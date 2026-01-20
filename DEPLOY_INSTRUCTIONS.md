# 🚀 Инструкция по развёртыванию TSMarket

## Требования
- Node.js 18+ 
- Python 3.10+
- MongoDB (локально или MongoDB Atlas)

---

## 1. Настройка MongoDB

### Вариант A: MongoDB Atlas (облако, бесплатно)
1. Зарегистрируйтесь на https://www.mongodb.com/atlas
2. Создайте бесплатный кластер (M0 Free)
3. Создайте пользователя БД (Database Access)
4. Разрешите доступ с любого IP (Network Access → Add IP → 0.0.0.0/0)
5. Скопируйте connection string: `mongodb+srv://user:password@cluster.mongodb.net/tsmarket`

### Вариант B: Локальная MongoDB
1. Установите MongoDB: https://www.mongodb.com/try/download/community
2. Запустите: `mongod`
3. Connection string: `mongodb://localhost:27017/tsmarket`

---

## 2. Настройка Backend

```bash
cd backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте (Windows)
venv\Scripts\activate

# Активируйте (Mac/Linux)
source venv/bin/activate

# Установите зависимости
pip install -r requirements.txt
```

### Настройте .env файл:
```env
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/tsmarket
DB_NAME=tsmarket
JWT_SECRET=your-super-secret-key-change-this-in-production
```

### Запустите сервер:
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Backend будет доступен: http://localhost:8001

---

## 3. Настройка Frontend

```bash
cd frontend

# Установите зависимости
npm install
# или
yarn install
```

### Настройте .env файл:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Запустите приложение:
```bash
npm start
# или
yarn start
```

Frontend будет доступен: http://localhost:3000

---

## 4. Создание администратора

После первого запуска зарегистрируйте пользователя через интерфейс, затем сделайте его админом через MongoDB:

```javascript
// В MongoDB Compass или mongosh:
use tsmarket
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

---

## 5. Деплой на хостинг

### Вариант A: Vercel (Frontend) + Railway (Backend)

#### Frontend на Vercel:
1. Загрузите папку `frontend` на GitHub
2. Подключите к Vercel: https://vercel.com
3. Добавьте переменную: `REACT_APP_BACKEND_URL=https://your-backend.railway.app`

#### Backend на Railway:
1. Загрузите папку `backend` на GitHub
2. Подключите к Railway: https://railway.app
3. Добавьте переменные окружения (MONGO_URL, DB_NAME, JWT_SECRET)
4. Railway автоматически определит Python проект

### Вариант B: VPS (DigitalOcean, Linode, etc.)

```bash
# На сервере
sudo apt update
sudo apt install python3-pip nodejs npm nginx

# Backend
cd backend
pip3 install -r requirements.txt
# Используйте gunicorn для продакшена:
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001

# Frontend - соберите статику
cd frontend
npm install
npm run build
# Скопируйте build/ в nginx
```

### Вариант C: Docker

Создайте `docker-compose.yml`:
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017/tsmarket
      - DB_NAME=tsmarket
      - JWT_SECRET=your-secret-key
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001

volumes:
  mongo_data:
```

```bash
docker-compose up -d
```

---

## 6. Важные замечания

### Безопасность:
- Измените JWT_SECRET на длинную случайную строку
- Используйте HTTPS в продакшене
- Ограничьте доступ к MongoDB

### CORS:
В `backend/server.py` обновите список разрешённых доменов:
```python
allow_origins=["https://your-domain.com", "http://localhost:3000"]
```

### Переменные окружения:
Никогда не коммитьте .env файлы в Git!

---

## Поддержка

Если возникнут вопросы - создайте issue в репозитории или напишите разработчику.

Удачного деплоя! 🎉
