package models

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Order struct {
	ID          uint            `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"deleted_at"`
	OrderNumber string          `gorm:"type:varchar(50);not null;uniqueIndex" json:"order_number"`
	CustomerID  uint            `gorm:"not null" json:"customer_id"`
	Customer    Customer        `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	QuotationID *uint           `gorm:"" json:"quotation_id"`
	Quotation   *Quotation      `gorm:"foreignKey:QuotationID" json:"quotation,omitempty"`
	TotalPrice  decimal.Decimal `gorm:"type:decimal(14,2);not null;default:0" json:"total_price"`
	Status      string          `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	Notes       string          `gorm:"type:text" json:"notes"`
	Items       []OrderItem     `gorm:"foreignKey:OrderID;constraint:OnDelete:CASCADE" json:"items"`
}

type OrderItem struct {
	ID          uint            `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"deleted_at"`
	OrderID     uint            `gorm:"not null" json:"order_id"`
	ProductID   uint            `gorm:"not null" json:"product_id"`
	ProductName string          `gorm:"type:varchar(255);not null" json:"product_name"`
	UnitPrice   decimal.Decimal `gorm:"type:decimal(12,2);not null" json:"unit_price"`
	Quantity    int             `gorm:"not null" json:"quantity"`
	Subtotal    decimal.Decimal `gorm:"type:decimal(14,2);not null" json:"subtotal"`
}
