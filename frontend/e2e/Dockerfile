FROM mcr.microsoft.com/playwright:v1.59.0-noble
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install --save-dev @playwright/test
COPY playwright.config.ts ./
COPY e2e/ ./e2e/
ENV BASE_URL=http://frontend:80
ENV API_URL=http://backend:8080
CMD ["npx", "playwright", "test"]
