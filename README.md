# CloudPress 배포 가이드

CloudPress는 pnpm 워크스페이스 기반 모노레포입니다. 루트에서 의존성을 설치한 뒤 각 앱/Worker를 배포합니다.

## 공통 준비

```bash
pnpm install --frozen-lockfile
npx wrangler login
```

Cloudflare CI/Pages/Workers 빌드 환경에서는 Node.js 22.x와 pnpm 9.x를 기준으로 동작합니다.

## 프론트엔드(platform)

`platform/`은 Astro 기반 Cloudflare Pages 프론트엔드입니다.

```bash
pnpm --filter platform build
pnpm --filter platform deploy
```

직접 실행하려면 다음과 같습니다.

```bash
cd platform
pnpm build
npx wrangler pages deploy dist/
```

## Workers 배포

### platform-api

```bash
pnpm --filter cloudpress-platform-api deploy
```

직접 실행:

```bash
cd workers/platform-api
npx wrangler deploy
```

### ai-gateway

```bash
pnpm --filter cloudpress-ai-gateway deploy
```

직접 실행:

```bash
cd workers/ai-gateway
npx wrangler deploy
```

### cms-site

`workers/cms-site`는 개별 CMS 사이트 런타임 Worker입니다. 배포 전 D1/KV 바인딩과 관리자 시크릿을 준비하세요.

```bash
pnpm --filter cloudpress-cms-site deploy
```

직접 실행:

```bash
cd workers/cms-site
npx wrangler deploy
```

배포 전 번들 검증만 할 때는 다음 명령을 사용합니다.

```bash
pnpm --filter cloudpress-cms-site exec wrangler deploy --dry-run
```

필수 설정:

- `workers/cms-site/wrangler.toml`의 `DB` D1 바인딩
- `workers/cms-site/wrangler.toml`의 `KV` 네임스페이스 ID
- 관리자 시크릿: `cd workers/cms-site && npx wrangler secret put ADMIN_SECRET`

## 데이터베이스 초기화

루트에서 D1 스키마와 시드를 적용합니다.

```bash
pnpm db:init:platform
pnpm db:seed:platform
pnpm db:init:site
pnpm db:seed:site
```

## 전체 빌드/검증

```bash
pnpm build:all
pnpm --filter cloudpress-cms-site exec wrangler deploy --dry-run
```

## Cloudflare 대시보드 빌드 명령 예시

- 프론트엔드 Pages: `pnpm --filter platform deploy`
- platform-api Worker: `pnpm --filter cloudpress-platform-api deploy`
- ai-gateway Worker: `pnpm --filter cloudpress-ai-gateway deploy`
- cms-site Worker: `pnpm --filter cloudpress-cms-site deploy`

루트가 아닌 각 Worker 디렉터리를 빌드 루트로 지정한 경우에는 `npx wrangler deploy`를 사용해도 됩니다.

## 단일 Worker WordPress 호스팅 배포

루트 `wrangler.toml`은 여러 WordPress 사이트를 하나의 Cloudflare Worker(`cloudpress-wordpress-hosting`)로 운영하기 위한 기준 배포 파일입니다. 사이트를 생성할 때마다 별도 Worker를 배포하지 않고, 동일 Worker에 도메인 route와 D1/KV/shard metadata만 추가합니다.

```bash
npx wrangler deploy
```

필수 루트 바인딩:

- `DB`: 전체 WordPress 호스팅 메타/기본 사이트 D1 바인딩
- `KV`: WP Rocket 호환 edge cache 및 HTML cache 네임스페이스
- `PHP_WASM_VERSION`: 운영 php-wasm 버전(예: `8.3`)
- `REQUIRED_AI_PLUGIN`: `aibp-pro.zip`
- `REQUIRED_CACHE_PLUGIN`: `wp-rocket-main.zip`
- `IMAGE_GENERATION_WORKER_URL`: `https://aibp100.jiji15899.workers.dev/`

## D1별 적용 스키마 표

| D1 데이터베이스 | 적용 SQL 파일 | 적용 대상 | 주요 테이블/역할 |
| --- | --- | --- | --- |
| `cloudpress_platform` | `database/platform-schema.sql` | 플랫폼/사용자/호스팅 레지스트리 | `users`, `user_cloudflare_accounts`, `site_registry`, `workers_registry`, `wordpress_shards`, `activity_logs`, `notifications` |
| `cloudpress_wordpress_hosting` | `database/site-schema.sql` | 단일 Worker가 기본으로 참조하는 WordPress 호스팅 템플릿/공용 사이트 DB | `cp_options`, `cp_users`, `cp_posts`, `cp_terms`, `cp_term_taxonomy`, `cp_plugins`, `cp_shard_registry`, compatibility views |
| `wordpress_host_<id>` | provisioning 내장 WordPress schema seed | 사이트 생성 시 자동 생성되는 사이트별 D1 | `cp_*` WordPress tables, `sites`, menus/redirects, 필수 plugin rows, shard bootstrap metadata |
| `database01.db` ~ `database10.db` 이상 | `cp_shard_registry` 및 `wordpress_shards` metadata | Durable Objects SQLite shard 논리 DB | primary/content shard 분산, 자동 확장 대상, 대규모 동시 작업 분산 |

적용 순서:

```bash
pnpm db:init:platform
pnpm db:init:site
# 사이트 생성 API 호출 시 wordpress_host_<id> D1에는 provisioning service가 schema/seed를 자동 적용합니다.
```

## WordPress 생성 시 자동 설치되는 필수 플러그인

WordPress 사이트 생성 시 `cp_plugins`와 `active_plugins` 옵션에 다음 플러그인을 자동 등록합니다.

| 플러그인 | ZIP/소스 | 목적 |
| --- | --- | --- |
| AI 글쓰기/스키마/이미지 생성 | `aibp-pro.zip` | AI 글쓰기, schema 생성, 이미지 생성(고정 Worker URL 사용) |
| WP Rocket Cache | `wp-rocket-main.zip` | WordPress HTML/cache 레이어 |
| CloudPress SQLite Integration | `cloudpress-sqlite-integration.zip` | php-wasm WordPress와 CloudPress SQLite/Durable Object shard 계층 연결 |
| CloudPress Easy Migration | `cloudpress-easy-migration.zip` | ZIP 방식 전체 사이트 내보내기/가져오기/복원 |

SQLite integration 플러그인은 `plugins/cloudpress-sqlite-integration`에서 관리하며, 배포용 ZIP은 `platform/public/plugins/cloudpress-sqlite-integration.zip`에 포함됩니다.

## WordPress 생성 자동 적용 데이터

사이트 생성 API는 WordPress 설치 직후 다음 데이터를 자동 적용합니다.

- `cp_options`: site URL/home, `ko_KR`, `Asia/Seoul`, 한 주의 시작 월요일(`1`), 글 이름 slug(`/%postname%/`), GeneratePress theme, 활성 플러그인, AI/cache/sqlite 플러그인 옵션
- `cp_users`/`cp_usermeta`: 자동 생성 관리자 계정, `administrator` capability, user level, 한국어 locale
- `cp_terms`/`cp_term_taxonomy`: 기본 `uncategorized` 카테고리만 유지하고 글 연결 count는 0으로 시작
- `cp_posts`: WordPress 기본 `Hello world`, 샘플 페이지, 개인정보처리방침 등 불필요한 기본 콘텐츠는 생성하지 않음
- `menus`/`menu_items`: 홈과 카테고리만 포함하는 최소 기본 메뉴
- `cp_themes`: 기본 테마를 제거한 상태로 GeneratePress만 설치/활성화된 metadata
- `cp_plugins`: 기본 플러그인은 제거하고 AIBP, WP Rocket, CloudPress SQLite Integration, CloudPress Easy Migration만 활성화
- `cp_shard_registry`: `database01.db` primary와 `database02.db`~`database10.db` content shard 자동 등록

즉, WordPress 생성 후 별도 수동 DB 보정 없이 관리자 로그인, 한국어/시간대/slug/테마/플러그인/shard metadata가 바로 준비되고 기본 불필요 페이지는 남지 않습니다.
