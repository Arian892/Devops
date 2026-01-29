FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY src ./src

# Start the service
CMD ["node", "src/app.js"]
