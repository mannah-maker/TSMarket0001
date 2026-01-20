#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class FocusedOrderTest:
    def __init__(self, base_url="https://tsmarket.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.helper_token = None
        self.test_order_id = None

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

    def setup_tokens(self):
        """Setup all required tokens"""
        print("🔐 Setting up authentication tokens...")
        
        # Admin login
        admin_data = {"email": "admin@tsmarket.com", "password": "admin123"}
        response = self.make_request('POST', 'auth/login', admin_data)
        if response and response.status_code == 200:
            self.admin_token = response.json().get('token')
            print("✅ Admin login successful")
        else:
            print("❌ Admin login failed")
            return False
        
        # Helper login
        helper_data = {"email": "helper@tsmarket.com", "password": "helper123"}
        response = self.make_request('POST', 'auth/login', helper_data)
        if response and response.status_code == 200:
            self.helper_token = response.json().get('token')
            print("✅ Helper login successful")
        else:
            print("❌ Helper login failed")
            return False
        
        # Regular user login (use admin as user for testing)
        self.user_token = self.admin_token
        print("✅ User token set")
        
        return True

    def create_test_order(self):
        """Create a test order for status updates"""
        print("\n📦 Creating test order...")
        
        # Get products
        response = self.make_request('GET', 'products')
        if not response or response.status_code != 200:
            print("❌ Failed to get products")
            return False
        
        products = response.json()
        if not products:
            print("❌ No products available")
            return False
        
        # Create order
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
                self.test_order_id = order_result['order'].get('order_id')
                print(f"✅ Test order created: {self.test_order_id}")
                return True
        
        print(f"❌ Order creation failed: {response.status_code if response else 'No response'}")
        if response:
            print(f"   Error: {response.text}")
        return False

    def test_order_status_update(self):
        """Test 1: Order Status Update API"""
        print("\n📝 Test 1: Order Status Update API (Helper)")
        
        if not self.test_order_id:
            print("❌ No test order available")
            return False
        
        # Test PUT /api/admin/orders/{order_id}/status with helper token
        status_data = {
            "status": "processing",
            "note": "Test processing"
        }
        
        response = self.make_request('PUT', f'admin/orders/{self.test_order_id}/status', 
                                   status_data, token=self.helper_token)
        
        if response and response.status_code == 200:
            result = response.json()
            print(f"✅ Helper successfully updated order status to: {result.get('status')}")
            return True
        else:
            print(f"❌ Helper failed to update order status: {response.status_code if response else 'No response'}")
            if response:
                print(f"   Error: {response.text}")
            return False

    def test_order_tracking(self):
        """Test 2: Order Tracking API (User)"""
        print("\n🔍 Test 2: Order Tracking API (User)")
        
        # Get user's orders
        response = self.make_request('GET', 'orders', token=self.user_token)
        if not response or response.status_code != 200:
            print("❌ Failed to get user orders")
            return False
        
        orders = response.json()
        if not orders:
            print("❌ No orders found")
            return False
        
        order_id = orders[0].get('order_id')
        print(f"✅ Found order: {order_id}")
        
        # Test order tracking
        response = self.make_request('GET', f'orders/{order_id}/track', token=self.user_token)
        if response and response.status_code == 200:
            tracking_data = response.json()
            required_fields = ['order_id', 'status', 'status_history']
            
            if all(field in tracking_data for field in required_fields):
                print("✅ Order tracking returns correct data:")
                print(f"   Order ID: {tracking_data.get('order_id')}")
                print(f"   Status: {tracking_data.get('status')}")
                print(f"   Status History: {len(tracking_data.get('status_history', []))} entries")
                return True
            else:
                print(f"❌ Missing required fields in tracking data: {tracking_data}")
                return False
        else:
            print(f"❌ Order tracking failed: {response.status_code if response else 'No response'}")
            return False

    def test_helper_permissions_allowed(self):
        """Test 3: Helper Permissions - Should Work"""
        print("\n✅ Test 3: Helper Permissions - Should Work")
        
        tests = [
            ("GET /api/admin/orders", "admin/orders"),
            ("GET /api/admin/topup-requests", "admin/topup-requests"),
            ("GET /api/admin/stats", "admin/stats")
        ]
        
        success_count = 0
        for test_name, endpoint in tests:
            response = self.make_request('GET', endpoint, token=self.helper_token)
            if response and response.status_code == 200:
                print(f"✅ {test_name}")
                success_count += 1
            else:
                print(f"❌ {test_name}: {response.status_code if response else 'No response'}")
        
        # Test category creation
        timestamp = int(time.time())
        category_data = {
            "name": f"Test Category {timestamp}",
            "slug": f"test-category-{timestamp}",
            "description": "Test category created by helper"
        }
        
        response = self.make_request('POST', 'categories', category_data, token=self.helper_token)
        if response and response.status_code in [200, 201]:
            print("✅ POST /api/categories (create test category)")
            success_count += 1
        else:
            print(f"❌ POST /api/categories: {response.status_code if response else 'No response'}")
        
        return success_count == 4

    def test_helper_permissions_forbidden(self):
        """Test 4: Helper Permissions - Should Fail (403)"""
        print("\n❌ Test 4: Helper Permissions - Should Fail (403)")
        
        # Test settings change
        settings_data = {
            "card_number": "1234 5678 9012 3456",
            "card_holder": "Test Helper",
            "additional_info": "Helper should not access this"
        }
        
        response = self.make_request('PUT', 'admin/settings', settings_data, token=self.helper_token)
        if response and response.status_code == 403:
            print("✅ PUT /api/admin/settings (correctly forbidden)")
        else:
            print(f"❌ PUT /api/admin/settings: Expected 403, got {response.status_code if response else 'No response'}")
        
        # Test bank card creation
        card_data = {
            "card_number": "9876 5432 1098 7654",
            "card_holder": "Helper Test Card",
            "bank_name": "Helper Bank"
        }
        
        response = self.make_request('POST', 'admin/bank-cards', card_data, token=self.helper_token)
        if response and response.status_code == 403:
            print("✅ POST /api/admin/bank-cards (correctly forbidden)")
        else:
            print(f"❌ POST /api/admin/bank-cards: Expected 403, got {response.status_code if response else 'No response'}")
        
        # Test role change (use a dummy user ID)
        response = self.make_request('PUT', 'admin/users/dummy_user/role', 
                                   params={'role': 'admin'}, token=self.helper_token)
        if response and response.status_code == 403:
            print("✅ PUT /api/admin/users/{user_id}/role (correctly forbidden)")
        else:
            print(f"❌ PUT /api/admin/users/role: Expected 403, got {response.status_code if response else 'No response'}")

    def run_focused_tests(self):
        """Run the focused order tracking tests"""
        print("🎯 TSMarket Order Tracking System - Focused Tests")
        print("=" * 60)
        
        if not self.setup_tokens():
            return False
        
        # Create test order (optional - use existing if creation fails)
        self.create_test_order()
        
        # Run the 4 main tests
        print("\n" + "=" * 60)
        self.test_order_status_update()
        self.test_order_tracking()
        self.test_helper_permissions_allowed()
        self.test_helper_permissions_forbidden()
        
        print("\n" + "=" * 60)
        print("🎉 Focused testing completed!")
        return True

def main():
    tester = FocusedOrderTest()
    try:
        success = tester.run_focused_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test runner crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())