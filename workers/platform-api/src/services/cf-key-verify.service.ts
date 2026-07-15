// workers/platform-api/src/services/cf-key-verify.service.ts
//
// 회원가입 시 사용자가 입력하는 Cloudflare "Global API Key"를 검증합니다.
// Global API 키는 OAuth 액세스 토큰과 인증 방식이 다르며,
// `X-Auth-Email` + `X-Auth-Key` 헤더 조합을 사용합니다.
// 참고: https://developers.cloudflare.com/fundamentals/api/get-started/keys/

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

export interface CfGlobalKeyVerifyResult {
  valid: boolean;
  accountEmail?: string;
  errorMessage?: string;
}

/**
 * 이메일 + Global API 키 조합이 실제로 유효한지 Cloudflare API로 검증합니다.
 * `GET /user` 엔드포인트는 인증된 사용자 자신의 정보를 반환하므로,
 * 키가 유효하지 않거나 이메일과 짝이 맞지 않으면 401을 반환합니다.
 */
export async function verifyCloudflareGlobalApiKey(
  accountEmail: string,
  globalApiKey: string
): Promise<CfGlobalKeyVerifyResult> {
  try {
    const response = await fetch(`${CF_API_BASE}/user`, {
      headers: {
        'X-Auth-Email': accountEmail,
        'X-Auth-Key': globalApiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, errorMessage: 'Cloudflare Global API 키 또는 이메일이 올바르지 않습니다.' };
    }
    if (!response.ok) {
      return { valid: false, errorMessage: `Cloudflare API 확인 중 오류가 발생했습니다 (${response.status}).` };
    }

    const data = (await response.json()) as { success: boolean; result?: { email?: string } };
    if (!data.success) {
      return { valid: false, errorMessage: 'Cloudflare Global API 키 검증에 실패했습니다.' };
    }
    return { valid: true, accountEmail: data.result?.email ?? accountEmail };
  } catch (err) {
    return {
      valid: false,
      errorMessage: err instanceof Error ? `Cloudflare API 연결 실패: ${err.message}` : 'Cloudflare API 연결에 실패했습니다.',
    };
  }
}
