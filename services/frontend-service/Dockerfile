# Development mode for faster startup
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY public ./public
COPY src ./src

# Expose the port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV REACT_APP_API_URL=http://localhost:8081

# Start the development server
CMD ["npm", "start"]
