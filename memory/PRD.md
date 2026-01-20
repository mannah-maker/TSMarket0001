# TSMarket - Gamified E-commerce Platform

## Original Problem Statement
Создать полноценный рабочий интернет-магазин TSMarket с геймификацией, балансом, XP и скрытой админкой только для админа.

## User Personas
1. **Гость** - может просматривать каталог и главную страницу
2. **Пользователь** - полный доступ к магазину, корзине, профилю, наградам, пополнению
3. **Админ** - доступ к скрытой /admin панели для управления всем магазином

## Core Requirements (All Implemented)
- ✅ Регистрация и вход (JWT + Google OAuth)
- ✅ Каталог товаров с фильтрами (поиск, цена, XP, категория)
- ✅ Система баланса с пополнением через карту + скриншот чека
- ✅ Корзина и оформление заказов
- ✅ XP-система с уровнями (формула: 100 + level*50)
- ✅ Колесо фортуны и награды за уровни
- ✅ Скрытая админка (/admin) для полного управления
- ✅ Двуязычность (Тоҷикӣ + Русский)

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- User authentication (JWT + Google OAuth via Emergent)
- Products, Categories CRUD
- Orders with XP calculation and level-up
- **NEW: Card-based top-up system**
  - Admin sets card number in settings
  - Users submit requests with receipt screenshots
  - Admin approves/rejects requests
- Rewards and Fortune Wheel
- **Full admin API endpoints**:
  - User management (edit balance, XP, delete, toggle admin)
  - Top-up requests management (approve/reject)
  - Card settings management
  - Products, categories, rewards, wheel prizes CRUD

### Frontend (React + Tailwind)
- **Bilingual UI (TJ + RU)** with language switcher
- Home page with hero, features, categories
- Catalog with search/filters
- Product detail page with size selection
- Cart with checkout
- Profile with XP progress, balance, achievements
- **TopUp page with card-based system**:
  - Displays admin's card number
  - Receipt image upload
  - Request history with status
- Rewards page with Fortune Wheel
- **Enhanced Admin panel**:
  - Dashboard with stats
  - Top-up requests management
  - Card settings tab
  - User management with edit/delete
  - Products, categories, rewards, wheel management
  - Orders history

### Design
- Solar Punk Arcade aesthetic
- Light green-aquamarine theme (#F0FDFA background)
- Unbounded + Outfit fonts
- Gamification UI (XP bars, level badges, neon glows)
- TSMarket dragon logo

## Demo Credentials
- **Admin**: admin@tsmarket.com / admin123
- **Card for payments**: 1234 5678 9012 3456

## Languages
- 🇷🇺 Русский (Russian) - default
- 🇹🇯 Тоҷикӣ (Tajik)

## P0/P1 Features Completed
- [x] P0: User auth (JWT + Google OAuth)
- [x] P0: Product catalog with filters
- [x] P0: Cart and checkout
- [x] P0: Balance top-up with card + receipt
- [x] P0: XP/Level system
- [x] P0: Full admin panel
- [x] P1: Fortune Wheel
- [x] P1: Bilingual support (TJ/RU)
- [x] P1: User management in admin

## Technical Stack
- Backend: FastAPI, Motor (MongoDB async), Pydantic
- Frontend: React 19, Tailwind CSS, Shadcn UI
- Database: MongoDB
- Auth: JWT + Emergent Google OAuth

## Next Actions
1. Add push notifications for request status updates
2. Add order status tracking (processing, shipped, delivered)
3. Implement discount/coupon system
