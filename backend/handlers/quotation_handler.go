package handlers

import (
	"net/http"
	"strconv"

	"github.com/cshliu/ezstore/backend/middleware"
	"github.com/cshliu/ezstore/backend/services"
	"github.com/gin-gonic/gin"
)

type QuotationHandler struct {
	Service *services.QuotationService
}

func NewQuotationHandler(service *services.QuotationService) *QuotationHandler {
	return &QuotationHandler{Service: service}
}

// List godoc
// @Summary      列出報價單
// @Description  取得報價單列表，支援分頁、狀態篩選與客戶篩選。狀態可為 draft（草稿）或 published（已發佈）。
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        page         query  int     false  "頁碼（預設 1）"        default(1)
// @Param        page_size    query  int     false  "每頁筆數（預設 20）"   default(20)
// @Param        status       query  string  false  "狀態篩選（draft/published）"
// @Param        customer_id  query  int     false  "客戶 ID 篩選"
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/quotations [get]
func (h *QuotationHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	customerID, _ := strconv.ParseUint(c.Query("customer_id"), 10, 32)

	quotations, total, err := h.Service.List(page, pageSize, status, uint(customerID))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      quotations,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get godoc
// @Summary      取得單一報價單
// @Description  根據 ID 取得報價單詳細資料，包含客戶資訊、報價因子、報價產品明細、總價、獲利金額與獲利率
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "報價單 ID"
// @Success      200  {object}  models.Quotation
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/quotations/{id} [get]
func (h *QuotationHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的報價單 ID")
		return
	}

	quotation, err := h.Service.GetByID(uint(id))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "報價單不存在")
		return
	}

	c.JSON(http.StatusOK, quotation)
}

// Create godoc
// @Summary      建立報價單
// @Description  建立新報價單。需提供客戶 ID、報價因子與產品明細（product_id 和 quantity）。系統會自動計算單價（牌價 × 報價因子）、復價（單價 × 數量）、總價、獲利金額與獲利率。報價因子預設值根據客戶等級：VIP=0.80、Standard=0.90、New=1.00，可自行調整。
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        quotation  body  services.QuotationCreateInput  true  "報價單資料"
// @Success      201  {object}  models.Quotation
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/quotations [post]
func (h *QuotationHandler) Create(c *gin.Context) {
	var input services.QuotationCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	quotation, err := h.Service.Create(&input)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, quotation)
}

// Update godoc
// @Summary      修改報價單
// @Description  根據 ID 修改報價單。僅草稿狀態（draft）的報價單可以修改，已發佈（published）的報價單不可修改。修改後系統會重新計算所有金額。
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        id         path  int                            true  "報價單 ID"
// @Param        quotation  body  services.QuotationCreateInput  true  "報價單資料"
// @Success      200  {object}  models.Quotation
// @Failure      400  {object}  map[string]interface{}
// @Failure      403  {object}  map[string]interface{}
// @Router       /api/v1/quotations/{id} [put]
func (h *QuotationHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的報價單 ID")
		return
	}

	var input services.QuotationCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	quotation, err := h.Service.Update(uint(id), &input)
	if err != nil {
		if err.Error() == "已發佈的報價單不可修改" {
			middleware.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, quotation)
}

// Duplicate godoc
// @Summary      複製報價單
// @Description  從任何報價單（含已發佈）複製一張新的草稿報價單。新報價單會保留原報價單的客戶、報價因子與產品明細，並重新查詢最新的產品資料快照、重新計算所有金額。新報價單的狀態固定為 draft。
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "來源報價單 ID"
// @Success      201  {object}  models.Quotation
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/quotations/{id}/duplicate [post]
func (h *QuotationHandler) Duplicate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的報價單 ID")
		return
	}

	quotation, err := h.Service.Duplicate(uint(id))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusCreated, quotation)
}

// Publish godoc
// @Summary      發佈報價單
// @Description  將報價單狀態從草稿（draft）變更為已發佈（published）。已發佈的報價單不可再修改或刪除。此操作不可逆。
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "報價單 ID"
// @Success      200  {object}  models.Quotation
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/quotations/{id}/publish [post]
func (h *QuotationHandler) Publish(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的報價單 ID")
		return
	}

	quotation, err := h.Service.Publish(uint(id))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "BAD_REQUEST", err.Error())
		return
	}

	c.JSON(http.StatusOK, quotation)
}

// Delete godoc
// @Summary      刪除報價單
// @Description  根據 ID 軟刪除報價單。僅草稿狀態（draft）的報價單可以刪除，已發佈（published）的報價單不可刪除。
// @Tags         quotations
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "報價單 ID"
// @Success      204
// @Failure      403  {object}  map[string]interface{}
// @Router       /api/v1/quotations/{id} [delete]
func (h *QuotationHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的報價單 ID")
		return
	}

	if err := h.Service.Delete(uint(id)); err != nil {
		if err.Error() == "已發佈的報價單不可刪除" {
			middleware.ErrorResponse(c, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}
