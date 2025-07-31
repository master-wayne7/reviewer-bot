package gemini

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"strings"

	"google.golang.org/genai"
)

// Client represents a Gemini API client using the official library
type Client struct {
	APIKey string
	client *genai.Client
}

// NewClient creates a new Gemini client using the official library
func NewClient(apiKey string) *Client {
	return &Client{
		APIKey: apiKey,
	}
}

// GetReviewPrompt returns a prompt based on the review style
func GetReviewPrompt(style, functionName, functionCode string) string {
	basePrompt := fmt.Sprintf(`You are a code reviewer. Review this function and provide a one-liner review in the specified style.

Function: %s
Code:
%s

Style: %s

Rate the code quality from 1-5 stars and provide ONLY a one-liner review (max 100 characters) that matches the style. Include appropriate emojis.

Format your response as: "⭐⭐⭐⭐⭐ Review text here" (use 1-5 stars based on quality)

IMPORTANT: Do not include detailed scoring, analysis, or explanations. Just the star rating and review text.`, functionName, functionCode, style)

	switch strings.ToLower(style) {
	case "roast":
		return basePrompt + "\n\nBe sarcastic and roast the code. Use 🔥 or 😂 emojis."
	case "funny":
		return basePrompt + "\n\nBe humorous and light-hearted. Use 😄 or 🤣 emojis."
	case "motivational":
		return basePrompt + "\n\nBe encouraging and motivational. Use 💪 or ⭐ emojis."
	case "technical":
		return basePrompt + "\n\nBe professional and technical. Use 🔧 or 📊 emojis."
	case "hilarious":
		return basePrompt + "\n\nBe extremely funny and over-the-top. Use 🤪 or 🎭 emojis."
	default:
		return basePrompt + "\n\nBe neutral and constructive."
	}
}

// GenerateReview generates a review for a function using Gemini API
func (c *Client) GenerateReview(functionName, functionCode, style string) (string, error) {
	// Check if we're in mock mode or if no API key is provided
	if os.Getenv("MOCK_MODE") == "true" || c.APIKey == "" {
		return c.generateMockReview(functionName, style), nil
	}

	// Initialize the client if not already done
	if c.client == nil {
		ctx := context.Background()
		client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: c.APIKey, Backend: genai.BackendGeminiAPI})
		if err != nil {
			return "", fmt.Errorf("failed to create Gemini client: %v", err)
		}
		c.client = client
	}

	prompt := GetReviewPrompt(style, functionName, functionCode)

	ctx := context.Background()
	result, err := c.client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash-exp",
		genai.Text(prompt),
		nil,
	)

	if err != nil {
		// Check for specific error types
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "quota") {
			return "", fmt.Errorf("API quota exceeded. Please check your Gemini API plan or try again later. Error: %v", err)
		}
		if strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), "unauthorized") {
			return "", fmt.Errorf("Invalid API key. Please check your Gemini API key. Error: %v", err)
		}
		return "", fmt.Errorf("Gemini API error: %v", err)
	}

	if result.Text() == "" {
		return "", fmt.Errorf("no response from Gemini API")
	}

	review := strings.TrimSpace(result.Text())
	return review, nil
}

// GenerateBatchReview generates reviews for multiple functions in a single API call
func (c *Client) GenerateBatchReview(batchPrompt, style string) (string, error) {
	// Check if we're in mock mode or if no API key is provided
	if os.Getenv("MOCK_MODE") == "true" || c.APIKey == "" {
		return c.generateMockBatchReview(style), nil
	}

	// Initialize the client if not already done
	if c.client == nil {
		ctx := context.Background()
		client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: c.APIKey, Backend: genai.BackendGeminiAPI})
		if err != nil {
			return "", fmt.Errorf("failed to create Gemini client: %v", err)
		}
		c.client = client
	}

	prompt := fmt.Sprintf(`%s

Style: %s

Rate each function from 1-5 stars and provide ONLY one-liner reviews (max 100 characters each) that match the style. Include appropriate emojis.

IMPORTANT: Do not include detailed scoring, analysis, or explanations. Just the star rating and review text for each function.`, batchPrompt, style)

	ctx := context.Background()
	result, err := c.client.Models.GenerateContent(
		ctx,
		"gemini-2.0-flash-exp",
		genai.Text(prompt),
		nil,
	)

	if err != nil {
		// Check for specific error types
		if strings.Contains(err.Error(), "429") || strings.Contains(err.Error(), "quota") {
			return "", fmt.Errorf("API quota exceeded. Please check your Gemini API plan or try again later. Error: %v", err)
		}
		if strings.Contains(err.Error(), "401") || strings.Contains(err.Error(), "unauthorized") {
			return "", fmt.Errorf("Invalid API key. Please check your Gemini API key. Error: %v", err)
		}
		return "", fmt.Errorf("Gemini API error: %v", err)
	}

	if result.Text() == "" {
		return "", fmt.Errorf("no response from Gemini API")
	}

	review := strings.TrimSpace(result.Text())
	return review, nil
}

// generateMockBatchReview generates mock batch reviews
func (c *Client) generateMockBatchReview(style string) string {
	mockReviews := map[string][]string{
		"funny": {
			"😄 This function is doing its best!",
			"🤣 Well, it's not the worst thing I've seen today",
			"😊 Simple and effective - like a good dad joke",
			"🎯 Gets the job done, no questions asked!",
			"🚀 This function is going places!",
		},
		"roast": {
			"🔥 This function needs a reality check!",
			"😂 At least it's not the worst code ever!",
			"🤦‍♂️ I've seen better code in a tutorial!",
			"💀 This function is barely alive!",
			"🤡 Clown code that somehow works!",
		},
		"motivational": {
			"💪 You're doing great! This function rocks!",
			"⭐ Keep up the excellent work!",
			"🚀 This function is going places!",
			"🌟 You're making progress!",
			"🎯 Every function counts!",
		},
		"technical": {
			"🔧 Well-structured and efficient",
			"📊 Good separation of concerns",
			"⚡ Performance looks optimized",
			"🎯 Clean and maintainable",
			"📈 Scalable design pattern",
		},
		"hilarious": {
			"🤪 This function is so wild, it needs a leash!",
			"🎭 Drama queen of functions right here!",
			"🤡 Clown code that somehow works!",
			"🎪 Welcome to the circus!",
			"🎨 Picasso would be proud!",
		},
	}

	reviews, exists := mockReviews[strings.ToLower(style)]
	if !exists {
		reviews = mockReviews["funny"]
	}

	// Generate multiple mock reviews with generic function names
	var result strings.Builder
	for i, review := range reviews {
		starCount := rand.Intn(3) + 3 // 3-5 stars
		stars := ""
		for j := 0; j < starCount; j++ {
			stars += "⭐"
		}
		// Use generic function names that will be replaced by actual names
		result.WriteString(fmt.Sprintf("Function%d: %s %s\n", i+1, stars, review))
	}

	return result.String()
}

// generateMockReview generates a mock review for testing
func (c *Client) generateMockReview(functionName, style string) string {
	mockReviews := map[string][]string{
		"roast": {
			"🔥 This function is more confusing than your ex's texts",
			"😂 I've seen better code in a fortune cookie",
			"🤦‍♂️ This function has more bugs than a picnic",
			"😅 At least it compiles... barely",
			"🤷‍♂️ It works, but at what cost?",
		},
		"funny": {
			"😄 This function is so clean, it sparkles! ✨",
			"🤣 Well, it's not the worst thing I've seen today",
			"😊 Simple and effective - like a good dad joke",
			"🎉 This function deserves a party!",
			"😎 Cool function, bro!",
		},
		"motivational": {
			"💪 You're doing great! This function rocks!",
			"⭐ Keep up the excellent work!",
			"🚀 This function is going places!",
			"🌟 You've got this! Amazing job!",
			"🔥 You're on fire! Keep coding!",
		},
		"technical": {
			"🔧 Well-structured and efficient",
			"📊 Good separation of concerns",
			"⚡ Performance looks optimized",
			"🛡️ Proper error handling implemented",
			"📝 Clean and readable code",
		},
		"hilarious": {
			"🤪 This function is so wild, it needs a leash! 🦮",
			"🎭 Drama queen of functions right here! 👑",
			"🤡 Clown code that somehow works! 🤹‍♂️",
			"🎪 Welcome to the circus of functions! 🎪",
			"🦄 Unicorn code - magical but questionable! ✨",
		},
	}

	reviews, exists := mockReviews[strings.ToLower(style)]
	if !exists {
		reviews = mockReviews["funny"]
	}

	// Use function name to determine which mock review to use
	index := len(functionName) % len(reviews)
	review := reviews[index]

	// Add random star rating (3-5 stars for mock reviews)
	starCount := rand.Intn(3) + 3 // 3-5 stars
	stars := ""
	for i := 0; i < starCount; i++ {
		stars += "⭐"
	}

	return stars + " " + review
}
