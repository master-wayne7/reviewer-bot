package types

// ReviewRequest represents a request to generate reviews for a file
type ReviewRequest struct {
	FilePath    string `json:"file_path"`
	FileContent string `json:"file_content"`
	Style       string `json:"style"`
	APIKey      string `json:"api_key,omitempty"`
}

// FunctionInfo represents a detected function in the code
type FunctionInfo struct {
	Name     string `json:"name"`
	Line     int    `json:"line"`
	Language string `json:"language"`
}

// Review represents a generated review for a function
type Review struct {
	Line     int    `json:"line"`
	Function string `json:"function"`
	Style    string `json:"style"`
	Review   string `json:"review"`
	Stars    string `json:"stars"`
}

// ReviewResponse represents the response containing all reviews for a file
type ReviewResponse struct {
	File    string   `json:"file"`
	Reviews []Review `json:"reviews"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error"`
}

// GeminiRequest represents a request to the Gemini API
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

// GeminiContent represents content in a Gemini request
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

// GeminiPart represents a part of content in a Gemini request
type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiResponse represents a response from the Gemini API
type GeminiResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
}

// GeminiCandidate represents a candidate response from Gemini
type GeminiCandidate struct {
	Content GeminiContent `json:"content"`
}
