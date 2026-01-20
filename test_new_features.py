#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class NewFeaturesAPITester:
    def __init__(self, base_url="https://tsmarket.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.helper_token = None
        self.test_user_id = None
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

    def setup_auth(self):
        """Setup authentication tokens"""
        print("🔐 Setting up authentication...")
        
        # Register test user
        timestamp = int(time.time())
        test_data = {
            "email": f"testuser{timestamp}@test.com",
            "password": "testpass123",
            "name": f"Test User {timestamp}"
        }
        
        response = self.make_request('POST', 'auth/register', test_data)
        if response and response.status_code in [200, 201]:
            data = response.json()
            self.user_token = data['token']
            self.test_user_id = data['user']['user_id']
            print(f"✅ User registered: {self.test_user_id}")
        
        # Admin login
        admin_data = {
            "email": "admin@tsmarket.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            self.admin_token = data['token']
            print(f"✅ Admin logged in")
        
        return self.admin_token and self.user_token

    def test_bank_cards_api(self):
        """Test Bank Cards API (NEW FEATURE)"""
        print("\n💳 Testing Bank Cards API...")
        
        # Test 1: GET /api/bank-cards - public endpoint
        response = self.make_request('GET', 'bank-cards')
        if response and response.status_code == 200:
            self.log_test("GET /api/bank-cards (public)", True)
        else:
            self.log_test("GET /api/bank-cards (public)", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 2: GET /api/admin/bank-cards - admin endpoint
        response = self.make_request('GET', 'admin/bank-cards', token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("GET /api/admin/bank-cards", True)
        else:
            self.log_test("GET /api/admin/bank-cards", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 3: POST /api/admin/bank-cards - create card
        timestamp = int(time.time())
        card_data = {
            "card_number": f"1234 5678 9012 {timestamp % 10000:04d}",
            "card_holder": f"Test Cardholder {timestamp}",
            "bank_name": "Test Bank"
        }
        
        response = self.make_request('POST', 'admin/bank-cards', card_data, token=self.admin_token)
        if response and response.status_code in [200, 201]:
            created_card = response.json()
            self.test_card_id = created_card.get('card_id')
            self.log_test("POST /api/admin/bank-cards (create)", True)
        else:
            self.log_test("POST /api/admin/bank-cards (create)", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 4: PUT /api/admin/bank-cards/{card_id}/toggle
        if hasattr(self, 'test_card_id'):
            response = self.make_request('PUT', f'admin/bank-cards/{self.test_card_id}/toggle', token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("PUT /api/admin/bank-cards/{card_id}/toggle", True)
            else:
                self.log_test("PUT /api/admin/bank-cards/{card_id}/toggle", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Test 5: DELETE /api/admin/bank-cards/{card_id}
        if hasattr(self, 'test_card_id'):
            response = self.make_request('DELETE', f'admin/bank-cards/{self.test_card_id}', token=self.admin_token)
            if response and response.status_code == 200:
                self.log_test("DELETE /api/admin/bank-cards/{card_id}", True)
            else:
                self.log_test("DELETE /api/admin/bank-cards/{card_id}", False, f"Status: {response.status_code if response else 'No response'}")

    def test_user_role_api(self):
        """Test User Role API (NEW FEATURE)"""
        print("\n👥 Testing User Role API...")
        
        # Test 1: PUT /api/admin/users/{user_id}/role?role=helper
        response = self.make_request('PUT', f'admin/users/{self.test_user_id}/role', 
                                   params={'role': 'helper'}, token=self.admin_token)
        if response and response.status_code == 200:
            self.log_test("PUT /api/admin/users/{user_id}/role?role=helper", True)
            
            # Login as helper to get helper token
            user_response = self.make_request('GET', 'admin/users', token=self.admin_token)
            if user_response and user_response.status_code == 200:
                users = user_response.json()
                test_user = next((u for u in users if u.get('user_id') == self.test_user_id), None)
                
                if test_user:
                    helper_login_data = {
                        "email": test_user['email'],
                        "password": "testpass123"
                    }
                    
                    login_response = self.make_request('POST', 'auth/login', helper_login_data)
                    if login_response and login_response.status_code == 200:
                        self.helper_token = login_response.json().get('token')
                        
                        # Test 2: Helper can access /api/admin/orders
                        orders_response = self.make_request('GET', 'admin/orders', token=self.helper_token)
                        if orders_response and orders_response.status_code == 200:
                            self.log_test("Helper can access /api/admin/orders", True)
                        else:
                            self.log_test("Helper can access /api/admin/orders", False, f"Status: {orders_response.status_code if orders_response else 'No response'}")
                        
                        # Test 3: Helper can access /api/admin/topup-requests/approve
                        # Create a topup request first
                        topup_data = {
                            "amount": 500,
                            "receipt_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
                        }
                        topup_response = self.make_request('POST', 'topup/request', topup_data, token=self.user_token)
                        if topup_response and topup_response.status_code in [200, 201]:
                            request_id = topup_response.json().get('request_id')
                            if request_id:
                                approve_response = self.make_request('PUT', f'admin/topup-requests/{request_id}/approve', token=self.helper_token)
                                if approve_response and approve_response.status_code == 200:
                                    self.log_test("Helper can access /api/admin/topup-requests/approve", True)
                                else:
                                    self.log_test("Helper can access /api/admin/topup-requests/approve", False, f"Status: {approve_response.status_code if approve_response else 'No response'}")
                        
                        # Test 4: Helper CANNOT access /api/admin/users
                        users_response = self.make_request('GET', 'admin/users', token=self.helper_token)
                        if users_response and users_response.status_code == 403:
                            self.log_test("Helper CANNOT access /api/admin/users (correct)", True)
                        else:
                            self.log_test("Helper CANNOT access /api/admin/users (correct)", False, f"Expected 403, got: {users_response.status_code if users_response else 'No response'}")
                        
                        # Test 5: Helper CANNOT access /api/admin/settings
                        settings_response = self.make_request('GET', 'admin/settings', token=self.helper_token)
                        if settings_response and settings_response.status_code == 403:
                            self.log_test("Helper CANNOT access /api/admin/settings (correct)", True)
                        else:
                            self.log_test("Helper CANNOT access /api/admin/settings (correct)", False, f"Expected 403, got: {settings_response.status_code if settings_response else 'No response'}")
        else:
            self.log_test("PUT /api/admin/users/{user_id}/role?role=helper", False, f"Status: {response.status_code if response else 'No response'}")

    def test_image_upload_api(self):
        """Test Image Upload API (NEW FEATURE)"""
        print("\n🖼️ Testing Image Upload API...")
        
        # Test POST /api/admin/upload-image
        test_image_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        
        image_data = {
            "image": test_image_base64
        }
        
        response = self.make_request('POST', 'admin/upload-image', image_data, token=self.admin_token)
        if response and response.status_code == 200:
            result = response.json()
            if 'image_url' in result:
                self.log_test("POST /api/admin/upload-image", True)
            else:
                self.log_test("POST /api/admin/upload-image", False, "No image_url in response")
        else:
            self.log_test("POST /api/admin/upload-image", False, f"Status: {response.status_code if response else 'No response'}")

    def test_product_multiple_images(self):
        """Test Product with Multiple Images (NEW FEATURE)"""
        print("\n📸 Testing Product with Multiple Images...")
        
        # Get categories first
        categories_response = self.make_request('GET', 'categories')
        if not categories_response or categories_response.status_code != 200:
            self.log_test("Product Multiple Images (setup)", False, "Cannot get categories")
            return
        
        categories = categories_response.json()
        if not categories:
            self.log_test("Product Multiple Images (setup)", False, "No categories available")
            return
        
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
            if ('images' in created_product and 
                len(created_product['images']) == 3 and
                created_product.get('image_url') == test_images[0]):
                self.log_test("POST /api/products with multiple images", True)
                self.test_product_id = created_product.get('product_id')
            else:
                self.log_test("POST /api/products with multiple images", False, "Images not saved correctly")
        else:
            self.log_test("POST /api/products with multiple images", False, f"Status: {response.status_code if response else 'No response'}")
        
        # Verify retrieval
        if hasattr(self, 'test_product_id'):
            get_response = self.make_request('GET', f'products/{self.test_product_id}')
            if get_response and get_response.status_code == 200:
                product = get_response.json()
                if 'images' in product and len(product['images']) == 3:
                    self.log_test("GET /api/products/{id} returns multiple images", True)
                else:
                    self.log_test("GET /api/products/{id} returns multiple images", False, "Images not retrieved correctly")
            else:
                self.log_test("GET /api/products/{id} returns multiple images", False, f"Status: {get_response.status_code if get_response else 'No response'}")

    def run_tests(self):
        """Run all NEW feature tests"""
        print("🚀 Testing NEW TSMarket Features...")
        print(f"Testing against: {self.base_url}")
        
        if not self.setup_auth():
            print("❌ Authentication setup failed - stopping tests")
            return False
        
        self.test_bank_cards_api()
        self.test_user_role_api()
        self.test_image_upload_api()
        self.test_product_multiple_images()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print(f"\n📊 NEW Features Test Summary:")
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
    tester = NewFeaturesAPITester()
    
    try:
        success = tester.run_tests()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("\n🎉 All NEW features tests passed!")
            return 0
        else:
            print(f"\n⚠️ {len(tester.failed_tests)} NEW features tests failed")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test runner crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())