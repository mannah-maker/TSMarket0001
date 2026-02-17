
import sys
import os

def verify_server_changes():
    server_path = '/home/ubuntu/project_root/TSMarket0001-main/backend/server.py'
    with open(server_path, 'r') as f:
        content = f.read()
    
    # Check daily bonus change
    bonus_check = 'coins = (settings.get("daily_bonus_coins", 10.0) if settings else 10.0) * user_level'
    if bonus_check in content:
        print("✅ Daily bonus multiplication logic found in server.py")
    else:
        print("❌ Daily bonus multiplication logic NOT found in server.py")
        
    # Check level discount change
    discount_check = 'level_discount_percent = 10 + (user_level - 10) * 0.5'
    cap_check = 'min(level_discount_percent, 15)'
    if discount_check in content and cap_check not in content:
        print("✅ Level discount logic (0.5% after level 10, NO CAP) found in server.py")
    elif cap_check in content:
        print("❌ Level discount still has 15% cap in server.py")
    else:
        print("❌ Level discount logic NOT found in server.py")

def verify_frontend_changes():
    cart_path = '/home/ubuntu/project_root/TSMarket0001-main/frontend/src/pages/Cart.jsx'
    with open(cart_path, 'r') as f:
        content = f.read()
        
    # Check level discount change in frontend
    discount_check = 'let levelDiscount = userLevel <= 10 ? userLevel : 10 + (userLevel - 10) * 0.5;'
    cap_check = 'Math.min(levelDiscount, 15)'
    if discount_check in content and cap_check not in content:
        print("✅ Level discount logic (NO CAP) found in Cart.jsx")
    elif cap_check in content:
        print("❌ Level discount still has 15% cap in Cart.jsx")
    else:
        print("❌ Level discount logic NOT found in Cart.jsx")

if __name__ == "__main__":
    verify_server_changes()
    verify_frontend_changes()
