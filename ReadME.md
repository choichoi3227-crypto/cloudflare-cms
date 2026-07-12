# CloudPress CMS 운영/배포/확장 가이드

CloudPress CMS는 Cloudflare Workers, D1, KV를 기반으로 동작하는 경량 CMS입니다. 미디어 저장은 사용자가 연결한 Blogger API와 Blogger가 발급/추적하는 `googleusercontent.com` URL을 사용합니다.

## 핵심 정책

- **미디어**: 직접 파일 저장소에 업로드하지 않습니다. 관리자 미디어 API는 Blogger API 흐름에서 확보한 `googleusercontent.com` URL만 등록합니다.
- **확장성**: WordPress.org 공개 API의 테마/플러그인 메타데이터를 검색하고, 설치 후보를 D1에 등록할 수 있습니다.
- **PHP 실행**: PHP 코드를 더미로 실행하지 않습니다. PHP-WASM 모듈 URL과 엔트리포인트가 설정된 경우에만 활성화/실행 경로가 열립니다.
- **장애 방지**: PHP-WASM 설정이 누락되면 테마/플러그인 활성화를 거부하고 명확한 오류를 반환합니다.

## 요구 사항

- Node.js 20+
- pnpm 9+
- Wrangler 3+
- Cloudflare 계정 및 D1/KV 바인딩
- Blogger API key 및 연결된 Blogger blog ID
- WordPress 호환 PHP 실행이 필요한 경우 PHP-WASM 아티팩트

## 설치

```bash
pnpm install
```

## 로컬 개발

```bash
pnpm --filter cloudpress-cms-site dev
pnpm --filter cloudpress-platform-api dev
```

## 데이터베이스 초기화

```bash
wrangler d1 execute cp_site_template --file=database/site-schema.sql
wrangler d1 execute cloudpress_platform --file=database/platform-schema.sql
```

## 배포

```bash
pnpm --filter cloudpress-cms-site deploy
pnpm --filter cloudpress-platform-api deploy
pnpm --filter cloudpress-ai-gateway deploy
```

## Blogger 미디어 사용 흐름

1. 플랫폼 API에 Blogger 연결 정보를 등록합니다.
2. Blogger API를 통해 게시글 또는 이미지가 포함된 콘텐츠를 생성/조회합니다.
3. CMS 미디어 API에 `googleusercontent_url` 또는 `blogger_post_url`을 전달합니다.
4. CMS는 URL 호스트가 `googleusercontent.com`인지 검증한 뒤 D1 `media` 테이블에 메타데이터만 저장합니다.

예시:

```bash
curl -X POST https://example.com/api/admin/media \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: <token>' \
  -d '{"googleusercontent_url":"https://blogger.googleusercontent.com/img/...","original_name":"hero-image"}'
```

## WordPress.org 마켓플레이스 검색

공개 WordPress.org API를 사용합니다.

```bash
curl 'https://example.com/api/admin/marketplace?type=plugin&q=seo&page=1&per_page=12' \
  -H 'X-Admin-Token: <token>'
```

지원 타입:

- `plugin`
- `theme`

## 플러그인 설치/활성화

```bash
curl -X POST https://example.com/api/admin/plugins \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: <token>' \
  -d '{"slug":"classic-editor","name":"Classic Editor","version":"latest","source":"wordpress.org"}'
```

활성화는 PHP-WASM 설정이 있어야 성공합니다.

```bash
curl -X POST https://example.com/api/admin/plugins/<plugin_id>/activate \
  -H 'X-Admin-Token: <token>'
```

## WordPress 테마 등록/활성화

```bash
curl -X POST https://example.com/api/admin/themes \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Token: <token>' \
  -d '{"name":"Twenty Twenty-Four","slug":"twentytwentyfour","version":"latest","source":"wordpress.org"}'
```

활성화:

```bash
curl -X POST https://example.com/api/admin/themes/<theme_id>/activate \
  -H 'X-Admin-Token: <token>'
```

## PHP-WASM 설정

`workers/cms-site/wrangler.toml` 또는 Cloudflare 환경 변수에 다음 값을 설정합니다.

```toml
PHP_WASM_URL = "https://example.com/php.wasm"
PHP_WASM_ENTRYPOINT = "php_wasm_run"
PHP_WASM_MEMORY_PAGES = "128"
```

설정이 없으면 CMS는 WordPress PHP 테마/플러그인의 활성화를 차단합니다. 이는 더미 실행을 방지하고 실제 PHP-WASM 실행 경로만 허용하기 위한 안전장치입니다.

## 점검 명령

```bash
npx tsc --noEmit -p /tmp/cloudpress-tsconfig.json
sqlite3 :memory: < database/site-schema.sql
sqlite3 :memory: < database/platform-schema.sql
```

## 운영 권장 사항

- 관리자 API에는 반드시 강한 `ADMIN_SECRET`을 설정하세요.
- Blogger API key는 Cloudflare secret 또는 암호화된 D1 필드로 관리하세요.
- PHP-WASM 아티팩트는 무결성 검증 및 버전 고정을 적용하세요.
- WordPress.org API 응답은 D1 캐시에 저장하되 오래된 캐시는 주기적으로 삭제하세요.
