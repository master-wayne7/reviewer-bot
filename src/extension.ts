import * as vscode from 'vscode';
import { BackendClient } from './backendClient';
import { ReviewCodeLensProvider } from './codeLensProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('ReviewerBot extension is now active!');

  const backendClient = new BackendClient();
  const codeLensProvider = new ReviewCodeLensProvider(backendClient);

  // Register CodeLens provider
  const selector = [
    { language: 'go', scheme: 'file' },
    { language: 'javascript', scheme: 'file' },
    { language: 'typescript', scheme: 'file' },
    { language: 'python', scheme: 'file' }
  ];

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider)
  );

  // Register command to generate reviews
  let generateReviewsCommand = vscode.commands.registerCommand('reviewer-bot.generateReviews', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active text editor found.');
      return;
    }

    const filePath = editor.document.uri.fsPath;
    
    // Check if language is supported
    if (!backendClient.isLanguageSupported(filePath)) {
      vscode.window.showErrorMessage('This file type is not supported for reviews.');
      return;
    }

    // Check if API key is configured
    const config = backendClient.getConfig();
    if (!config.apiKey) {
      vscode.window.showErrorMessage('Please configure your Gemini API key in settings.');
      return;
    }

    try {
      // Show progress
      let reviewsResponse;
      const config = backendClient.getConfig();
      console.log('Generating reviews with style:', config.reviewStyle);
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Generating reviews...",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0 });

        const fileContent = editor.document.getText();
        reviewsResponse = await backendClient.generateReviews(filePath, fileContent);
        
        progress.report({ increment: 50 });
        
        // Store reviews in CodeLens provider
        codeLensProvider.setReviews(filePath, reviewsResponse.reviews);
        
        progress.report({ increment: 100 });
      });

      vscode.window.showInformationMessage(`Generated ${reviewsResponse.reviews.length} reviews with ${config.reviewStyle} style!`);
    } catch (error) {
      console.error('Error generating reviews:', error);
      vscode.window.showErrorMessage(`Failed to generate reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Register command to clear reviews
  let clearReviewsCommand = vscode.commands.registerCommand('reviewer-bot.clearReviews', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const filePath = editor.document.uri.fsPath;
      codeLensProvider.clearReviews(filePath);
      vscode.window.showInformationMessage('Reviews cleared!');
    } else {
      vscode.window.showErrorMessage('No active text editor found.');
    }
  });

  // Register command to show review history
  let showReviewHistoryCommand = vscode.commands.registerCommand('reviewer-bot.showReviewHistory', (functionName: string) => {
    const history = codeLensProvider.getReviewHistory(functionName);
    if (history.length > 0) {
      vscode.window.showQuickPick(history.slice().reverse(), {
        title: `Review History: ${functionName}`,
        placeHolder: 'Select a review to view',
      }).then(selected => {
        if (selected) {
          vscode.window.showInformationMessage(`Selected review: ${selected}`);
        }
      });
    } else {
      vscode.window.showInformationMessage(`No review history for ${functionName}`);
    }
  });

  // Register command to set API key
  let setApiKeyCommand = vscode.commands.registerCommand('reviewer-bot.setApiKey', async () => {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Gemini API Key',
      password: true,
      placeHolder: 'AIza...',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty';
        }
        if (!value.startsWith('AIza')) {
          return 'API key should start with "AIza"';
        }
        return null;
      }
    });

    if (apiKey) {
      await vscode.workspace.getConfiguration('reviewerBot').update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
      backendClient.reloadConfig();
      vscode.window.showInformationMessage('Gemini API Key saved successfully!');
    }
  });

  // Register command to clear API key
  let clearApiKeyCommand = vscode.commands.registerCommand('reviewer-bot.clearApiKey', async () => {
    const result = await vscode.window.showWarningMessage(
      'Are you sure you want to clear your Gemini API Key?',
      { modal: true },
      'Yes, Clear It'
    );

    if (result === 'Yes, Clear It') {
      await vscode.workspace.getConfiguration('reviewerBot').update('apiKey', '', vscode.ConfigurationTarget.Global);
      backendClient.reloadConfig();
      vscode.window.showInformationMessage('Gemini API Key cleared. Mock mode will be used.');
    }
  });

  // Register command to show current configuration
  let showConfigCommand = vscode.commands.registerCommand('reviewer-bot.showConfig', () => {
    const config = backendClient.getConfig();
    const hasApiKey = config.apiKey ? 'Yes (starts with ' + config.apiKey.substring(0, 10) + '...)' : 'No (using mock mode)';
    
    vscode.window.showInformationMessage(
      `ReviewerBot Configuration:
      • API Key: ${hasApiKey}
      • Review Style: ${config.reviewStyle}
      • Auto-generate on Save: ${config.autoGenerateOnSave ? 'Enabled' : 'Disabled'}
      • Supported Languages: ${config.enabledLanguages.join(', ')}`
    );
  });

  // Handle auto-generation on save
  let saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const config = backendClient.getConfig();
    console.log('Auto-generate on save:', config.autoGenerateOnSave);
    
    if (!config.autoGenerateOnSave) {
      console.log('Auto-generate disabled, skipping');
      return;
    }

    const filePath = document.uri.fsPath;
    console.log('File saved:', filePath);
    
    if (!backendClient.isLanguageSupported(filePath)) {
      console.log('Language not supported:', filePath);
      return;
    }

    console.log('Generating reviews for saved file...');
    try {
      const fileContent = document.getText();
      const reviewsResponse = await backendClient.generateReviews(filePath, fileContent);
      codeLensProvider.setReviews(filePath, reviewsResponse.reviews);
      console.log('Auto-generated reviews:', reviewsResponse.reviews.length);
    } catch (error) {
      console.error('Error auto-generating reviews on save:', error);
      // Don't show error for auto-generation to avoid spam
    }
  });

  // Handle configuration changes
  let configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('reviewerBot')) {
      backendClient.reloadConfig();
    }
  });

  // Context subscriptions
  context.subscriptions.push(
    generateReviewsCommand,
    clearReviewsCommand,
    showReviewHistoryCommand,
    setApiKeyCommand,
    clearApiKeyCommand,
    showConfigCommand,
    saveListener,
    configListener
  );
}

export function deactivate() {
  console.log('ReviewerBot extension is now deactivated!');
} 