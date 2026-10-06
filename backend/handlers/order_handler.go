package handlers

import (
	"net/http"
	"strconv"

	"github.com/cshliu/ezstore/backend/middleware"
	"github.com/cshliu/ezstore/backend/services"
	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	Service *services.OrderService
}

func NewOrderHandler(service *services.OrderService) *OrderHandler {
	return &OrderHandler{Service: service}
}

// List godoc
// @Summary      列出訂單
// @Description  取得訂單列表，支援分頁、狀態篩選與客戶篩選。狀態可為 pending（待處理）、confirmed（已確認）、completed（已完成）、cancelled（已取消）。
// @Tags         orders
// @Accept       json
// @Produce      json
// @Param        page         query  int     false  "頁碼（預設 1）"        default(1)
// @Param        page_size    query  int     false  "每頁筆數（預設 20）"   default(20)
// @Param        status       query  string  false  "狀態篩選"
// @Param        customer_id  query  int     false  "客戶 ID 篩選"
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/orders [get]
func (h *OrderHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	status := c.Query("status")
	customerID, _ := strconv.ParseUint(c.Query("customer_id"), 10, 32)

	orders, total, err := h.Service.List(page, pageSize, status, uint(customerID))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      orders,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get godoc
// @Summary      取得單一訂單
// @Description  根據 ID 取得訂單詳細資料，包含客戶資訊、訂單明細（產品名稱、單價、數量、復價）與總價
// @Tags         orders
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "訂單 ID"
// @Success      200  {object}  models.Order
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/orders/{id} [get]
func (h *OrderHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的訂單 ID")
		return
	}

	order, err := h.Service.GetByID(uint(id))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "訂單不存在")
		return
	}

	c.JSON(http.StatusOK, order)
}

// Create godoc
// @Summary      建立訂單
// @Description  建立新訂單。需提供客戶 ID 與訂單明細（product_id、unit_price、quantity）。可選擇關聯已發佈的報價單（quotation_id）。系統會自動計算復價（單價 × 數量）與總價。
// @Tags         orders
// @Accept       json
// @Produce      json
// @Param        order  body  services.OrderCreateInput  true  "訂單資料"
// @Success      201  {object}  models.Order
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/orders [post]
func (h *OrderHandler) Create(c *gin.Context) {
	var input services.OrderCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	order, err := h.Service.Create(&input)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, order)
}

// Update godoc
// @Summary      修改訂單
// @Description  根據 ID 修改訂單資料，修改後系統會重新計算總價
// @Tags         orders
// @Accept       json
// @Produce      json
// @Param        id     path  int                        true  "訂單 ID"
// @Param        order  body  services.OrderCreateInput  true  "訂單資料"
// @Success      200  {object}  models.Order
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/orders/{id} [put]
func (h *OrderHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的訂單 ID")
		return
	}

	var input services.OrderCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	order, err := h.Service.Update(uint(id), &input)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, order)
}

// Delete godoc
// @Summary      刪除訂單
// @Description  根據 ID 軟刪除訂單
// @Tags         orders
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "訂單 ID"
// @Success      204
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/orders/{id} [delete]
func (h *OrderHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的訂單 ID")
		return
	}

	if err := h.Service.Delete(uint(id)); err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}
