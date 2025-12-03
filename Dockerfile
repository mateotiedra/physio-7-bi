FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and PM2 globally
RUN npm ci && npm install -g pm2

# Install Playwright browsers with all system dependencies
RUN npx playwright install --with-deps chromium

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Keep container running for manual scraper execution
CMD ["tail", "-f", "/dev/null"]
