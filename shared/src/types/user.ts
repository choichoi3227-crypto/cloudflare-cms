// shared/src/types/user.ts
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  status: UserStatus;
  created_at: number;
  updated_at: number;
}

export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface CloudflareAccount {
  id: string;
  user_id: string;
  cloudflare_account_id: string;
  email: string;
  oauth_token: string;
  refresh_token: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface AIConnection {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  model: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'z-ai' | 'deepseek';
