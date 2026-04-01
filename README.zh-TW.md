# EZStore

> 輕量級 B2B 報價與訂單管理系統。

[English](README.md)

---

## 第一部分 — 給開發者閱讀

### 功能概述

EZStore 提供四大核心模組，管理 B2B 銷售流程：

| 模組 | 說明 |
|------|------|
| **客戶管理** | 客戶資料的 CRUD — 公司名稱、統一編號、聯絡資訊、地址、客戶等級（VIP / 一般 / 新客戶）、信用評分 |
| **產品管理** | 產品資料的 CRUD — 產品編號、名稱、描述、成本、牌價、庫存、供應商 |
| **報價單管理** | 報價單的建立、修改、發佈、刪除。單價由「報價因子」乘以牌價計算。已發佈的報價單不可再修改。 |
| **訂單管理** | 訂單的 CRUD — 可選擇關聯已發佈的報價單 |

### 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | Go 1.25 · Gin · GORM · Swagger (swaggo) · Testify |
| 前端 | React 19 · TypeScript · Tailwind CSS 4 · Vite 8 · TanStack React Query · React Hook Form · React Router |
| 資料庫 | PostgreSQL 16 |
| 編譯部署 | Docker · Docker Compose · Bun（前端）· Nginx（前端服務與 API 反向代理）|

### 專案目錄結構

```
ezstore/
├── docker-compose.yml          # 整合三個服務的編排檔
├── scripts/
│   └── seed-test-data.sql      # 冪等測試資料集（TRUNCATE + INSERT）
├── backend/
│   ├── Dockerfile
│   ├── main.go                 # 入口 — Gin + GORM + Swagger 初始化
│   ├── config/config.go        # 資料庫連線（環境變數）
│   ├── models/                 # GORM 模型（Customer、Product、Quotation、Order + 明細）
│   ├── repositories/           # 資料存取層（CRUD、分頁、搜尋）
│   ├── services/               # 業務邏輯（報價計算引擎、驗證）
│   ├── handlers/               # Gin HTTP 處理器 + Swagger 註解
│   ├── middleware/              # CORS、錯誤處理
│   ├── routes/routes.go        # 路由註冊
│   └── docs/                   # 自動產生的 Swagger 文件
└── frontend/
    ├── Dockerfile
    ├── nginx.conf              # 反向代理 /api → 後端、SPA fallback
    ├── vite.config.ts
    ├── src/
    │   ├── api/                # Axios API 用戶端
    │   ├── pages/              # 頁面元件
    │   ├── components/         # 共用 UI（DataTable、Pagination、StatusBadge 等）
    │   ├── types/index.ts      # TypeScript 型別定義
    │   ├── App.tsx             # Router + QueryClientProvider
    │   └── main.tsx            # React 入口
    └── e2e/                    # Playwright E2E 測試（規劃中）
```

### 開發環境需求

開發或執行 EZStore 前，需要安裝以下工具：

| 工具 | 版本 | 用途 |
|------|------|------|
| **Docker** | ≥ 24.0 | 容器運行環境 |
| **Docker Compose** | ≥ 2.20（Docker Desktop 已內含） | 多容器編排 |
| **Go** | ≥ 1.24 | 後端編譯與開發 |
| **Bun** | ≥ 1.0 | 前端套件管理與建置工具 |
| **swag**（Go CLI） | latest | Swagger 文件產生 |

> **僅執行模式：** 如果只需要*執行* EZStore（不做開發），只需安裝 Docker 與 Docker Compose。Go、Bun、swag 僅在本機開發時需要。

#### macOS

```bash
# 安裝 Homebrew（若尚未安裝）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Docker Desktop（包含 Docker Compose）
brew install --cask docker

# Go
brew install go

# Bun
brew install oven-sh/bun/bun

# swag（Swagger CLI）— 需要先安裝 Go
go install github.com/swaggo/swag/cmd/swag@latest
```

安裝 Docker Desktop 後，從「應用程式」啟動，確認選單列出現鯨魚圖示代表正在運行。

#### Windows

```powershell
# 安裝 winget（Windows 11 已內建；Windows 10 請從 Microsoft Store 安裝「應用程式安裝程式」）

# Docker Desktop（包含 Docker Compose）
winget install Docker.DockerDesktop

# Go
winget install GoLang.Go

# Bun
powershell -c "irm bun.sh/install.ps1 | iex"

# swag（Swagger CLI）— 需要先安裝 Go；安裝 Go 後請重啟終端機
go install github.com/swaggo/swag/cmd/swag@latest
```

安裝 Docker Desktop 後啟動，確認已啟用 **WSL 2 後端**（設定 → 一般 → 使用 WSL 2 引擎）。可能需要重新啟動電腦。

> **Windows 使用者注意：** 本文件的 shell 指令使用 Unix 風格語法。請使用 **Git Bash**、**WSL 2** 或 **PowerShell** 執行。若使用 PowerShell，請將 `export VAR=value` 替換為 `$env:VAR="value"`。

#### 驗證安裝

```bash
docker --version          # Docker version 24.x+
docker compose version    # Docker Compose version v2.x+
go version                # go1.24+
bun --version             # 1.x+
swag --version            # swag version v1.x+
```

### 快速開始（Docker Compose）

**方式 A — 使用 GHCR 雲端預建 image（預設，免編譯）：**

```bash
docker compose up -d
```

**方式 B — 使用本地原始碼編譯：**

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

**載入測試資料：**

```bash
docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql
```

| 服務 | 網址 |
|------|------|
| 前端 | http://localhost:3000 |
| 後端 API | http://localhost:8080/api/v1 |
| Swagger UI | http://localhost:8080/swagger/index.html |
| 健康檢查 | http://localhost:8080/health |

**執行 E2E 測試（驗證部署是否正常）：**

```bash
docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql
docker compose run --rm e2e
```

### 開發模式

```bash
# 1. 啟動 PostgreSQL
docker compose up db -d

# 2. 啟動後端
cd backend
export DB_HOST=localhost DB_PORT=5432 DB_USER=ezstore DB_PASSWORD=ezstore DB_NAME=ezstore
go run .

# 3. 啟動前端（Vite 開發伺服器，自動代理 /api）
cd frontend
bun install
bun run dev          # http://localhost:5173
```

### API 文件

所有端點皆有 Swagger 註解。後端啟動後，開啟：

```
http://localhost:8080/swagger/index.html
```

### 測試

**後端單元測試：**

```bash
cd backend
go test ./... -v -cover
```

**載入測試資料集**（冪等 — 可安全重複執行）：

```bash
docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql
```

測試資料包含：15 位客戶（5 VIP + 6 一般 + 4 新客戶）、20 個產品、12 張報價單（8 已發佈 + 4 草稿）、10 筆訂單（3 待處理 + 3 已確認 + 2 已完成 + 2 已取消）。

**重新產生 Swagger 文件：**

```bash
cd backend
$(go env GOPATH)/bin/swag init -g main.go --parseDependency --parseInternal
```

### 核心業務邏輯

**報價因子** — 根據客戶等級調整牌價：

| 客戶等級 | 預設因子 | 效果 |
|---------|---------|------|
| VIP | 0.80 | 八折 |
| 一般 | 0.90 | 九折 |
| 新客戶 | 1.00 | 原價 |

報價因子可在報價單中手動調整。

**計算公式：**

```
單價     = 牌價 × 報價因子
復價     = 單價 × 數量
總價     = Σ(復價)
獲利金額 = Σ((單價 − 成本) × 數量)
獲利率   = 獲利金額 ÷ 總價
```

**發佈不可變性** — 報價單一旦發佈：
- 不可修改（HTTP 403）
- 不可刪除（HTTP 403）
- 不可重複發佈（HTTP 400）

### 授權

本專案採用 [MIT License](LICENSE) 開源授權。

---

## 第二部分 — 給 AI Coding Agent 閱讀

> 本段為 AI 編程助手設計（Claude Code、Gemini CLI、GitHub Copilot、Antigravity、Cursor、Aider 等），提供結構化的專案上下文，協助快速理解程式碼庫。

### 專案定位

- **名稱：** EZStore
- **用途：** B2B 報價與訂單管理系統
- **語言：** Go（後端）、TypeScript/React（前端）
- **資料庫：** PostgreSQL 16
- **部署：** Docker Compose（3 個服務：db、backend、frontend）

### 架構模式

後端採用**三層式架構**：

```
HTTP 請求 → Handler（Gin）→ Service（業務邏輯）→ Repository（GORM/DB）
```

- **Handler** 解析 HTTP 輸入、呼叫 Service、回傳 JSON。包含 Swagger 註解。
- **Service** 包含驗證與業務邏輯。不存取 `*gin.Context`。
- **Repository** 封裝 GORM 查詢。回傳 model 或 error，不涉及 HTTP 概念。

### 關鍵檔案路徑

| 用途 | 路徑 |
|------|------|
| 後端入口 | `backend/main.go` |
| 資料庫設定 | `backend/config/config.go` |
| 所有 Model | `backend/models/*.go` |
| 所有 Repository | `backend/repositories/*.go` |
| 所有 Service | `backend/services/*.go` |
| 所有 Handler | `backend/handlers/*.go` |
| 路由註冊 | `backend/routes/routes.go` |
| CORS 中介層 | `backend/middleware/cors.go` |
| 錯誤回應輔助函式 | `backend/middleware/error_handler.go` |
| 報價因子預設值 | `backend/models/customer.go` → `DefaultPricingFactor()` |
| 報價計算邏輯 | `backend/services/quotation_service.go` → `computeTotals()`、`buildItems()` |
| 前端入口 | `frontend/src/main.tsx` |
| React 路由 | `frontend/src/App.tsx` |
| TypeScript 型別 | `frontend/src/types/index.ts` |
| API 用戶端 | `frontend/src/api/*.ts` |
| 頁面元件 | `frontend/src/pages/*.tsx` |
| 共用元件 | `frontend/src/components/shared/*.tsx` |
| Docker 編排 | `docker-compose.yml` |
| 測試資料集 | `scripts/seed-test-data.sql` |

### 資料庫 Schema 摘要

共 6 張表。主要實體使用 GORM 軟刪除（`deleted_at`）。明細表使用硬刪除。

```
customers         → id, name, tax_id（唯一, 8碼數字）, contact_name, contact_phone,
                    contact_email, address, level（vip|standard|new）, credit_score（0-100）

products          → id, product_number（唯一）, name, description, cost, list_price,
                    inventory, supplier

quotations        → id, quotation_number（唯一, 自動: QT-YYYYMMDD-NNN）,
                    customer_id（FK）, customer_level（快照）, pricing_factor,
                    total_price, profit_amount, profit_rate,
                    status（draft|published）, notes

quotation_items   → id, quotation_id（FK, CASCADE）, product_id（FK）,
                    product_name（快照）, product_cost（快照）, list_price（快照）,
                    unit_price, quantity, subtotal

orders            → id, order_number（唯一, 自動: ORD-YYYYMMDD-NNN）,
                    customer_id（FK）, quotation_id（FK, 可為空）,
                    total_price, status（pending|confirmed|completed|cancelled）, notes

order_items       → id, order_id（FK, CASCADE）, product_id（FK）,
                    product_name（快照）, unit_price, quantity, subtotal
```

**重要：** 報價單/訂單明細儲存產品資料的*快照*（名稱、成本、牌價），確保產品資料後續修改不影響歷史記錄。

### REST API 端點

Base path: `/api/v1`

```
GET    /health                        → { status: "ok" }
GET    /api/v1/pricing-factor/:level  → { level, pricing_factor }

# 客戶
GET    /api/v1/customers              → 分頁列表（?page, ?page_size, ?search）
GET    /api/v1/customers/:id
POST   /api/v1/customers
PUT    /api/v1/customers/:id
DELETE /api/v1/customers/:id          → 軟刪除

# 產品
GET    /api/v1/products               → 分頁列表（?page, ?page_size, ?search）
GET    /api/v1/products/:id
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id           → 軟刪除

# 報價單
GET    /api/v1/quotations             → 分頁列表（?page, ?page_size, ?status, ?customer_id）
GET    /api/v1/quotations/:id         → 含 items[] 與 customer
POST   /api/v1/quotations             → body: { customer_id, pricing_factor, notes, items: [{product_id, quantity}] }
PUT    /api/v1/quotations/:id         → 僅草稿可修改；body 同 POST
POST   /api/v1/quotations/:id/publish → 將狀態設為 published（不可逆）
DELETE /api/v1/quotations/:id         → 僅草稿可刪除；軟刪除

# 訂單
GET    /api/v1/orders                 → 分頁列表（?page, ?page_size, ?status, ?customer_id）
GET    /api/v1/orders/:id             → 含 items[] 與 customer
POST   /api/v1/orders                 → body: { customer_id, quotation_id?, notes, items: [{product_id, unit_price, quantity}] }
PUT    /api/v1/orders/:id
DELETE /api/v1/orders/:id             → 軟刪除
```

### 報價計算規則

建立或修改報價單時，後端：

1. 查詢客戶 → 快照 `customer_level`
2. 對每個明細項目：查詢產品 → 快照 `product_name`、`product_cost`、`list_price`
3. 計算 `unit_price = list_price × pricing_factor`
4. 計算 `subtotal = unit_price × quantity`
5. 計算 `total_price = Σ(subtotal)`
6. 計算 `profit_amount = Σ((unit_price − cost) × quantity)`
7. 計算 `profit_rate = profit_amount ÷ total_price`（防護：total 為 0 時回傳 0）

預設報價因子：VIP → 0.80、一般 → 0.90、新客戶 → 1.00（定義於 `backend/models/customer.go`）。

### 業務規則與約束條件

- **統一編號**：必須為 8 位數字（`^\d{8}$`）
- **客戶等級**：必須為 `vip`、`standard`、`new` 其一
- **信用評分**：整數 0–100
- **產品成本與牌價**：必須 ≥ 0（使用 Decimal，不用 float）
- **數量**：必須 > 0
- **已發佈報價單**：不可修改、刪除、重複發佈
- **報價單/訂單編號**：自動產生格式 `QT-YYYYMMDD-NNN` / `ORD-YYYYMMDD-NNN`
- **軟刪除**：customers、products、quotations、orders 使用 `deleted_at`
- **硬刪除**：quotation_items 與 order_items 在父層更新時直接刪除

### 常用開發指令

```bash
# 完整環境（Docker）
docker compose up --build -d
docker compose down -v                    # 停止並移除 volumes
docker compose exec db psql -U ezstore -f /scripts/seed-test-data.sql

# 後端
cd backend
go run .                                  # 啟動 API 伺服器（port 8080）
go test ./... -v -cover                   # 執行所有測試
go build -o ezstore-api .                 # 編譯
$(go env GOPATH)/bin/swag init -g main.go --parseDependency --parseInternal  # 重新產生 Swagger

# 前端
cd frontend
bun install                               # 安裝依賴
bun run dev                               # 開發伺服器（port 5173，代理 /api 到 :8080）
bun run build                             # 正式建置 → dist/
```

### 常見修改場景

**為現有實體新增欄位（例如在 Customer 新增 `fax`）：**
1. 在 `backend/models/customer.go` 新增欄位（含 GORM + JSON tag）
2. GORM AutoMigrate 於 `main.go` 會自動處理資料表變更
3. 如需要，在 `backend/services/customer_service.go` 更新驗證邏輯
4. 更新 `backend/handlers/customer_handler.go` 的 Swagger 註解
5. 在 `frontend/src/types/index.ts` 新增欄位
6. 更新 `frontend/src/pages/CustomerFormPage.tsx` 的表單
7. 更新 `frontend/src/pages/CustomerListPage.tsx` 的表格欄位
8. 重新產生 Swagger 文件

**新增 API 端點：**
1. 在 `backend/handlers/` 建立或更新 handler 函式（含 Swagger 註解）
2. 在 `backend/services/` 加入業務邏輯
3. 如需要，在 `backend/repositories/` 加入資料存取
4. 在 `backend/routes/routes.go` 註冊路由
5. 在 `frontend/src/api/` 加入前端 API 函式
6. 重新產生 Swagger 文件

**新增實體：**
依循現有模式：model → repository → service → handler → route。每個實體在每一層都有獨立檔案。可參考 `customer` 作為最簡單的完整範例。
