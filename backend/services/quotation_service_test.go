package services

import (
	"testing"

	"github.com/cshliu/ezstore/backend/models"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestComputeTotals(t *testing.T) {
	service := &QuotationService{}

	// Test case: product cost=500, list_price=1000, pricing_factor=0.85, quantity=10
	// Expected: unit_price=850, subtotal=8500, profit=(850-500)*10=3500, profit_rate=3500/8500≈0.4118
	quotation := &models.Quotation{
		PricingFactor: decimal.NewFromFloat(0.85),
		Items: []models.QuotationItem{
			{
				ProductCost: decimal.NewFromInt(500),
				ListPrice:   decimal.NewFromInt(1000),
				UnitPrice:   decimal.NewFromInt(1000).Mul(decimal.NewFromFloat(0.85)), // 850
				Quantity:    10,
				Subtotal:    decimal.NewFromInt(1000).Mul(decimal.NewFromFloat(0.85)).Mul(decimal.NewFromInt(10)), // 8500
			},
		},
	}

	service.computeTotals(quotation)

	assert.True(t, quotation.TotalPrice.Equal(decimal.NewFromInt(8500)), "total_price should be 8500, got %s", quotation.TotalPrice)
	assert.True(t, quotation.ProfitAmount.Equal(decimal.NewFromInt(3500)), "profit_amount should be 3500, got %s", quotation.ProfitAmount)

	expectedRate := decimal.NewFromInt(3500).Div(decimal.NewFromInt(8500))
	assert.True(t, quotation.ProfitRate.Equal(expectedRate), "profit_rate should be %s, got %s", expectedRate, quotation.ProfitRate)
}

func TestComputeTotals_MultipleItems(t *testing.T) {
	service := &QuotationService{}

	pricingFactor := decimal.NewFromFloat(1.3)

	// Item 1: list_price=100, cost=60, quantity=5 => unit_price=130, subtotal=650, profit=(130-60)*5=350
	// Item 2: list_price=200, cost=150, quantity=3 => unit_price=260, subtotal=780, profit=(260-150)*3=330
	// Total: 650+780=1430, Profit: 350+330=680, Rate: 680/1430≈0.4755

	item1UnitPrice := decimal.NewFromInt(100).Mul(pricingFactor) // 130
	item2UnitPrice := decimal.NewFromInt(200).Mul(pricingFactor) // 260

	quotation := &models.Quotation{
		PricingFactor: pricingFactor,
		Items: []models.QuotationItem{
			{
				ProductCost: decimal.NewFromInt(60),
				ListPrice:   decimal.NewFromInt(100),
				UnitPrice:   item1UnitPrice,
				Quantity:    5,
				Subtotal:    item1UnitPrice.Mul(decimal.NewFromInt(5)),
			},
			{
				ProductCost: decimal.NewFromInt(150),
				ListPrice:   decimal.NewFromInt(200),
				UnitPrice:   item2UnitPrice,
				Quantity:    3,
				Subtotal:    item2UnitPrice.Mul(decimal.NewFromInt(3)),
			},
		},
	}

	service.computeTotals(quotation)

	assert.True(t, quotation.TotalPrice.Equal(decimal.NewFromInt(1430)), "total_price should be 1430, got %s", quotation.TotalPrice)
	assert.True(t, quotation.ProfitAmount.Equal(decimal.NewFromInt(680)), "profit_amount should be 680, got %s", quotation.ProfitAmount)
}

func TestComputeTotals_ZeroTotal(t *testing.T) {
	service := &QuotationService{}

	quotation := &models.Quotation{
		Items: []models.QuotationItem{},
	}

	service.computeTotals(quotation)

	assert.True(t, quotation.TotalPrice.Equal(decimal.Zero))
	assert.True(t, quotation.ProfitAmount.Equal(decimal.Zero))
	assert.True(t, quotation.ProfitRate.Equal(decimal.Zero))
}

func TestDuplicateNotesFormat(t *testing.T) {
	// Test notes formatting for duplicate: with original notes
	sourceNumber := "QT-20260101-001"
	sourceNotes := "原始備註"
	expected := "複製自 QT-20260101-001 — 原始備註"
	result := formatDuplicateNotes(sourceNumber, sourceNotes)
	assert.Equal(t, expected, result)

	// Test notes formatting for duplicate: without original notes
	result2 := formatDuplicateNotes(sourceNumber, "")
	assert.Equal(t, "複製自 QT-20260101-001", result2)
}

func TestDefaultPricingFactor(t *testing.T) {
	assert.True(t, models.DefaultPricingFactor("vip").Equal(decimal.NewFromFloat(0.80)))
	assert.True(t, models.DefaultPricingFactor("standard").Equal(decimal.NewFromFloat(0.90)))
	assert.True(t, models.DefaultPricingFactor("new").Equal(decimal.NewFromFloat(1.00)))
	assert.True(t, models.DefaultPricingFactor("unknown").Equal(decimal.NewFromFloat(0.90)))
}
