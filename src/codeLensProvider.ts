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
    
        console.log(`CodeLens: Processing file ${filePath}`);
        console.log(`CodeLens: Language ID: ${document.languageId}`);
        console.log(`CodeLens: Found ${fileReviews.length} reviews for this file`);
    
        // Map line numbers to reviews
        const reviewsByLine = new Map<number, Review>();
        for (const review of fileReviews) {
            reviewsByLine.set(review.line, review);
            console.log(`CodeLens: Available review for '${review.function}' at line ${review.line}: ${review.stars} ${review.review}`);
        }
    
        const patterns = this.getFunctionPatterns(document.languageId);
        console.log(`CodeLens: Using ${patterns.length} patterns for language ${document.languageId}`);
    
        const processedFunctions = new Set<string>();
        const text = document.getText();
    
        for (const pattern of patterns) {
            const regex = new RegExp(pattern.regex, 'gm');
            let match: RegExpExecArray | null;
    
            while ((match = regex.exec(text))) {
                const functionName = pattern.extractName(match);
                if (!functionName) continue;
    
                const matchText = match[0];
                const fullMatchStart = match.index;
    
                // Try to find more precise line of function name
                let functionLine = document.positionAt(fullMatchStart).line;
                const offsetInMatch = matchText.indexOf(functionName);
                if (offsetInMatch !== -1) {
                    const absoluteIndex = fullMatchStart + offsetInMatch;
                    functionLine = document.positionAt(absoluteIndex).line;
                }
    
                const functionKey = `${functionName}:${functionLine}`;
                if (processedFunctions.has(functionKey)) {
                    console.log(`CodeLens: Skipping duplicate function '${functionName}' at line ${functionLine}`);
                    continue;
                }
    
                processedFunctions.add(functionKey);
                console.log(`CodeLens: Found function '${functionName}' at line ${functionLine}`);
    
                const range = new vscode.Range(functionLine, 0, functionLine, 0);
                const review = reviewsByLine.get(functionLine);
    
                let title = '';
                if (review) {
                    console.log(`CodeLens: Found review for function '${functionName}' at line ${functionLine}`);
                    title = `${review.stars} ${review.review}`;
                } else {
                    console.log(`CodeLens: No review found for function '${functionName}' at line ${functionLine}`);
                    const reviewByName = fileReviews.find(r => r.function === functionName);
                    if (reviewByName) {
                        console.log(`CodeLens: Found review by name '${functionName}' at line ${reviewByName.line}`);
                        title = `${reviewByName.stars} ${reviewByName.review}`;
                    } else {
                        title = this.generateDefaultReview(functionName);
                    }
                }
    
                lenses.push(new vscode.CodeLens(range, {
                    title: title,
                    command: 'reviewer-bot.showReviewHistory',
                    arguments: [functionName],
                    tooltip: `Review for ${functionName}`
                }));
            }
        }
    
        return lenses;
    }
    

    private getFunctionPatterns(languageId: string): Array<{regex: string, extractName: (match: RegExpExecArray) => string | null}> {
        switch (languageId) {
            case 'go':
                return [{
                    regex: `^\\s*func\\s+(?:\\([^)]+\\)\\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*(?:[^{]*)?\\s*\\{`,
                    extractName: (match) => match[1] || null
                }];
            
            case 'javascript':
            case 'typescript':
                return [
                    {
                        regex: `^\\s*function\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\([^)]*\\)\\s*\\{`,
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
                    regex: `^\\s*def\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*:`,
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
                        regex: `^\\s*[a-zA-Z_][a-zA-Z0-9_<>]*\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^>]*>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*[a-zA-Z_][a-zA-Z0-9_<>]*\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^>]*>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^>]*>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^>]*>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^<]*<[^>]*>>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^<]*<[^>]*>>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^<]*<[^<]*<[^>]*>>>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^<]*<[^<]*<[^>]*>>>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    // More comprehensive nested generics patterns
                    {
                        regex: `^\\s*Future<[^<]*<[^<]*<[^<]*<[^<]*<[^>]*>>>>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^<]*<[^<]*<[^<]*<[^<]*<[^>]*>>>>>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    // Generic patterns for any level of nesting
                    {
                        regex: `^\\s*Future<[^>]*>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*async\\s*\\{`,
                        extractName: (match) => match[1] || null
                    },
                    {
                        regex: `^\\s*Future<[^>]*>\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\([^)]*\\)\\s*\\{`,
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