package routes

import (
	"github.com/cshliu/ezstore/backend/handlers"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupRoutes(r *gin.Engine, customerHandler *handlers.CustomerHandler, productHandler *handlers.ProductHandler, quotationHandler *handlers.QuotationHandler, orderHandler *handlers.OrderHandler) {
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")
	{
		// Customers
		customers := v1.Group("/customers")
		{
			customers.GET("", customerHandler.List)
			customers.GET("/:id", customerHandler.Get)
			customers.POST("", customerHandler.Create)
			customers.PUT("/:id", customerHandler.Update)
			customers.DELETE("/:id", customerHandler.Delete)
		}

		// Products
		products := v1.Group("/products")
		{
			products.GET("", productHandler.List)
			products.GET("/:id", productHandler.Get)
			products.POST("", productHandler.Create)
			products.PUT("/:id", productHandler.Update)
			products.DELETE("/:id", productHandler.Delete)
		}

		// Quotations
		quotations := v1.Group("/quotations")
		{
			quotations.GET("", quotationHandler.List)
			quotations.GET("/:id", quotationHandler.Get)
			quotations.POST("", quotationHandler.Create)
			quotations.PUT("/:id", quotationHandler.Update)
			quotations.POST("/:id/duplicate", quotationHandler.Duplicate)
			quotations.POST("/:id/publish", quotationHandler.Publish)
			quotations.DELETE("/:id", quotationHandler.Delete)
		}

		// Orders
		orders := v1.Group("/orders")
		{
			orders.GET("", orderHandler.List)
			orders.GET("/:id", orderHandler.Get)
			orders.POST("", orderHandler.Create)
			orders.PUT("/:id", orderHandler.Update)
			orders.DELETE("/:id", orderHandler.Delete)
		}

		// Pricing factor
		v1.GET("/pricing-factor/:level", handlers.GetPricingFactor)
	}
}
