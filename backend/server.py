from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import secrets
import jwt
import bcrypt
import httpx
import random
import re
from collections import defaultdict
import time
import base64
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# AI Integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logging.warning("emergentintegrations not available, AI features disabled")

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.getenv("MONGO_URL")
if not mongo_url:
    raise RuntimeError("❌ MONGO_URL is not set in environment variables")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email Settings
SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168  # 7 days

# Rate limiting storage (in-memory, resets on server restart)
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 100  # max requests per window

# Rate limiting middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        # Clean old requests
        rate_limit_store[client_ip] = [
            t for t in rate_limit_store[client_ip] 
            if current_time - t < RATE_LIMIT_WINDOW
        ]
        
        # Check rate limit
        if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
            return Response(
                content='{"detail": "Слишком много запросов. Подождите немного."}',
                status_code=429,
                media_type="application/json"
            )
        
        # Add current request
        rate_limit_store[client_ip].append(current_time)
        
        response = await call_next(request)
        return response

# Input sanitization helper
def sanitize_string(value: str, max_length: int = 1000) -> str:
    """Sanitize string input to prevent XSS and limit length"""
    if not value:
        return value
    # Remove HTML tags
    value = re.sub(r'<[^>]*>', '', value)
    # Limit length
    return value[:max_length].strip()

async def send_verification_email(email: str, code: str):
    """Send verification code to user's email"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logging.warning("SMTP credentials not set, email not sent")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USER
        msg['To'] = email
        msg['Subject'] = "Код подтверждения регистрации TSMarket"
        
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #10b981; text-align: center;">Добро пожаловать в TSMarket!</h2>
                    <p>Здравствуйте!</p>
                    <p>Для завершения регистрации, пожалуйста, введите следующий 6-значный код подтверждения:</p>
                    <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f766e; border-radius: 5px; margin: 20px 0;">
                        {code}
                    </div>
                    <p>Этот код действителен в течение 10 минут. Если вы не запрашивали этот код, просто проигнорируйте это письмо.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">&copy; 2026 TSMarket. Все права защищены.</p>
                </div>
            </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Use asyncio.to_thread for blocking smtplib calls
        def _send():
            if SMTP_PORT == 465:
                with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
                    server.login(SMTP_USER, SMTP_PASSWORD)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                    server.starttls()
                    server.login(SMTP_USER, SMTP_PASSWORD)
                    server.send_message(msg)
        
        await asyncio.to_thread(_send)
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False

# AI Receipt Analysis Function
async def analyze_receipt_with_ai(receipt_image_url: str, expected_amount: float) -> dict:
    """
    Analyze receipt image using AI to verify the amount.
    Returns: {"approved": bool, "confidence": str, "extracted_amount": float|None, "reason": str}
    """
    if not AI_AVAILABLE:
        return {"approved": False, "confidence": "none", "extracted_amount": None, "reason": "AI модуль не доступен"}
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return {"approved": False, "confidence": "none", "extracted_amount": None, "reason": "API ключ не настроен"}
    
    try:
        # Get image as base64
        image_base64 = None
        
        if receipt_image_url.startswith('/uploads/'):
            # Local file
            file_path = ROOT_DIR / receipt_image_url.lstrip('/')
            if file_path.exists():
                with open(file_path, 'rb') as f:
                    image_base64 = base64.b64encode(f.read()).decode('utf-8')
        elif receipt_image_url.startswith('http'):
            # Remote URL
            async with httpx.AsyncClient() as client:
                resp = await client.get(receipt_image_url, timeout=30)
                if resp.status_code == 200:
                    image_base64 = base64.b64encode(resp.content).decode('utf-8')
        elif receipt_image_url.startswith('data:image'):
            # Already base64
            image_base64 = receipt_image_url.split(',')[1] if ',' in receipt_image_url else receipt_image_url
        
        if not image_base64:
            return {"approved": False, "confidence": "none", "extracted_amount": None, "reason": "Не удалось загрузить изображение"}
        
        # Initialize AI chat
        chat = LlmChat(
            api_key=api_key,
            session_id=f"receipt_analysis_{uuid.uuid4().hex[:8]}",
            system_message="""Ты - AI помощник для проверки чеков пополнения баланса. 
Твоя задача - проанализировать изображение чека/квитанции и найти сумму перевода.

ВАЖНО:
1. Найди на изображении сумму денежного перевода
2. Ответь ТОЛЬКО в формате JSON: {"amount": число_или_null, "confidence": "high/medium/low", "found": true/false}
3. Если сумму определить невозможно или изображение некачественное, верни {"amount": null, "confidence": "low", "found": false}
4. Не добавляй никакого дополнительного текста, только JSON"""
        ).with_model("openai", "gpt-5.1")
        
        # Create message with image
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text=f"Найди сумму перевода на этом чеке. Ожидаемая сумма для проверки: {expected_amount}",
            image_contents=[image_content]
        )
        
        # Send to AI
        response = await chat.send_message(user_message)
        
        # Parse response
        try:
            # Clean response - remove markdown if present
            clean_response = response.strip()
            if clean_response.startswith('```'):
                clean_response = clean_response.split('```')[1]
                if clean_response.startswith('json'):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            import json
            result = json.loads(clean_response)
            
            extracted_amount = result.get('amount')
            confidence = result.get('confidence', 'low')
            found = result.get('found', False)
            
            if not found or extracted_amount is None:
                return {
                    "approved": False, 
                    "confidence": confidence,
                    "extracted_amount": None,
                    "reason": "AI не смог определить сумму на чеке"
                }
            
            # Compare amounts (allow 5% tolerance)
            tolerance = expected_amount * 0.05
            amount_matches = abs(float(extracted_amount) - expected_amount) <= tolerance
            
            if amount_matches and confidence in ['high', 'medium']:
                return {
                    "approved": True,
                    "confidence": confidence,
                    "extracted_amount": float(extracted_amount),
                    "reason": f"AI подтвердил: сумма {extracted_amount} соответствует заявленной {expected_amount}"
                }
            elif not amount_matches:
                return {
                    "approved": False,
                    "confidence": confidence,
                    "extracted_amount": float(extracted_amount),
                    "reason": f"Сумма на чеке ({extracted_amount}) не совпадает с заявленной ({expected_amount})"
                }
            else:
                return {
                    "approved": False,
                    "confidence": confidence,
                    "extracted_amount": float(extracted_amount),
                    "reason": "Низкая уверенность AI - требуется ручная проверка"
                }
                
        except json.JSONDecodeError:
            return {
                "approved": False,
                "confidence": "low",
                "extracted_amount": None,
                "reason": f"Ошибка парсинга ответа AI: {response[:100]}"
            }
            
    except Exception as e:
        logging.error(f"AI analysis error: {str(e)}")
        return {
            "approved": False,
            "confidence": "none",
            "extracted_amount": None,
            "reason": f"Ошибка AI анализа: {str(e)}"
        }

# Create the main app
app = FastAPI(title="TSMarket API")
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"), # Frontend URL from environment variable
        "https://ts-market0001-oek6.vercel.app", # Existing Vercel preview URLs
        "https://ts-market0001-yilv.vercel.app"
    ],
    # Это разрешит любые preview-ссылки от Vercel для вашего проекта
    allow_origin_regex=os.getenv("FRONTEND_URL_REGEX", r"https://ts-market0001-.*\.vercel\.app"), # Regex for Vercel preview deployments
    allow_methods=["*"],
    allow_headers=["*"],
)
# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== AUTH ======================



class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Пароль должен быть не менее 6 символов')
        if len(v) > 128:
            raise ValueError('Пароль слишком длинный')
        return v
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = sanitize_string(v, 100)
        if len(v) < 2:
            raise ValueError('Имя должно быть не менее 2 символов')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyCode(BaseModel):
    email: EmailStr
    code: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    balance: float = 0.0
    xp: int = 0
    level: int = 1
    is_admin: bool = False
    role: str = "user"  # "user", "helper", "admin", "delivery"
    wheel_spins_available: int = 0
    claimed_rewards: List[int] = []
    created_at: datetime

class UserPublic(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    balance: float = 0.0
    xp: int = 0
    level: int = 1
    is_admin: bool = False
    role: str = "user"
    wheel_spins_available: int = 0
    claimed_rewards: List[int] = []

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str  # Default name (backward compatible)
    name_ru: Optional[str] = None  # Russian name
    name_tj: Optional[str] = None  # Tajik name
    slug: str
    description: Optional[str] = None
    description_ru: Optional[str] = None
    description_tj: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None  # Parent category ID for subcategories
    is_parent: bool = False  # True if this is a parent category

class CategoryCreate(BaseModel):
    name: str
    name_ru: Optional[str] = None
    name_tj: Optional[str] = None
    slug: str
    description: Optional[str] = None
    description_ru: Optional[str] = None
    description_tj: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None  # Parent category ID

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    name: str  # Default name (backward compatible)
    name_ru: Optional[str] = None  # Russian name
    name_tj: Optional[str] = None  # Tajik name
    description: str
    description_ru: Optional[str] = None
    description_tj: Optional[str] = None
    price: float
    xp_reward: int = 10
    category_id: str
    image_url: str  # Main image (URL or base64)
    images: List[str] = []  # Additional images (URLs or base64)
    sizes: List[str] = []
    stock: int = 100
    in_stock: bool = True
    arrival_date: Optional[str] = None
    is_active: bool = True
    discount_percent: float = 0.0  # Admin sets discount on product
    tags: List[str] = []  # List of tag IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    name_ru: Optional[str] = None
    name_tj: Optional[str] = None
    description: str
    description_ru: Optional[str] = None
    description_tj: Optional[str] = None
    price: float
    xp_reward: int = 10
    category_id: str
    image_url: str = ""  # Can be empty if images provided
    images: List[str] = []  # Base64 or URLs
    sizes: List[str] = []
    stock: int = 100
    in_stock: bool = True
    arrival_date: Optional[str] = None
    discount_percent: float = 0.0
    tags: List[str] = []

# Bank card model for multiple cards
class BankCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    card_id: str = Field(default_factory=lambda: f"card_{uuid.uuid4().hex[:12]}")
    card_number: str
    card_holder: str
    bank_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BankCardCreate(BaseModel):
    card_number: str
    card_holder: str
    bank_name: str

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    size: Optional[str] = None

class CreateOrderRequest(BaseModel):
    items: List['CartItem']
    delivery_address: str
    phone_number: str
    promo_code: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    price: float
    quantity: int
    size: Optional[str] = None
    xp_reward: int

class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None
    tracking_number: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"ord_{uuid.uuid4().hex[:12]}")
    user_id: str
    items: List[OrderItem]
    total: float
    total_xp: int
    status: str = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled
    delivery_address: str = ""
    phone_number: str = ""
    discount_applied: float = 0.0
    promo_code: Optional[str] = None
    tracking_number: Optional[str] = None  # Tracking number for shipment
    status_history: List[dict] = []  # History of status changes
    admin_note: Optional[str] = None
    delivery_user_id: Optional[str] = None  # ID of the delivery person who took the order
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

# Promo Code model
class PromoCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    promo_id: str = Field(default_factory=lambda: f"promo_{uuid.uuid4().hex[:12]}")
    code: str
    discount_percent: float  # 0-100
    is_active: bool = True
    usage_limit: int = 0  # 0 = unlimited
    times_used: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PromoCodeCreate(BaseModel):
    code: str
    discount_percent: float
    usage_limit: int = 0

class TopUpCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    code_id: str = Field(default_factory=lambda: f"code_{uuid.uuid4().hex[:12]}")
    code: str
    amount: float
    is_used: bool = False
    used_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TopUpCodeCreate(BaseModel):
    code: str
    amount: float

# New TopUp Request model for card-based payments
class TopUpRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    user_id: str
    user_name: str
    user_email: str
    amount: float
    receipt_url: str  # URL to uploaded receipt image
    status: str = "pending"  # pending, approved, rejected
    admin_note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class TopUpRequestCreate(BaseModel):
    amount: float
    receipt_url: str

class ShopTheme(BaseModel):
    model_config = ConfigDict(extra="ignore")
    theme_id: str = Field(default_factory=lambda: f"theme_{uuid.uuid4().hex[:12]}")
    name: str
    icon: str = "🎨"
    hero_image: str
    gradient: str
    title_color: str
    tagline: str
    is_system: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShopThemeCreate(BaseModel):
    name: str
    icon: str = "🎨"
    hero_image: str
    gradient: str
    title_color: str
    tagline: str

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    settings_id: str = "admin_settings"
    card_number: str = ""
    card_holder: str = ""
    additional_info: str = ""
    # Support contacts
    support_telegram: str = ""
    support_whatsapp: str = ""
    support_email: str = ""
    support_phone: str = ""
    # AI Assistant
    ai_auto_approve_enabled: bool = False
    active_theme: str = "default"

class AdminSettingsUpdate(BaseModel):
    card_number: str
    card_holder: str = ""
    additional_info: str = ""
    support_telegram: str = ""
    support_whatsapp: str = ""
    support_email: str = ""
    support_phone: str = ""
    ai_auto_approve_enabled: bool = False
    active_theme: str = "default"

class Reward(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reward_id: str = Field(default_factory=lambda: f"rew_{uuid.uuid4().hex[:12]}")
    level_required: int
    name: str
    description: str
    reward_type: str  # "coins", "xp_boost", "discount", "exclusive"
    value: float

    is_exclusive: bool = False  # For every 10 levels

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:12]}")
    product_id: str
    user_id: str
    user_name: str
    rating: int = Field(..., ge=1, le=5)
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str

class RewardCreate(BaseModel):
    level_required: int
    name: str
    description: str
    reward_type: str
    value: float
    is_exclusive: bool = False

class WheelPrize(BaseModel):
    model_config = ConfigDict(extra="ignore")
    prize_id: str = Field(default_factory=lambda: f"prize_{uuid.uuid4().hex[:12]}")
    name: str
    prize_type: str  # "coins", "xp", "discount"
    value: float
    probability: float  # 0.0 to 1.0
    color: str = "#0D9488"

class WheelPrizeCreate(BaseModel):
    name: str
    prize_type: str
    value: float
    probability: float
    color: str = "#0D9488"

# Tag model for products
class Tag(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tag_id: str = Field(default_factory=lambda: f"tag_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str
    color: str = "#0D9488"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TagCreate(BaseModel):
    name: str
    slug: str
    color: str = "#0D9488"

# Mission/Quest model
class Mission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    mission_id: str = Field(default_factory=lambda: f"mission_{uuid.uuid4().hex[:12]}")
    title: str
    description: str
    mission_type: str  # "purchase", "topup", "level", "orders_count", "spend_amount", "review"
    target_value: float  # e.g., 5 orders, 1000 coins spent, level 5
    reward_type: str  # "coins", "xp", "spin"
    reward_value: float
    min_level: int = 1
    is_active: bool = True
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MissionCreate(BaseModel):
    title: str
    description: str
    mission_type: str
    target_value: float
    reward_type: str
    reward_value: float
    min_level: int = 1
    expires_at: Optional[str] = None

# User mission progress
class UserMission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_mission_id: str = Field(default_factory=lambda: f"um_{uuid.uuid4().hex[:12]}")
    user_id: str
    mission_id: str
    progress: float = 0.0
    is_completed: bool = False
    is_claimed: bool = False
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Support ticket model
class SupportTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket_id: str = Field(default_factory=lambda: f"ticket_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    name: str
    email: str
    subject: str
    message: str
    status: str = "open"  # open, in_progress, resolved, closed
    admin_response: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportTicketCreate(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        v = sanitize_string(v, 100)
        if len(v) < 2:
            raise ValueError('Имя слишком короткое')
        return v
    
    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v):
        v = sanitize_string(v, 200)
        if len(v) < 3:
            raise ValueError('Тема слишком короткая')
        return v
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v):
        v = sanitize_string(v, 5000)
        if len(v) < 10:
            raise ValueError('Сообщение слишком короткое')
        return v

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: f"sess_{uuid.uuid4().hex[:12]}")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def calculate_level(xp: int) -> int:
    """Calculate level from XP. Formula: each level needs base 100 + level*50 XP"""
    level = 1
    xp_needed = 100
    total_xp_for_level = 0
    while xp >= total_xp_for_level + xp_needed:
        total_xp_for_level += xp_needed
        level += 1
        xp_needed = 100 + level * 50
    return level

def xp_for_next_level(current_level: int) -> int:
    """XP needed to reach next level"""
    return 100 + current_level * 50

def total_xp_for_level(level: int) -> int:
    """Total XP accumulated to reach a level"""
    total = 0
    for l in range(1, level):
        total += 100 + l * 50
    return total

async def get_current_user(request: Request) -> Optional[User]:
    # Try cookie first
    session_token = request.cookies.get("session_token")
    
    # Then try Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Check session
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        return None
    
    return User(**user)

async def require_user(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> User:
    user = await require_user(request)
    if not user.is_admin and user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_helper_or_admin(request: Request) -> User:
    """Require helper or admin role"""
    user = await require_user(request)
    if user.role not in ["helper", "admin"] and not user.is_admin:
        raise HTTPException(status_code=403, detail="Helper or admin access required")
    return user

async def require_delivery_or_admin(request: Request) -> User:
    """Require delivery or admin role"""
    user = await require_user(request)
    if user.role not in ["delivery", "admin"] and not user.is_admin:
        raise HTTPException(status_code=403, detail="Delivery or admin access required")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check for existing pending registration
    await db.pending_registrations.delete_many({"email": data.email})
    
    # Generate verification code
    verification_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
    
    pending_data = {
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "verification_code": verification_code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pending_registrations.insert_one(pending_data)
    
    # Send email
    email_sent = await send_verification_email(data.email, verification_code)
    
    if not email_sent:
        # If email sending fails, we might still want to proceed for demo purposes 
        # or show an error. Let's return success but mention email status in logs.
        logging.warning(f"Verification email could not be sent to {data.email}")
    
    return {"message": "Код подтверждения отправлен на вашу почту", "email": data.email}

@api_router.post("/auth/verify")
async def verify_code(data: VerifyCode, response: Response):
    pending = await db.pending_registrations.find_one({
        "email": data.email,
        "verification_code": data.code
    })
    
    if not pending:
        raise HTTPException(status_code=400, detail="Неверный код или email")
    
    # Check expiration
    expires_at = datetime.fromisoformat(pending["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_registrations.delete_one({"_id": pending["_id"]})
        raise HTTPException(status_code=400, detail="Код истек. Пожалуйста, зарегистрируйтесь снова.")
    
    # Create actual user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_data = {
        "user_id": user_id,
        "email": pending["email"],
        "name": pending["name"],
        "password_hash": pending["password_hash"],
        "picture": None,
        "balance": 0.0,
        "xp": 0,
        "level": 1,
        "is_admin": False,
        "role": "user",
        "wheel_spins_available": 1,
        "claimed_rewards": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_data)
    await db.pending_registrations.delete_one({"_id": pending["_id"]})
    
    # Create session
    session_token = secrets.token_hex(32)
    session_data = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_data.pop("password_hash", None)
    user_data.pop("_id", None)
    return {"user": user_data, "token": session_token}

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = secrets.token_hex(32)
    session_data = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    return {"user": user_response, "token": session_token}

@api_router.post("/auth/session")
async def process_google_session(request: Request, response: Response):
    """Process session_id from Google OAuth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Fetch user data from Emergent Auth
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        oauth_data = resp.json()
    
    # Check if user exists
    existing = await db.users.find_one({"email": oauth_data["email"]}, {"_id": 0})
    
    if existing:
        user_id = existing["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": oauth_data.get("name", existing.get("name")),
                "picture": oauth_data.get("picture", existing.get("picture"))
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_data = {
            "user_id": user_id,
            "email": oauth_data["email"],
            "name": oauth_data.get("name", "User"),
            "picture": oauth_data.get("picture"),
            "balance": 0.0,
            "xp": 0,
            "level": 1,
            "is_admin": False,
            "wheel_spins_available": 1,
            "claimed_rewards": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_data)
    
    # Create session
    session_token = oauth_data.get("session_token", secrets.token_hex(32))
    session_data = {
        "session_id": f"sess_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user, "token": session_token}

# ==================== REVIEWS ====================

@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, user: User = Depends(get_current_user)):
    product = await db.products.find_one({"product_id": review_data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    review = Review(
        **review_data.model_dump(),
        user_id=user.user_id,
        user_name=user.name,
    )

    await db.reviews.insert_one(review.model_dump(by_alias=True))
    
    # Update mission progress
    await update_mission_progress(user.user_id, "review", 1)
    
    return review

@api_router.get("/reviews/{product_id}", response_model=List[Review])
async def get_reviews_for_product(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_user)):
    return UserPublic(**user.model_dump())

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ==================== CATEGORY ENDPOINTS ====================

@api_router.get("/categories")
async def get_categories(hierarchical: bool = False):
    """Get all categories, optionally in hierarchical structure"""
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    
    # Sort: parents first (by name), then children grouped by parent
    def sort_key(cat):
        name = cat.get("name_ru") or cat.get("name") or ""
        if not cat.get("parent_id"):
            return (0, name)
        return (1, cat.get("parent_id") or "", name)
    
    categories.sort(key=sort_key)
    
    if not hierarchical:
        return categories
    
    # Build hierarchical structure
    parent_categories = [c for c in categories if not c.get("parent_id")]
    
    for parent in parent_categories:
        parent["subcategories"] = [c for c in categories if c.get("parent_id") == parent["category_id"]]
    
    return parent_categories

@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate, user: User = Depends(require_helper_or_admin)):
    category_data = data.model_dump()
    category_data["category_id"] = f"cat_{uuid.uuid4().hex[:12]}"
    
    # If this category has no parent, mark it as parent
    if not category_data.get("parent_id"):
        category_data["is_parent"] = True
    else:
        category_data["is_parent"] = False
        # Verify parent exists
        parent = await db.categories.find_one({"category_id": category_data["parent_id"]}, {"_id": 0})
        if not parent:
            raise HTTPException(status_code=400, detail="Родительская категория не найдена")
        # Mark parent as having subcategories
        await db.categories.update_one(
            {"category_id": category_data["parent_id"]},
            {"$set": {"is_parent": True}}
        )
    
    await db.categories.insert_one(category_data)
    category_data.pop("_id", None)
    return category_data

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: User = Depends(require_helper_or_admin)):
    # Check if category has subcategories
    subcategories = await db.categories.find({"parent_id": category_id}, {"_id": 0}).to_list(100)
    if subcategories:
        raise HTTPException(status_code=400, detail="Нельзя удалить категорию с подкатегориями")
    
    result = await db.categories.delete_one({"category_id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ==================== PRODUCT ENDPOINTS ====================

@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_xp: Optional[int] = None,
    size: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    query: Dict[str, Any] = {"is_active": True}
    
    # 1. Фильтр по категории (пропускаем, если выбрано "all")
    if category and category != "all":
        # Check if this is a parent category
        cat_doc = await db.categories.find_one({"category_id": category})
        if cat_doc and cat_doc.get("is_parent"):
            # Get all subcategories
            subcats = await db.categories.find({"parent_id": category}).to_list(100)
            subcat_ids = [s["category_id"] for s in subcats]
            # Include parent category itself and all its subcategories
            query["category_id"] = {"$in": [category] + subcat_ids}
        else:
            query["category_id"] = category
        
    # 2. Улучшенный поиск (ищет по названию и описанию на двух языках)
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"name_ru": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"description_ru": {"$regex": search, "$options": "i"}}
        ]
    
    # 3. Правильная фильтрация по цене (объединяем min и max)
    if min_price is not None or max_price is not None:
        price_query = {}
        if min_price is not None:
            price_query["$gte"] = min_price
        if max_price is not None:
            price_query["$lte"] = max_price
        query["price"] = price_query
        
    # 4. Фильтр по XP
    if min_xp is not None:
        query["xp_reward"] = {"$gte": min_xp}
        
    # 5. Фильтр по размеру
    if size:
        query["sizes"] = size
    
    # Для админки позволяем загружать все товары без ограничений
    # Если лимит больше 1000, считаем это запросом от админки
    is_admin_request = limit > 1000
    actual_limit = limit if is_admin_request else min(limit, 100)
    
    # Получаем товары
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(actual_limit).to_list(actual_limit)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, user: User = Depends(require_helper_or_admin)):
    """Helper and admin can create products"""
    # Set main image from first in images array if not provided
    image_url = data.image_url
    if not image_url and data.images:
        image_url = data.images[0]
    
    product_data = data.model_dump()
    product_data["image_url"] = image_url
    
    product = Product(**product_data)
    product_dict = product.model_dump()
    product_dict["created_at"] = product_dict["created_at"].isoformat()
    await db.products.insert_one(product_dict)
    return product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, data: ProductCreate, user: User = Depends(require_helper_or_admin)):
    """Helper and admin can update products"""
    update_data = data.model_dump()
    # Set main image from first in images array if not provided
    if not update_data.get("image_url") and update_data.get("images"):
        update_data["image_url"] = update_data["images"][0]
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: User = Depends(require_helper_or_admin)):
    """Only admin can delete products"""
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ==================== ORDER ENDPOINTS ====================

@api_router.post("/orders")
async def create_order(data: CreateOrderRequest, user: User = Depends(require_user)):
    items = data.items
    delivery_address = data.delivery_address
    phone_number = data.phone_number
    promo_code = data.promo_code
    
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    if not delivery_address or len(delivery_address.strip()) < 5:
        raise HTTPException(status_code=400, detail="Delivery address is required")
    
    if not phone_number or len(phone_number.strip()) < 7:
        raise HTTPException(status_code=400, detail="Phone number is required")
    
    # Get user data for level discount
    current_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    user_level = current_user.get("level", 1)
    
    # Calculate level discount (1% per level, max 15%)
    level_discount_percent = min(user_level, 15)
    
    # Check promo code
    promo_discount_percent = 0.0
    if promo_code:
        promo = await db.promo_codes.find_one({
            "code": promo_code.upper(),
            "is_active": True
        }, {"_id": 0})
        if promo:
            if promo.get("usage_limit", 0) == 0 or promo.get("times_used", 0) < promo.get("usage_limit", 0):
                promo_discount_percent = promo.get("discount_percent", 0)
                # Update promo usage
                await db.promo_codes.update_one(
                    {"code": promo_code.upper()},
                    {"$inc": {"times_used": 1}}
                )
    
    order_items = []
    total = 0.0
    total_discount = 0.0
    total_xp = 0
    
    # Batch fetch products to avoid N+1 queries
    product_ids = [item.product_id for item in items]
    products_cursor = db.products.find({"product_id": {"$in": product_ids}}, {"_id": 0})
    products_list = await products_cursor.to_list(length=len(product_ids))
    products_map = {p["product_id"]: p for p in products_list}
    
    for item in items:
        product = products_map.get(item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        if item.size and item.size not in product.get("sizes", []):
            raise HTTPException(status_code=400, detail=f"Size {item.size} not available")
        
        # Calculate price with product discount
        base_price = product["price"]
        product_discount = product.get("discount_percent", 0)
        price_after_product_discount = base_price * (1 - product_discount / 100)
        
        item_total = price_after_product_discount * item.quantity
        item_xp = product["xp_reward"] * item.quantity
        
        order_items.append(OrderItem(
            product_id=item.product_id,
            product_name=product["name"],
            price=price_after_product_discount,
            quantity=item.quantity,
            size=item.size,
            xp_reward=item_xp
        ))
        
        total += item_total
        total_xp += item_xp
    
    # Apply level discount
    level_discount_amount = total * (level_discount_percent / 100)
    total -= level_discount_amount
    total_discount += level_discount_amount
    
    # Apply promo discount
    promo_discount_amount = total * (promo_discount_percent / 100)
    total -= promo_discount_amount
    total_discount += promo_discount_amount
    
    # Round total
    total = round(total, 2)
    total_discount = round(total_discount, 2)
    
    # Check balance
    if current_user["balance"] < total:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Create order with initial status
    order = Order(
        user_id=user.user_id,
        items=order_items,
        total=total,
        total_xp=total_xp,
        status="pending",
        delivery_address=delivery_address.strip(),
        phone_number=phone_number.strip(),
        discount_applied=total_discount,
        promo_code=promo_code.upper() if promo_code else None,
        status_history=[{
            "status": "pending",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Заказ создан"
        }]
    )
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["items"] = [item.model_dump() for item in order_items]
    await db.orders.insert_one(order_dict)
    
    # Remove MongoDB _id from response
    order_dict.pop("_id", None)
    
    # Update user balance and XP
    new_xp = current_user["xp"] + total_xp
    old_level = current_user["level"]
    new_level = calculate_level(new_xp)
    
    # Calculate wheel spins for level up
    levels_gained = new_level - old_level
    new_spins = current_user.get("wheel_spins_available", 0) + levels_gained
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "balance": current_user["balance"] - total,
            "xp": new_xp,
            "level": new_level,
            "wheel_spins_available": new_spins
        }}
    )
    
    # Update mission progress
    await update_mission_progress(user.user_id, "orders_count", 1)
    await update_mission_progress(user.user_id, "spend_amount", total)
    await update_mission_progress(user.user_id, "purchase", 1)
    
    return {
        "order": order_dict,
        "xp_gained": total_xp,
        "new_level": new_level,
        "level_up": new_level > old_level,
        "discount_applied": total_discount
    }

@api_router.get("/orders")
async def get_user_orders(
    user: User = Depends(require_user),
    skip: int = 0,
    limit: int = 50
):
    """Get user orders with pagination"""
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}) \
        .sort("created_at", -1) \
        .skip(skip) \
        .limit(limit) \
        .to_list(limit)
    return orders

# ==================== TOP-UP ENDPOINTS ====================

@api_router.post("/topup/redeem")
async def redeem_topup_code(code: str, user: User = Depends(require_user)):
    topup = await db.topup_codes.find_one({"code": code, "is_used": False}, {"_id": 0})
    if not topup:
        raise HTTPException(status_code=404, detail="Invalid or already used code")
    
    # Mark as used
    await db.topup_codes.update_one(
        {"code": code},
        {"$set": {"is_used": True, "used_by": user.user_id}}
    )
    
    # Add balance
    current = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    new_balance = current["balance"] + topup["amount"]
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"balance": new_balance}}
    )
    
    # Log history
    await db.topup_history.insert_one({
        "history_id": f"hist_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "code": code,
        "amount": topup["amount"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Balance topped up", "amount": topup["amount"], "new_balance": new_balance}

# New card-based top-up system
@api_router.get("/topup/settings")
async def get_topup_settings():
    """Get card payment settings (public endpoint)"""
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"}, {"_id": 0})
    if not settings:
        return {"card_number": "", "card_holder": "", "additional_info": ""}
    return {
        "card_number": settings.get("card_number", ""),
        "card_holder": settings.get("card_holder", ""),
        "additional_info": settings.get("additional_info", "")
    }

@api_router.post("/topup/request")
async def create_topup_request(data: TopUpRequestCreate, user: User = Depends(require_user)):
    """Create a new top-up request with receipt"""
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    
    request_data = {
        "request_id": request_id,
        "user_id": user.user_id,
        "user_name": user.name,
        "user_email": user.email,
        "amount": data.amount,
        "receipt_url": data.receipt_url,
        "receipt_image_url": data.receipt_url,  # Alias for compatibility
        "status": "pending",
        "admin_note": None,
        "ai_analysis": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processed_at": None
    }
    
    # Check if AI auto-approve is enabled
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"}, {"_id": 0})
    ai_enabled = settings.get("ai_auto_approve_enabled", False) if settings else False
    
    if ai_enabled and AI_AVAILABLE:
        # Run AI analysis
        ai_result = await analyze_receipt_with_ai(data.receipt_url, data.amount)
        request_data["ai_analysis"] = ai_result
        
        if ai_result.get("approved"):
            # Auto-approve
            request_data["status"] = "approved"
            request_data["admin_note"] = f"🤖 AI авто-одобрение: {ai_result.get('reason')}"
            request_data["processed_at"] = datetime.now(timezone.utc).isoformat()
            
            # Add balance to user
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$inc": {"balance": data.amount}}
            )
            
            # Log history
            history_entry = {
                "history_id": f"hist_{uuid.uuid4().hex[:12]}",
                "user_id": user.user_id,
                "amount": data.amount,
                "type": "ai_approved",
                "description": f"AI авто-одобрение пополнения: {data.amount}",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.topup_history.insert_one(history_entry)
    
    await db.topup_requests.insert_one(request_data)
    request_data.pop("_id", None)
    return request_data

@api_router.get("/topup/requests")
async def get_user_topup_requests(user: User = Depends(require_user)):
    """Get user's top-up requests"""
    requests = await db.topup_requests.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.get("/topup/history")
async def get_topup_history(user: User = Depends(require_user)):
    history = await db.topup_history.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return history

# ==================== REWARDS ENDPOINTS ====================

@api_router.get("/rewards")
async def get_rewards(user: User = Depends(require_user)):
    rewards = await db.rewards.find({}, {"_id": 0}).sort("level_required", 1).to_list(100)
    
    # Mark which rewards user can claim
    for reward in rewards:
        reward["can_claim"] = (
            user.level >= reward["level_required"] and 
            reward["level_required"] not in user.claimed_rewards
        )
        reward["is_claimed"] = reward["level_required"] in user.claimed_rewards
    
    return rewards

@api_router.post("/rewards/claim/{level}")
async def claim_reward(level: int, user: User = Depends(require_user)):
    reward = await db.rewards.find_one({"level_required": level}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if user.level < level:
        raise HTTPException(status_code=400, detail="Level requirement not met")
    
    if level in user.claimed_rewards:
        raise HTTPException(status_code=400, detail="Reward already claimed")
    
    # Apply reward
    current = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    updates = {"claimed_rewards": current["claimed_rewards"] + [level]}
    
    if reward["reward_type"] == "coins":
        updates["balance"] = current["balance"] + reward["value"]
    elif reward["reward_type"] == "xp_boost":
        updates["xp"] = current["xp"] + int(reward["value"])
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    
    return {"message": "Reward claimed", "reward": reward}

# ==================== WHEEL ENDPOINTS ====================

@api_router.get("/wheel/prizes")
async def get_wheel_prizes():
    prizes = await db.wheel_prizes.find({}, {"_id": 0}).to_list(100)
    return prizes

@api_router.post("/wheel/spin")
async def spin_wheel(user: User = Depends(require_user)):
    if user.wheel_spins_available <= 0:
        raise HTTPException(status_code=400, detail="No spins available")
    
    prizes = await db.wheel_prizes.find({}, {"_id": 0}).to_list(100)
    if not prizes:
        raise HTTPException(status_code=404, detail="No prizes configured")
    
    # Weighted random selection
    total_prob = sum(p["probability"] for p in prizes)
    rand = random.uniform(0, total_prob)
    cumulative = 0
    selected_prize = prizes[0]
    
    for prize in prizes:
        cumulative += prize["probability"]
        if rand <= cumulative:
            selected_prize = prize
            break
    
    # Apply prize
    current = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    updates = {"wheel_spins_available": current["wheel_spins_available"] - 1}
    
    if selected_prize["prize_type"] == "coins":
        updates["balance"] = current["balance"] + selected_prize["value"]
    elif selected_prize["prize_type"] == "xp":
        new_xp = current["xp"] + int(selected_prize["value"])
        new_level = calculate_level(new_xp)
        updates["xp"] = new_xp
        updates["level"] = new_level
    
    await db.users.update_one({"user_id": user.user_id}, {"$set": updates})
    
    return {"prize": selected_prize, "spins_remaining": current["wheel_spins_available"] - 1}

# ==================== ADMIN ENDPOINTS ====================

@api_router.get("/admin/stats")
async def get_admin_stats(user: User = Depends(require_helper_or_admin)):
    users_count = await db.users.count_documents({})
    orders_count = await db.orders.count_documents({})
    products_count = await db.products.count_documents({})
    
    # Get custom revenue from settings if exists
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"})
    custom_revenue = settings.get("custom_revenue") if settings else None
    
    if custom_revenue is not None:
        total_revenue = custom_revenue
    else:
        # Calculate real revenue from orders
        orders = await db.orders.find({}, {"total": 1, "_id": 0}).to_list(10000)
        total_revenue = sum(o.get("total", 0) for o in orders)
    
    return {
        "users_count": users_count,
        "orders_count": orders_count,
        "products_count": products_count,
        "total_revenue": total_revenue,
        "is_custom_revenue": custom_revenue is not None
    }

@api_router.put("/admin/stats/revenue")
async def update_admin_revenue(revenue: float, user: User = Depends(require_admin)):
    """Admin can override the total revenue shown in stats"""
    await db.admin_settings.update_one(
        {"settings_id": "admin_settings"},
        {"$set": {"custom_revenue": revenue}},
        upsert=True
    )
    return {"message": "Выручка обновлена", "new_revenue": revenue}

@api_router.delete("/admin/stats/revenue")
async def reset_admin_revenue(user: User = Depends(require_admin)):
    """Reset revenue to real calculated value"""
    await db.admin_settings.update_one(
        {"settings_id": "admin_settings"},
        {"$unset": {"custom_revenue": ""}}
    )
    return {"message": "Выручка сброшена к реальным значениям"}

# ==================== PROMO CODES ====================

@api_router.post("/promo/validate")
async def validate_promo_code(code: str, user: User = Depends(require_user)):
    promo = await db.promo_codes.find_one({
        "code": code.upper(),
        "is_active": True
    }, {"_id": 0})
    
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    
    if promo.get("usage_limit", 0) > 0 and promo.get("times_used", 0) >= promo.get("usage_limit", 0):
        raise HTTPException(status_code=400, detail="Промокод больше недействителен")
    
    return {
        "valid": True,
        "discount_percent": promo.get("discount_percent", 0),
        "code": promo.get("code")
    }

@api_router.get("/admin/promo-codes")
async def get_promo_codes(user: User = Depends(require_helper_or_admin)):
    codes = await db.promo_codes.find({}, {"_id": 0}).to_list(1000)
    return codes

@api_router.post("/admin/promo-codes")
async def create_promo_code(data: PromoCodeCreate, user: User = Depends(require_helper_or_admin)):
    existing = await db.promo_codes.find_one({"code": data.code.upper()}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Промокод уже существует")
    
    promo = PromoCode(
        code=data.code.upper(),
        discount_percent=data.discount_percent,
        usage_limit=data.usage_limit
    )
    promo_dict = promo.model_dump()
    promo_dict["created_at"] = promo_dict["created_at"].isoformat()
    await db.promo_codes.insert_one(promo_dict)
    promo_dict.pop("_id", None)
    return promo_dict

@api_router.delete("/admin/promo-codes/{promo_id}")
async def delete_promo_code(promo_id: str, user: User = Depends(require_helper_or_admin)):
    result = await db.promo_codes.delete_one({"promo_id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    return {"message": "Промокод удалён"}

@api_router.put("/admin/promo-codes/{promo_id}/toggle")
async def toggle_promo_code(promo_id: str, user: User = Depends(require_helper_or_admin)):
    promo = await db.promo_codes.find_one({"promo_id": promo_id}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    
    new_status = not promo.get("is_active", True)
    await db.promo_codes.update_one(
        {"promo_id": promo_id},
        {"$set": {"is_active": new_status}}
    )
    return {"message": "Статус изменён", "is_active": new_status}

@api_router.get("/admin/users")
async def get_all_users(user: User = Depends(require_helper_or_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}/admin")
async def toggle_admin(user_id: str, is_admin: bool, user: User = Depends(require_admin)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"is_admin": is_admin}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Admin status updated"}

@api_router.post("/admin/topup-codes", response_model=TopUpCode)
async def create_topup_code(data: TopUpCodeCreate, user: User = Depends(require_helper_or_admin)):
    existing = await db.topup_codes.find_one({"code": data.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists")
    
    code = TopUpCode(**data.model_dump())
    code_dict = code.model_dump()
    code_dict["created_at"] = code_dict["created_at"].isoformat()
    await db.topup_codes.insert_one(code_dict)
    return code

@api_router.get("/admin/topup-codes")
async def get_topup_codes(user: User = Depends(require_helper_or_admin)):
    codes = await db.topup_codes.find({}, {"_id": 0}).to_list(1000)
    return codes

@api_router.delete("/admin/topup-codes/{code_id}")
async def delete_topup_code(code_id: str, user: User = Depends(require_helper_or_admin)):
    result = await db.topup_codes.delete_one({"code_id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Code not found")
    return {"message": "Code deleted"}

# Update product discount
@api_router.put("/admin/products/{product_id}/discount")
async def update_product_discount(product_id: str, discount_percent: float, user: User = Depends(require_helper_or_admin)):
    if discount_percent < 0 or discount_percent > 100:
        raise HTTPException(status_code=400, detail="Скидка должна быть от 0 до 100%")
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"discount_percent": discount_percent}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return {"message": "Скидка обновлена", "discount_percent": discount_percent}

# Admin settings for card payments
@api_router.get("/admin/settings")
async def get_admin_settings(user: User = Depends(require_admin)):
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"}, {"_id": 0})
    if not settings:
        return {
            "settings_id": "admin_settings", 
            "card_number": "", 
            "card_holder": "", 
            "additional_info": "",
            "support_telegram": "",
            "support_whatsapp": "",
            "support_email": "",
            "support_phone": ""
        }
    return settings

@api_router.put("/admin/settings")
async def update_admin_settings(data: AdminSettingsUpdate, user: User = Depends(require_admin)):
    await db.admin_settings.update_one(
        {"settings_id": "admin_settings"},
        {"$set": {
            "settings_id": "admin_settings",
            "card_number": data.card_number,
            "card_holder": data.card_holder,
            "additional_info": data.additional_info,
            "support_telegram": data.support_telegram,
            "support_whatsapp": data.support_whatsapp,
            "support_email": data.support_email,
            "support_phone": data.support_phone,
            "ai_auto_approve_enabled": data.ai_auto_approve_enabled,
            "active_theme": data.active_theme
        }},
        upsert=True
    )
    return {"message": "Настройки сохранены"}

# Public support contacts
@api_router.get("/support/contacts")
async def get_support_contacts():
    """Public endpoint to get support contact info"""
    settings = await db.admin_settings.find_one({"settings_id": "admin_settings"}, {"_id": 0})
    if not settings:
        return {
            "telegram": "",
            "whatsapp": "",
            "email": "",
            "phone": ""
        }
    return {
        "telegram": settings.get("support_telegram", ""),
        "whatsapp": settings.get("support_whatsapp", ""),
        "email": settings.get("support_email", ""),
        "phone": settings.get("support_phone", "")
    }

# Top-up requests management
@api_router.get("/admin/topup-requests")
async def get_all_topup_requests(user: User = Depends(require_helper_or_admin)):
    requests = await db.topup_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

@api_router.put("/admin/topup-requests/{request_id}/approve")
async def approve_topup_request(request_id: str, user: User = Depends(require_helper_or_admin)):
    """Helper and admin can approve topup requests"""
    req = await db.topup_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update request status
    await db.topup_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "approved",
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "processed_by": user.user_id
        }}
    )
    
    # Add balance to user
    target_user = await db.users.find_one({"user_id": req["user_id"]}, {"_id": 0})
    if target_user:
        new_balance = target_user["balance"] + req["amount"]
        await db.users.update_one(
            {"user_id": req["user_id"]},
            {"$set": {"balance": new_balance}}
        )
    
    return {"message": "Request approved", "amount": req["amount"]}

@api_router.put("/admin/topup-requests/{request_id}/reject")
async def reject_topup_request(request_id: str, note: str = "", user: User = Depends(require_helper_or_admin)):
    """Helper and admin can reject topup requests"""
    req = await db.topup_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    await db.topup_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "rejected",
            "admin_note": note,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Request rejected"}

# Delete user
@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, user: User = Depends(require_admin)):
    if user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    # Also delete user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

# Update user balance (admin)
@api_router.put("/admin/users/{user_id}/balance")
async def update_user_balance(user_id: str, balance: float, user: User = Depends(require_admin)):
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"balance": balance}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Balance updated"}

# Update user XP/Level (admin)
@api_router.put("/admin/users/{user_id}/xp")
async def update_user_xp(user_id: str, xp: int, user: User = Depends(require_admin)):
    new_level = calculate_level(xp)
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"xp": xp, "level": new_level}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "XP updated", "new_level": new_level}

# Admin profile update (email/password)
class AdminProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    name: Optional[str] = None

@api_router.put("/admin/profile")
async def update_admin_profile(data: AdminProfileUpdate, user: User = Depends(require_admin)):
    updates = {}
    
    if data.email and data.email != user.email:
        # Check if email is already taken
        existing = await db.users.find_one({"email": data.email, "user_id": {"$ne": user.user_id}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates["email"] = data.email
    
    if data.password:
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        updates["password_hash"] = hash_password(data.password)
    
    if data.name:
        updates["name"] = data.name
    
    if updates:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": updates}
        )
    
    return {"message": "Profile updated"}

@api_router.post("/admin/rewards", response_model=Reward)
async def create_reward(data: RewardCreate, user: User = Depends(require_helper_or_admin)):
    reward = Reward(**data.model_dump())
    await db.rewards.insert_one(reward.model_dump())
    return reward

@api_router.delete("/admin/rewards/{reward_id}")
async def delete_reward(reward_id: str, user: User = Depends(require_helper_or_admin)):
    result = await db.rewards.delete_one({"reward_id": reward_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reward not found")
    return {"message": "Reward deleted"}

@api_router.put("/admin/rewards/{reward_id}")
async def update_reward(reward_id: str, data: RewardCreate, user: User = Depends(require_helper_or_admin)):
    result = await db.rewards.update_one(
        {"reward_id": reward_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reward not found")
    return {"message": "Reward updated"}

@api_router.post("/admin/wheel-prizes", response_model=WheelPrize)
async def create_wheel_prize(data: WheelPrizeCreate, user: User = Depends(require_helper_or_admin)):
    prize = WheelPrize(**data.model_dump())
    await db.wheel_prizes.insert_one(prize.model_dump())
    return prize

@api_router.delete("/admin/wheel-prizes/{prize_id}")
async def delete_wheel_prize(prize_id: str, user: User = Depends(require_helper_or_admin)):
    result = await db.wheel_prizes.delete_one({"prize_id": prize_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prize not found")
    return {"message": "Prize deleted"}

@api_router.put("/admin/wheel-prizes/{prize_id}")
async def update_wheel_prize(prize_id: str, data: WheelPrizeCreate, user: User = Depends(require_helper_or_admin)):
    result = await db.wheel_prizes.update_one(
        {"prize_id": prize_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prize not found")
    return {"message": "Prize updated"}

@api_router.get("/admin/orders")
async def get_all_orders(user: User = Depends(require_helper_or_admin)):
    """Helper and admin can view orders"""
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/admin/orders/{order_id}")
async def get_order_details(order_id: str, user: User = Depends(require_helper_or_admin)):
    """Get detailed order info including user details"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    # Get user info
    order_user = await db.users.find_one({"user_id": order["user_id"]}, {"_id": 0, "hashed_password": 0})
    order["user_info"] = order_user
    
    return order

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, user: User = Depends(require_helper_or_admin)):
    """Update order status with tracking"""
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Неверный статус. Доступны: {', '.join(valid_statuses)}")
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    # Create status history entry
    status_entry = {
        "status": data.status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": data.note or get_status_note(data.status),
        "updated_by": user.email
    }
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if data.tracking_number:
        update_data["tracking_number"] = data.tracking_number
    
    if data.note:
        update_data["admin_note"] = data.note
    
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": update_data,
            "$push": {"status_history": status_entry}
        }
    )
    
    return {"message": f"Статус изменён на: {data.status}", "new_status": data.status}

def get_status_note(status: str) -> str:
    """Get default note for status"""
    notes = {
        "pending": "Заказ ожидает подтверждения",
        "confirmed": "Заказ подтверждён",
        "processing": "Заказ обрабатывается",
        "shipped": "Заказ отправлен",
        "delivered": "Заказ доставлен",
        "cancelled": "Заказ отменён"
    }
    return notes.get(status, "Статус обновлён")

@api_router.get("/orders/{order_id}/track")
async def track_order(order_id: str, user: User = Depends(require_user)):
    """User can track their own order"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    return {
        "order_id": order["order_id"],
        "status": order.get("status", "pending"),
        "tracking_number": order.get("tracking_number"),
        "status_history": order.get("status_history", []),
        "created_at": order.get("created_at"),
        "updated_at": order.get("updated_at"),
        "total": order.get("total", 0)
    }

@api_router.post("/orders/{order_id}/return-request")
async def request_order_return(order_id: str, user: User = Depends(require_user)):
    """User requests a return for their order within 24 hours"""
    order = await db.orders.find_one({"order_id": order_id, "user_id": user.user_id})
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.get("status") in ["returned", "return_pending", "cancelled"]:
        raise HTTPException(status_code=400, detail="Заказ уже возвращен, ожидает возврата или отменен")
    
    # Check 24 hours limit
    created_at = order.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    
    now = datetime.now(timezone.utc)
    if now - created_at > timedelta(hours=24):
        raise HTTPException(status_code=400, detail="Срок возврата (24 часа) истек")
    
    # Update order status to return_pending
    status_entry = {
        "status": "return_pending",
        "timestamp": now.isoformat(),
        "note": "Пользователь запросил возврат товара. Ожидается одобрение администратора."
    }
    
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "return_pending",
                "updated_at": now.isoformat()
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    return {
        "message": "Запрос на возврат отправлен администратору",
        "new_status": "return_pending"
    }

@api_router.post("/admin/orders/{order_id}/approve-return")
async def approve_order_return(order_id: str, user: User = Depends(require_admin)):
    """Admin approves the return and 90% is automatically refunded to user balance"""
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.get("status") != "return_pending":
        raise HTTPException(status_code=400, detail="Заказ не находится в статусе ожидания возврата")
    
    # Calculate refund (90% of actual paid amount)
    total_spent = order.get("total", 0)
    refund_amount = round(total_spent * 0.9, 2)
    order_user_id = order.get("user_id")
    
    # Update user balance
    await db.users.update_one(
        {"user_id": order_user_id},
        {"$inc": {"balance": refund_amount}}
    )
    
    # Update order status to returned
    now = datetime.now(timezone.utc)
    status_entry = {
        "status": "returned",
        "timestamp": now.isoformat(),
        "note": f"Возврат одобрен администратором ({user.email}). Возвращено 90% средств ({refund_amount}) на счет пользователя.",
        "updated_by": user.email
    }
    
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "status": "returned",
                "updated_at": now.isoformat(),
                "refund_amount": refund_amount
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    return {
        "message": "Возврат одобрен, средства возвращены пользователю",
        "new_status": "returned",
        "refund_amount": refund_amount
    }

@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, user: User = Depends(require_admin)):
    """Admin deletes an order"""
    result = await db.orders.delete_one({"order_id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    return {"message": "Заказ успешно удален"}

# ==================== BANK CARDS API ====================

@api_router.get("/bank-cards")
async def get_bank_cards():
    """Get active bank cards for topup"""
    cards = await db.bank_cards.find({"is_active": True}, {"_id": 0}).to_list(100)
    return cards

@api_router.get("/admin/bank-cards")
async def get_all_bank_cards(user: User = Depends(require_admin)):
    """Admin get all bank cards"""
    cards = await db.bank_cards.find({}, {"_id": 0}).to_list(100)
    return cards

@api_router.post("/admin/bank-cards")
async def create_bank_card(data: BankCardCreate, user: User = Depends(require_admin)):
    card = BankCard(
        card_number=data.card_number,
        card_holder=data.card_holder,
        bank_name=data.bank_name
    )
    card_dict = card.model_dump()
    card_dict["created_at"] = card_dict["created_at"].isoformat()
    await db.bank_cards.insert_one(card_dict)
    card_dict.pop("_id", None)
    return card_dict

@api_router.put("/admin/bank-cards/{card_id}/toggle")
async def toggle_bank_card(card_id: str, user: User = Depends(require_admin)):
    card = await db.bank_cards.find_one({"card_id": card_id}, {"_id": 0})
    if not card:
        raise HTTPException(status_code=404, detail="Карта не найдена")
    
    new_status = not card.get("is_active", True)
    await db.bank_cards.update_one({"card_id": card_id}, {"$set": {"is_active": new_status}})
    return {"message": "Статус изменён", "is_active": new_status}

@api_router.delete("/admin/bank-cards/{card_id}")
async def delete_bank_card(card_id: str, user: User = Depends(require_admin)):
    result = await db.bank_cards.delete_one({"card_id": card_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Карта не найдена")
    return {"message": "Карта удалена"}

# ==================== IMAGE UPLOAD API ====================

@api_router.post("/admin/upload-image")
async def upload_image(request: Request, user: User = Depends(require_helper_or_admin)):
    """Upload image as base64 - returns the base64 string"""
    try:
        body = await request.json()
        image_data = body.get("image")
        if not image_data:
            raise HTTPException(status_code=400, detail="Изображение не предоставлено")
        
        # Validate base64 format
        if not image_data.startswith("data:image/"):
            raise HTTPException(status_code=400, detail="Неверный формат изображения")
        
        # Check size (max 5MB)
        if len(image_data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Изображение слишком большое (макс 5MB)")
        
        return {"image_url": image_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== DELIVERY ROLE API ====================

@api_router.get("/delivery/orders")
async def get_available_delivery_orders(user: User = Depends(require_delivery_or_admin)):
    """Get orders that are not yet taken by any delivery person"""
    # Orders that are 'confirmed' or 'processing' and have no delivery_user_id
    query = {
        "status": {"$in": ["confirmed", "processing"]},
        "delivery_user_id": None
    }
    # If the user is a delivery person, also show orders they have already taken
    if user.role == "delivery":
        query = {
            "$or": [
                query,
                {"delivery_user_id": user.user_id}
            ]
        }
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.post("/delivery/orders/{order_id}/take")
async def take_delivery_order(order_id: str, user: User = Depends(require_delivery_or_admin)):
    """Take an order for delivery"""
    if user.role != "delivery" and not user.is_admin:
        raise HTTPException(status_code=403, detail="Only delivery staff can take orders")
    
    order = await db.orders.find_one({"order_id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    
    if order.get("delivery_user_id") and order.get("delivery_user_id") != user.user_id:
        raise HTTPException(status_code=400, detail="Заказ уже принят другим доставщиком")
    
    now = datetime.now(timezone.utc)
    status_entry = {
        "status": "processing",
        "timestamp": now.isoformat(),
        "note": f"Заказ принят доставщиком: {user.name}",
        "updated_by": user.email
    }
    
    # Use atomic update with condition to prevent race conditions
    result = await db.orders.update_one(
        {
            "order_id": order_id,
            "$or": [
                {"delivery_user_id": None},
                {"delivery_user_id": {"$exists": False}}
            ]
        },
        {
            "$set": {
                "delivery_user_id": user.user_id,
                "status": "processing",
                "updated_at": now.isoformat()
            },
            "$push": {"status_history": status_entry}
        }
    )
    
    if result.modified_count == 0:
        # Check if it was already taken by this user (idempotency)
        if order.get("delivery_user_id") == user.user_id:
            return {"message": "Вы уже приняли этот заказ", "status": order.get("status")}
        raise HTTPException(status_code=400, detail="Заказ уже принят другим доставщиком")
    
    return {"message": "Заказ принят в доставку", "status": "processing"}

# ==================== HELPER ROLE API ====================

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, user: User = Depends(require_admin)):
    """Admin can set user role: user, helper, admin"""
    if role not in ["user", "helper", "admin", "delivery"]:
        raise HTTPException(status_code=400, detail="Неверная роль. Доступны: user, helper, admin, delivery")
    
    target_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    update_data = {"role": role}
    if role == "admin":
        update_data["is_admin"] = True
    elif role in ["user", "helper", "delivery"]:
        update_data["is_admin"] = False
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    return {"message": f"Роль изменена на {role}"}

# ==================== TAGS API ====================

@api_router.get("/tags")
async def get_tags():
    tags = await db.tags.find({}, {"_id": 0}).to_list(100)
    return tags

@api_router.post("/admin/tags")
async def create_tag(data: TagCreate, user: User = Depends(require_helper_or_admin)):
    existing = await db.tags.find_one({"slug": data.slug}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Тег с таким slug уже существует")
    
    tag = Tag(name=data.name, slug=data.slug, color=data.color)
    tag_dict = tag.model_dump()
    tag_dict["created_at"] = tag_dict["created_at"].isoformat()
    await db.tags.insert_one(tag_dict)
    tag_dict.pop("_id", None)
    return tag_dict

@api_router.delete("/admin/tags/{tag_id}")
async def delete_tag(tag_id: str, user: User = Depends(require_helper_or_admin)):
    result = await db.tags.delete_one({"tag_id": tag_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Тег не найден")
    # Remove tag from all products
    await db.products.update_many({}, {"$pull": {"tags": tag_id}})
    return {"message": "Тег удалён"}

@api_router.put("/admin/products/{product_id}/tags")
async def update_product_tags(product_id: str, tags: List[str], user: User = Depends(require_helper_or_admin)):
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"tags": tags}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return {"message": "Теги обновлены", "tags": tags}

# ==================== MISSIONS API ====================

@api_router.get("/missions")
async def get_missions(user: User = Depends(require_user)):
    # Get active missions that match user level
    missions = await db.missions.find({
        "is_active": True,
        "$or": [
            {"min_level": {"$lte": user.level}},
            {"min_level": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Get user's progress on missions
    user_missions = await db.user_missions.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).to_list(100)
    user_progress = {um["mission_id"]: um for um in user_missions}
    
    # Combine data
    result = []
    for mission in missions:
        progress_data = user_progress.get(mission["mission_id"], {})
        result.append({
            **mission,
            "progress": progress_data.get("progress", 0),
            "is_completed": progress_data.get("is_completed", False),
            "is_claimed": progress_data.get("is_claimed", False)
        })
    
    return result

@api_router.post("/missions/{mission_id}/claim")
async def claim_mission_reward(mission_id: str, user: User = Depends(require_user)):
    # Check mission exists and is active
    mission = await db.missions.find_one({"mission_id": mission_id, "is_active": True}, {"_id": 0})
    if not mission:
        raise HTTPException(status_code=404, detail="Миссия не найдена")
    
    # Check user progress
    user_mission = await db.user_missions.find_one({
        "user_id": user.user_id,
        "mission_id": mission_id
    }, {"_id": 0})
    
    if not user_mission or not user_mission.get("is_completed"):
        raise HTTPException(status_code=400, detail="Миссия не выполнена")
    
    if user_mission.get("is_claimed"):
        raise HTTPException(status_code=400, detail="Награда уже получена")
    
    # Give reward
    reward_type = mission["reward_type"]
    reward_value = mission["reward_value"]
    
    update_data = {}
    if reward_type == "coins":
        update_data["balance"] = user.balance + reward_value
    elif reward_type == "xp":
        new_xp = user.xp + int(reward_value)
        new_level = calculate_level(new_xp)
        update_data["xp"] = new_xp
        update_data["level"] = new_level
    elif reward_type == "spin":
        update_data["wheel_spins_available"] = user.wheel_spins_available + int(reward_value)
    
    if update_data:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update_data})
    
    # Mark as claimed
    await db.user_missions.update_one(
        {"user_id": user.user_id, "mission_id": mission_id},
        {"$set": {"is_claimed": True}}
    )
    
    return {"message": "Награда получена!", "reward_type": reward_type, "reward_value": reward_value}

@api_router.get("/admin/missions")
async def get_all_missions(user: User = Depends(require_helper_or_admin)):
    missions = await db.missions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return missions

@api_router.post("/admin/missions")
async def create_mission(data: MissionCreate, user: User = Depends(require_helper_or_admin)):
    mission = Mission(
        title=data.title,
        description=data.description,
        mission_type=data.mission_type,
        target_value=data.target_value,
        reward_type=data.reward_type,
        reward_value=data.reward_value,
        min_level=data.min_level
    )
    if data.expires_at:
        mission.expires_at = datetime.fromisoformat(data.expires_at)
    
    mission_dict = mission.model_dump()
    mission_dict["created_at"] = mission_dict["created_at"].isoformat()
    if mission_dict.get("expires_at"):
        mission_dict["expires_at"] = mission_dict["expires_at"].isoformat()
    
    await db.missions.insert_one(mission_dict)
    mission_dict.pop("_id", None)
    return mission_dict

@api_router.delete("/admin/missions/{mission_id}")
async def delete_mission(mission_id: str, user: User = Depends(require_helper_or_admin)):
    result = await db.missions.delete_one({"mission_id": mission_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"message": "Mission deleted"}

@api_router.put("/admin/missions/{mission_id}")
async def update_mission(mission_id: str, data: MissionCreate, user: User = Depends(require_helper_or_admin)):
    mission_dict = data.model_dump()
    if mission_dict.get("expires_at"):
        try:
            mission_dict["expires_at"] = datetime.fromisoformat(mission_dict["expires_at"]).isoformat()
        except:
            pass
    
    result = await db.missions.update_one(
        {"mission_id": mission_id},
        {"$set": mission_dict}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mission not found")
    return {"message": "Mission updated"}
@api_router.put("/admin/missions/{mission_id}/toggle")
async def toggle_mission(mission_id: str, user: User = Depends(require_helper_or_admin)):
    mission = await db.missions.find_one({"mission_id": mission_id}, {"_id": 0})
    if not mission:
        raise HTTPException(status_code=404, detail="Миссия не найдена")
    
    new_status = not mission.get("is_active", True)
    await db.missions.update_one({"mission_id": mission_id}, {"$set": {"is_active": new_status}})
    return {"message": "Статус изменён", "is_active": new_status}

# Helper to update mission progress
async def update_mission_progress(user_id: str, mission_type: str, value: float):
    """Update user's mission progress based on action type"""
    # Get user to check level
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        return

    missions = await db.missions.find({
        "is_active": True,
        "mission_type": mission_type,
        "$or": [
            {"min_level": {"$lte": user.get("level", 1)}},
            {"min_level": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(100)
    
    for mission in missions:
        # Get or create user mission progress
        user_mission = await db.user_missions.find_one({
            "user_id": user_id,
            "mission_id": mission["mission_id"]
        }, {"_id": 0})
        
        if user_mission and user_mission.get("is_completed"):
            continue  # Already completed
        
        # Update progress
        current_progress = user_mission.get("progress", 0) if user_mission else 0
        new_progress = current_progress + value
        is_completed = new_progress >= mission["target_value"]
        
        await db.user_missions.update_one(
            {"user_id": user_id, "mission_id": mission["mission_id"]},
            {"$set": {
                "user_id": user_id,
                "mission_id": mission["mission_id"],
                "progress": new_progress,
                "is_completed": is_completed,
                "completed_at": datetime.now(timezone.utc).isoformat() if is_completed else None
            }},
            upsert=True
        )

# ==================== SUPPORT API ====================

@api_router.post("/support/ticket")
async def create_support_ticket(data: SupportTicketCreate, request: Request):
    # Try to get user if authenticated
    user_id = None
    try:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("user_id")
    except:
        pass
    
    ticket = SupportTicket(
        user_id=user_id,
        name=data.name,
        email=data.email,
        subject=data.subject,
        message=data.message
    )
    ticket_dict = ticket.model_dump()
    ticket_dict["created_at"] = ticket_dict["created_at"].isoformat()
    await db.support_tickets.insert_one(ticket_dict)
    ticket_dict.pop("_id", None)
    return {"message": "Заявка отправлена! Мы ответим в ближайшее время.", "ticket_id": ticket_dict["ticket_id"]}

@api_router.get("/support/tickets")
async def get_user_tickets(user: User = Depends(require_user)):
    tickets = await db.support_tickets.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return tickets

@api_router.get("/admin/support/tickets")
async def get_all_tickets(user: User = Depends(require_helper_or_admin)):
    tickets = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tickets

@api_router.put("/admin/support/tickets/{ticket_id}")
async def respond_to_ticket(ticket_id: str, response: str, status: str = "resolved", user: User = Depends(require_helper_or_admin)):
    result = await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"admin_response": response, "status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"message": "Ответ отправлен"}

# ==================== SEED DATA ====================

@api_router.post("/migrate-translations")
async def migrate_translations(user: User = Depends(require_admin)):
    """Add translations to existing products and categories"""
    
    # Translation mappings for products
    product_translations = {
        "Dragon Gaming Headset": {"ru": "Игровые наушники Дракон", "tj": "Гӯшмонакҳои бозии Аждаҳо", "desc_ru": "Премиум RGB наушники с объёмным звуком", "desc_tj": "Гӯшмонакҳои RGB бо овози ҳаҷмнок"},
        "Neon Gaming Mouse": {"ru": "Неоновая игровая мышь", "tj": "Муши бозии неонӣ", "desc_ru": "Игровая мышь с высоким DPI и настраиваемой подсветкой", "desc_tj": "Муши бозӣ бо DPI баланд ва равшании танзимшаванда"},
        "TSMarket Hoodie": {"ru": "Худи TSMarket", "tj": "Худи TSMarket", "desc_ru": "Премиум худи для геймеров с логотипом дракона", "desc_tj": "Худи барои бозингарон бо логои аждаҳо"},
        "Gaming T-Shirt": {"ru": "Игровая футболка", "tj": "Футболкаи бозӣ", "desc_ru": "Удобная хлопковая футболка для геймеров", "desc_tj": "Футболкаи пахтагии роҳат барои бозингарон"},
        "RGB Keyboard": {"ru": "RGB Клавиатура", "tj": "Клавиатураи RGB", "desc_ru": "Механическая игровая клавиатура с переключателями Cherry MX", "desc_tj": "Клавиатураи механикии бозӣ бо калидҳои Cherry MX"},
        "Gaming Mousepad XL": {"ru": "Игровой коврик XL", "tj": "Фарши муш XL", "desc_ru": "Расширенный RGB коврик для полного покрытия стола", "desc_tj": "Фарши RGB васеъ барои пӯшиши пурраи мизи кор"},
        "Dragon Figurine": {"ru": "Фигурка дракона", "tj": "Ҳайкали аждаҳо", "desc_ru": "Коллекционный дракон TSMarket ограниченной серии", "desc_tj": "Коллексияи маҳдуди аждаҳои TSMarket"},
        "Gaming Cap": {"ru": "Игровая кепка", "tj": "Кулоҳи бозӣ", "desc_ru": "Кепка с вышитым драконом", "desc_tj": "Кулоҳ бо аждаҳои дӯзишуда"},
    }
    
    # Category translations
    category_translations = {
        "Gaming": {"ru": "Игровое", "tj": "Бозиҳо", "desc_ru": "Игровая периферия и аксессуары", "desc_tj": "Таҷҳизоти бозӣ ва аксессуарҳо"},
        "Clothing": {"ru": "Одежда", "tj": "Либос", "desc_ru": "Стильная одежда для геймеров", "desc_tj": "Либоси зебо барои бозингарон"},
        "Accessories": {"ru": "Аксессуары", "tj": "Аксессуарҳо", "desc_ru": "Технические аксессуары", "desc_tj": "Аксессуарҳои техникӣ"},
        "Collectibles": {"ru": "Коллекционное", "tj": "Коллексияҳо", "desc_ru": "Лимитированные товары", "desc_tj": "Молҳои маҳдуд"},
    }
    
    # Update products
    products_updated = 0
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    for product in products:
        if product.get("name") in product_translations:
            trans = product_translations[product["name"]]
            await db.products.update_one(
                {"product_id": product["product_id"]},
                {"$set": {
                    "name_ru": trans["ru"],
                    "name_tj": trans["tj"],
                    "description_ru": trans["desc_ru"],
                    "description_tj": trans["desc_tj"]
                }}
            )
            products_updated += 1
    
    # Update categories
    categories_updated = 0
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    for category in categories:
        if category.get("name") in category_translations:
            trans = category_translations[category["name"]]
            await db.categories.update_one(
                {"category_id": category["category_id"]},
                {"$set": {
                    "name_ru": trans["ru"],
                    "name_tj": trans["tj"],
                    "description_ru": trans["desc_ru"],
                    "description_tj": trans["desc_tj"]
                }}
            )
            categories_updated += 1
    
    return {
        "message": "Миграция завершена",
        "products_updated": products_updated,
        "categories_updated": categories_updated
    }

@api_router.post("/migrate-subcategories")
async def migrate_subcategories(user: User = Depends(require_admin)):
    """Add subcategories to existing categories"""
    
    # Update existing categories to be parent categories
    await db.categories.update_many(
        {"category_id": {"$in": ["cat_gaming", "cat_clothing", "cat_accessories"]}},
        {"$set": {"is_parent": True, "parent_id": None}}
    )
    await db.categories.update_many(
        {"category_id": "cat_collectibles"},
        {"$set": {"is_parent": True, "parent_id": None}}
    )
    
    # Subcategories to add
    subcategories = [
        # Gaming subcategories
        {"category_id": "cat_headsets", "name": "Headsets", "name_ru": "Наушники", "name_tj": "Гӯшмонакҳо", "slug": "headsets", "description": "Gaming headsets", "description_ru": "Игровые наушники", "description_tj": "Гӯшмонакҳои бозӣ", "is_parent": False, "parent_id": "cat_gaming"},
        {"category_id": "cat_mice", "name": "Mice", "name_ru": "Мыши", "name_tj": "Мушҳо", "slug": "mice", "description": "Gaming mice", "description_ru": "Игровые мыши", "description_tj": "Мушҳои бозӣ", "is_parent": False, "parent_id": "cat_gaming"},
        {"category_id": "cat_keyboards", "name": "Keyboards", "name_ru": "Клавиатуры", "name_tj": "Клавиатураҳо", "slug": "keyboards", "description": "Gaming keyboards", "description_ru": "Игровые клавиатуры", "description_tj": "Клавиатураҳои бозӣ", "is_parent": False, "parent_id": "cat_gaming"},
        
        # Clothing subcategories
        {"category_id": "cat_hoodies", "name": "Hoodies", "name_ru": "Худи", "name_tj": "Худиҳо", "slug": "hoodies", "description": "Gaming hoodies", "description_ru": "Игровые худи", "description_tj": "Худиҳои бозӣ", "is_parent": False, "parent_id": "cat_clothing"},
        {"category_id": "cat_tshirts", "name": "T-Shirts", "name_ru": "Футболки", "name_tj": "Футболкаҳо", "slug": "tshirts", "description": "Gaming t-shirts", "description_ru": "Игровые футболки", "description_tj": "Футболкаҳои бозӣ", "is_parent": False, "parent_id": "cat_clothing"},
        {"category_id": "cat_caps", "name": "Caps", "name_ru": "Кепки", "name_tj": "Кулоҳҳо", "slug": "caps", "description": "Gaming caps", "description_ru": "Игровые кепки", "description_tj": "Кулоҳҳои бозӣ", "is_parent": False, "parent_id": "cat_clothing"},
        
        # Accessories subcategories
        {"category_id": "cat_mousepads", "name": "Mousepads", "name_ru": "Коврики", "name_tj": "Фаршҳо", "slug": "mousepads", "description": "Gaming mousepads", "description_ru": "Игровые коврики", "description_tj": "Фаршҳои бозӣ", "is_parent": False, "parent_id": "cat_accessories"},
    ]
    
    added = 0
    for subcat in subcategories:
        existing = await db.categories.find_one({"category_id": subcat["category_id"]})
        if not existing:
            await db.categories.insert_one(subcat)
            added += 1
    
    return {
        "message": "Подкатегории добавлены",
        "subcategories_added": added
    }

@api_router.post("/seed")
async def seed_database():
    """Seed database with demo data"""
    
    # Check if already seeded
    existing = await db.categories.find_one({})
    if existing:
        return {"message": "Database already seeded"}
    
    # Categories with multilingual support and subcategories
    categories = [
        # Parent categories
        {"category_id": "cat_gaming", "name": "Gaming", "name_ru": "Игровое", "name_tj": "Бозиҳо", "slug": "gaming", "description": "Gaming peripherals and accessories", "description_ru": "Игровая периферия и аксессуары", "description_tj": "Таҷҳизоти бозӣ ва аксессуарҳо", "is_parent": True, "parent_id": None},
        {"category_id": "cat_clothing", "name": "Clothing", "name_ru": "Одежда", "name_tj": "Либос", "slug": "clothing", "description": "Stylish gaming apparel", "description_ru": "Стильная одежда для геймеров", "description_tj": "Либоси зебо барои бозингарон", "is_parent": True, "parent_id": None},
        {"category_id": "cat_accessories", "name": "Accessories", "name_ru": "Аксессуары", "name_tj": "Аксессуарҳо", "slug": "accessories", "description": "Tech accessories", "description_ru": "Технические аксессуары", "description_tj": "Аксессуарҳои техникӣ", "is_parent": True, "parent_id": None},
        {"category_id": "cat_collectibles", "name": "Collectibles", "name_ru": "Коллекционное", "name_tj": "Коллексияҳо", "slug": "collectibles", "description": "Limited edition items", "description_ru": "Лимитированные товары", "description_tj": "Молҳои маҳдуд", "is_parent": True, "parent_id": None},
        
        # Subcategories for Gaming
        {"category_id": "cat_headsets", "name": "Headsets", "name_ru": "Наушники", "name_tj": "Гӯшмонакҳо", "slug": "headsets", "description": "Gaming headsets", "description_ru": "Игровые наушники", "description_tj": "Гӯшмонакҳои бозӣ", "is_parent": False, "parent_id": "cat_gaming"},
        {"category_id": "cat_mice", "name": "Mice", "name_ru": "Мыши", "name_tj": "Мушҳо", "slug": "mice", "description": "Gaming mice", "description_ru": "Игровые мыши", "description_tj": "Мушҳои бозӣ", "is_parent": False, "parent_id": "cat_gaming"},
        {"category_id": "cat_keyboards", "name": "Keyboards", "name_ru": "Клавиатуры", "name_tj": "Клавиатураҳо", "slug": "keyboards", "description": "Gaming keyboards", "description_ru": "Игровые клавиатуры", "description_tj": "Клавиатураҳои бозӣ", "is_parent": False, "parent_id": "cat_gaming"},
        
        # Subcategories for Clothing
        {"category_id": "cat_hoodies", "name": "Hoodies", "name_ru": "Худи", "name_tj": "Худиҳо", "slug": "hoodies", "description": "Gaming hoodies", "description_ru": "Игровые худи", "description_tj": "Худиҳои бозӣ", "is_parent": False, "parent_id": "cat_clothing"},
        {"category_id": "cat_tshirts", "name": "T-Shirts", "name_ru": "Футболки", "name_tj": "Футболкаҳо", "slug": "tshirts", "description": "Gaming t-shirts", "description_ru": "Игровые футболки", "description_tj": "Футболкаҳои бозӣ", "is_parent": False, "parent_id": "cat_clothing"},
        {"category_id": "cat_caps", "name": "Caps", "name_ru": "Кепки", "name_tj": "Кулоҳҳо", "slug": "caps", "description": "Gaming caps", "description_ru": "Игровые кепки", "description_tj": "Кулоҳҳои бозӣ", "is_parent": False, "parent_id": "cat_clothing"},
    ]
    await db.categories.insert_many(categories)
    
    # Products with multilingual support
    products = [
        {
            "product_id": "prod_001", "name": "Dragon Gaming Headset", "name_ru": "Игровые наушники Дракон", "name_tj": "Гӯшмонакҳои бозии Аждаҳо",
            "description": "Premium RGB gaming headset with surround sound", "description_ru": "Премиум RGB наушники с объёмным звуком", "description_tj": "Гӯшмонакҳои RGB бо овози ҳаҷмнок",
            "price": 1500, "xp_reward": 150, "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500",
            "sizes": [], "stock": 50, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_002", "name": "Neon Gaming Mouse", "name_ru": "Неоновая игровая мышь", "name_tj": "Муши бозии неонӣ",
            "description": "High DPI gaming mouse with customizable lighting", "description_ru": "Игровая мышь с высоким DPI и настраиваемой подсветкой", "description_tj": "Муши бозӣ бо DPI баланд ва равшании танзимшаванда",
            "price": 800, "xp_reward": 80, "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500",
            "sizes": [], "stock": 100, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_003", "name": "TSMarket Hoodie", "name_ru": "Худи TSMarket", "name_tj": "Худи TSMarket",
            "description": "Premium gaming hoodie with dragon logo", "description_ru": "Премиум худи для геймеров с логотипом дракона", "description_tj": "Худи барои бозингарон бо логои аждаҳо",
            "price": 2000, "xp_reward": 200, "category_id": "cat_clothing",
            "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
            "sizes": ["S", "M", "L", "XL", "XXL"], "stock": 30, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_004", "name": "Gaming T-Shirt", "name_ru": "Игровая футболка", "name_tj": "Футболкаи бозӣ",
            "description": "Comfortable cotton t-shirt for gamers", "description_ru": "Удобная хлопковая футболка для геймеров", "description_tj": "Футболкаи пахтагии роҳат барои бозингарон",
            "price": 1000, "xp_reward": 100, "category_id": "cat_clothing",
            "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
            "sizes": ["S", "M", "L", "XL"], "stock": 75, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_005", "name": "RGB Keyboard", "name_ru": "RGB Клавиатура", "name_tj": "Клавиатураи RGB",
            "description": "Mechanical gaming keyboard with Cherry MX switches", "description_ru": "Механическая игровая клавиатура с переключателями Cherry MX", "description_tj": "Клавиатураи механикии бозӣ бо калидҳои Cherry MX",
            "price": 2500, "xp_reward": 250, "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=500",
            "sizes": [], "stock": 40, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_006", "name": "Gaming Mousepad XL", "name_ru": "Игровой коврик XL", "name_tj": "Фарши муш XL",
            "description": "Extended RGB mousepad for full desk coverage", "description_ru": "Расширенный RGB коврик для полного покрытия стола", "description_tj": "Фарши RGB васеъ барои пӯшиши пурраи мизи кор",
            "price": 600, "xp_reward": 60, "category_id": "cat_accessories",
            "image_url": "https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=500",
            "sizes": [], "stock": 200, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_007", "name": "Dragon Figurine", "name_ru": "Фигурка дракона", "name_tj": "Ҳайкали аждаҳо",
            "description": "Limited edition TSMarket dragon collectible", "description_ru": "Коллекционный дракон TSMarket ограниченной серии", "description_tj": "Коллексияи маҳдуди аждаҳои TSMarket",
            "price": 5000, "xp_reward": 500, "category_id": "cat_collectibles",
            "image_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500",
            "sizes": [], "stock": 10, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "product_id": "prod_008", "name": "Gaming Cap", "name_ru": "Игровая кепка", "name_tj": "Кулоҳи бозӣ",
            "description": "Snapback cap with embroidered dragon", "description_ru": "Кепка с вышитым драконом", "description_tj": "Кулоҳ бо аждаҳои дӯзишуда",
            "price": 700, "xp_reward": 70, "category_id": "cat_clothing",
            "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
            "sizes": ["One Size"], "stock": 60, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()
        },
    ]
    await db.products.insert_many(products)
    
    # Rewards
    rewards = [
        {"reward_id": "rew_001", "level_required": 2, "name": "Welcome Bonus", "description": "50 coins for reaching level 2", "reward_type": "coins", "value": 50, "is_exclusive": False},
        {"reward_id": "rew_002", "level_required": 5, "name": "Rising Star", "description": "100 coins for reaching level 5", "reward_type": "coins", "value": 100, "is_exclusive": False},
        {"reward_id": "rew_003", "level_required": 10, "name": "Dragon's Blessing", "description": "500 coins exclusive reward!", "reward_type": "coins", "value": 500, "is_exclusive": True},
        {"reward_id": "rew_004", "level_required": 15, "name": "XP Boost", "description": "200 bonus XP", "reward_type": "xp_boost", "value": 200, "is_exclusive": False},
        {"reward_id": "rew_005", "level_required": 20, "name": "Dragon Master", "description": "1000 coins exclusive reward!", "reward_type": "coins", "value": 1000, "is_exclusive": True},
    ]
    await db.rewards.insert_many(rewards)
    
    # Wheel Prizes
    wheel_prizes = [
        {"prize_id": "prize_001", "name": "10 Coins", "prize_type": "coins", "value": 10, "probability": 0.3, "color": "#0D9488"},
        {"prize_id": "prize_002", "name": "25 Coins", "prize_type": "coins", "value": 25, "probability": 0.25, "color": "#14B8A6"},
        {"prize_id": "prize_003", "name": "50 Coins", "prize_type": "coins", "value": 50, "probability": 0.2, "color": "#F0ABFC"},
        {"prize_id": "prize_004", "name": "100 Coins", "prize_type": "coins", "value": 100, "probability": 0.1, "color": "#FFD700"},
        {"prize_id": "prize_005", "name": "50 XP", "prize_type": "xp", "value": 50, "probability": 0.1, "color": "#FF4D4D"},
        {"prize_id": "prize_006", "name": "200 Coins JACKPOT!", "prize_type": "coins", "value": 200, "probability": 0.05, "color": "#FFD700"},
    ]
    await db.wheel_prizes.insert_many(wheel_prizes)

    # Themes
    themes = [
        {
            "theme_id": "default",
            "name": "Обычный",
            "icon": "🛒",
            "hero_image": "https://images.unsplash.com/photo-1636036769389-343bb250f013?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBzZXR1cCUyMHBlcmlwaGVyYWxzJTIwaGVhZHBob25lcyUyMGtleWJvYXJkJTIwbW91c2UlMjBuZW9uJTIwbGlnaHR8ZW58MHx8fHwxNzY3MjM5NjczfDA&ixlib=rb-4.1.0&q=85",
            "gradient": "tsmarket-gradient",
            "title_color": "text-teal-500",
            "tagline": "🛒 Обычный стиль",
            "is_system": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "theme_id": "new_year",
            "name": "Новый Год",
            "icon": "🎄",
            "hero_image": "https://images.unsplash.com/photo-1543589077-47d81606c1bf?q=80&w=2070&auto=format&fit=crop",
            "gradient": "bg-gradient-to-br from-blue-900 via-slate-900 to-blue-800 text-white",
            "title_color": "text-blue-400",
            "tagline": "🎄 С Новым Годом!",
            "is_system": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "theme_id": "valentine",
            "name": "14 Февраля",
            "icon": "❤️",
            "hero_image": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=2070&auto=format&fit=crop",
            "gradient": "bg-gradient-to-br from-rose-100 via-pink-50 to-rose-200",
            "title_color": "text-rose-500",
            "tagline": "❤️ С Днем Влюбленных!",
            "is_system": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "theme_id": "men_day",
            "name": "23 Февраля",
            "icon": "🎖️",
            "hero_image": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=2070&auto=format&fit=crop",
            "gradient": "bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-800 text-white",
            "title_color": "text-emerald-500",
            "tagline": "🎖️ С 23 Февраля!",
            "is_system": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.themes.insert_many(themes)
    
    # Demo top-up codes
    topup_codes = [
        {"code_id": "code_001", "code": "WELCOME100", "amount": 100, "is_used": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"code_id": "code_002", "code": "DRAGON500", "amount": 500, "is_used": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"code_id": "code_003", "code": "GAMING1000", "amount": 1000, "is_used": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    await db.topup_codes.insert_many(topup_codes)
    
    # Create admin user
    admin_user = {
        "user_id": "user_admin001",
        "email": "turakhonzodasurush@gmail.com",
        "name": "Admin",
        "password_hash": hash_password("Manah001"),
        "picture": None,
        "balance": 10000.0,
        "xp": 5000,
        "level": 15,
        "is_admin": True,
        "wheel_spins_available": 5,
        "claimed_rewards": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    
    return {"message": "Database seeded successfully"}

# Include router
app.include_router(api_router)


# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ==================== THEMES API ====================

@api_router.get("/themes")
async def get_themes():
    """Get all available themes"""
    themes = await db.themes.find({}, {"_id": 0}).to_list(100)
    return themes

@api_router.post("/admin/themes")
async def create_theme(data: ShopThemeCreate, user: User = Depends(require_admin)):
    """Admin creates a new theme"""
    theme = ShopTheme(
        name=data.name,
        icon=data.icon,
        hero_image=data.hero_image,
        gradient=data.gradient,
        title_color=data.title_color,
        tagline=data.tagline,
        is_system=False
    )
    theme_dict = theme.model_dump()
    theme_dict["created_at"] = theme_dict["created_at"].isoformat()
    await db.themes.insert_one(theme_dict)
    theme_dict.pop("_id", None)
    return theme_dict

@api_router.delete("/admin/themes/{theme_id}")
async def delete_theme(theme_id: str, user: User = Depends(require_admin)):
    """Admin deletes a theme"""
    theme = await db.themes.find_one({"theme_id": theme_id})
    if not theme:
        raise HTTPException(status_code=404, detail="Тема не найдена")
    
    if theme.get("is_system"):
        raise HTTPException(status_code=400, detail="Системные темы нельзя удалять")
        
    await db.themes.delete_one({"theme_id": theme_id})
    return {"message": "Тема удалена"}

# Add the router to the app if not already added
# (It's already added in the original code as api_router)
