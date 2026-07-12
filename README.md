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
