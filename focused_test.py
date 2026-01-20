#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class FocusedTSMarketTester:
    def __init__(self, base_url="https://tsmarket.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
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
                response = self.session.get(url, headers=request_headers, params=params, timeout=15)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=request_headers, params=params, timeout=15)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=request_headers, params=params, timeout=15)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=request_headers, params=params, timeout=15)
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_helper_access(self):
        """Test Helper Page API Access"""
        print("\n🔧 Testing Helper Page API Access...")
        
        # Login as helper user
        helper_login_data = {
            "email": "helper@tsmarket.com",
            "password": "helper123"
        }
        
        response = self.make_request('POST', 'auth/login', helper_login_data)
        if response and response.status_code == 200:
            data = response.json()
            helper_token = data.get('token')
            self.log_test("Helper login", True)
            
            # Test admin/topup-requests access
            response = self.make_request('GET', 'admin/topup-requests', token=helper_token)
            if response and response.status_code == 200:
                self.log_test("Helper can access admin/topup-requests", True)
            else:
                self.log_test("Helper can access admin/topup-requests", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test admin/orders access
            response = self.make_request('GET', 'admin/orders', token=helper_token)
            if response and response.status_code == 200:
                self.log_test("Helper can access admin/orders", True)
            else:
                self.log_test("Helper can access admin/orders", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test products access (public)
            response = self.make_request('GET', 'products')
            if response and response.status_code == 200:
                self.log_test("Helper can access products (public)", True)
            else:
                self.log_test("Helper can access products (public)", False, f"Status: {response.status_code if response else 'No response'}")
            
            # Test product creation
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
            self.log_test("Helper login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_ai_auto_approve(self):
        """Test AI Auto-Approve Settings"""
        print("\n🤖 Testing AI Auto-Approve Settings...")
        
        # Login as admin
        admin_login_data = {
            "email": "admin@tsmarket.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_login_data)
        if response and response.status_code == 200:
            data = response.json()
            admin_token = data.get('token')
            self.log_test("Admin login", True)
            
            # Test PUT /api/admin/settings with ai_auto_approve_enabled: true
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
            
            response = self.make_request('PUT', 'admin/settings', settings_data, token=admin_token)
            if response and response.status_code == 200:
                self.log_test("Set AI auto-approve enabled to true", True)
                
                # Test GET /api/admin/settings and check ai_auto_approve_enabled is true
                response = self.make_request('GET', 'admin/settings', token=admin_token)
                if response and response.status_code == 200:
                    settings = response.json()
                    if settings.get('ai_auto_approve_enabled') == True:
                        self.log_test("Verify AI auto-approve setting is saved as true", True)
                    else:
                        self.log_test("Verify AI auto-approve setting is saved as true", False, f"ai_auto_approve_enabled is {settings.get('ai_auto_approve_enabled')}")
                else:
                    self.log_test("Verify AI auto-approve setting is saved as true", False, f"Status: {response.status_code if response else 'No response'}")
            else:
                self.log_test("Set AI auto-approve enabled to true", False, f"Status: {response.status_code if response else 'No response'}")
        else:
            self.log_test("Admin login", False, f"Status: {response.status_code if response else 'No response'}")

    def test_multilingual_products(self):
        """Test Products API with multilingual fields"""
        print("\n🌐 Testing Products API with Russian and Tajik translations...")
        
        # Login as admin
        admin_login_data = {
            "email": "admin@tsmarket.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_login_data)
        if response and response.status_code == 200:
            data = response.json()
            admin_token = data.get('token')
            
            # Create test product with Russian and Tajik translations
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
            
            response = self.make_request('POST', 'products', product_data, token=admin_token)
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
                    
                    # Verify retrieval
                    product_id = created_product.get('product_id')
                    get_response = self.make_request('GET', f'products/{product_id}')
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
        else:
            self.log_test("Admin login for multilingual test", False, f"Status: {response.status_code if response else 'No response'}")

    def run_focused_tests(self):
        """Run the 3 specific tests requested"""
        print("🚀 Starting Focused TSMarket API Tests...")
        print(f"Base URL: {self.base_url}")
        
        # Test 1: Helper Page API Access
        self.test_helper_access()
        
        # Test 2: AI Auto-Approve Settings
        self.test_ai_auto_approve()
        
        # Test 3: Products API with multilingual fields
        self.test_multilingual_products()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failed in self.failed_tests:
                print(f"  - {failed['test']}: {failed['error']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = FocusedTSMarketTester()
    success = tester.run_focused_tests()
    sys.exit(0 if success else 1)