package parser

import (
	"bufio"
	"regexp"
	"reviewer-bot/types"
	"strings"
)

// Parser interface for different language parsers
type Parser interface {
	ParseFunctions(content string) []types.FunctionInfo
}

// GoParser parses Go functions
type GoParser struct{}

// JavaScriptParser parses JavaScript functions
type JavaScriptParser struct{}

// PythonParser parses Python functions
type PythonParser struct{}

// CParser parses C functions
type CParser struct{}

// CppParser parses C++ functions
type CppParser struct{}

// DartParser parses Dart functions
type DartParser struct{}

// JavaParser parses Java functions
type JavaParser struct{}

// ParseFunctions parses Go functions
func (p *GoParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for Go function definitions
	// Matches: func FunctionName(params) returnType {
	// Also handles methods: func (receiver) MethodName(params) returnType {
	goFuncRegex := regexp.MustCompile(`^func\s+(?:\([^)]+\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:[^{]*)?\s*\{`)

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := goFuncRegex.FindStringSubmatch(line); matches != nil {
			functions = append(functions, types.FunctionInfo{
				Name:     matches[1],
				Line:     lineNum,
				Language: "go",
			})
		}
		lineNum++
	}

	return functions
}

// ParseFunctions parses JavaScript functions
func (p *JavaScriptParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for various JavaScript function patterns
	patterns := []*regexp.Regexp{
		// function name(params) {
		regexp.MustCompile(`^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{`),
		// const name = (params) => {
		regexp.MustCompile(`^const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{`),
		// let name = (params) => {
		regexp.MustCompile(`^let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{`),
		// var name = (params) => {
		regexp.MustCompile(`^var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{`),
		// name(params) {
		regexp.MustCompile(`^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{`),
	}

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())

		for _, pattern := range patterns {
			if matches := pattern.FindStringSubmatch(line); matches != nil {
				// Skip if it's likely a method call or other non-function
				if !strings.Contains(line, "if") && !strings.Contains(line, "for") && !strings.Contains(line, "while") {
					functions = append(functions, types.FunctionInfo{
						Name:     matches[1],
						Line:     lineNum,
						Language: "javascript",
					})
					break
				}
			}
		}
		lineNum++
	}

	return functions
}

// ParseFunctions parses Python functions
func (p *PythonParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for Python function definitions
	// Matches: def function_name(params):
	pythonFuncRegex := regexp.MustCompile(`^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*:`)

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := pythonFuncRegex.FindStringSubmatch(line); matches != nil {
			functions = append(functions, types.FunctionInfo{
				Name:     matches[1],
				Line:     lineNum,
				Language: "python",
			})
		}
		lineNum++
	}

	return functions
}

// ParseFunctions parses C functions
func (p *CParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for C function definitions
	// Matches: return_type function_name(params) {
	cFuncRegex := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{`)

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := cFuncRegex.FindStringSubmatch(line); matches != nil {
			functions = append(functions, types.FunctionInfo{
				Name:     matches[1],
				Line:     lineNum,
				Language: "c",
			})
		}
		lineNum++
	}

	return functions
}

// ParseFunctions parses C++ functions
func (p *CppParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for C++ function definitions
	// Matches: return_type function_name(params) {
	// Also handles: return_type ClassName::function_name(params) {
	cppFuncRegex := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_<>]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{`)

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := cppFuncRegex.FindStringSubmatch(line); matches != nil {
			functions = append(functions, types.FunctionInfo{
				Name:     matches[1],
				Line:     lineNum,
				Language: "cpp",
			})
		}
		lineNum++
	}

	return functions
}

// ParseFunctions parses Dart functions
func (p *DartParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for Dart function definitions
	// Matches: return_type function_name(params) {
	dartFuncRegex := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_<>]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{`)

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := dartFuncRegex.FindStringSubmatch(line); matches != nil {
			functions = append(functions, types.FunctionInfo{
				Name:     matches[1],
				Line:     lineNum,
				Language: "dart",
			})
		}
		lineNum++
	}

	return functions
}

// ParseFunctions parses Java functions
func (p *JavaParser) ParseFunctions(content string) []types.FunctionInfo {
	var functions []types.FunctionInfo

	// Regex for Java function definitions
	// Matches: return_type function_name(params) {
	javaFuncRegex := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_<>]*\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{`)

	scanner := bufio.NewScanner(strings.NewReader(content))
	lineNum := 1

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if matches := javaFuncRegex.FindStringSubmatch(line); matches != nil {
			functions = append(functions, types.FunctionInfo{
				Name:     matches[1],
				Line:     lineNum,
				Language: "java",
			})
		}
		lineNum++
	}

	return functions
}

// GetParser returns the appropriate parser based on file extension
func GetParser(filePath string) Parser {
	lowerPath := strings.ToLower(filePath)

	switch {
	case strings.HasSuffix(lowerPath, ".go"):
		return &GoParser{}
	case strings.HasSuffix(lowerPath, ".js") || strings.HasSuffix(lowerPath, ".ts") || strings.HasSuffix(lowerPath, ".jsx") || strings.HasSuffix(lowerPath, ".tsx"):
		return &JavaScriptParser{}
	case strings.HasSuffix(lowerPath, ".py"):
		return &PythonParser{}
	case strings.HasSuffix(lowerPath, ".c"):
		return &CParser{}
	case strings.HasSuffix(lowerPath, ".cpp") || strings.HasSuffix(lowerPath, ".cc") || strings.HasSuffix(lowerPath, ".cxx") || strings.HasSuffix(lowerPath, ".h") || strings.HasSuffix(lowerPath, ".hpp"):
		return &CppParser{}
	case strings.HasSuffix(lowerPath, ".dart"):
		return &DartParser{}
	case strings.HasSuffix(lowerPath, ".java"):
		return &JavaParser{}
	default:
		// Default to JavaScript parser for unknown extensions
		return &JavaScriptParser{}
	}
}

// ParseFile parses functions from a file based on its extension
func ParseFile(filePath, content string) []types.FunctionInfo {
	parser := GetParser(filePath)
	return parser.ParseFunctions(content)
}
