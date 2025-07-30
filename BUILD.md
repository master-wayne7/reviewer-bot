# ReviewerBot Build Guide

This guide will help you build and test the ReviewerBot VS Code extension with its Go backend.

## Prerequisites

- Go 1.21+
- Node.js 16+
- VS Code
- Gemini API Key (optional for testing)

## Building the Go Backend

### 1. Install Dependencies
```bash
go mod tidy
```

### 2. Build the Executable
```bash
go build -o reviewer-bot.exe main.go
```

### 3. Test the Backend

#### Test with Mock Mode (No API Key Required)
```bash
# Set mock mode
$env:MOCK_MODE="true"

# Test with simple JSON
Get-Content test_simple.json | .\reviewer-bot.exe
```

#### Test with Real API
```bash
# Set your API key
$env:GEMINI_API_KEY="your-api-key-here"

# Test with sample file
Get-Content test_simple.json | .\reviewer-bot.exe
```

#### Test Direct Communication
The extension now calls the Go executable directly via stdin/stdout, no server needed!

## Building the VS Code Extension

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile TypeScript
```bash
npm run compile
```

### 3. Package Extension (Optional)
```bash
npm run package
```

### 4. Install Extension
1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Extensions: Install from VSIX"
4. Select the generated `.vsix` file

## Testing the Complete System

### 1. Ensure Go Executable is Built
```bash
go build -o reviewer-bot.exe main.go
```

### 2. Configure Extension
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "ReviewerBot"
3. Set your Gemini API key (optional - will use mock mode if not set)
4. Choose review style

### 3. Test Extension
1. Open a sample file from `/examples`
2. Press `Ctrl+Shift+P`
3. Type "ReviewerBot: Generate Reviews"
4. Verify reviews appear above functions

## Troubleshooting

### Backend Issues
- **Port already in use**: Change `PORT` environment variable
- **API key invalid**: Verify your Gemini API key
- **JSON parsing errors**: Check input format

### Extension Issues
- **Backend not found**: Ensure Go backend is running
- **No reviews generated**: Check file type support
- **Configuration errors**: Verify settings in VS Code

### Common Solutions
1. Restart VS Code after configuration changes
2. Check browser console for error messages
3. Verify backend is accessible at configured URL
4. Test with mock mode first

## Development Workflow

### Backend Development
1. Make changes to Go files
2. Run `go build` to check for errors
3. Test with mock mode: `$env:MOCK_MODE="true"; go run main.go`
4. Test with real API when ready

### Extension Development
1. Make changes to TypeScript files
2. Run `npm run compile` to check for errors
3. Press `F5` in VS Code to launch extension in debug mode
4. Test changes in the debug instance

## File Structure

```
reviewer-bot/
├── main.go                 # Backend entry point
├── parser/                 # Function parsing
├── gemini/                 # Gemini API client
├── review/                 # Review generation
├── types/                  # Data structures
├── src/                    # Extension source
├── examples/               # Sample files
├── test_simple.json        # Test data
├── test_backend.ps1        # Test script
└── README.md               # Documentation
```

## Next Steps

1. Add more language support (C++, Java, etc.)
2. Implement caching for API responses
3. Add more review styles
4. Create unit tests
5. Add CI/CD pipeline
6. Publish to VS Code marketplace 