FROM python:3.11-slim

WORKDIR /app
environment:
  - MONGO_URL=mongodb+srv://tsmarket:1234567890@cluster0.qyakzfk.mongodb.net/

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
