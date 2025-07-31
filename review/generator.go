package review

import (
	"fmt"
	"regexp"
	"reviewer-bot/gemini"
	"reviewer-bot/parser"
	"reviewer-bot/types"
	"strings"
)

// Generator handles the review generation process
type Generator struct {
	geminiClient *gemini.Client
}

// NewGenerator creates a new review generator
func NewGenerator(apiKey string) *Generator {
	return &Generator{
		geminiClient: gemini.NewClient(apiKey),
	}
}

// ExtractStarRating extracts star rating from AI response and removes stars from review text
func ExtractStarRating(review string) (string, string) {
	// Look for star emojis at the beginning of the review
	starPattern := regexp.MustCompile(`^[⭐]+`)
	if match := starPattern.FindString(review); match != "" {
		// Remove stars from the beginning of the review
		cleanReview := strings.TrimSpace(strings.TrimPrefix(review, match))
		return match, cleanReview
	}

	// Fallback: count stars in the entire review
	starCount := strings.Count(review, "⭐")
	if starCount > 0 && starCount <= 5 {
		stars := ""
		for i := 0; i < starCount; i++ {
			stars += "⭐"
		}
		// Remove all stars from the review text
		cleanReview := strings.ReplaceAll(review, "⭐", "")
		cleanReview = strings.TrimSpace(cleanReview)
		return stars, cleanReview
	}

	// Default fallback
	return "⭐⭐⭐", review
}

// ExtractFunctionCode extracts the function code from the file content
func ExtractFunctionCode(content string, functionLine int) string {
	lines := strings.Split(content, "\n")

	// Find the function start
	startLine := functionLine - 1 // Convert to 0-based index

	// Find the function end by looking for closing brace
	endLine := startLine
	braceCount := 0
	inFunction := false

	for i := startLine; i < len(lines); i++ {
		line := lines[i]

		if !inFunction {
			// Look for opening brace
			if strings.Contains(line, "{") {
				inFunction = true
				braceCount = strings.Count(line, "{") - strings.Count(line, "}")
			}
		} else {
			braceCount += strings.Count(line, "{") - strings.Count(line, "}")
			if braceCount <= 0 {
				endLine = i
				break
			}
		}
	}

	// Extract function code
	if endLine >= startLine {
		functionLines := lines[startLine : endLine+1]
		return strings.Join(functionLines, "\n")
	}

	// Fallback: return just the function line
	if startLine < len(lines) {
		return lines[startLine]
	}

	return ""
}

// GenerateReviews generates reviews for all functions in a file
func (g *Generator) GenerateReviews(filePath, fileContent, style string) (*types.ReviewResponse, error) {
	// Parse functions from the file
	functions := parser.ParseFile(filePath, fileContent)

	if len(functions) == 0 {
		return &types.ReviewResponse{
			File:    filePath,
			Reviews: []types.Review{},
		}, nil
	}

	// If only one function, use single API call
	if len(functions) == 1 {
		return g.generateSingleReview(functions[0], fileContent, style)
	}

	// For multiple functions, try batch API call first, fallback to individual calls
	reviews, err := g.generateBatchReviews(functions, fileContent, style)
	if err != nil {
		// Fallback to individual calls
		return g.generateIndividualReviews(functions, fileContent, style)
	}

	return &types.ReviewResponse{
		File:    filePath,
		Reviews: reviews,
	}, nil
}

// generateSingleReview generates a review for a single function
func (g *Generator) generateSingleReview(function types.FunctionInfo, fileContent, style string) (*types.ReviewResponse, error) {
	functionCode := ExtractFunctionCode(fileContent, function.Line)
	reviewText, err := g.geminiClient.GenerateReview(function.Name, functionCode, style)
	if err != nil {
		reviewText = g.generateFallbackReview(function.Name, style)
	}

	stars, cleanReviewText := ExtractStarRating(reviewText)
	review := types.Review{
		Line:     function.Line,
		Function: function.Name,
		Style:    style,
		Review:   cleanReviewText,
		Stars:    stars,
	}

	return &types.ReviewResponse{
		File:    "test.go", // This will be overridden
		Reviews: []types.Review{review},
	}, nil
}

// generateBatchReviews attempts to generate all reviews in a single API call
func (g *Generator) generateBatchReviews(functions []types.FunctionInfo, fileContent, style string) ([]types.Review, error) {
	// Create a batch prompt with all functions
	var batchPrompt strings.Builder
	batchPrompt.WriteString(fmt.Sprintf("Review these functions in %s style. Provide one review per function:\n\n", style))

	for _, function := range functions {
		functionCode := ExtractFunctionCode(fileContent, function.Line)
		batchPrompt.WriteString(fmt.Sprintf("Function: %s\nCode:\n%s\n\n", function.Name, functionCode))
	}

	batchPrompt.WriteString("Provide reviews in this format:\n")
	batchPrompt.WriteString("FUNCTION_NAME: ⭐⭐⭐⭐⭐ Review text here\n")

	// Try batch API call
	reviewText, err := g.geminiClient.GenerateBatchReview(batchPrompt.String(), style)
	if err != nil {
		return nil, err
	}

	// Parse batch response
	reviews, err := g.parseBatchResponse(reviewText, functions)
	if err != nil {
		return nil, err
	}

	return reviews, nil
}

// generateIndividualReviews generates reviews one by one (fallback)
func (g *Generator) generateIndividualReviews(functions []types.FunctionInfo, fileContent, style string) (*types.ReviewResponse, error) {
	var reviews []types.Review

	for _, function := range functions {
		functionCode := ExtractFunctionCode(fileContent, function.Line)
		reviewText, err := g.geminiClient.GenerateReview(function.Name, functionCode, style)
		if err != nil {
			reviewText = g.generateFallbackReview(function.Name, style)
		}

		stars, cleanReviewText := ExtractStarRating(reviewText)
		review := types.Review{
			Line:     function.Line,
			Function: function.Name,
			Style:    style,
			Review:   cleanReviewText,
			Stars:    stars,
		}

		reviews = append(reviews, review)
	}

	return &types.ReviewResponse{
		File:    "test.go", // This will be overridden
		Reviews: reviews,
	}, nil
}

// parseBatchResponse parses the batch API response
func (g *Generator) parseBatchResponse(responseText string, functions []types.FunctionInfo) ([]types.Review, error) {
	var reviews []types.Review

	lines := strings.Split(responseText, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Look for pattern: FUNCTION_NAME: ⭐⭐⭐⭐⭐ Review text
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}

		functionName := strings.TrimSpace(parts[0])
		reviewPart := strings.TrimSpace(parts[1])

		// Handle mock responses with generic function names (Function1, Function2, etc.)
		if strings.HasPrefix(functionName, "Function") {
			// Extract the number from FunctionX
			var functionIndex int
			fmt.Sscanf(functionName, "Function%d", &functionIndex)

			// Map to actual function by index (1-based to 0-based)
			if functionIndex > 0 && functionIndex <= len(functions) {
				actualFunction := functions[functionIndex-1]
				stars, cleanReviewText := ExtractStarRating(reviewPart)
				review := types.Review{
					Line:     actualFunction.Line,
					Function: actualFunction.Name,
					Style:    "funny", // Default style
					Review:   cleanReviewText,
					Stars:    stars,
				}
				reviews = append(reviews, review)
			}
		} else {
			// Find matching function by name
			for _, function := range functions {
				if function.Name == functionName {
					stars, cleanReviewText := ExtractStarRating(reviewPart)
					review := types.Review{
						Line:     function.Line,
						Function: function.Name,
						Style:    "funny", // Default style
						Review:   cleanReviewText,
						Stars:    stars,
					}
					reviews = append(reviews, review)
					break
				}
			}
		}
	}

	return reviews, nil
}

// generateFallbackReview generates a fallback review when Gemini is unavailable
func (g *Generator) generateFallbackReview(functionName, style string) string {
	fallbackReviews := map[string][]string{
		"roast": {
			"🔥 This function needs a reality check",
			"😂 At least it's not the worst code ever",
			"🤦‍♂️ I've seen better code in a tutorial",
		},
		"funny": {
			"😄 This function is doing its best",
			"🤣 It's not perfect, but it's trying",
			"😊 Simple and gets the job done",
		},
		"motivational": {
			"💪 Keep coding, you're doing great!",
			"⭐ Every function is a step forward",
			"🚀 You're on the right track!",
		},
		"technical": {
			"🔧 Functional and readable",
			"📊 Basic but effective",
			"⚡ Standard implementation",
		},
		"hilarious": {
			"🤪 This function is a character!",
			"🎭 Drama in the codebase!",
			"🤡 Clowning around with code!",
		},
	}

	reviews, exists := fallbackReviews[strings.ToLower(style)]
	if !exists {
		reviews = fallbackReviews["funny"]
	}

	// Use function name to determine which fallback review to use
	index := len(functionName) % len(reviews)
	return reviews[index]
}
