package services

import (
	"errors"
	"regexp"

	"github.com/cshliu/ezstore/backend/models"
	"github.com/cshliu/ezstore/backend/repositories"
)

type CustomerService struct {
	Repo *repositories.CustomerRepository
}

func NewCustomerService(repo *repositories.CustomerRepository) *CustomerService {
	return &CustomerService{Repo: repo}
}

func (s *CustomerService) List(page, pageSize int, search string) ([]models.Customer, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return s.Repo.List(page, pageSize, search)
}

func (s *CustomerService) GetByID(id uint) (*models.Customer, error) {
	return s.Repo.GetByID(id)
}

func (s *CustomerService) Create(customer *models.Customer) error {
	if err := validateCustomer(customer); err != nil {
		return err
	}
	return s.Repo.Create(customer)
}

func (s *CustomerService) Update(id uint, input *models.Customer) (*models.Customer, error) {
	existing, err := s.Repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	existing.Name = input.Name
	existing.TaxID = input.TaxID
	existing.ContactName = input.ContactName
	existing.ContactPhone = input.ContactPhone
	existing.ContactEmail = input.ContactEmail
	existing.Address = input.Address
	existing.Level = input.Level
	existing.CreditScore = input.CreditScore

	if err := validateCustomer(existing); err != nil {
		return nil, err
	}

	if err := s.Repo.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *CustomerService) Delete(id uint) error {
	return s.Repo.Delete(id)
}

var taxIDRegex = regexp.MustCompile(`^\d{8}$`)

func validateCustomer(c *models.Customer) error {
	if c.Name == "" {
		return errors.New("客戶名稱不可為空")
	}
	if !taxIDRegex.MatchString(c.TaxID) {
		return errors.New("統一編號必須為8位數字")
	}
	validLevels := map[string]bool{"vip": true, "standard": true, "new": true}
	if !validLevels[c.Level] {
		return errors.New("客戶等級必須為 vip、standard 或 new")
	}
	if c.CreditScore < 0 || c.CreditScore > 100 {
		return errors.New("信用評分必須在 0-100 之間")
	}
	return nil
}
