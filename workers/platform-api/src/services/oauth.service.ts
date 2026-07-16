// Cloudflare OAuth 로그인은 폐기되었습니다. 이 파일은 이전 import 호환을 위한 차단 서비스입니다.
import { AppError } from '../utils/errors';

export class OAuthService {
  async handleCallback(): Promise<never> {
    throw new AppError('CLOUDFLARE_OAUTH_DISABLED', 'Cloudflare 로그인은 지원하지 않습니다.', 410);
  }
}
