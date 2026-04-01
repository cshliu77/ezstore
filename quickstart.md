# Quick Start Guide

> EZStore - B2B Quotation & Order Management System

---

## 1. Prerequisites

Install the following tools (latest versions recommended):

| Tool | Download |
|------|----------|
| Node.js | https://nodejs.org/zh-tw/download |
| Bun | https://bun.com/ |
| Go | https://go.dev/dl/ |
| Python | https://www.python.org/downloads/ |
| Docker Desktop | https://www.docker.com/products/docker-desktop/ |
| Playwright | https://playwright.dev/docs/intro |
| uv | https://docs.astral.sh/uv/getting-started/installation/ |

---

## 2. Getting Started

### Step 1: Clone the repository

```bash
git clone https://github.com/cshliu77/ezstore.git
```

### Step 2: Navigate to the project directory

```bash
cd ezstore
```

### Step 3: Run Docker Compose

```bash
docker compose up -d
```

> Uses pre-built images from GHCR (default, no build required).

### Step 4: Run with local build

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

> Builds images from local source code instead of pulling from GHCR.

### Step 5: Seed test data into the database

```bash
docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql
```

### Step 6: Run E2E tests via Playwright (Containerized)

```bash
docker compose run --rm e2e
```

### Step 7: (Optional) Run E2E tests via Playwright (Local)

```bash
cd frontend
bun run e2e
```

### Step 8: Access the application

Open your browser and navigate to:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger/index.html |
| Health Check | http://localhost:8080/health |
