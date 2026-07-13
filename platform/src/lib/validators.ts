// platform/src/lib/validators.ts
import { isDomain } from '@shared/utils/validation';

export function validateSiteCreation(data: { siteName: string; domain: string }): string | null {
  if (!data.siteName || data.siteName.trim().length < 2) return '사이트 이름은 2자 이상이어야 합니다.';
  if (data.siteName.trim().length > 50) return '사이트 이름은 50자 이하이어야 합니다.';
  if (!data.domain || !isDomain(data.domain)) return '올바른 도메인을 입력해주세요.';
  return null;
}
