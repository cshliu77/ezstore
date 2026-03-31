package repositories

import (
	"github.com/cshliu/ezstore/backend/models"
	"gorm.io/gorm"
)

type CustomerRepository struct {
	DB *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
	return &CustomerRepository{DB: db}
}

func (r *CustomerRepository) List(page, pageSize int, search string) ([]models.Customer, int64, error) {
	var customers []models.Customer
	var total int64

	query := r.DB.Model(&models.Customer{})
	if search != "" {
		query = query.Where("name ILIKE ? OR tax_id ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("id DESC").Find(&customers).Error; err != nil {
		return nil, 0, err
	}

	return customers, total, nil
}

func (r *CustomerRepository) GetByID(id uint) (*models.Customer, error) {
	var customer models.Customer
	if err := r.DB.First(&customer, id).Error; err != nil {
		return nil, err
	}
	return &customer, nil
}

func (r *CustomerRepository) Create(customer *models.Customer) error {
	return r.DB.Create(customer).Error
}

func (r *CustomerRepository) Update(customer *models.Customer) error {
	return r.DB.Save(customer).Error
}

func (r *CustomerRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Customer{}, id).Error
}
