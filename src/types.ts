export interface Review {
    line: number;
    function: string;
    style: string;
    review: string;
    stars: string;
}

export interface ReviewRequest {
    file_path: string;
    file_content: string;
    style: string;
}

export interface ReviewResponse {
    file: string;
    Reviews: Review[];
}

export interface ErrorResponse {
    error: string;
}

export type ReviewStyle = 'funny' | 'roast' | 'motivational' | 'technical' | 'hilarious';

export interface ExtensionConfig {
    apiKey: string;
    reviewStyle: ReviewStyle;
    autoGenerateOnSave: boolean;
    enabledLanguages: string[];
}