FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers with all system dependencies
RUN npx playwright install --with-deps chromium

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Keep container running for manual scraper execution
CMD ["tail", "-f", "/dev/null"]
