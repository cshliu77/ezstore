package repositories

import (
	"github.com/cshliu/ezstore/backend/models"
	"gorm.io/gorm"
)

type OrderRepository struct {
	DB *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{DB: db}
}

func (r *OrderRepository) List(page, pageSize int, status string, customerID uint) ([]models.Order, int64, error) {
	var orders []models.Order
	var total int64

	query := r.DB.Model(&models.Order{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if customerID > 0 {
		query = query.Where("customer_id = ?", customerID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Preload("Customer").Preload("Items").Offset(offset).Limit(pageSize).Order("id DESC").Find(&orders).Error; err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *OrderRepository) GetByID(id uint) (*models.Order, error) {
	var order models.Order
	if err := r.DB.Preload("Customer").Preload("Items").First(&order, id).Error; err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) Create(order *models.Order) error {
	return r.DB.Create(order).Error
}

func (r *OrderRepository) Update(order *models.Order) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Unscoped().Where("order_id = ?", order.ID).Delete(&models.OrderItem{}).Error; err != nil {
			return err
		}
		return tx.Save(order).Error
	})
}

func (r *OrderRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Order{}, id).Error
}

func (r *OrderRepository) CountToday() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Order{}).
		Where("DATE(created_at) = CURRENT_DATE").
		Count(&count).Error
	return count, err
}
