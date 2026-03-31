package services

import (
	"errors"

	"github.com/cshliu/ezstore/backend/models"
	"github.com/cshliu/ezstore/backend/repositories"
	"github.com/shopspring/decimal"
)

type ProductService struct {
	Repo *repositories.ProductRepository
}

func NewProductService(repo *repositories.ProductRepository) *ProductService {
	return &ProductService{Repo: repo}
}

func (s *ProductService) List(page, pageSize int, search string) ([]models.Product, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.Repo.List(page, pageSize, search)
}

func (s *ProductService) GetByID(id uint) (*models.Product, error) {
	return s.Repo.GetByID(id)
}

func (s *ProductService) Create(product *models.Product) error {
	if err := validateProduct(product); err != nil {
		return err
	}
	return s.Repo.Create(product)
}

func (s *ProductService) Update(id uint, input *models.Product) (*models.Product, error) {
	existing, err := s.Repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	existing.ProductNumber = input.ProductNumber
	existing.Name = input.Name
	existing.Description = input.Description
	existing.Cost = input.Cost
	existing.ListPrice = input.ListPrice
	existing.Inventory = input.Inventory
	existing.Supplier = input.Supplier

	if err := validateProduct(existing); err != nil {
		return nil, err
	}

	if err := s.Repo.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *ProductService) Delete(id uint) error {
	return s.Repo.Delete(id)
}

func validateProduct(p *models.Product) error {
	if p.Name == "" {
		return errors.New("產品名稱不可為空")
	}
	if p.ProductNumber == "" {
		return errors.New("產品編號不可為空")
	}
	if p.Cost.LessThan(decimal.Zero) {
		return errors.New("成本不可為負數")
	}
	if p.ListPrice.LessThan(decimal.Zero) {
		return errors.New("牌價不可為負數")
	}
	if p.Inventory < 0 {
		return errors.New("庫存不可為負數")
	}
	return nil
}
