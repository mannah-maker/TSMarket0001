#!/usr/bin/env python3

import requests
import json

def test_delivery_address_validation():
    """Test delivery address validation in TSMarket checkout process"""
    
    base_url = 'https://tsmarket.preview.emergentagent.com'
    
    print("🏠 Testing TSMarket Delivery Address Feature")
    print("=" * 50)
    
    # Step 1: Login as admin
    print("1. Logging in as admin@tsmarket.com...")
    login_data = {'email': 'admin@tsmarket.com', 'password': 'admin123'}
    login_response = requests.post(f'{base_url}/api/auth/login', json=login_data)
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return False
    
    token = login_response.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    print("✅ Login successful")
    
    # Test scenarios
    test_results = []
    
    # Test 1: Order WITHOUT delivery address - should fail with 422
    print("\n2. Testing order WITHOUT delivery address...")
    order_data = {
        'items': [{'product_id': 'prod_001', 'quantity': 1}]
        # No delivery_address field
    }
    
    response = requests.post(f'{base_url}/api/orders', json=order_data, headers=headers)
    if response.status_code == 422:
        error_detail = response.json().get('detail', [])
        if any('delivery_address' in str(detail) for detail in error_detail):
            print("✅ Order without delivery address correctly failed with validation error")
            test_results.append(True)
        else:
            print(f"❌ Wrong validation error: {error_detail}")
            test_results.append(False)
    else:
        print(f"❌ Expected 422 validation error, got: {response.status_code}")
        test_results.append(False)
    
    # Test 2: Order with empty delivery address - should fail with 400
    print("\n3. Testing order with EMPTY delivery address...")
    order_data = {
        'items': [{'product_id': 'prod_001', 'quantity': 1}],
        'delivery_address': ''
    }
    
    response = requests.post(f'{base_url}/api/orders', json=order_data, headers=headers)
    if response.status_code == 400:
        error_detail = response.json().get('detail', '')
        if 'Delivery address is required' in error_detail:
            print("✅ Order with empty delivery address correctly failed")
            test_results.append(True)
        else:
            print(f"❌ Wrong error message: {error_detail}")
            test_results.append(False)
    else:
        print(f"❌ Expected 400 error, got: {response.status_code}")
        test_results.append(False)
    
    # Test 3: Order with short address (less than 5 chars) - should fail with 400
    print("\n4. Testing order with SHORT delivery address (less than 5 chars)...")
    order_data = {
        'items': [{'product_id': 'prod_001', 'quantity': 1}],
        'delivery_address': '123'
    }
    
    response = requests.post(f'{base_url}/api/orders', json=order_data, headers=headers)
    if response.status_code == 400:
        error_detail = response.json().get('detail', '')
        if 'Delivery address is required' in error_detail:
            print("✅ Order with short delivery address correctly failed")
            test_results.append(True)
        else:
            print(f"❌ Wrong error message: {error_detail}")
            test_results.append(False)
    else:
        print(f"❌ Expected 400 error, got: {response.status_code}")
        test_results.append(False)
    
    # Test 4: Order with valid address - should succeed
    print("\n5. Testing order with VALID delivery address...")
    order_data = {
        'items': [{'product_id': 'prod_001', 'quantity': 1}],
        'delivery_address': 'г. Душанбе, ул. Ленина 15, кв 42'
    }
    
    response = requests.post(f'{base_url}/api/orders', json=order_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        saved_address = result.get('order', {}).get('delivery_address')
        if saved_address == 'г. Душанбе, ул. Ленина 15, кв 42':
            print("✅ Order with valid delivery address succeeded and address saved correctly")
            test_results.append(True)
        else:
            print(f"❌ Order created but delivery address not saved correctly: {saved_address}")
            test_results.append(False)
    else:
        print(f"❌ Expected 200 success, got: {response.status_code}")
        if response.status_code == 400:
            error_detail = response.json().get('detail', '')
            print(f"Error: {error_detail}")
        test_results.append(False)
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DELIVERY ADDRESS VALIDATION TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(test_results)
    total = len(test_results)
    
    print(f"Tests passed: {passed}/{total}")
    print(f"Success rate: {(passed/total*100):.1f}%")
    
    if passed == total:
        print("🎉 ALL DELIVERY ADDRESS VALIDATION TESTS PASSED!")
        return True
    else:
        print("⚠️ Some tests failed")
        return False

if __name__ == "__main__":
    test_delivery_address_validation()