package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Quotation struct {
	ID              uint            `gorm:"primarykey" json:"id"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	DeletedAt       gorm.DeletedAt  `gorm:"index" json:"deleted_at"`
	QuotationNumber string          `gorm:"type:varchar(50);not null;uniqueIndex" json:"quotation_number"`
	CustomerID      uint            `gorm:"not null" json:"customer_id"`
	Customer        Customer        `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	CustomerLevel   string          `gorm:"type:varchar(20);not null" json:"customer_level"`
	PricingFactor   decimal.Decimal `gorm:"type:decimal(5,4);not null" json:"pricing_factor"`
	TotalPrice      decimal.Decimal `gorm:"type:decimal(14,2);not null;default:0" json:"total_price"`
	ProfitAmount    decimal.Decimal `gorm:"type:decimal(14,2);not null;default:0" json:"profit_amount"`
	ProfitRate      decimal.Decimal `gorm:"type:decimal(5,4);not null;default:0" json:"profit_rate"`
	Status          string          `gorm:"type:varchar(20);not null;default:'draft'" json:"status"`
	Notes           string          `gorm:"type:text" json:"notes"`
	Items           []QuotationItem `gorm:"foreignKey:QuotationID;constraint:OnDelete:CASCADE" json:"items"`
}

type QuotationItem struct {
	ID          uint            `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"deleted_at"`
	QuotationID uint            `gorm:"not null" json:"quotation_id"`
	ProductID   uint            `gorm:"not null" json:"product_id"`
	ProductName string          `gorm:"type:varchar(255);not null" json:"product_name"`
	ProductCost decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"product_cost"`
	ListPrice   decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"list_price"`
	UnitPrice   decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"unit_price"`
	Quantity    int             `gorm:"not null" json:"quantity"`
	Subtotal    decimal.Decimal `gorm:"type:decimal(14,2);not null" json:"subtotal"`
}
