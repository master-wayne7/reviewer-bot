import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { ReviewRequest, ReviewResponse, ErrorResponse, ExtensionConfig } from './types';

export class BackendClient {
  private config: ExtensionConfig;
  private backendPath: string;

  constructor() {
    this.config = this.loadConfig();
    // Use the local Go executable
    this.backendPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath + '/reviewer-bot.exe';
  }

  private loadConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('reviewerBot');
    return {
      apiKey: config.get('apiKey', ''),
      reviewStyle: config.get('reviewStyle', 'funny'),
      autoGenerateOnSave: config.get('autoGenerateOnSave', false),
      enabledLanguages: config.get('enabledLanguages', ['go', 'javascript', 'typescript', 'python'])
    };
  }

  public reloadConfig(): void {
    this.config = this.loadConfig();
  }

  public async generateReviews(filePath: string, fileContent: string): Promise<ReviewResponse> {
    try {
      // Check if Go executable exists
      const fs = require('fs');
      if (!fs.existsSync(this.backendPath)) {
        throw new Error(`Go executable not found at: ${this.backendPath}. Please ensure reviewer-bot.exe is in the workspace root.`);
      }

      const request: ReviewRequest = {
        file_path: filePath,
        file_content: fileContent,
        style: this.config.reviewStyle,
        api_key: this.config.apiKey || undefined
      };

      // Call the Go executable directly
      const response = await this.callGoBackend(request);
      return response;
    } catch (error) {
      console.error('Error generating reviews:', error);
      throw error;
    }
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

  public isLanguageSupported(filePath: string): boolean {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    const languageMap: { [key: string]: string } = {
      'go': 'go',
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'cpp',
      'hpp': 'cpp',
      'dart': 'dart',
      'java': 'java'
    };

    const language = languageMap[extension];
    return language ? this.config.enabledLanguages.includes(language) : false;
  }

  public getConfig(): ExtensionConfig {
    return this.config;
  }
} 