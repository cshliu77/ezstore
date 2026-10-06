package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/cshliu/ezstore/backend/models"
	"github.com/cshliu/ezstore/backend/repositories"
	"github.com/shopspring/decimal"
)

type OrderCreateInput struct {
	CustomerID  uint             `json:"customer_id" binding:"required"`
	QuotationID *uint            `json:"quotation_id"`
	Notes       string           `json:"notes"`
	Items       []OrderItemInput `json:"items" binding:"required,min=1"`
}

type OrderItemInput struct {
	ProductID uint            `json:"product_id" binding:"required"`
	UnitPrice decimal.Decimal `json:"unit_price" binding:"required"`
	Quantity  int             `json:"quantity" binding:"required,min=1"`
}

type OrderService struct {
	Repo         *repositories.OrderRepository
	CustomerRepo *repositories.CustomerRepository
	ProductRepo  *repositories.ProductRepository
}

func NewOrderService(repo *repositories.OrderRepository, customerRepo *repositories.CustomerRepository, productRepo *repositories.ProductRepository) *OrderService {
	return &OrderService{Repo: repo, CustomerRepo: customerRepo, ProductRepo: productRepo}
}

func (s *OrderService) List(page, pageSize int, status string, customerID uint) ([]models.Order, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.Repo.List(page, pageSize, status, customerID)
}

func (s *OrderService) GetByID(id uint) (*models.Order, error) {
	return s.Repo.GetByID(id)
}

func (s *OrderService) Create(input *OrderCreateInput) (*models.Order, error) {
	if _, err := s.CustomerRepo.GetByID(input.CustomerID); err != nil {
		return nil, errors.New("客戶不存在")
	}

	number, err := s.generateNumber()
	if err != nil {
		return nil, err
	}

	order := &models.Order{
		OrderNumber: number,
		CustomerID:  input.CustomerID,
		QuotationID: input.QuotationID,
		Status:      "pending",
		Notes:       input.Notes,
	}

	items, err := s.buildItems(input.Items)
	if err != nil {
		return nil, err
	}
	order.Items = items

	totalPrice := decimal.Zero
	for _, item := range items {
		totalPrice = totalPrice.Add(item.Subtotal)
	}
	order.TotalPrice = totalPrice

	if err := s.Repo.Create(order); err != nil {
		return nil, err
	}

	return s.Repo.GetByID(order.ID)
}

func (s *OrderService) Update(id uint, input *OrderCreateInput) (*models.Order, error) {
	existing, err := s.Repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if _, err := s.CustomerRepo.GetByID(input.CustomerID); err != nil {
		return nil, errors.New("客戶不存在")
	}

	existing.CustomerID = input.CustomerID
	existing.QuotationID = input.QuotationID
	existing.Notes = input.Notes

	items, err := s.buildItems(input.Items)
	if err != nil {
		return nil, err
	}
	existing.Items = items

	totalPrice := decimal.Zero
	for _, item := range items {
		totalPrice = totalPrice.Add(item.Subtotal)
	}
	existing.TotalPrice = totalPrice

	if err := s.Repo.Update(existing); err != nil {
		return nil, err
	}

	return s.Repo.GetByID(existing.ID)
}

func (s *OrderService) Delete(id uint) error {
	return s.Repo.Delete(id)
}

func (s *OrderService) buildItems(inputs []OrderItemInput) ([]models.OrderItem, error) {
	items := make([]models.OrderItem, 0, len(inputs))

	for _, input := range inputs {
		product, err := s.ProductRepo.GetByID(input.ProductID)
		if err != nil {
			return nil, fmt.Errorf("產品 ID %d 不存在", input.ProductID)
		}

		if input.Quantity <= 0 {
			return nil, errors.New("數量必須大於 0")
		}

		quantity := decimal.NewFromInt(int64(input.Quantity))
		subtotal := input.UnitPrice.Mul(quantity)

		items = append(items, models.OrderItem{
			ProductID:   input.ProductID,
			ProductName: product.Name,
			UnitPrice:   input.UnitPrice,
			Quantity:    input.Quantity,
			Subtotal:    subtotal,
		})
	}

	return items, nil
}

func (s *OrderService) generateNumber() (string, error) {
	count, err := s.Repo.CountToday()
	if err != nil {
		return "", err
	}
	today := time.Now().Format("20060102")
	return fmt.Sprintf("ORD-%s-%03d", today, count+1), nil
}
