package handlers

import (
	"net/http"
	"strconv"

	"github.com/cshliu/ezstore/backend/middleware"
	"github.com/cshliu/ezstore/backend/models"
	"github.com/cshliu/ezstore/backend/services"
	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	Service *services.ProductService
}

func NewProductHandler(service *services.ProductService) *ProductHandler {
	return &ProductHandler{Service: service}
}

// List godoc
// @Summary      列出產品
// @Description  取得產品列表，支援分頁與搜尋（搜尋產品名稱或產品編號）
// @Tags         products
// @Accept       json
// @Produce      json
// @Param        page       query  int     false  "頁碼（預設 1）"        default(1)
// @Param        page_size  query  int     false  "每頁筆數（預設 20）"   default(20)
// @Param        search     query  string  false  "搜尋關鍵字"
// @Success      200  {object}  map[string]interface{}
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/products [get]
func (h *ProductHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")

	products, total, err := h.Service.List(page, pageSize, search)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":      products,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// Get godoc
// @Summary      取得單一產品
// @Description  根據 ID 取得產品詳細資料，包含成本、牌價、庫存等資訊
// @Tags         products
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "產品 ID"
// @Success      200  {object}  models.Product
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/products/{id} [get]
func (h *ProductHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的產品 ID")
		return
	}

	product, err := h.Service.GetByID(uint(id))
	if err != nil {
		middleware.ErrorResponse(c, http.StatusNotFound, "NOT_FOUND", "產品不存在")
		return
	}

	c.JSON(http.StatusOK, product)
}

// Create godoc
// @Summary      建立產品
// @Description  建立新產品，需提供產品編號、名稱、成本、牌價等資料
// @Tags         products
// @Accept       json
// @Produce      json
// @Param        product  body  models.Product  true  "產品資料"
// @Success      201  {object}  models.Product
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/products [post]
func (h *ProductHandler) Create(c *gin.Context) {
	var product models.Product
	if err := c.ShouldBindJSON(&product); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := h.Service.Create(&product); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusCreated, product)
}

// Update godoc
// @Summary      修改產品
// @Description  根據 ID 修改產品資料
// @Tags         products
// @Accept       json
// @Produce      json
// @Param        id       path  int             true  "產品 ID"
// @Param        product  body  models.Product  true  "產品資料"
// @Success      200  {object}  models.Product
// @Failure      400  {object}  map[string]interface{}
// @Failure      404  {object}  map[string]interface{}
// @Router       /api/v1/products/{id} [put]
func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的產品 ID")
		return
	}

	var input models.Product
	if err := c.ShouldBindJSON(&input); err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	product, err := h.Service.Update(uint(id), &input)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	c.JSON(http.StatusOK, product)
}

// Delete godoc
// @Summary      刪除產品
// @Description  根據 ID 軟刪除產品
// @Tags         products
// @Accept       json
// @Produce      json
// @Param        id   path  int  true  "產品 ID"
// @Success      204
// @Failure      500  {object}  map[string]interface{}
// @Router       /api/v1/products/{id} [delete]
func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_ID", "無效的產品 ID")
		return
	}

	if err := h.Service.Delete(uint(id)); err != nil {
		middleware.ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}
