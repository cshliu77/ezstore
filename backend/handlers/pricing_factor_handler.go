package handlers

import (
	"net/http"

	"github.com/cshliu/ezstore/backend/middleware"
	"github.com/cshliu/ezstore/backend/models"
	"github.com/gin-gonic/gin"
)

// GetPricingFactor godoc
// @Summary      取得預設報價因子
// @Description  根據客戶等級取得預設的報價因子。VIP 客戶為 0.80（八折）、Standard 客戶為 0.90（九折）、New 客戶為 1.00（原價）。報價人員可在建立報價單時自行調整此值。
// @Tags         pricing
// @Accept       json
// @Produce      json
// @Param        level  path  string  true  "客戶等級（vip/standard/new）"
// @Success      200  {object}  map[string]interface{}
// @Failure      400  {object}  map[string]interface{}
// @Router       /api/v1/pricing-factor/{level} [get]
func GetPricingFactor(c *gin.Context) {
	level := c.Param("level")
	validLevels := map[string]bool{"vip": true, "standard": true, "new": true}
	if !validLevels[level] {
		middleware.ErrorResponse(c, http.StatusBadRequest, "INVALID_LEVEL", "無效的客戶等級，必須為 vip、standard 或 new")
		return
	}

	factor := models.DefaultPricingFactor(level)
	c.JSON(http.StatusOK, gin.H{
		"level":          level,
		"pricing_factor": factor,
	})
}
