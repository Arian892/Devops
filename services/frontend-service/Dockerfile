FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S frontend -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R frontend:nodejs /app

# Switch to the non-root user
USER frontend

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
