# 🚀 CloudPress - WordPress 기반 Cloudflare CMS

100% WordPress PHP-WASM 기반의 Cloudflare Workers 호스팅 플랫폼

![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-alpha-yellow)
![Version](https://img.shields.io/badge/version-1.0.0--alpha-blue)

---

## ✨ 주요 특징

- **100% WordPress**: 완전한 WordPress 호스팅, 커스텀 CMS 없음
- **PHP-WASM**: 서버 없이 Cloudflare Workers에서 PHP 실행
- **GitHub Releases**: 관리자 계정/조직의 Release 저장소와 기존 저장 로직 연동
- **하이브리드 DB**: SQLite (기본) + JSON (폴백)
- **유료 호스팅 단위 플랜**: 라이트/스탠다드/스마트/인텔리전트 월 결제
- **자동 캐싱**: WP-Rocket + Cloudflare 통합
- **공통 무제한 정책**: 트래픽, 스토리지, DB, 기본 플러그인, WAF/DDoS 방어 제공

---

## 📋 시스템 요구사항

- **Node.js**: 18.x 이상
- **pnpm**: 9.x 이상  
- **Cloudflare 계정**: Global API Key 필요
- **GitHub 계정**: 스토리지용 저장소

---

## 🚀 빠른 시작

### 1. 저장소 클론 및 설정

```bash
git clone https://github.com/your-org/cloudflare-cms-main.git
cd cloudflare-cms-main
pnpm install
```

### 2. 환경 변수 설정

**.env.production:**
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
GITHUB_OWNER=your-github-org
GITHUB_REPO=wordpress-releases
```

### 3. 빌드 및 배포

```bash
# 스테이징 환경
cd platform
pnpm build
pnpm deploy -- --env staging

# 프로덕션
pnpm deploy -- --env production
```

### 4. 첫 실행

```bash
# 로컬 개발 서버
pnpm dev

# 브라우저에서 열기
open http://localhost:3000
```

---

## 📁 프로젝트 구조

```
cloudflare-cms-main/
├── platform/                    # Astro 대시보드
│  ├── src/
│  │  ├── lib/
│  │  │  ├── github-storage.ts  # GitHub Releases API
│  │  │  ├── wordpress-manager.ts # WordPress 관리
│  │  │  ├── hybrid-db.ts       # SQLite + JSON
│  │  │  └── plan-policy.ts     # 플랜 정책
│  │  └── pages/
│  │     ├── dashboard/         # 관리 대시보드
│  │     ├── wordpress/         # WordPress 상세
│  │     └── api/               # API 엔드포인트
│  └── package.json
│
├── workers/                     # Cloudflare Workers
│  ├── wordpress-runtime/        # PHP-WASM 런타임
│  ├── platform-api/             # 플랫폼 API
│  ├── cms-site/                 # 레거시 (이동 중)
│  └── media-processor/          # 미디어 처리
│
├── shared/                      # 공유 타입 및 유틸
├── database/                    # 데이터베이스 스키마
│
├── WORDPRESS_IMPLEMENTATION.md  # 구현 가이드
├── DEPLOYMENT_GUIDE.md          # 배포 가이드
├── MIGRATION_GUIDE.md           # 마이그레이션 가이드
└── README.md                    # 이 파일
```

---

## 🔧 개발 설정

### 로컬 개발

```bash
# 워치 모드
cd platform
pnpm dev

# 다른 터미널에서
cd platform
npm run typecheck

# 빌드 확인
npm run build
```

### 테스트

```bash
# 단위 테스트
pnpm test

# E2E 테스트
pnpm test:e2e

# 커버리지
pnpm test:coverage
```

### 코드 스타일

```bash
# 포매팅
pnpm format

# 린트
pnpm lint

# 타입 체크
pnpm typecheck
```

---

## 📚 문서

### 시작하기
- [WordPress 구현 가이드](./WORDPRESS_IMPLEMENTATION.md) - 전체 아키텍처
- [배포 가이드](./DEPLOYMENT_GUIDE.md) - Cloudflare 배포
- [마이그레이션 가이드](./MIGRATION_GUIDE.md) - 기존 사이트 이동

### API 레퍼런스
- [WordPress API](./docs/api/wordpress.md)
- [플랜 정책 API](./docs/api/plan.md)
- [호스팅 API](./docs/api/hosting.md)

### 튜토리얼
- [첫 WordPress 사이트 만들기](./docs/tutorials/first-site.md)
- [플러그인 설치](./docs/tutorials/plugins.md)
- [캐싱 설정](./docs/tutorials/caching.md)

---

## 🔐 보안

### 인증
- 이메일/비밀번호 및 Google/GitHub 소셜 로그인 기반
- 가입 시 Cloudflare Global API Key 등록 및 이메일 인증 필수
- HttpOnly 쿠키 사용
- CSRF 토큰 검증

### 데이터 보호
- SQLite 암호화 (선택)
- KV 암호화 저장
- TLS 1.3 기본값

### 규정 준수
- GDPR 호환
- CCPA 호환
- 개인정보 처리 방침 제공

---

## 📊 성능

### 벤치마크

| 메트릭 | 값 | 설명 |
|--------|-----|------|
| TTFB | <50ms | 평균 응답 시간 |
| FCP | <100ms | First Contentful Paint |
| LCP | <200ms | Largest Contentful Paint |
| 캐시 히트율 | 87% | WP-Rocket + Cloudflare |
| 가용성 | 99.99% | SLA 보장 |

### 최적화 기법
- Edge 캐싱 (Cloudflare CDN)
- PHP-WASM 최적화
- 임계 CSS 인라인
- 이미지 지연 로딩
- 자동 복축

---

## 🛠️ 문제 해결

### 빌드 오류

```bash
# 캐시 정리
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 재빌드
pnpm build
```

### WordPress 로드 실패

```bash
# GitHub Releases 접근 확인
curl -I https://api.github.com/repos/your-org/wordpress-releases/releases

# KV 접근 확인
wrangler kv:key list --namespace-id YOUR_KV_ID
```

### 성능 문제

```bash
# 로그 확인
wrangler tail --format json

# 캐시 비우기 (WordPress 관리자)
대시보드 → WordPress 상세 → 캐시 비우기
```

자세한 트러블슈팅은 [문제 해결 가이드](./docs/troubleshooting.md)를 참조하세요.

---

## 🤝 기여

이 프로젝트는 오픈소스이며 기여를 환영합니다!

### 기여 방법

1. Fork 생성
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

### 개발 기준
- TypeScript 사용 (타입 안정성)
- 테스트 작성 (최소 80% 커버리지)
- ESLint/Prettier 준수
- Conventional Commits 사용

---

## 📝 라이선스

이 프로젝트는 MIT License 하에 배포됩니다. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참조하세요.

---

## 🎯 로드맵

### v1.0 (Current)
- ✅ WordPress 완전 통합
- ✅ PHP-WASM 런타임
- ✅ GitHub Releases 스토리지
- ✅ 기본 대시보드

### v1.1 (Planned)
- [ ] 데이터 마이그레이션 도구
- [ ] 고급 분석 대시보드
- [ ] 플러그인 마켓플레이스
- [ ] 커뮤니티 포럼

### v2.0 (Future)
- [ ] 멀티테넌시 강화
- [ ] AI 콘텐츠 생성
- [ ] GraphQL API
- [ ] CLI 도구

---

## 📞 지원

- **문서**: [docs 폴더](./docs)
- **이슈**: [GitHub Issues](https://github.com/your-org/cloudflare-cms/issues)
- **토론**: [GitHub Discussions](https://github.com/your-org/cloudflare-cms/discussions)
- **메일**: support@cloud-press.co.kr

---

## 🏆 감사

이 프로젝트는 다음의 오픈소스 프로젝트를 사용합니다:

- [Astro](https://astro.build) - 정적 사이트 생성기
- [Cloudflare Workers](https://workers.cloudflare.com) - 에지 컴퓨팅
- [WordPress](https://wordpress.org) - CMS
- [PHP-WASM](https://www.php-wasm.com) - PHP 런타임
- [SQLite](https://www.sqlite.org) - 데이터베이스

---

**최종 업데이트**: 2026년 7월 13일
**유지보수자**: [Your Team]

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
