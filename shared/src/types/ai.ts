// shared/src/types/ai.ts
export interface AIWriterRequest {
  keyword: string;
  type: ArticleType;
  length: 'short' | 'medium' | 'long';
  language?: string;
  tone?: string;
  additional_instructions?: string;
}

export type ArticleType = 'informational' | 'news' | 'policy' | 'review' | 'comparison' | 'tutorial';

export interface AIWriterResponse {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  faq: Array<{ question: string; answer: string }>;
  meta_description: string;
  og_description: string;
  tags: string[];
  focus_keyword: string;
}

export interface AISeoRequest {
  title: string;
  content: string;
  meta_description: string;
  focus_keyword: string;
}

export interface AISeoResponse {
  score: number;
  suggestions: Array<{
    type: 'info' | 'warning' | 'error';
    category: string;
    message: string;
    field?: string;
    suggested_value?: string;
  }>;
  keyword_density: number;
  readability_score: number;
  title_analysis: { score: number; suggestions: string[] };
  meta_analysis: { score: number; suggestions: string[] };
}

export interface AISchemaRequest {
  object_type: string;
  object_id: string;
  data: Record<string, unknown>;
}

export interface AISchemaResponse {
  schema_type: string;
  schema_json: string;
}
