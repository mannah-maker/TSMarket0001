FROM node:20-alpine

WORKDIR /app

# Устанавливаем репозиторий taobao (для Китая) или yarnpkg
RUN npm config set registry https://registry.npmmirror.com/

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "start"]