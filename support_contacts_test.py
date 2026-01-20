#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class SupportContactsTester:
    def __init__(self, base_url="https://tsmarket.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
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

    def test_admin_login(self):
        """Test admin login"""
        print("🔐 Testing Admin Login...")
        
        admin_data = {
            "email": "admin@tsmarket.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.admin_token = data['token']
                if data['user'].get('is_admin'):
                    self.log_test("Admin login", True)
                    return True
        
        self.log_test("Admin login", False, f"Status: {response.status_code if response else 'No response'}")
        return False

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

    def run_tests(self):
        """Run support contacts tests"""
        print("🚀 Starting Support Contacts Feature Tests...")
        print(f"Base URL: {self.base_url}")
        
        # Login as admin first
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Run support contacts feature tests
        self.test_support_contacts_feature()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failed in self.failed_tests:
                print(f"  - {failed['test']}: {failed['error']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test function"""
    tester = SupportContactsTester()
    
    try:
        success = tester.run_tests()
        
        if success:
            print("\n🎉 All support contacts tests passed!")
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