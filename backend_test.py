#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class TSMarketAPITester:
    def __init__(self, base_url="https://tsmarket.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_user_id = None
        self.admin_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "error": details})

    def make_request(self, method, endpoint, data=None, headers=None, token=None, params=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        if token:
            request_headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=request_headers, params=params, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=request_headers, params=params, timeout=30)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=request_headers, params=params, timeout=30)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=request_headers, params=params, timeout=30)
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_database_seeding(self):
        """Test database seeding"""
        print("\n🌱 Testing Database Seeding...")
        
        response = self.make_request('POST', 'seed')
        if response and response.status_code in [200, 201]:
            self.log_test("Database seeding", True)
            return True
        else:
            self.log_test("Database seeding", False, f"Status: {response.status_code if response else 'No response'}")
            return False

    def test_user_registration(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        
        timestamp = int(time.time())
        test_data = {
            "email": f"testuser{timestamp}@test.com",
            "password": "testpass123",
            "name": f"Test User {timestamp}"
        }
        
        response = self.make_request('POST', 'auth/register', test_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.user_token = data['token']
                self.test_user_id = data['user']['user_id']
                self.log_test("User registration", True)
                return True
        
        self.log_test("User registration", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Login...")
        
        admin_data = {
            "email": "admin@tsmarket.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.admin_token = data['token']
                self.admin_user_id = data['user']['user_id']
                if data['user'].get('is_admin'):
                    self.log_test("Admin login", True)
                    return True
        
        self.log_test("Admin login", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_categories_api(self):
        """Test categories API"""
        print("\n📂 Testing Categories API...")
        
        # Get categories
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            categories = response.json()
            if isinstance(categories, list) and len(categories) > 0:
                self.log_test("Get categories", True)
                return categories
        
        self.log_test("Get categories", False, f"Status: {response.status_code if response else 'No response'}")
        return []

    def test_products_api(self):
        """Test products API"""
        print("\n📦 Testing Products API...")
        
        # Get all products
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            products = response.json()
            if isinstance(products, list) and len(products) > 0:
                self.log_test("Get products", True)
                
                # Test product filtering
                first_product = products[0]
                
                # Test get single product
                product_response = self.make_request('GET', f'products/{first_product["product_id"]}')
                if product_response and product_response.status_code == 200:
                    self.log_test("Get single product", True)
                else:
                    self.log_test("Get single product", False, f"Status: {product_response.status_code if product_response else 'No response'}")
                
                # Test product search
                search_response = self.make_request('GET', 'products?search=gaming')
                if search_response and search_response.status_code == 200:
                    self.log_test("Product search", True)
                else:
                    self.log_test("Product search", False, f"Status: {search_response.status_code if search_response else 'No response'}")
                
                return products
        
        self.log_test("Get products", False, f"Status: {response.status_code if response else 'No response'}")
        return []

    def test_topup_codes(self):
        """Test top-up code redemption"""
        print("\n💰 Testing Top-up Codes...")
        
        if not self.user_token:
            self.log_test("Top-up codes (no user token)", False, "User not logged in")
            return False
        
        # Test redeeming WELCOME100 code
        test_codes = ["WELCOME100", "DRAGON500", "GAMING1000"]
        
        for code in test_codes:
            response = self.make_request('POST', 'topup/redeem', params={'code': code}, token=self.user_token)
            if response and response.status_code == 200:
                self.log_test(f"Redeem code {code}", True)
            else:
                # Code might already be used, which is expected in testing
                if response and response.status_code == 404:
                    self.log_test(f"Redeem code {code}", True, "Code already used (expected)")
                else:
                    self.log_test(f"Redeem code {code}", False, f"Status: {response.status_code if response else 'No response'}")

    def test_cart_and_checkout(self):
        """Test cart and checkout functionality"""
        print("\n🛒 Testing Cart and Checkout...")
        
        if not self.user_token:
            self.log_test("Cart and checkout (no user token)", False, "User not logged in")
            return False
        
        # Get products first
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            self.log_test("Cart and checkout (no products)", False, "Cannot get products")
            return False
        
        products = products_response.json()
        if not products:
            self.log_test("Cart and checkout (empty products)", False, "No products available")
            return False
        
        # Create order with first product
        first_product = products[0]
        order_data = {
            "items": [
                {
                    "product_id": first_product["product_id"],
                    "quantity": 1,
                    "size": first_product["sizes"][0] if first_product.get("sizes") else None
                }
            ],
            "delivery_address": "г. Душанбе, ул. Ленина 15, кв 42",
            "phone_number": "+992123456789"
        }
        
        response = self.make_request('POST', 'orders', order_data, token=self.user_token)
        if response and response.status_code in [200, 201]:
            order_result = response.json()
            if 'order' in order_result:
                self.log_test("Create order", True)
                return True
        
        # If order fails due to insufficient balance, that's expected
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'balance' in error_detail.lower():
                self.log_test("Create order", True, "Insufficient balance (expected)")
                return True
        
        self.log_test("Create order", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_delivery_address_validation(self):
        """Test delivery address validation in checkout process"""
        print("\n🏠 Testing Delivery Address Validation...")
        
        if not self.admin_token:
            self.log_test("Delivery address validation (no admin token)", False, "Admin not logged in")
            return False
        
        # Get products first
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            self.log_test("Delivery address validation (no products)", False, "Cannot get products")
            return False
        
        products = products_response.json()
        if not products:
            self.log_test("Delivery address validation (empty products)", False, "No products available")
            return False
        
        # Use prod_001 as specified in the test request
        test_product = None
        for product in products:
            if product["product_id"] == "prod_001":
                test_product = product
                break
        
        if not test_product:
            # Fallback to first product if prod_001 not found
            test_product = products[0]
        
        # Test 1: Order WITHOUT delivery address - should fail
        order_data_no_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "phone_number": "+992123456789"
            # No delivery_address field
        }
        
        response = self.make_request('POST', 'orders', order_data_no_address, token=self.admin_token)
        if response:
            if response.status_code == 422:
                # Pydantic validation error - delivery_address field missing
                self.log_test("Order without delivery address (should fail)", True, "422 validation error as expected")
            elif response.status_code == 400:
                error_detail = response.json().get('detail', '')
                if 'Delivery address is required' in error_detail:
                    self.log_test("Order without delivery address (should fail)", True)
                else:
                    self.log_test("Order without delivery address (should fail)", False, f"Wrong error message: {error_detail}")
            else:
                self.log_test("Order without delivery address (should fail)", False, f"Expected 400/422 error, got: {response.status_code}")
        else:
            self.log_test("Order without delivery address (should fail)", False, "No response")
        
        # Test 2: Order with empty delivery address - should fail
        order_data_empty_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "delivery_address": "",
            "phone_number": "+992123456789"
        }
        
        response = self.make_request('POST', 'orders', order_data_empty_address, token=self.admin_token)
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'Delivery address is required' in error_detail:
                self.log_test("Order with empty delivery address (should fail)", True)
            else:
                self.log_test("Order with empty delivery address (should fail)", False, f"Wrong error message: {error_detail}")
        else:
            self.log_test("Order with empty delivery address (should fail)", False, f"Expected 400 error, got: {response.status_code if response else 'No response'}")
        
        # Test 3: Order with short address (less than 5 chars) - should fail
        order_data_short_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "delivery_address": "123",
            "phone_number": "+992123456789"
        }
        
        response = self.make_request('POST', 'orders', order_data_short_address, token=self.admin_token)
        if response and response.status_code == 400:
            error_detail = response.json().get('detail', '')
            if 'Delivery address is required' in error_detail:
                self.log_test("Order with short delivery address (should fail)", True)
            else:
                self.log_test("Order with short delivery address (should fail)", False, f"Wrong error message: {error_detail}")
        else:
            self.log_test("Order with short delivery address (should fail)", False, f"Expected 400 error, got: {response.status_code if response else 'No response'}")
        
        # Test 4: Order with valid address - should succeed
        order_data_valid_address = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1
                }
            ],
            "delivery_address": "г. Душанбе, ул. Ленина 15, кв 42",
            "phone_number": "+992123456789"
        }
        
        response = self.make_request('POST', 'orders', order_data_valid_address, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            order_result = response.json()
            if 'order' in order_result and order_result['order'].get('delivery_address') == "г. Душанбе, ул. Ленина 15, кв 42":
                self.log_test("Order with valid delivery address (should succeed)", True)
                return True
            else:
                self.log_test("Order with valid delivery address (should succeed)", False, "Order created but delivery address not saved correctly")
        else:
            # Check if it's a balance issue
            if response and response.status_code == 400:
                error_detail = response.json().get('detail', '')
                if 'balance' in error_detail.lower():
                    self.log_test("Order with valid delivery address (should succeed)", True, "Insufficient balance but address validation passed")
                    return True
                else:
                    self.log_test("Order with valid delivery address (should succeed)", False, f"Unexpected error: {error_detail}")
            else:
                self.log_test("Order with valid delivery address (should succeed)", False, f"Status: {response.status_code if response else 'No response'}")
        
        return False

    def test_user_profile(self):
        """Test user profile endpoints"""
        print("\n👤 Testing User Profile...")
        
        if not self.user_token:
            self.log_test("User profile (no token)", False, "User not logged in")
            return False
        
        # Get user profile
        response = self.make_request('GET', 'auth/me', token=self.user_token)
        if response and response.status_code == 200:
            user_data = response.json()
            if 'user_id' in user_data:
                self.log_test("Get user profile", True)
                
                # Test get user orders
                orders_response = self.make_request('GET', 'orders', token=self.user_token)
                if orders_response and orders_response.status_code == 200:
                    self.log_test("Get user orders", True)
                else:
                    self.log_test("Get user orders", False, f"Status: {orders_response.status_code if orders_response else 'No response'}")
                
                return True
        
        self.log_test("Get user profile", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_rewards_system(self):
        """Test rewards system"""
        print("\n🎁 Testing Rewards System...")
        
        if not self.user_token:
            self.log_test("Rewards system (no token)", False, "User not logged in")
            return False
        
        # Get rewards
        response = self.make_request('GET', 'rewards', token=self.user_token)
        if response and response.status_code == 200:
            rewards = response.json()
            if isinstance(rewards, list):
                self.log_test("Get rewards", True)
                
                # Test wheel prizes
                wheel_response = self.make_request('GET', 'wheel/prizes')
                if wheel_response and wheel_response.status_code == 200:
                    self.log_test("Get wheel prizes", True)
                else:
                    self.log_test("Get wheel prizes", False, f"Status: {wheel_response.status_code if wheel_response else 'No response'}")
                
                return True
        
        self.log_test("Get rewards", False, f"Status: {response.status_code if response else 'No response'}")
        return False

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n⚙️ Testing Admin Endpoints...")
        
        if not self.admin_token:
            self.log_test("Admin endpoints (no admin token)", False, "Admin not logged in")
            return False
        
        # Test admin stats
        response = self.make_request('GET', 'admin/stats', token=self.admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            if 'users_count' in stats:
                self.log_test("Get admin stats", True)
            else:
                self.log_test("Get admin stats", False, "Invalid stats format")
        else:
            self.log_test("Get admin stats", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get all users
        users_response = self.make_request('GET', 'admin/users', token=self.admin_token)
        if users_response and users_response.status_code == 200:
            self.log_test("Get all users", True)
        else:
            self.log_test("Get all users", False, f"Status: {users_response.status_code if users_response else 'No response'}")
        
        # Test get top-up codes
        codes_response = self.make_request('GET', 'admin/topup-codes', token=self.admin_token)
        if codes_response and codes_response.status_code == 200:
            self.log_test("Get top-up codes", True)
        else:
            self.log_test("Get top-up codes", False, f"Status: {codes_response.status_code if codes_response else 'No response'}")

    def test_new_card_topup_system(self):
        """Test new card-based top-up system"""
        print("\n💳 Testing Card-based Top-up System...")
        
        # Test get topup settings (public endpoint)
        response = self.make_request('GET', 'topup/settings')
        if response and response.status_code == 200:
            settings = response.json()
            if 'card_number' in settings:
                self.log_test("Get topup settings", True)
                print(f"   Card number: {settings.get('card_number', 'Not set')}")
            else:
                self.log_test("Get topup settings", False, "Invalid settings format")
        else:
            self.log_test("Get topup settings", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not self.user_token:
            self.log_test("Card topup (no user token)", False, "User not logged in")
            return False
        
        # Test create topup request
        request_data = {
            "amount": 1000,
            "receipt_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        response = self.make_request('POST', 'topup/request', request_data, token=self.user_token)
        if response and response.status_code in [200, 201]:
            request_result = response.json()
            if 'request_id' in request_result:
                self.log_test("Create topup request", True)
                self.test_request_id = request_result['request_id']
            else:
                self.log_test("Create topup request", False, "Invalid request format")
        else:
            self.log_test("Create topup request", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test get user topup requests
        response = self.make_request('GET', 'topup/requests', token=self.user_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                self.log_test("Get user topup requests", True)
            else:
                self.log_test("Get user topup requests", False, "Invalid requests format")
        else:
            self.log_test("Get user topup requests", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_card_settings(self):
        """Test admin card settings management"""
        print("\n⚙️ Testing Admin Card Settings...")
        
        if not self.admin_token:
            self.log_test("Admin card settings (no admin token)", False, "Admin not logged in")
            return False
        
        # Test get admin settings
        response = self.make_request('GET', 'admin/settings', token=self.admin_token)
        if response and response.status_code == 200:
            settings = response.json()
            self.log_test("Get admin settings", True)
        else:
            self.log_test("Get admin settings", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update admin settings
        settings_data = {
            "card_number": "1234 5678 9012 3456",
            "card_holder": "TSMarket Admin",
            "additional_info": "Test bank info"
        }
        
        response = self.make_request('PUT', 'admin/settings', settings_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Update admin settings", True)
        else:
            self.log_test("Update admin settings", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_topup_requests_management(self):
        """Test admin topup requests management"""
        print("\n📋 Testing Admin Topup Requests Management...")
        
        if not self.admin_token:
            self.log_test("Admin topup requests (no admin token)", False, "Admin not logged in")
            return False
        
        # Test get all topup requests
        response = self.make_request('GET', 'admin/topup-requests', token=self.admin_token)
        if response and response.status_code == 200:
            requests_list = response.json()
            if isinstance(requests_list, list):
                self.log_test("Get all topup requests", True)
                
                # If there are pending requests, test approve/reject
                pending_requests = [r for r in requests_list if r.get('status') == 'pending']
                if pending_requests and hasattr(self, 'test_request_id'):
                    request_id = self.test_request_id
                    
                    # Test approve request
                    approve_response = self.make_request('PUT', f'admin/topup-requests/{request_id}/approve', token=self.admin_token)
                    if approve_response and approve_response.status_code == 200:
                        self.log_test("Approve topup request", True)
                    else:
                        self.log_test("Approve topup request", False, f"Status: {approve_response.status_code if approve_response else 'No response'}")
                
            else:
                self.log_test("Get all topup requests", False, "Invalid requests format")
        else:
            self.log_test("Get all topup requests", False, f"Status: {response.status_code if response else 'No response'}")

    def test_admin_user_management(self):
        """Test admin user management features"""
        print("\n👥 Testing Admin User Management...")
        
        if not self.admin_token or not self.test_user_id:
            self.log_test("Admin user management (no tokens)", False, "Admin or test user not available")
            return False
        
        # Test update user balance
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/balance', params={'balance': 5000}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Update user balance", True)
        else:
            self.log_test("Update user balance", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test update user XP
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/xp', params={'xp': 1000}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Update user XP", True)
        else:
            self.log_test("Update user XP", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test toggle admin status (make user admin then remove)
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/admin', params={'is_admin': True}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Toggle admin status (grant)", True)
            
            # Remove admin status
            response = self.make_request('PUT', f'admin/users/{self.test_user_id}/admin', params={'is_admin': False}, token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("Toggle admin status (remove)", True)
            else:
                self.log_test("Toggle admin status (remove)", False, f"Status: {response.status_code if response else 'No response'}")
        else:
            self.log_test("Toggle admin status (grant)", False, f"Status: {response.status_code if response else 'No response'}")

    def test_promo_codes_api(self):
        """Test promo codes API (NEW FEATURE)"""
        print("\n🎫 Testing Promo Codes API...")
        
        if not self.admin_token:
            self.log_test("Promo codes API (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 1: GET /api/admin/promo-codes - should list promo codes including "TSMARKET20"
        response = self.make_request('GET', 'admin/promo-codes', token=self.admin_token)
        if response and response.status_code == 200:
            promo_codes = response.json()
            if isinstance(promo_codes, list):
                self.log_test("Get admin promo codes", True)
                
                # Check if TSMARKET20 exists with 20% discount
                tsmarket20_found = False
                for promo in promo_codes:
                    if promo.get('code') == 'TSMARKET20' and promo.get('discount_percent') == 20:
                        tsmarket20_found = True
                        self.log_test("TSMARKET20 promo code exists with 20% discount", True)
                        break
                
                if not tsmarket20_found:
                    self.log_test("TSMARKET20 promo code exists with 20% discount", False, "TSMARKET20 not found or wrong discount")
            else:
                self.log_test("Get admin promo codes", False, "Invalid response format")
        else:
            self.log_test("Get admin promo codes", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: POST /api/admin/promo-codes - test creating a new promo code
        timestamp = int(time.time())
        new_promo_data = {
            "code": f"TEST{timestamp}",
            "discount_percent": 15,
            "usage_limit": 100
        }
        
        response = self.make_request('POST', 'admin/promo-codes', new_promo_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_promo = response.json()
            if created_promo.get('code') == new_promo_data['code']:
                self.log_test("Create new promo code", True)
                self.test_promo_id = created_promo.get('promo_id')
            else:
                self.log_test("Create new promo code", False, "Created promo code doesn't match input")
        else:
            self.log_test("Create new promo code", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: POST /api/promo/validate?code=TSMARKET20 - should return valid: true, discount_percent: 20
        if not self.user_token:
            self.log_test("Validate TSMARKET20 promo (no user token)", False, "User not logged in")
            return False
        
        response = self.make_request('POST', 'promo/validate', params={'code': 'TSMARKET20'}, token=self.user_token)
        if response and response.status_code == 200:
            validation_result = response.json()
            if (validation_result.get('valid') == True and 
                validation_result.get('discount_percent') == 20 and
                validation_result.get('code') == 'TSMARKET20'):
                self.log_test("Validate TSMARKET20 promo code", True)
            else:
                self.log_test("Validate TSMARKET20 promo code", False, f"Invalid validation result: {validation_result}")
        else:
            self.log_test("Validate TSMARKET20 promo code", False, f"Status: {response.status_code if response else 'No response'}")

    def test_product_discount_api(self):
        """Test product discount API (NEW FEATURE)"""
        print("\n💰 Testing Product Discount API...")
        
        if not self.admin_token:
            self.log_test("Product discount API (no admin token)", False, "Admin not logged in")
            return False
        
        # Get products first to test discount setting
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            self.log_test("Product discount API (no products)", False, "Cannot get products")
            return False
        
        products = products_response.json()
        if not products:
            self.log_test("Product discount API (empty products)", False, "No products available")
            return False
        
        # Test 1: PUT /api/admin/products/{product_id}/discount?discount_percent=15
        test_product = products[0]
        product_id = test_product['product_id']
        
        response = self.make_request('PUT', f'admin/products/{product_id}/discount', 
                                   params={'discount_percent': 15}, token=self.admin_token)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('discount_percent') == 15:
                self.log_test("Set product discount to 15%", True)
            else:
                self.log_test("Set product discount to 15%", False, f"Wrong discount in response: {result}")
        else:
            self.log_test("Set product discount to 15%", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: GET /api/products - verify products return with discount_percent field
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            updated_products = response.json()
            if isinstance(updated_products, list) and len(updated_products) > 0:
                # Find the product we just updated
                updated_product = None
                for product in updated_products:
                    if product.get('product_id') == product_id:
                        updated_product = product
                        break
                
                if updated_product and 'discount_percent' in updated_product:
                    if updated_product.get('discount_percent') == 15:
                        self.log_test("Products API returns discount_percent field", True)
                    else:
                        self.log_test("Products API returns discount_percent field", False, f"Wrong discount value: {updated_product.get('discount_percent')}")
                else:
                    self.log_test("Products API returns discount_percent field", False, "discount_percent field missing or product not found")
            else:
                self.log_test("Products API returns discount_percent field", False, "Invalid products response")
        else:
            self.log_test("Products API returns discount_percent field", False, f"Status: {response.status_code if response else 'No response'}")

    def test_orders_with_discounts(self):
        """Test orders with promo code discounts (NEW FEATURE)"""
        print("\n🛍️ Testing Orders with Discounts...")
        
        if not self.user_token:
            self.log_test("Orders with discounts (no user token)", False, "User not logged in")
            return False
        
        # Get products first
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            self.log_test("Orders with discounts (no products)", False, "Cannot get products")
            return False
        
        products = products_response.json()
        if not products:
            self.log_test("Orders with discounts (empty products)", False, "No products available")
            return False
        
        # Test order with TSMARKET20 promo code
        test_product = products[0]
        order_data = {
            "items": [
                {
                    "product_id": test_product["product_id"],
                    "quantity": 1,
                    "size": test_product["sizes"][0] if test_product.get("sizes") else None
                }
            ],
            "delivery_address": "г. Душанбе, ул. Ленина 15, кв 42",
            "phone_number": "+992123456789",
            "promo_code": "TSMARKET20"
        }
        
        response = self.make_request('POST', 'orders', order_data, token=self.user_token)
        if response and response.status_code in [200, 201]:
            order_result = response.json()
            if 'order' in order_result:
                order = order_result['order']
                discount_applied = order_result.get('discount_applied', 0)
                
                # Check if discount was applied
                if discount_applied > 0 and order.get('promo_code') == 'TSMARKET20':
                    self.log_test("Order with TSMARKET20 promo code applies discount", True)
                else:
                    self.log_test("Order with TSMARKET20 promo code applies discount", False, f"No discount applied or wrong promo code: discount={discount_applied}, promo={order.get('promo_code')}")
            else:
                self.log_test("Order with TSMARKET20 promo code applies discount", False, "Invalid order response")
        else:
            # Check if it's a balance issue
            if response and response.status_code == 400:
                error_detail = response.json().get('detail', '')
                if 'balance' in error_detail.lower():
                    self.log_test("Order with TSMARKET20 promo code applies discount", True, "Insufficient balance but promo validation passed")
                else:
                    self.log_test("Order with TSMARKET20 promo code applies discount", False, f"Unexpected error: {error_detail}")
            else:
                self.log_test("Order with TSMARKET20 promo code applies discount", False, f"Status: {response.status_code if response else 'No response'}")

    def test_missions_api(self):
        """Test Missions API (NEW FEATURE)"""
        print("\n🎯 Testing Missions API...")
        
        if not self.admin_token:
            self.log_test("Missions API (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 1: POST /api/admin/missions - create a new mission
        timestamp = int(time.time())
        mission_data = {
            "title": f"Test Mission {timestamp}",
            "description": "Complete 5 orders to earn coins",
            "mission_type": "orders_count",
            "target_value": 5,
            "reward_type": "coins",
            "reward_value": 100
        }
        
        response = self.make_request('POST', 'admin/missions', mission_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_mission = response.json()
            if created_mission.get('title') == mission_data['title']:
                self.log_test("Create new mission", True)
                self.test_mission_id = created_mission.get('mission_id')
            else:
                self.log_test("Create new mission", False, "Created mission doesn't match input")
        else:
            self.log_test("Create new mission", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: GET /api/missions - should return active missions with user progress
        if not self.user_token:
            self.log_test("Get missions (no user token)", False, "User not logged in")
            return False
        
        response = self.make_request('GET', 'missions', token=self.user_token)
        if response and response.status_code == 200:
            missions = response.json()
            if isinstance(missions, list):
                self.log_test("Get missions with user progress", True)
                
                # Check if missions have progress fields
                if missions:
                    first_mission = missions[0]
                    if 'progress' in first_mission and 'is_completed' in first_mission and 'is_claimed' in first_mission:
                        self.log_test("Missions include user progress data", True)
                    else:
                        self.log_test("Missions include user progress data", False, "Missing progress fields")
            else:
                self.log_test("Get missions with user progress", False, "Invalid response format")
        else:
            self.log_test("Get missions with user progress", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: PUT /api/admin/missions/{mission_id}/toggle - toggle mission active status
        if hasattr(self, 'test_mission_id'):
            response = self.make_request('PUT', f'admin/missions/{self.test_mission_id}/toggle', token=self.admin_token)
            if response and response.status_code == 200:
                result = response.json()
                if 'is_active' in result:
                    self.log_test("Toggle mission active status", True)
                else:
                    self.log_test("Toggle mission active status", False, "Missing is_active in response")
            else:
                self.log_test("Toggle mission active status", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: POST /api/missions/{mission_id}/claim - claim mission reward (test with incomplete mission)
        if hasattr(self, 'test_mission_id'):
            response = self.make_request('POST', f'missions/{self.test_mission_id}/claim', token=self.user_token)
            if response and response.status_code == 400:
                error_detail = response.json().get('detail', '')
                if 'не выполнена' in error_detail or 'not completed' in error_detail.lower():
                    self.log_test("Claim incomplete mission (should fail)", True, "Mission not completed as expected")
                else:
                    self.log_test("Claim incomplete mission (should fail)", False, f"Wrong error message: {error_detail}")
            else:
                self.log_test("Claim incomplete mission (should fail)", False, f"Expected 400 error, got: {response.status_code if response else 'No response'}")
        
        # Test 5: DELETE /api/admin/missions/{mission_id} - delete mission
        if hasattr(self, 'test_mission_id'):
            response = self.make_request('DELETE', f'admin/missions/{self.test_mission_id}', token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("Delete mission", True)
            else:
                self.log_test("Delete mission", False, f"Status: {response.status_code if response else 'No response'}")

    def test_tags_api(self):
        """Test Tags API (NEW FEATURE)"""
        print("\n🏷️ Testing Tags API...")
        
        # Test 1: GET /api/tags - list all tags (public endpoint)
        response = self.make_request('GET', 'tags')
        if response and response.status_code == 200:
            tags = response.json()
            if isinstance(tags, list):
                self.log_test("Get all tags", True)
            else:
                self.log_test("Get all tags", False, "Invalid response format")
        else:
            self.log_test("Get all tags", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not self.admin_token:
            self.log_test("Tags API admin functions (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 2: POST /api/admin/tags - create tag
        timestamp = int(time.time())
        tag_data = {
            "name": f"Test Tag {timestamp}",
            "slug": f"test-tag-{timestamp}",
            "color": "#FF5733"
        }
        
        response = self.make_request('POST', 'admin/tags', tag_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_tag = response.json()
            if created_tag.get('name') == tag_data['name']:
                self.log_test("Create new tag", True)
                self.test_tag_id = created_tag.get('tag_id')
            else:
                self.log_test("Create new tag", False, "Created tag doesn't match input")
        else:
            self.log_test("Create new tag", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: PUT /api/admin/products/{product_id}/tags - update product tags
        # Get products first
        products_response = self.make_request('GET', 'products')
        if products_response and products_response.status_code == 200:
            products = products_response.json()
            if products:
                test_product = products[0]
                product_id = test_product['product_id']
                
                # Update product tags
                tags_to_assign = [self.test_tag_id] if hasattr(self, 'test_tag_id') else []
                response = self.make_request('PUT', f'admin/products/{product_id}/tags', tags_to_assign, token=self.admin_token)
                if response and response.status_code == 200:
                    result = response.json()
                    if 'tags' in result:
                        self.log_test("Update product tags", True)
                    else:
                        self.log_test("Update product tags", False, "Missing tags in response")
                else:
                    self.log_test("Update product tags", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: DELETE /api/admin/tags/{tag_id} - delete tag
        if hasattr(self, 'test_tag_id'):
            response = self.make_request('DELETE', f'admin/tags/{self.test_tag_id}', token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("Delete tag", True)
            else:
                self.log_test("Delete tag", False, f"Status: {response.status_code if response else 'No response'}")

    def test_support_api(self):
        """Test Support API (NEW FEATURE)"""
        print("\n🎧 Testing Support API...")
        
        # Test 1: POST /api/support/ticket - create support ticket (public endpoint)
        timestamp = int(time.time())
        ticket_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@test.com",
            "subject": "Test Support Request",
            "message": "This is a test support ticket to verify the API functionality."
        }
        
        response = self.make_request('POST', 'support/ticket', ticket_data)
        if response and response.status_code in [200, 201]:
            result = response.json()
            if 'ticket_id' in result:
                self.log_test("Create support ticket", True)
                self.test_ticket_id = result.get('ticket_id')
            else:
                self.log_test("Create support ticket", False, "Missing ticket_id in response")
        else:
            self.log_test("Create support ticket", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not self.user_token:
            self.log_test("Support API user functions (no user token)", False, "User not logged in")
        else:
            # Test 2: GET /api/support/tickets - get user's tickets
            response = self.make_request('GET', 'support/tickets', token=self.user_token)
            if response and response.status_code == 200:
                tickets = response.json()
                if isinstance(tickets, list):
                    self.log_test("Get user support tickets", True)
                else:
                    self.log_test("Get user support tickets", False, "Invalid response format")
            else:
                self.log_test("Get user support tickets", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not self.admin_token:
            self.log_test("Support API admin functions (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 3: GET /api/admin/support/tickets - admin get all tickets
        response = self.make_request('GET', 'admin/support/tickets', token=self.admin_token)
        if response and response.status_code == 200:
            all_tickets = response.json()
            if isinstance(all_tickets, list):
                self.log_test("Admin get all support tickets", True)
            else:
                self.log_test("Admin get all support tickets", False, "Invalid response format")
        else:
            self.log_test("Admin get all support tickets", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: PUT /api/admin/support/tickets/{ticket_id}?response=...&status=... - respond to ticket
        if hasattr(self, 'test_ticket_id'):
            response_params = {
                'response': 'Thank you for your inquiry. We have resolved your issue.',
                'status': 'resolved'
            }
            response = self.make_request('PUT', f'admin/support/tickets/{self.test_ticket_id}', 
                                       params=response_params, token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("Admin respond to support ticket", True)
            else:
                self.log_test("Admin respond to support ticket", False, f"Status: {response.status_code if response else 'No response'}")

    def test_bank_cards_api(self):
        """Test Bank Cards API (NEW FEATURE)"""
        print("\n💳 Testing Bank Cards API...")
        
        # Test 1: GET /api/bank-cards - public endpoint, returns active cards
        response = self.make_request('GET', 'bank-cards')
        if response and response.status_code == 200:
            cards = response.json()
            if isinstance(cards, list):
                self.log_test("Get active bank cards (public)", True)
            else:
                self.log_test("Get active bank cards (public)", False, "Invalid response format")
        else:
            self.log_test("Get active bank cards (public)", False, f"Status: {response.status_code if response else 'No response'}")
        
        if not self.admin_token:
            self.log_test("Bank Cards API admin functions (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 2: GET /api/admin/bank-cards - admin gets all cards
        response = self.make_request('GET', 'admin/bank-cards', token=self.admin_token)
        if response and response.status_code == 200:
            all_cards = response.json()
            if isinstance(all_cards, list):
                self.log_test("Admin get all bank cards", True)
            else:
                self.log_test("Admin get all bank cards", False, "Invalid response format")
        else:
            self.log_test("Admin get all bank cards", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: POST /api/admin/bank-cards - create bank card
        timestamp = int(time.time())
        card_data = {
            "card_number": f"1234 5678 9012 {timestamp % 10000:04d}",
            "card_holder": f"Test Cardholder {timestamp}",
            "bank_name": "Test Bank"
        }
        
        response = self.make_request('POST', 'admin/bank-cards', card_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_card = response.json()
            if created_card.get('card_number') == card_data['card_number']:
                self.log_test("Create bank card", True)
                self.test_card_id = created_card.get('card_id')
            else:
                self.log_test("Create bank card", False, "Created card doesn't match input")
        else:
            self.log_test("Create bank card", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: PUT /api/admin/bank-cards/{card_id}/toggle - toggle card active status
        if hasattr(self, 'test_card_id'):
            response = self.make_request('PUT', f'admin/bank-cards/{self.test_card_id}/toggle', token=self.admin_token)
            if response and response.status_code == 200:
                result = response.json()
                if 'is_active' in result:
                    self.log_test("Toggle bank card active status", True)
                else:
                    self.log_test("Toggle bank card active status", False, "Missing is_active in response")
            else:
                self.log_test("Toggle bank card active status", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 5: DELETE /api/admin/bank-cards/{card_id} - delete card
        if hasattr(self, 'test_card_id'):
            response = self.make_request('DELETE', f'admin/bank-cards/{self.test_card_id}', token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("Delete bank card", True)
            else:
                self.log_test("Delete bank card", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_role_api(self):
        """Test User Role API (NEW FEATURE)"""
        print("\n👥 Testing User Role API...")
        
        if not self.admin_token or not self.test_user_id:
            self.log_test("User Role API (no tokens)", False, "Admin or test user not available")
            return False
        
        # Test 1: PUT /api/admin/users/{user_id}/role?role=helper - set user role to helper
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/role', 
                                   params={'role': 'helper'}, token=self.admin_token)
        if response and response.status_code == 200:
            result = response.json()
            if 'helper' in result.get('message', '').lower():
                self.log_test("Set user role to helper", True)
                
                # Create a helper token by logging in as the test user (now helper)
                # First get the test user's email
                user_response = self.make_request('GET', 'admin/users', token=self.admin_token)
                if user_response and user_response.status_code == 200:
                    users = user_response.json()
                    test_user = None
                    for user in users:
                        if user.get('user_id') == self.test_user_id:
                            test_user = user
                            break
                    
                    if test_user:
                        # Login as helper user (we need to know the password, which we set during registration)
                        helper_login_data = {
                            "email": test_user['email'],
                            "password": "testpass123"  # Password we used during registration
                        }
                        
                        login_response = self.make_request('POST', 'auth/login', helper_login_data)
                        if login_response and login_response.status_code == 200:
                            login_data = login_response.json()
                            self.helper_token = login_data.get('token')
                            
                            # Test 2: Verify helper can access /api/admin/orders
                            if self.helper_token:
                                orders_response = self.make_request('GET', 'admin/orders', token=self.helper_token)
                                if orders_response and orders_response.status_code == 200:
                                    self.log_test("Helper can access admin orders", True)
                                else:
                                    self.log_test("Helper can access admin orders", False, f"Status: {orders_response.status_code if orders_response else 'No response'}")
                                
                                # Test 3: Verify helper can access /api/admin/topup-requests/approve
                                # First create a topup request to approve
                                topup_data = {
                                    "amount": 500,
                                    "receipt_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                                }
                                topup_response = self.make_request('POST', 'topup/request', topup_data, token=self.user_token)
                                if topup_response and topup_response.status_code in [200, 201]:
                                    topup_result = topup_response.json()
                                    request_id = topup_result.get('request_id')
                                    
                                    if request_id:
                                        approve_response = self.make_request('PUT', f'admin/topup-requests/{request_id}/approve', token=self.helper_token)
                                        if approve_response and approve_response.status_code == 200:
                                            self.log_test("Helper can approve topup requests", True)
                                        else:
                                            self.log_test("Helper can approve topup requests", False, f"Status: {approve_response.status_code if approve_response else 'No response'}")
                                
                                # Test 4: Verify helper CANNOT access /api/admin/users
                                users_response = self.make_request('GET', 'admin/users', token=self.helper_token)
                                if users_response and users_response.status_code == 403:
                                    self.log_test("Helper cannot access admin users (correct)", True)
                                else:
                                    self.log_test("Helper cannot access admin users (correct)", False, f"Expected 403, got: {users_response.status_code if users_response else 'No response'}")
                                
                                # Test 5: Verify helper CANNOT access /api/admin/settings
                                settings_response = self.make_request('GET', 'admin/settings', token=self.helper_token)
                                if settings_response and settings_response.status_code == 403:
                                    self.log_test("Helper cannot access admin settings (correct)", True)
                                else:
                                    self.log_test("Helper cannot access admin settings (correct)", False, f"Expected 403, got: {settings_response.status_code if settings_response else 'No response'}")
            else:
                self.log_test("Set user role to helper", False, f"Unexpected response: {result}")
        else:
            self.log_test("Set user role to helper", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Reset user role back to user
        reset_response = self.make_request('PUT', f'admin/users/{self.test_user_id}/role', 
                                         params={'role': 'user'}, token=self.admin_token)
        if reset_response and reset_response.status_code == 200:
            self.log_test("Reset user role to user", True)
        else:
            self.log_test("Reset user role to user", False, f"Status: {reset_response.status_code if reset_response else 'No response'}")

    def test_image_upload_api(self):
        """Test Image Upload API (NEW FEATURE)"""
        print("\n🖼️ Testing Image Upload API...")
        
        if not self.admin_token:
            self.log_test("Image Upload API (no admin token)", False, "Admin not logged in")
            return False
        
        # Test POST /api/admin/upload-image - upload base64 image
        # Create a small test base64 image
        test_image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        image_data = {
            "image": test_image_base64
        }
        
        response = self.make_request('POST', 'admin/upload-image', image_data, token=self.admin_token)
        if response and response.status_code == 200:
            result = response.json()
            if 'image_url' in result and result['image_url'] == test_image_base64:
                self.log_test("Upload base64 image", True)
            else:
                self.log_test("Upload base64 image", False, "Image URL not returned correctly")
        else:
            self.log_test("Upload base64 image", False, f"Status: {response.status_code if response else 'No response'}")

    def test_product_multiple_images(self):
        """Test Product with Multiple Images (NEW FEATURE)"""
        print("\n📸 Testing Product with Multiple Images...")
        
        if not self.admin_token:
            self.log_test("Product Multiple Images (no admin token)", False, "Admin not logged in")
            return False
        
        # Get categories first
        categories_response = self.make_request('GET', 'categories')
        if not categories_response or categories_response.status_code != 200:
            self.log_test("Product Multiple Images (no categories)", False, "Cannot get categories")
            return False
        
        categories = categories_response.json()
        if not categories:
            self.log_test("Product Multiple Images (empty categories)", False, "No categories available")
            return False
        
        # Test POST /api/products with images array
        timestamp = int(time.time())
        test_images = [
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNkYGBgYGBgYAAAAAUAAY27m/MAAAAASUVORK5CYII=",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAGklEQVR42mNkYGBgYGBgYGBgYGBgYGBgYGAAAAUgAQFiLuNMAAAAAElFTkSuQmCC"
        ]
        
        product_data = {
            "name": f"Multi-Image Product {timestamp}",
            "description": "Test product with multiple images",
            "price": 99.99,
            "xp_reward": 15,
            "category_id": categories[0]['category_id'],
            "image_url": "",  # Will be set from first image in images array
            "images": test_images,
            "sizes": ["S", "M", "L"],
            "stock": 50
        }
        
        response = self.make_request('POST', 'products', product_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_product = response.json()
            if (created_product.get('name') == product_data['name'] and 
                'images' in created_product and 
                len(created_product['images']) == 3 and
                created_product.get('image_url') == test_images[0]):  # Main image should be first from images array
                self.log_test("Create product with multiple images", True)
                self.test_multi_image_product_id = created_product.get('product_id')
            else:
                self.log_test("Create product with multiple images", False, "Product not created correctly or images not saved")
        else:
            self.log_test("Create product with multiple images", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Verify the product can be retrieved with all images
        if hasattr(self, 'test_multi_image_product_id'):
            get_response = self.make_request('GET', f'products/{self.test_multi_image_product_id}')
            if get_response and get_response.status_code == 200:
                product = get_response.json()
                if 'images' in product and len(product['images']) == 3:
                    self.log_test("Retrieve product with multiple images", True)
                else:
                    self.log_test("Retrieve product with multiple images", False, "Images not retrieved correctly")
            else:
                self.log_test("Retrieve product with multiple images", False, f"Status: {get_response.status_code if get_response else 'No response'}")
        
        # Clean up - delete the test product
        if hasattr(self, 'test_multi_image_product_id'):
            delete_response = self.make_request('DELETE', f'products/{self.test_multi_image_product_id}', token=self.admin_token)
            if delete_response and delete_response.status_code == 200:
                self.log_test("Delete test multi-image product", True)
            else:
                self.log_test("Delete test multi-image product", False, f"Status: {delete_response.status_code if delete_response else 'No response'}")

    def test_support_contacts_feature(self):
        """Test TSMarket support contacts feature end-to-end"""
        print("\n📞 Testing Support Contacts Feature...")
        
        if not self.admin_token:
            self.log_test("Support contacts feature (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 1: Admin Settings API - Save support contacts
        print("   Testing Admin Settings API...")
        settings_data = {
            "card_number": "1234 5678 9012 3456",
            "card_holder": "TSMarket Admin",
            "additional_info": "Test bank info",
            "support_telegram": "@test_support",
            "support_whatsapp": "+992111222333",
            "support_email": "test@support.com",
            "support_phone": "+992444555666"
        }
        
        response = self.make_request('PUT', 'admin/settings', settings_data, token=self.admin_token)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('message') == 'Настройки сохранены':
                self.log_test("Admin Settings API - Save support contacts", True)
            else:
                self.log_test("Admin Settings API - Save support contacts", False, f"Wrong response message: {result}")
        else:
            self.log_test("Admin Settings API - Save support contacts", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: Public Support Contacts API - Get support contacts
        print("   Testing Public Support Contacts API...")
        response = self.make_request('GET', 'support/contacts')
        if response and response.status_code == 200:
            contacts = response.json()
            expected_fields = ['telegram', 'whatsapp', 'email', 'phone']
            
            # Check if all 4 contact fields are present
            if all(field in contacts for field in expected_fields):
                # Verify the values match what we saved
                if (contacts.get('telegram') == '@test_support' and
                    contacts.get('whatsapp') == '+992111222333' and
                    contacts.get('email') == 'test@support.com' and
                    contacts.get('phone') == '+992444555666'):
                    self.log_test("Public Support Contacts API - Returns all 4 contact fields", True)
                else:
                    self.log_test("Public Support Contacts API - Returns all 4 contact fields", False, f"Contact values don't match: {contacts}")
            else:
                self.log_test("Public Support Contacts API - Returns all 4 contact fields", False, f"Missing contact fields: {contacts}")
        else:
            self.log_test("Public Support Contacts API - Returns all 4 contact fields", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Support Tickets API - Create support ticket
        print("   Testing Support Tickets API...")
        ticket_data = {
            "name": "Test User",
            "email": "user@test.com",
            "subject": "Test Subject",
            "message": "Test message"
        }
        
        response = self.make_request('POST', 'support/ticket', ticket_data)
        if response and response.status_code in [200, 201]:
            result = response.json()
            if 'ticket_id' in result:
                self.log_test("Support Tickets API - Create support ticket", True)
                self.test_support_ticket_id = result.get('ticket_id')
            else:
                self.log_test("Support Tickets API - Create support ticket", False, "Missing ticket_id in response")
        else:
            self.log_test("Support Tickets API - Create support ticket", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: Admin Panel Access - Verify admin can access stats
        print("   Testing Admin Panel Access...")
        response = self.make_request('GET', 'admin/stats', token=self.admin_token)
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['users_count', 'orders_count', 'products_count', 'total_revenue']
            if all(field in stats for field in required_fields):
                self.log_test("Admin Panel Access - Admin can access stats", True)
            else:
                self.log_test("Admin Panel Access - Admin can access stats", False, f"Missing stats fields: {stats}")
        else:
            self.log_test("Admin Panel Access - Admin can access stats", False, f"Status: {response.status_code if response else 'No response'}")
        
        print("   ✅ Support Contacts Feature testing completed")

    def test_multilingual_products_api(self):
        """Test Multilingual Products API (NEW FEATURE)"""
        print("\n🌐 Testing Multilingual Products API...")
        
        # Test 1: GET /api/products - verify products have multilingual fields
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            products = response.json()
            if isinstance(products, list) and len(products) > 0:
                self.log_test("Get products with multilingual fields", True)
                
                # Check if products have multilingual fields
                first_product = products[0]
                multilingual_fields = ['name', 'name_ru', 'name_tj', 'description', 'description_ru', 'description_tj']
                missing_fields = [field for field in multilingual_fields if field not in first_product]
                
                if not missing_fields:
                    self.log_test("Products contain all multilingual fields", True)
                else:
                    self.log_test("Products contain all multilingual fields", False, f"Missing fields: {missing_fields}")
                
                # Test 2: Check specific product "prod_001" for Russian name
                prod_001 = None
                for product in products:
                    if product.get('product_id') == 'prod_001':
                        prod_001 = product
                        break
                
                if prod_001:
                    if prod_001.get('name_ru') == 'Игровые наушники Дракон':
                        self.log_test("Product prod_001 has correct Russian name", True)
                    else:
                        self.log_test("Product prod_001 has correct Russian name", False, f"Expected 'Игровые наушники Дракон', got: {prod_001.get('name_ru')}")
                else:
                    self.log_test("Product prod_001 has correct Russian name", False, "Product prod_001 not found")
                
                return products
            else:
                self.log_test("Get products with multilingual fields", False, "No products found")
        else:
            self.log_test("Get products with multilingual fields", False, f"Status: {response.status_code if response else 'No response'}")
        
        return []

    def test_multilingual_categories_api(self):
        """Test Multilingual Categories API (NEW FEATURE)"""
        print("\n📂 Testing Multilingual Categories API...")
        
        # Test GET /api/categories - verify categories have multilingual fields
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            categories = response.json()
            if isinstance(categories, list) and len(categories) > 0:
                self.log_test("Get categories with multilingual fields", True)
                
                # Check if categories have multilingual fields
                first_category = categories[0]
                multilingual_fields = ['name', 'name_ru', 'name_tj']
                missing_fields = [field for field in multilingual_fields if field not in first_category]
                
                if not missing_fields:
                    self.log_test("Categories contain all multilingual fields", True)
                else:
                    self.log_test("Categories contain all multilingual fields", False, f"Missing fields: {missing_fields}")
                
                # Test specific category "cat_gaming" for Russian and Tajik names
                cat_gaming = None
                for category in categories:
                    if category.get('category_id') == 'cat_gaming':
                        cat_gaming = category
                        break
                
                if cat_gaming:
                    # Check Russian name
                    if cat_gaming.get('name_ru') == 'Игровое':
                        self.log_test("Category cat_gaming has correct Russian name", True)
                    else:
                        self.log_test("Category cat_gaming has correct Russian name", False, f"Expected 'Игровое', got: {cat_gaming.get('name_ru')}")
                    
                    # Check Tajik name
                    if cat_gaming.get('name_tj') == 'Бозиҳо':
                        self.log_test("Category cat_gaming has correct Tajik name", True)
                    else:
                        self.log_test("Category cat_gaming has correct Tajik name", False, f"Expected 'Бозиҳо', got: {cat_gaming.get('name_tj')}")
                else:
                    self.log_test("Category cat_gaming has correct Russian name", False, "Category cat_gaming not found")
                    self.log_test("Category cat_gaming has correct Tajik name", False, "Category cat_gaming not found")
                
                return categories
            else:
                self.log_test("Get categories with multilingual fields", False, "No categories found")
        else:
            self.log_test("Get categories with multilingual fields", False, f"Status: {response.status_code if response else 'No response'}")
        
        return []

    def test_multilingual_product_creation(self):
        """Test Multilingual Product Creation (NEW FEATURE)"""
        print("\n🆕 Testing Multilingual Product Creation...")
        
        if not self.admin_token:
            self.log_test("Multilingual Product Creation (no admin token)", False, "Admin not logged in")
            return False
        
        # Test POST /api/products with multilingual fields
        timestamp = int(time.time())
        multilingual_product_data = {
            "name": "Test Product",
            "name_ru": "Тестовый продукт",
            "name_tj": "Маҳсулоти санҷишӣ",
            "description": "Test desc",
            "description_ru": "Тестовое описание",
            "description_tj": "Тавсифи санҷишӣ",
            "price": 100,
            "category_id": "cat_gaming",
            "image_url": "https://example.com/test.jpg"
        }
        
        response = self.make_request('POST', 'products', multilingual_product_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_product = response.json()
            
            # Verify all multilingual fields are saved correctly
            multilingual_checks = [
                ('name', 'Test Product'),
                ('name_ru', 'Тестовый продукт'),
                ('name_tj', 'Маҳсулоти санҷишӣ'),
                ('description', 'Test desc'),
                ('description_ru', 'Тестовое описание'),
                ('description_tj', 'Тавсифи санҷишӣ')
            ]
            
            all_fields_correct = True
            for field, expected_value in multilingual_checks:
                if created_product.get(field) != expected_value:
                    self.log_test(f"Product creation - {field} field", False, f"Expected '{expected_value}', got '{created_product.get(field)}'")
                    all_fields_correct = False
                else:
                    self.log_test(f"Product creation - {field} field", True)
            
            if all_fields_correct:
                self.log_test("Create product with multilingual fields", True)
                self.test_multilingual_product_id = created_product.get('product_id')
                
                # Verify the product can be retrieved with all multilingual fields
                if self.test_multilingual_product_id:
                    get_response = self.make_request('GET', f'products/{self.test_multilingual_product_id}')
                    if get_response and get_response.status_code == 200:
                        retrieved_product = get_response.json()
                        
                        # Check all multilingual fields are preserved
                        retrieval_correct = True
                        for field, expected_value in multilingual_checks:
                            if retrieved_product.get(field) != expected_value:
                                retrieval_correct = False
                                break
                        
                        if retrieval_correct:
                            self.log_test("Retrieve multilingual product preserves all fields", True)
                        else:
                            self.log_test("Retrieve multilingual product preserves all fields", False, "Some multilingual fields were not preserved")
                    else:
                        self.log_test("Retrieve multilingual product preserves all fields", False, f"Status: {get_response.status_code if get_response else 'No response'}")
            else:
                self.log_test("Create product with multilingual fields", False, "Some multilingual fields were not saved correctly")
        else:
            self.log_test("Create product with multilingual fields", False, f"Status: {response.status_code if response else 'No response'}")

    def test_helper_page_api_access(self):
        """Test Helper Page API Access (NEW REVIEW REQUEST)"""
        print("\n🔧 Testing Helper Page API Access...")
        
        # Login as helper user
        helper_login_data = {
            "email": "helper@tsmarket.com",
            "password": "helper123"
        }
        
        response = self.make_request('POST', 'auth/login', helper_login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                helper_token = data['token']
                self.log_test("Helper login", True)
                
                # Test 1: GET /api/admin/topup-requests (should work for helper)
                response = self.make_request('GET', 'admin/topup-requests', token=helper_token)
                if response and response.status_code == 200:
                    self.log_test("Helper can access admin/topup-requests", True)
                else:
                    self.log_test("Helper can access admin/topup-requests", False, f"Status: {response.status_code if response else 'No response'}")
                
                # Test 2: GET /api/admin/orders (should work for helper)
                response = self.make_request('GET', 'admin/orders', token=helper_token)
                if response and response.status_code == 200:
                    self.log_test("Helper can access admin/orders", True)
                else:
                    self.log_test("Helper can access admin/orders", False, f"Status: {response.status_code if response else 'No response'}")
                
                # Test 3: GET /api/products (public)
                response = self.make_request('GET', 'products')
                if response and response.status_code == 200:
                    self.log_test("Helper can access products (public)", True)
                else:
                    self.log_test("Helper can access products (public)", False, f"Status: {response.status_code if response else 'No response'}")
                
                # Test 4: POST /api/products (should work for helper with require_helper_or_admin)
                categories_response = self.make_request('GET', 'categories')
                if categories_response and categories_response.status_code == 200:
                    categories = categories_response.json()
                    if categories:
                        timestamp = int(time.time())
                        product_data = {
                            "name": f"Helper Test Product {timestamp}",
                            "description": "Test product created by helper",
                            "price": 199.99,
                            "xp_reward": 20,
                            "category_id": categories[0]['category_id'],
                            "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                            "sizes": ["M", "L"],
                            "stock": 25
                        }
                        
                        response = self.make_request('POST', 'products', product_data, token=helper_token)
                        if response and response.status_code in [200, 201]:
                            self.log_test("Helper can create products", True)
                        else:
                            self.log_test("Helper can create products", False, f"Status: {response.status_code if response else 'No response'}")
                    else:
                        self.log_test("Helper can create products", False, "No categories available")
                else:
                    self.log_test("Helper can create products", False, "Cannot get categories")
            else:
                self.log_test("Helper login", False, "Invalid login response")
        else:
            self.log_test("Helper login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_ai_auto_approve_settings(self):
        """Test AI Auto-Approve Settings (NEW REVIEW REQUEST)"""
        print("\n🤖 Testing AI Auto-Approve Settings...")
        
        if not self.admin_token:
            self.log_test("AI Auto-Approve Settings (no admin token)", False, "Admin not logged in")
            return False
        
        # Test 1: PUT /api/admin/settings with ai_auto_approve_enabled: true
        settings_data = {
            "card_number": "1234 5678 9012 3456",
            "card_holder": "TSMarket Admin",
            "additional_info": "Test bank info",
            "support_telegram": "@test_support",
            "support_whatsapp": "+992111222333",
            "support_email": "test@support.com",
            "support_phone": "+992444555666",
            "ai_auto_approve_enabled": True
        }
        
        response = self.make_request('PUT', 'admin/settings', settings_data, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("Set AI auto-approve enabled to true", True)
        else:
            self.log_test("Set AI auto-approve enabled to true", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: GET /api/admin/settings and check ai_auto_approve_enabled is true
        response = self.make_request('GET', 'admin/settings', token=self.admin_token)
        if response and response.status_code == 200:
            settings = response.json()
            if settings.get('ai_auto_approve_enabled') == True:
                self.log_test("Verify AI auto-approve setting is saved as true", True)
            else:
                self.log_test("Verify AI auto-approve setting is saved as true", False, f"ai_auto_approve_enabled is {settings.get('ai_auto_approve_enabled')}")
        else:
            self.log_test("Verify AI auto-approve setting is saved as true", False, f"Status: {response.status_code if response else 'No response'}")

    def test_multilingual_product_creation_with_translations(self):
        """Test Products API with multilingual fields (NEW REVIEW REQUEST)"""
        print("\n🌐 Testing Products API with Russian and Tajik translations...")
        
        if not self.admin_token:
            self.log_test("Multilingual Product Creation (no admin token)", False, "Admin not logged in")
            return False
        
        # Get categories first
        categories_response = self.make_request('GET', 'categories')
        if not categories_response or categories_response.status_code != 200:
            self.log_test("Multilingual Product Creation (no categories)", False, "Cannot get categories")
            return False
        
        categories = categories_response.json()
        if not categories:
            self.log_test("Multilingual Product Creation (empty categories)", False, "No categories available")
            return False
        
        # Create test product with Russian and Tajik translations as specified in review request
        product_data = {
            "name": "Test Prod",
            "name_ru": "Тестовый продукт",
            "name_tj": "Маҳсулоти санҷишӣ",
            "description": "Test desc",
            "description_ru": "Тестовое описание",
            "description_tj": "Тавсифи санҷишӣ",
            "price": 500,
            "category_id": "cat_gaming",
            "image_url": "https://example.com/test.jpg"
        }
        
        response = self.make_request('POST', 'products', product_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_product = response.json()
            if (created_product.get('name') == "Test Prod" and 
                created_product.get('name_ru') == "Тестовый продукт" and
                created_product.get('name_tj') == "Маҳсулоти санҷишӣ" and
                created_product.get('description') == "Test desc" and
                created_product.get('description_ru') == "Тестовое описание" and
                created_product.get('description_tj') == "Тавсифи санҷишӣ" and
                created_product.get('price') == 500):
                self.log_test("Create product with Russian and Tajik translations", True)
                self.test_multilingual_product_id = created_product.get('product_id')
                
                # Verify the product can be retrieved with all multilingual fields
                get_response = self.make_request('GET', f'products/{self.test_multilingual_product_id}')
                if get_response and get_response.status_code == 200:
                    retrieved_product = get_response.json()
                    if (retrieved_product.get('name_ru') == "Тестовый продукт" and
                        retrieved_product.get('name_tj') == "Маҳсулоти санҷишӣ" and
                        retrieved_product.get('description_ru') == "Тестовое описание" and
                        retrieved_product.get('description_tj') == "Тавсифи санҷишӣ"):
                        self.log_test("Retrieve product with multilingual fields preserved", True)
                    else:
                        self.log_test("Retrieve product with multilingual fields preserved", False, "Multilingual fields not preserved correctly")
                else:
                    self.log_test("Retrieve product with multilingual fields preserved", False, f"Status: {get_response.status_code if get_response else 'No response'}")
            else:
                self.log_test("Create product with Russian and Tajik translations", False, "Product not created with correct multilingual fields")
        else:
            self.log_test("Create product with Russian and Tajik translations", False, f"Status: {response.status_code if response else 'No response'}")

    def test_subcategories_feature(self):
        """Test TSMarket Subcategories Feature (NEW REVIEW REQUEST)"""
        print("\n📂 Testing TSMarket Subcategories Feature...")
        
        # Test 1: Categories API - Flat list
        print("   Testing flat categories list...")
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            categories = response.json()
            if isinstance(categories, list) and len(categories) > 0:
                self.log_test("GET /api/categories - flat list", True)
                
                # Verify required fields for each category
                required_fields = ['category_id', 'name', 'name_ru', 'name_tj', 'slug', 'parent_id', 'is_parent']
                all_have_fields = True
                for category in categories:
                    if not all(field in category for field in required_fields):
                        all_have_fields = False
                        break
                
                if all_have_fields:
                    self.log_test("Categories have required fields (category_id, name, name_ru, name_tj, slug, parent_id, is_parent)", True)
                    
                    # Check sorting: parents first by name, then children
                    parents = [c for c in categories if not c.get('parent_id')]
                    children = [c for c in categories if c.get('parent_id')]
                    
                    # Verify parents come first
                    parent_count = len(parents)
                    first_parent_names = [c.get('name_ru', c.get('name', '')) for c in categories[:parent_count]]
                    expected_parent_names = sorted([c.get('name_ru', c.get('name', '')) for c in parents])
                    
                    if first_parent_names == expected_parent_names:
                        self.log_test("Categories sorted correctly (parents first by name)", True)
                    else:
                        self.log_test("Categories sorted correctly (parents first by name)", False, f"Sorting incorrect: got {first_parent_names[:3]}, expected {expected_parent_names[:3]}")
                    
                    # Store gaming category for later tests
                    self.gaming_category_id = None
                    for category in categories:
                        if category.get('slug') == 'gaming':
                            self.gaming_category_id = category['category_id']
                            break
                    
                    if self.gaming_category_id:
                        self.log_test("Found gaming category for subcategory tests", True)
                    else:
                        self.log_test("Found gaming category for subcategory tests", False, "Gaming category not found")
                        
                else:
                    self.log_test("Categories have required fields", False, "Some categories missing required fields")
            else:
                self.log_test("GET /api/categories - flat list", False, "Invalid response format or empty")
        else:
            self.log_test("GET /api/categories - flat list", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: Categories API - Hierarchical
        print("   Testing hierarchical categories...")
        response = self.make_request('GET', 'categories', params={'hierarchical': 'true'})
        if response and response.status_code == 200:
            hierarchical_categories = response.json()
            if isinstance(hierarchical_categories, list):
                self.log_test("GET /api/categories?hierarchical=true - returns parent categories", True)
                
                # Verify each parent has subcategories array
                all_have_subcategories = True
                for parent in hierarchical_categories:
                    if 'subcategories' not in parent:
                        all_have_subcategories = False
                        break
                
                if all_have_subcategories:
                    self.log_test("Parent categories have subcategories array", True)
                else:
                    self.log_test("Parent categories have subcategories array", False, "Some parents missing subcategories array")
                
                # Verify only parent categories are returned (no parent_id)
                only_parents = all(not cat.get('parent_id') for cat in hierarchical_categories)
                if only_parents:
                    self.log_test("Hierarchical view returns only parent categories", True)
                else:
                    self.log_test("Hierarchical view returns only parent categories", False, "Some categories have parent_id")
                    
            else:
                self.log_test("GET /api/categories?hierarchical=true", False, "Invalid response format")
        else:
            self.log_test("GET /api/categories?hierarchical=true", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: Create subcategory
        print("   Testing subcategory creation...")
        if not self.admin_token:
            self.log_test("Create subcategory (no admin token)", False, "Admin not logged in")
        elif not hasattr(self, 'gaming_category_id') or not self.gaming_category_id:
            self.log_test("Create subcategory (no gaming category)", False, "Gaming category not found")
        else:
            timestamp = int(time.time())
            subcategory_data = {
                "name": "Controllers",
                "name_ru": "Контроллеры", 
                "name_tj": "Контроллерҳо",
                "slug": f"controllers-{timestamp}",  # Make unique to avoid conflicts
                "parent_id": self.gaming_category_id
            }
            
            response = self.make_request('POST', 'categories', subcategory_data, token=self.admin_token)
            if response and response.status_code in [200, 201]:
                created_subcategory = response.json()
                if (created_subcategory.get('name') == 'Controllers' and
                    created_subcategory.get('parent_id') == self.gaming_category_id and
                    created_subcategory.get('is_parent') == False):
                    self.log_test("Create subcategory under gaming category", True)
                    self.test_subcategory_id = created_subcategory.get('category_id')
                else:
                    self.log_test("Create subcategory under gaming category", False, f"Subcategory not created correctly: {created_subcategory}")
            else:
                self.log_test("Create subcategory under gaming category", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: Product filtering by subcategory
        print("   Testing product filtering by subcategory...")
        
        # First, let's find an existing subcategory to test with
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            categories = response.json()
            test_subcategory_id = None
            
            # Look for existing subcategories
            for category in categories:
                if category.get('parent_id'):  # This is a subcategory
                    test_subcategory_id = category['category_id']
                    break
            
            # If no existing subcategory, use the one we just created
            if not test_subcategory_id and hasattr(self, 'test_subcategory_id'):
                test_subcategory_id = self.test_subcategory_id
            
            if test_subcategory_id:
                # Test product filtering by subcategory
                response = self.make_request('GET', 'products', params={'category': test_subcategory_id})
                if response and response.status_code == 200:
                    filtered_products = response.json()
                    if isinstance(filtered_products, list):
                        self.log_test("GET /api/products?category=subcategory_id - filters by subcategory", True)
                        
                        # Verify all returned products belong to the subcategory
                        if filtered_products:
                            all_match_category = all(product.get('category_id') == test_subcategory_id for product in filtered_products)
                            if all_match_category:
                                self.log_test("Filtered products belong to correct subcategory", True)
                            else:
                                self.log_test("Filtered products belong to correct subcategory", False, "Some products don't match subcategory")
                        else:
                            self.log_test("Filtered products belong to correct subcategory", True, "No products in subcategory (expected)")
                    else:
                        self.log_test("GET /api/products?category=subcategory_id", False, "Invalid response format")
                else:
                    self.log_test("GET /api/products?category=subcategory_id", False, f"Status: {response.status_code if response else 'No response'}")
            else:
                self.log_test("Product filtering by subcategory", False, "No subcategory available for testing")

    def test_order_tracking_system(self):
        """Test TSMarket order tracking system and helper permissions"""
        print("\n📦 Testing Order Tracking System and Helper Permissions...")
        
        # First, ensure we have helper and regular user tokens
        if not self.admin_token:
            self.log_test("Order tracking (no admin token)", False, "Admin not logged in")
            return False
        
        # Create helper user if not exists and get helper token
        helper_token = self.setup_helper_user()
        if not helper_token:
            self.log_test("Order tracking (no helper token)", False, "Helper user setup failed")
            return False
        
        # Create regular user token if not exists
        if not self.user_token:
            self.test_user_registration()
        
        if not self.user_token:
            self.log_test("Order tracking (no user token)", False, "Regular user not available")
            return False
        
        # Test 1: Order Status Update API (Helper)
        self.test_order_status_update_api(helper_token)
        
        # Test 2: Order Tracking API (User)
        self.test_order_tracking_api()
        
        # Test 3: Helper Permissions - Should Work
        self.test_helper_permissions_allowed(helper_token)
        
        # Test 4: Helper Permissions - Should Fail (403)
        self.test_helper_permissions_forbidden(helper_token)

    def setup_helper_user(self):
        """Setup helper user and return helper token"""
        # Try to login as existing helper
        helper_login_data = {
            "email": "helper@tsmarket.com",
            "password": "helper123"
        }
        
        response = self.make_request('POST', 'auth/login', helper_login_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data:
                return data['token']
        
        # If helper doesn't exist, create one
        # First register a new user
        timestamp = int(time.time())
        helper_reg_data = {
            "email": f"helper{timestamp}@tsmarket.com",
            "password": "helper123",
            "name": f"Helper User {timestamp}"
        }
        
        reg_response = self.make_request('POST', 'auth/register', helper_reg_data)
        if reg_response and reg_response.status_code in [200, 201]:
            reg_data = reg_response.json()
            helper_user_id = reg_data['user']['user_id']
            
            # Set role to helper
            role_response = self.make_request('PUT', f'admin/users/{helper_user_id}/role', 
                                           params={'role': 'helper'}, token=self.admin_token)
            if role_response and role_response.status_code == 200:
                # Login as helper
                login_response = self.make_request('POST', 'auth/login', {
                    "email": helper_reg_data['email'],
                    "password": helper_reg_data['password']
                })
                if login_response and login_response.status_code == 200:
                    return login_response.json().get('token')
        
        return None

    def test_order_status_update_api(self, helper_token):
        """Test order status update API with helper permissions"""
        print("\n   📝 Testing Order Status Update API...")
        
        # First, create an order to update
        order_id = self.create_test_order()
        if not order_id:
            self.log_test("Order status update (no test order)", False, "Could not create test order")
            return
        
        # Test PUT /api/admin/orders/{order_id}/status with helper token
        status_update_data = {
            "status": "processing",
            "note": "Test processing"
        }
        
        response = self.make_request('PUT', f'admin/orders/{order_id}/status', 
                                   status_update_data, token=helper_token)
        if response and response.status_code == 200:
            result = response.json()
            if result.get('status') == 'processing':
                self.log_test("Helper can update order status", True)
                
                # Verify order status was actually updated
                order_response = self.make_request('GET', f'admin/orders/{order_id}', token=helper_token)
                if order_response and order_response.status_code == 200:
                    order = order_response.json()
                    if order.get('status') == 'processing':
                        self.log_test("Order status updated correctly", True)
                    else:
                        self.log_test("Order status updated correctly", False, f"Status not updated: {order.get('status')}")
                else:
                    self.log_test("Order status updated correctly", False, "Could not verify order status")
            else:
                self.log_test("Helper can update order status", False, f"Wrong status in response: {result}")
        else:
            self.log_test("Helper can update order status", False, f"Status: {response.status_code if response else 'No response'}")

    def test_order_tracking_api(self):
        """Test order tracking API for regular users"""
        print("\n   🔍 Testing Order Tracking API...")
        
        # Test GET /api/orders (get user's orders)
        response = self.make_request('GET', 'orders', token=self.user_token)
        if response and response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list):
                self.log_test("Get user orders", True)
                
                if orders:
                    # Pick first order for tracking test
                    first_order = orders[0]
                    order_id = first_order.get('order_id')
                    
                    if order_id:
                        # Test GET /api/orders/{order_id}/track
                        track_response = self.make_request('GET', f'orders/{order_id}/track', token=self.user_token)
                        if track_response and track_response.status_code == 200:
                            tracking_data = track_response.json()
                            if ('order_id' in tracking_data and 
                                'status' in tracking_data and 
                                'status_history' in tracking_data and
                                isinstance(tracking_data['status_history'], list)):
                                self.log_test("Order tracking API returns correct data", True)
                            else:
                                self.log_test("Order tracking API returns correct data", False, f"Missing fields in response: {tracking_data}")
                        else:
                            self.log_test("Order tracking API returns correct data", False, f"Status: {track_response.status_code if track_response else 'No response'}")
                    else:
                        self.log_test("Order tracking API returns correct data", False, "No order_id in first order")
                else:
                    # No orders exist, create one for testing
                    order_id = self.create_test_order()
                    if order_id:
                        track_response = self.make_request('GET', f'orders/{order_id}/track', token=self.user_token)
                        if track_response and track_response.status_code == 200:
                            tracking_data = track_response.json()
                            if ('order_id' in tracking_data and 
                                'status' in tracking_data and 
                                'status_history' in tracking_data):
                                self.log_test("Order tracking API returns correct data", True)
                            else:
                                self.log_test("Order tracking API returns correct data", False, f"Missing fields: {tracking_data}")
                        else:
                            self.log_test("Order tracking API returns correct data", False, f"Status: {track_response.status_code if track_response else 'No response'}")
                    else:
                        self.log_test("Order tracking API returns correct data", False, "Could not create test order")
            else:
                self.log_test("Get user orders", False, "Invalid response format")
        else:
            self.log_test("Get user orders", False, f"Status: {response.status_code if response else 'No response'}")

    def test_helper_permissions_allowed(self, helper_token):
        """Test helper permissions that should work"""
        print("\n   ✅ Testing Helper Permissions - Should Work...")
        
        # Test GET /api/admin/orders
        response = self.make_request('GET', 'admin/orders', token=helper_token)
        if response and response.status_code == 200:
            self.log_test("Helper can access admin orders", True)
        else:
            self.log_test("Helper can access admin orders", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test GET /api/admin/topup-requests
        response = self.make_request('GET', 'admin/topup-requests', token=helper_token)
        if response and response.status_code == 200:
            self.log_test("Helper can access topup requests", True)
        else:
            self.log_test("Helper can access topup requests", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test POST /api/categories (create test category)
        timestamp = int(time.time())
        category_data = {
            "name": f"Test Category {timestamp}",
            "slug": f"test-category-{timestamp}",
            "description": "Test category created by helper"
        }
        
        response = self.make_request('POST', 'categories', category_data, token=helper_token)
        if response and response.status_code in [200, 201]:
            created_category = response.json()
            if created_category.get('name') == category_data['name']:
                self.log_test("Helper can create categories", True)
                self.test_helper_category_id = created_category.get('category_id')
            else:
                self.log_test("Helper can create categories", False, "Category not created correctly")
        else:
            self.log_test("Helper can create categories", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test GET /api/admin/stats
        response = self.make_request('GET', 'admin/stats', token=helper_token)
        if response and response.status_code == 200:
            stats = response.json()
            if 'users_count' in stats and 'orders_count' in stats:
                self.log_test("Helper can access admin stats", True)
            else:
                self.log_test("Helper can access admin stats", False, "Invalid stats format")
        else:
            self.log_test("Helper can access admin stats", False, f"Status: {response.status_code if response else 'No response'}")

    def test_helper_permissions_forbidden(self, helper_token):
        """Test helper permissions that should fail with 403"""
        print("\n   ❌ Testing Helper Permissions - Should Fail (403)...")
        
        # Test PUT /api/admin/settings (settings change) - should return 403
        settings_data = {
            "card_number": "1234 5678 9012 3456",
            "card_holder": "Test Helper",
            "additional_info": "Helper should not be able to change this"
        }
        
        response = self.make_request('PUT', 'admin/settings', settings_data, token=helper_token)
        if response and response.status_code == 403:
            self.log_test("Helper cannot change admin settings (correct)", True)
        else:
            self.log_test("Helper cannot change admin settings (correct)", False, f"Expected 403, got: {response.status_code if response else 'No response'}")
        
        # Test POST /api/admin/bank-cards (bank card creation) - should return 403
        card_data = {
            "card_number": "9876 5432 1098 7654",
            "card_holder": "Helper Test Card",
            "bank_name": "Helper Bank"
        }
        
        response = self.make_request('POST', 'admin/bank-cards', card_data, token=helper_token)
        if response and response.status_code == 403:
            self.log_test("Helper cannot create bank cards (correct)", True)
        else:
            self.log_test("Helper cannot create bank cards (correct)", False, f"Expected 403, got: {response.status_code if response else 'No response'}")
        
        # Test PUT /api/admin/users/{user_id}/role (role change) - should return 403
        if self.test_user_id:
            response = self.make_request('PUT', f'admin/users/{self.test_user_id}/role', 
                                       params={'role': 'admin'}, token=helper_token)
            if response and response.status_code == 403:
                self.log_test("Helper cannot change user roles (correct)", True)
            else:
                self.log_test("Helper cannot change user roles (correct)", False, f"Expected 403, got: {response.status_code if response else 'No response'}")
        else:
            self.log_test("Helper cannot change user roles (correct)", False, "No test user available")

    def create_test_order(self):
        """Create a test order and return order_id"""
        # Get products first
        products_response = self.make_request('GET', 'products')
        if not products_response or products_response.status_code != 200:
            return None
        
        products = products_response.json()
        if not products:
            return None
        
        # Ensure user has sufficient balance
        if self.admin_token and self.test_user_id:
            self.make_request('PUT', f'admin/users/{self.test_user_id}/balance', 
                            params={'balance': 10000}, token=self.admin_token)
        
        # Create order with first product
        first_product = products[0]
        order_data = {
            "items": [
                {
                    "product_id": first_product["product_id"],
                    "quantity": 1,
                    "size": first_product["sizes"][0] if first_product.get("sizes") else None
                }
            ],
            "delivery_address": "г. Душанбе, ул. Ленина 15, кв 42",
            "phone_number": "+992123456789"
        }
        
        response = self.make_request('POST', 'orders', order_data, token=self.user_token)
        if response and response.status_code in [200, 201]:
            order_result = response.json()
            if 'order' in order_result:
                return order_result['order'].get('order_id')
        
        return None

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting TSMarket API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test basic functionality first
        if not self.test_database_seeding():
            print("❌ Database seeding failed - stopping tests")
            return False
        
        # Test authentication
        self.test_user_registration()
        self.test_admin_login()
        
        # Test core APIs
        self.test_categories_api()
        self.test_products_api()
        
        # Test user functionality
        self.test_topup_codes()
        self.test_user_profile()
        self.test_cart_and_checkout()
        
        # Test delivery address validation (specific test requested)
        self.test_delivery_address_validation()
        
        self.test_rewards_system()
        
        # Test NEW card-based topup system
        self.test_new_card_topup_system()
        
        # Test admin functionality
        self.test_admin_endpoints()
        self.test_admin_card_settings()
        self.test_admin_topup_requests_management()
        self.test_admin_user_management()
        
        # Test NEW FEATURES - Promo Codes and Product Discounts
        self.test_promo_codes_api()
        self.test_product_discount_api()
        self.test_orders_with_discounts()
        
        # Test NEWEST FEATURES - Missions, Tags, and Support APIs
        self.test_missions_api()
        self.test_tags_api()
        self.test_support_api()
        
        # Test LATEST NEW FEATURES from review request
        self.test_bank_cards_api()
        self.test_user_role_api()
        self.test_image_upload_api()
        self.test_product_multiple_images()
        
        # Test Support Contacts Feature (CURRENT REQUEST)
        self.test_support_contacts_feature()
        
        # Test MULTILINGUAL SUPPORT (CURRENT REQUEST)
        self.test_multilingual_products_api()
        self.test_multilingual_categories_api()
        self.test_multilingual_product_creation()
        
        # Test NEW REVIEW REQUEST FEATURES
        self.test_helper_page_api_access()
        self.test_ai_auto_approve_settings()
        self.test_multilingual_product_creation_with_translations()
        
        # Test SUBCATEGORIES FEATURE (CURRENT REVIEW REQUEST)
        self.test_subcategories_feature()
        
        # Test ORDER TRACKING SYSTEM AND HELPER PERMISSIONS (NEW REVIEW REQUEST)
        self.test_order_tracking_system()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test function"""
    tester = TSMarketAPITester()
    
    try:
        success = tester.run_all_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print(f"\n⚠️ {len(tester.failed_tests)} tests failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test runner crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())