// TypeScript types for ReviewerBot

export interface ReviewRequest {
  file_path: string;
  file_content: string;
  style: string;
  api_key?: string;
}

export interface FunctionInfo {
  name: string;
  line: number;
  language: string;
}

export interface Review {
  line: number;
  function: string;
  style: string;
  review: string;
  stars: string;
}

export interface ReviewResponse {
  file: string;
  reviews: Review[];
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