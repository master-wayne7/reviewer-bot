package main

import (
	"strings"
)

// CalculateSum adds two numbers together
func CalculateSum(a, b int) int {
	return a + b
}

// ProcessString converts a string to uppercase
func ProcessString(input string) string {
	return strings.ToUpper(input)
}

// ValidateEmail checks if an email is valid
func ValidateEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

// GetUserData retrieves user information
func GetUserData(userID string) map[string]interface{} {
	return map[string]interface{}{
		"id":   userID,
		"name": "John Doe",
		"age":  30,
	}
}

// ComplexCalculation performs a complex mathematical operation
func ComplexCalculation(x, y, z float64) float64 {
	result := x * y / z
	if result < 0 {
		result = -result
	}
	return result
}
