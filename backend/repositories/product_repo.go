package repositories

import (
	"github.com/cshliu/ezstore/backend/models"
	"gorm.io/gorm"
)

type ProductRepository struct {
	DB *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{DB: db}
}

func (r *ProductRepository) List(page, pageSize int, search string) ([]models.Product, int64, error) {
	var products []models.Product
	var total int64

	query := r.DB.Model(&models.Product{})
	if search != "" {
		query = query.Where("name ILIKE ? OR product_number ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("id DESC").Find(&products).Error; err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

func (r *ProductRepository) GetByID(id uint) (*models.Product, error) {
	var product models.Product
	if err := r.DB.First(&product, id).Error; err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) Create(product *models.Product) error {
	return r.DB.Create(product).Error
}

func (r *ProductRepository) Update(product *models.Product) error {
	return r.DB.Save(product).Error
}

func (r *ProductRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Product{}, id).Error
}
