package review

import (
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

	var reviews []types.Review

	for _, function := range functions {
		// Extract function code
		functionCode := ExtractFunctionCode(fileContent, function.Line)

		// Generate review using Gemini
		reviewText, err := g.geminiClient.GenerateReview(function.Name, functionCode, style)
		if err != nil {
			// If Gemini fails, use a fallback review
			reviewText = g.generateFallbackReview(function.Name, style)
		}

		// Extract star rating from AI response and clean the review text
		stars, cleanReviewText := ExtractStarRating(reviewText)

		// Create review
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
		File:    filePath,
		Reviews: reviews,
	}, nil
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
