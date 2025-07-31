import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { ReviewRequest, ReviewResponse, ErrorResponse, ExtensionConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class BackendClient {
    private config: ExtensionConfig;
    private backendPath: string;

    constructor() {
        this.config = this.loadConfig();
        this.backendPath = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', 'reviewer-bot.exe');
    }

    private loadConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration('reviewerBot');
        return {
            apiKey: config.get('apiKey', ''),
            reviewStyle: config.get('reviewStyle', 'funny'),
            autoGenerateOnSave: config.get('autoGenerateOnSave', false),
            enabledLanguages: config.get('enabledLanguages', ['go', 'javascript', 'typescript', 'python', 'dart'])
        };
    }

    public reloadConfig() {
        this.config = this.loadConfig();
    }

    public getConfig(): ExtensionConfig {
        return this.config;
    }

    public async generateReviews(filePath: string, fileContent: string, style: string): Promise<ReviewResponse> {
        const request: ReviewRequest = {
            file_path: filePath,
            file_content: fileContent,
            style
        };

        return this.callGoBackend(request);
    }

    private async callGoBackend(request: ReviewRequest): Promise<ReviewResponse> {
        return new Promise((resolve, reject) => {
            // Set environment variables
            const env = { ...process.env };
            if (this.config.apiKey) {
                env.GEMINI_API_KEY = this.config.apiKey;
            }
            // Enable mock mode if no API key is provided
            if (!this.config.apiKey) {
                env.MOCK_MODE = 'true';
            }

            // Check if Go executable exists
            if (!fs.existsSync(this.backendPath)) {
                reject(new Error(`Go executable not found at: ${this.backendPath}. Please ensure reviewer-bot.exe is in the workspace root.`));
                return;
            }

            // Spawn the Go process
            const goProcess = spawn(this.backendPath, [], {
                env: env,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            // Collect stdout
            goProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            // Collect stderr
            goProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            // Handle process completion
            goProcess.on('close', (code) => {
                if (code !== 0) {
                    if (stderr.includes('Failed to parse JSON')) {
                        reject(new Error(`Invalid request format: ${stderr}`));
                    } else if (stderr.includes('Missing required fields')) {
                        reject(new Error(`Invalid request: ${stderr}`));
                    } else {
                        reject(new Error(`Go backend failed with code ${code}: ${stderr}`));
                    }
                    return;
                }

                try {
                    const response = JSON.parse(stdout) as ReviewResponse;
                    
                    // Validate response structure
                    if (!response || typeof response !== 'object') {
                        reject(new Error('Invalid response structure from Go backend'));
                        return;
                    }
                    
                    // Ensure Reviews field exists
                    if (!response.Reviews) {
                        console.warn('Go backend response missing Reviews field:', response);
                        response.Reviews = [];
                    }
                    
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Failed to parse Go backend response: ${error}`));
                }
            });

            // Handle process errors
            goProcess.on('error', (error) => {
                if (error.message.includes('ENOENT')) {
                    reject(new Error(`Go executable not found at: ${this.backendPath}. Please ensure reviewer-bot.exe is in the workspace root.`));
                } else {
                    reject(new Error(`Failed to start Go backend: ${error.message}`));
                }
            });

            // Send request to stdin
            const requestJson = JSON.stringify(request);
            goProcess.stdin.write(requestJson);
            goProcess.stdin.end();
        });
    }

    public isLanguageSupported(languageId: string): boolean {
        const languageMap: { [key: string]: string } = {
            'go': 'go',
            'javascript': 'javascript',
            'typescript': 'typescript',
            'python': 'python',
            'dart': 'dart'
        };

        const mappedLanguage = languageMap[languageId];
        return mappedLanguage && this.config.enabledLanguages.includes(mappedLanguage);
    }
}