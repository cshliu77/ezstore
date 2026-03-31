package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIError struct {
	Code    string          `json:"code"`
	Message string          `json:"message"`
	Details []FieldError    `json:"details,omitempty"`
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func ErrorResponse(c *gin.Context, status int, code string, message string, details ...FieldError) {
	c.JSON(status, gin.H{
		"error": APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) > 0 {
			err := c.Errors.Last()
			ErrorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", err.Error())
		}
	}
}
