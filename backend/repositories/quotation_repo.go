package repositories

import (
	"github.com/cshliu/ezstore/backend/models"
	"gorm.io/gorm"
)

type QuotationRepository struct {
	DB *gorm.DB
}

func NewQuotationRepository(db *gorm.DB) *QuotationRepository {
	return &QuotationRepository{DB: db}
}

func (r *QuotationRepository) List(page, pageSize int, status string, customerID uint) ([]models.Quotation, int64, error) {
	var quotations []models.Quotation
	var total int64

	query := r.DB.Model(&models.Quotation{})
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
	if err := query.Preload("Customer").Preload("Items").Offset(offset).Limit(pageSize).Order("id DESC").Find(&quotations).Error; err != nil {
		return nil, 0, err
	}

	return quotations, total, nil
}

func (r *QuotationRepository) GetByID(id uint) (*models.Quotation, error) {
	var quotation models.Quotation
	if err := r.DB.Preload("Customer").Preload("Items").First(&quotation, id).Error; err != nil {
		return nil, err
	}
	return &quotation, nil
}

func (r *QuotationRepository) Create(quotation *models.Quotation) error {
	return r.DB.Create(quotation).Error
}

func (r *QuotationRepository) Update(quotation *models.Quotation) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		// Hard delete existing items (items don't use soft delete)
		if err := tx.Unscoped().Where("quotation_id = ?", quotation.ID).Delete(&models.QuotationItem{}).Error; err != nil {
			return err
		}
		// Save quotation with new items
		return tx.Save(quotation).Error
	})
}

func (r *QuotationRepository) UpdateStatus(id uint, status string) error {
	return r.DB.Model(&models.Quotation{}).Where("id = ?", id).Update("status", status).Error
}

func (r *QuotationRepository) Delete(id uint) error {
	return r.DB.Delete(&models.Quotation{}, id).Error
}

func (r *QuotationRepository) CountToday() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Quotation{}).
		Where("DATE(created_at) = CURRENT_DATE").
		Count(&count).Error
	return count, err
}
