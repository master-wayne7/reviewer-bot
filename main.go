package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"reviewer-bot/review"
	"reviewer-bot/types"
	"strings"

	"github.com/joho/godotenv"
)

const (
	defaultStyle = "funny"
)

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		// Ignore error if .env file doesn't exist
		log.Printf("No .env file found, using environment variables")
	}

	// Only process stdin - no server mode
	processStdin()
}

// processStdin processes requests from stdin (for extension communication)
func processStdin() {
	// Read input from stdin
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		log.Fatalf("Failed to read stdin: %v", err)
	}

	// Parse JSON input
	var request types.ReviewRequest
	if err := json.Unmarshal(input, &request); err != nil {
		log.Fatalf("Failed to parse JSON: %v", err)
	}

	// Validate required fields
	if request.FilePath == "" || request.FileContent == "" {
		log.Fatal("Missing required fields: file_path and file_content")
	}

	// Set default style if not provided
	if request.Style == "" {
		request.Style = defaultStyle
	}

	// Get API key from environment if not provided in request
	apiKey := request.APIKey
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}

	// Check if we should use mock mode
	if strings.ToLower(os.Getenv("MOCK_MODE")) == "true" {
		os.Setenv("MOCK_MODE", "true")
	}

	// Generate reviews
	generator := review.NewGenerator(apiKey)
	response, err := generator.GenerateReviews(request.FilePath, request.FileContent, request.Style)
	if err != nil {
		log.Fatalf("Failed to generate reviews: %v", err)
	}

	// Output response as JSON
	output, err := json.MarshalIndent(response, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal response: %v", err)
	}

	fmt.Println(string(output))
}
