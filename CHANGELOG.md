# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-07-31
### Added
- 🎉 **Official Release**: ReviewerBot VS Code extension
- 🤖 **AI-Powered Reviews**: Using Gemini 2.0 Flash API
- 🌍 **Multi-language Support**: Go, JavaScript/TypeScript, Python, Dart
- 👁️ **CodeLens Integration**: Reviews appear as clickable CodeLens above functions
- ⭐ **AI-Generated Star Ratings**: Quality-based ratings (1-5 stars)
- 🎨 **Multiple Review Styles**: Funny, Roast, Motivational, Technical, Hilarious
- 🔑 **API Key Management**: Built-in UI for Gemini API key configuration
- 💾 **Review Persistence**: Reviews saved to `.reviewer-bot-reviews.json`
- 📚 **Review History**: Click CodeLens to view review history
- 🚀 **Auto-generation**: Generate reviews on file save (optional)
- 🎭 **Mock Mode**: Test without API calls
- 🔧 **Direct Communication**: Go backend called via stdin/stdout (no server required)

### Technical Features
- **Go Backend**: Function parsing, Gemini integration, review generation
- **VS Code Extension**: TypeScript-based with CodeLens provider
- **Error Handling**: Specific messages for API quotas, invalid keys, etc.
- **Batch Processing**: Optimized API calls with fallback to individual calls
- **Cross-platform**: Works on Windows, macOS, Linux

## [0.1.0] - 2025-07-30
### Added
- Initial release of ReviewerBot VS Code extension
- AI-powered code reviews using Gemini 2.0 Flash
- Multi-language support (Go, JS, Python, C, C++, Dart, Java)
- CodeLens review display
- API key management UI
- Review persistence and history
- Mock mode for testing 