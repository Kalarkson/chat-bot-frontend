FROM node:18-alpine

WORKDIR /app

COPY chat-bot/package*.json ./
RUN npm ci
COPY chat-bot/ ./

RUN npm run build

EXPOSE 4003

CMD ["npm", "start", "--", "-H", "0.0.0.0"]