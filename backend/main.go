package main

import (
	"log"
	"os"

	"github.com/cshliu/ezstore/backend/config"
	_ "github.com/cshliu/ezstore/backend/docs"
	"github.com/cshliu/ezstore/backend/handlers"
	"github.com/cshliu/ezstore/backend/middleware"
	"github.com/cshliu/ezstore/backend/models"
	"github.com/cshliu/ezstore/backend/repositories"
	"github.com/cshliu/ezstore/backend/routes"
	"github.com/cshliu/ezstore/backend/services"
	"github.com/gin-gonic/gin"
)

// @title          EZStore API
// @version        1.0
// @description    EZStore B2B 報價與訂單管理系統 API。提供客戶管理、產品管理、報價單管理（含報價因子計算）及訂單管理功能。
// @host           localhost:8080
// @BasePath       /
func main() {
	db, err := config.ConnectDatabase()
	if err != nil {
		log.Fatalf("無法連線資料庫: %v", err)
	}

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.Customer{},
		&models.Product{},
		&models.Quotation{},
		&models.QuotationItem{},
		&models.Order{},
		&models.OrderItem{},
	); err != nil {
		log.Fatalf("資料庫遷移失敗: %v", err)
	}

	// Repositories
	customerRepo := repositories.NewCustomerRepository(db)
	productRepo := repositories.NewProductRepository(db)
	quotationRepo := repositories.NewQuotationRepository(db)
	orderRepo := repositories.NewOrderRepository(db)

	// Services
	customerService := services.NewCustomerService(customerRepo)
	productService := services.NewProductService(productRepo)
	quotationService := services.NewQuotationService(quotationRepo, customerRepo, productRepo)
	orderService := services.NewOrderService(orderRepo, customerRepo, productRepo)

	// Handlers
	customerHandler := handlers.NewCustomerHandler(customerService)
	productHandler := handlers.NewProductHandler(productService)
	quotationHandler := handlers.NewQuotationHandler(quotationService)
	orderHandler := handlers.NewOrderHandler(orderService)

	// Gin setup
	r := gin.Default()
	r.Use(middleware.SetupCORS())
	r.Use(middleware.ErrorHandler())

	routes.SetupRoutes(r, customerHandler, productHandler, quotationHandler, orderHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("EZStore API 啟動於 :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("伺服器啟動失敗: %v", err)
	}
}
