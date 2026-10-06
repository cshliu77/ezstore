package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Customer struct {
	ID           uint            `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	DeletedAt    gorm.DeletedAt  `gorm:"index" json:"deleted_at"`
	Name         string          `gorm:"type:varchar(255);not null" json:"name"`
	TaxID        string          `gorm:"type:varchar(20);not null;uniqueIndex" json:"tax_id"`
	ContactName  string          `gorm:"type:varchar(255)" json:"contact_name"`
	ContactPhone string          `gorm:"type:varchar(50)" json:"contact_phone"`
	ContactEmail string          `gorm:"type:varchar(255)" json:"contact_email"`
	Address      string          `gorm:"type:text" json:"address"`
	Level        string          `gorm:"type:varchar(20);not null;default:'standard'" json:"level"`
	CreditScore  int             `gorm:"default:0" json:"credit_score"`
}

// DefaultPricingFactor returns the default pricing factor for a customer level.
func DefaultPricingFactor(level string) decimal.Decimal {
	switch level {
	case "vip":
		return decimal.NewFromFloat(0.80)
	case "standard":
		return decimal.NewFromFloat(0.90)
	case "new":
		return decimal.NewFromFloat(1.00)
	default:
		return decimal.NewFromFloat(0.90)
	}
}
