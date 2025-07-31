import * as vscode from 'vscode';
import { BackendClient } from './backendClient';
import { ReviewCodeLensProvider } from './codeLensProvider';

let codeLensProvider: ReviewCodeLensProvider;
let backendClient: BackendClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('ReviewerBot extension is now active!');

    // Initialize backend client
    backendClient = new BackendClient();

    // Register CodeLens provider
    codeLensProvider = new ReviewCodeLensProvider(backendClient);
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [
                { language: 'go' },
                { language: 'javascript' },
                { language: 'typescript' },
                { language: 'python' },
                { language: 'dart' }
            ],
            codeLensProvider
        )
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('reviewer-bot.generateReviews', generateReviewsCommand),
        vscode.commands.registerCommand('reviewer-bot.clearReviews', clearReviewsCommand),
        vscode.commands.registerCommand('reviewer-bot.showReviewHistory', showReviewHistoryCommand),
        vscode.commands.registerCommand('reviewer-bot.setApiKey', setApiKeyCommand),
        vscode.commands.registerCommand('reviewer-bot.clearApiKey', clearApiKeyCommand),
        vscode.commands.registerCommand('reviewer-bot.showConfig', showConfigCommand)
    );

    // Register auto-save handler
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            const config = backendClient.getConfig();
            if (config.autoGenerateOnSave && backendClient.isLanguageSupported(document.languageId)) {
                console.log(`Auto-generating reviews for ${document.fileName}`);
                generateReviewsForDocument(document);
            }
        })
    );
}

async function generateReviewsCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    await generateReviewsForDocument(editor.document);
}

async function generateReviewsForDocument(document: vscode.TextDocument) {
    if (!backendClient.isLanguageSupported(document.languageId)) {
        vscode.window.showErrorMessage(`Language '${document.languageId}' is not supported.`);
        return;
    }

    const config = backendClient.getConfig();
    
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating reviews...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            const reviewsResponse = await backendClient.generateReviews(
                document.fileName,
                document.getText(),
                config.reviewStyle
            );
            
            progress.report({ increment: 100 });
            
            // Debug: Log the response structure
            console.log('Backend response:', JSON.stringify(reviewsResponse, null, 2));
            
            if (reviewsResponse.reviews && reviewsResponse.reviews.length > 0) {
                codeLensProvider.setReviews(document.fileName, reviewsResponse.reviews);
                vscode.window.showInformationMessage(`Generated ${reviewsResponse.reviews.length} reviews!`);
            } else {
                vscode.window.showInformationMessage('No functions found to review.');
            }
        });
    } catch (error) {
        console.error('Error generating reviews:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Show specific error messages for common issues
        if (errorMessage.includes('API quota exceeded')) {
            vscode.window.showErrorMessage('API quota exceeded. Please check your Gemini API plan or try again later.');
        } else if (errorMessage.includes('Invalid API key')) {
            vscode.window.showErrorMessage('Invalid API key. Please check your Gemini API key in settings.');
        } else if (errorMessage.includes('Gemini API error')) {
            vscode.window.showErrorMessage('Gemini API error. Please check your internet connection and try again.');
        } else {
            vscode.window.showErrorMessage(`Failed to generate reviews: ${errorMessage}`);
        }
    }
}

function clearReviewsCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found.');
        return;
    }

    codeLensProvider.clearReviews(editor.document.fileName);
    vscode.window.showInformationMessage('Reviews cleared!');
}

function showReviewHistoryCommand(functionName: string) {
    const history = codeLensProvider.getReviewHistory(functionName);
    if (history.length === 0) {
        vscode.window.showInformationMessage(`No review history for function '${functionName}'`);
        return;
    }

    vscode.window.showQuickPick(history, {
        placeHolder: `Review history for ${functionName}`,
        title: `Review History: ${functionName}`
    });
}

async function setApiKeyCommand() {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Gemini API Key',
        password: true,
        placeHolder: 'sk-...'
    });

    if (apiKey !== undefined) {
        await vscode.workspace.getConfiguration('reviewerBot').update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
        backendClient.reloadConfig();
        vscode.window.showInformationMessage('API key set successfully!');
    }
}

async function clearApiKeyCommand() {
    await vscode.workspace.getConfiguration('reviewerBot').update('apiKey', '', vscode.ConfigurationTarget.Global);
    backendClient.reloadConfig();
    vscode.window.showInformationMessage('API key cleared!');
}

function showConfigCommand() {
    const config = backendClient.getConfig();
    const message = `Current Configuration:
• API Key: ${config.apiKey ? 'Set' : 'Not set'}
• Review Style: ${config.reviewStyle}
• Auto-generate on Save: ${config.autoGenerateOnSave ? 'Enabled' : 'Disabled'}
• Enabled Languages: ${config.enabledLanguages.join(', ')}`;
    
    vscode.window.showInformationMessage(message);
}

export function deactivate() {
    console.log('ReviewerBot extension is now deactivated!');
} 