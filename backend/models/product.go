package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Product struct {
	ID            uint            `gorm:"primarykey" json:"id"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	DeletedAt     gorm.DeletedAt  `gorm:"index" json:"deleted_at"`
	ProductNumber string          `gorm:"type:varchar(50);not null;uniqueIndex" json:"product_number"`
	Name          string          `gorm:"type:varchar(255);not null" json:"name"`
	Description   string          `gorm:"type:text" json:"description"`
	Cost          decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"cost"`
	ListPrice     decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"list_price"`
	Inventory     int             `gorm:"not null;default:0" json:"inventory"`
	Supplier      string          `gorm:"type:varchar(255)" json:"supplier"`
}
