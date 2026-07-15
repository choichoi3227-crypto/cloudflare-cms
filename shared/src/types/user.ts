// shared/src/types/user.ts
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  status: UserStatus;
  auth_provider: AuthProvider;
  email_verified: boolean;
  referral_code: string | null;
  referred_by_code: string | null;
  cf_account_email: string | null;
  created_at: number;
  updated_at: number;
}

// 'pending_verification': 이메일 인증 전, 'pending_cf_key': 소셜 로그인 완료했으나 CF Global API 키 미입력,
// 'active': 정상, 'suspended'/'deleted': 관리 상태
export type UserStatus = 'pending_verification' | 'pending_cf_key' | 'active' | 'suspended' | 'deleted';

export type AuthProvider = 'email' | 'google' | 'github' | 'cloudflare_oauth';

export interface SocialAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'github';
  provider_user_id: string;
  email: string;
  created_at: number;
  updated_at: number;
}

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
