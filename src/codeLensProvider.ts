import * as vscode from 'vscode';
import { BackendClient } from './backendClient';
import { Review } from './types';
import * as fs from 'fs';
import * as path from 'path';

export class ReviewCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    private reviews: Map<string, Review[]> = new Map();
    private reviewHistory: Map<string, string[]> = new Map();
    private backendClient: BackendClient;
    private storageFile: string;

    constructor(backendClient: BackendClient) {
        this.backendClient = backendClient;
        this.storageFile = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.reviewer-bot-reviews.json');
        this.loadReviews();
    }

    public refresh() {
        this._onDidChangeCodeLenses.fire();
    }

    public setReviews(filePath: string, reviews: Review[]) {
        this.reviews.set(filePath, reviews);
        
        // Store in review history
        for (const review of reviews) {
            const key = `${review.function}`;
            if (!this.reviewHistory.has(key)) {
                this.reviewHistory.set(key, []);
            }
            const reviewText = `${review.stars} ${review.review}`;
            this.reviewHistory.get(key)?.push(reviewText);
        }
        
        // Save to file for persistence
        this.saveReviews();
        this.refresh();
    }

    public clearReviews(filePath: string) {
        this.reviews.delete(filePath);
        this.refresh();
    }

    public getReviewHistory(functionName: string): string[] {
        return this.reviewHistory.get(functionName) || [];
    }

    private loadReviews(): void {
        try {
            if (fs.existsSync(this.storageFile)) {
                const data = fs.readFileSync(this.storageFile, 'utf8');
                const savedData = JSON.parse(data);
                
                // Load reviews
                this.reviews = new Map(Object.entries(savedData.reviews || {}));
                
                // Load review history
                this.reviewHistory = new Map(Object.entries(savedData.history || {}));
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
        }
    }

    private saveReviews(): void {
        try {
            const data = {
                reviews: Object.fromEntries(this.reviews),
                history: Object.fromEntries(this.reviewHistory)
            };
            fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save reviews:', error);
        }
    }

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const lenses: vscode.CodeLens[] = [];
        const filePath = document.uri.fsPath;
        const fileReviews = this.reviews.get(filePath) || [];

        // Create a map of line numbers to reviews for quick lookup
        const reviewsByLine = new Map<number, Review>();
        for (const review of fileReviews) {
            reviewsByLine.set(review.line, review);
        }

        // Function detection patterns for different languages
        const patterns = this.getFunctionPatterns(document.languageId);
        
        for (const pattern of patterns) {
            const regex = new RegExp(pattern.regex, 'gm');
            const text = document.getText();
            let match: RegExpExecArray | null;

            while ((match = regex.exec(text))) {
                const line = document.positionAt(match.index).line;
                const functionName = pattern.extractName(match);
                
                if (functionName) {
                    const range = new vscode.Range(line, 0, line, 0);
                    const review = reviewsByLine.get(line + 1); // Convert to 1-based line number
                    
                    let title = '';
                    if (review) {
                        title = `${review.stars} ${review.review}`;
                    } else {
                        // Generate a default review if none exists
                        title = this.generateDefaultReview(functionName);
                    }

                    lenses.push(new vscode.CodeLens(range, {
                        title: title,
                        command: 'reviewer-bot.showReviewHistory',
                        arguments: [functionName],
                        tooltip: `Review for ${functionName}`
                    }));
                }
            }
        }

        return lenses;
    }

    private getFunctionPatterns(languageId: string): Array<{regex: string, extractName: (match: RegExpExecArray) => string | null}> {
        switch (languageId) {
            case 'go':
                return [{
                    regex: `^func\\s+(?:\\([^)]+\\)\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*(?:[^{]*)?\\s*\\{`,
                    extractName: (match) => match[1] || null
                }];
            
            case 'javascript':
            case 'typescript':
                return [
                    {
                        regex: `^function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => {
                            // Skip if it's likely a method call or other non-function
                            const line = match[0];
                            if (line.includes('if') || line.includes('for') || line.includes('while')) {
                                return null;
                            }
                            return match[1] || null;
                        }
                    }
                ];
            
            case 'python':
                return [{
                    regex: `^def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*:`,
                    extractName: (match) => match[1] || null
                }];

            case 'c':
                return [
                    {
                        regex: `^[a-zA-Z_][a-zA-Z0-9_]*\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    }
                ];

            case 'cpp':
                return [
                    {
                        regex: `^[a-zA-Z_][a-zA-Z0-9_<>]*\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    }
                ];

            case 'dart':
                return [
                    {
                        regex: `^[a-zA-Z_][a-zA-Z0-9_<>]*\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    }
                ];

            case 'java':
                return [{
                    regex: `^[a-zA-Z_][a-zA-Z0-9_<>]*\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                    extractName: (match) => match[1] || null
                }];
            
            default:
                return [];
        }
    }

    private generateDefaultReview(functionName: string): string {
        const config = this.backendClient.getConfig();
        const style = config.reviewStyle;
        
        const defaultReviews = {
            funny: [
                '😄 This function is doing its best',
                '🤣 It\'s not perfect, but it\'s trying',
                '😊 Simple and gets the job done',
                '🎉 This function deserves a party!',
                '😎 Cool function, bro!'
            ],
            roast: [
                '🔥 This function needs a reality check',
                '😂 At least it\'s not the worst code ever',
                '🤦‍♂️ I\'ve seen better code in a tutorial',
                '😅 This function is... interesting',
                '🤷‍♂️ It works, but at what cost?'
            ],
            motivational: [
                '💪 Keep coding, you\'re doing great!',
                '⭐ Every function is a step forward',
                '🚀 You\'re on the right track!',
                '🌟 You\'ve got this! Amazing job!',
                '🔥 You\'re on fire! Keep coding!'
            ],
            technical: [
                '🔧 Functional and readable',
                '📊 Basic but effective',
                '⚡ Standard implementation',
                '🛡️ Proper structure',
                '📝 Clean and readable code'
            ],
            hilarious: [
                '🤪 This function is a character!',
                '🎭 Drama in the codebase!',
                '🤡 Clowning around with code!',
                '🎪 Welcome to the circus of functions!',
                '🦄 Unicorn code - magical but questionable!'
            ]
        };

        const reviews = defaultReviews[style] || defaultReviews.funny;
        const review = reviews[Math.floor(Math.random() * reviews.length)];
        const stars = '⭐'.repeat(Math.floor(Math.random() * 3) + 3); // 3-5 stars
        
        return `${stars} ${review}`;
    }
} 