package handlers

import (
	"net/http"
	"strconv"

	"github.com/cshliu/ezstore/backend/middleware"
	"github.com/cshliu/ezstore/backend/models"
	"github.com/cshliu/ezstore/backend/services"
	"github.com/gin-gonic/gin"
)

type CustomerHandler struct {
	Service *services.CustomerService
}

func NewCustomerHandler(service *services.CustomerService) *CustomerHandler {
	return &CustomerHandler{Service: service}
}

// List godoc
// @Summary      列出客戶
// @Description  取得客戶列表，支援分頁與搜尋（搜尋客戶名稱或統一編號）
// @Tags         customers
// @Accept       json
// @Produce      json
// @Param        page       query  int     false  "頁碼（預設 1）"        default(1)
// @Param        page_size  query  int     false  "每頁筆數（預設 20）"   default(20)
// @Param        search     query  string  false  "搜尋關鍵字"
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/customers [get]
func (h *CustomerHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")

	customers, total, err := h.Service.List(page, pageSize, search)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      customers,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get godoc
// @Summary      取得單一客戶
// @Description  根據 ID 取得客戶詳細資料
// @Tags         customers
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "客戶 ID"
// @Success      200  {object}  models.Customer
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/customers/{id} [get]
func (h *CustomerHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的客戶 ID")
		return
	}

	customer, err := h.Service.GetByID(uint(id))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "客戶不存在")
		return
	}

	c.JSON(http.StatusOK, customer)
}

// Create godoc
// @Summary      建立客戶
// @Description  建立新客戶，需提供客戶名稱、統一編號（8碼數字）、客戶等級（vip/standard/new）等資料
// @Tags         customers
// @Accept       json
// @Produce      json
// @Param        customer  body  models.Customer  true  "客戶資料"
// @Success      201  {object}  models.Customer
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/customers [post]
func (h *CustomerHandler) Create(c *gin.Context) {
	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := h.Service.Create(&customer); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, customer)
}

// Update godoc
// @Summary      修改客戶
// @Description  根據 ID 修改客戶資料
// @Tags         customers
// @Accept       json
// @Produce      json
// @Param        id        path  int              true  "客戶 ID"
// @Param        customer  body  models.Customer  true  "客戶資料"
// @Success      200  {object}  models.Customer
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/customers/{id} [put]
func (h *CustomerHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的客戶 ID")
		return
	}

	var input models.Customer
	if err := c.ShouldBindJSON(&input); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	customer, err := h.Service.Update(uint(id), &input)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, customer)
}

// Delete godoc
// @Summary      刪除客戶
// @Description  根據 ID 軟刪除客戶（資料不會真正刪除，僅標記為已刪除）
// @Tags         customers
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "客戶 ID"
// @Success      204
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/customers/{id} [delete]
func (h *CustomerHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的客戶 ID")
		return
	}

	if err := h.Service.Delete(uint(id)); err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}
