# Cloudflare CMS - WordPress PHP-WASM 구현 가이드

## 📋 개요

이 프로젝트는 Cloudflare Workers를 기반으로 하는 완전한 WordPress 호스팅 플랫폼으로, 100% PHP-WASM과 GitHub Releases를 활용한 분산 스토리지를 지원합니다.

**주요 특징:**
- ✅ PHP-WASM 기반 WordPress 런타임
- ✅ GitHub Releases를 스토리지로 사용 (토큰 불필요)
- ✅ SQLite + JSON 하이브리드 데이터베이스
- ✅ 호스팅 단위 무차별 플랜 정책
- ✅ Cloudflare 에지에서의 완전한 캐싱

---

## 🏗️ 아키텍처

### 계층 구조

```
┌─────────────────────────────────────────┐
│     Astro 플랫폼 (대시보드)              │
│  - 호스팅 관리                          │
│  - WordPress 인스턴스 관리               │
│  - 설정 및 마이그레이션                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    API 레이어 (Edge)                    │
│  - WordPress 관리 (admin)                │
│  - 캐싱 설정 (cache-settings)            │
│  - 마이그레이션 (migrate)                │
│  - 플랜 정책 (plan)                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Workers 런타임                       │
│  - PHP-WASM 실행                        │
│  - 도메인 라우팅                        │
│  - 요청 처리                            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    스토리지 계층                        │
│  - GitHub Releases (WordPress files)    │
│  - Cloudflare KV (캐시)                 │
│  - 로컬 SQLite (DB)                     │
│  - JSON 폴백                            │
└─────────────────────────────────────────┘
```

---

## 📂 디렉토리 구조

### 주요 파일

```
cloudflare-cms-main/
├── platform/
│  ├── astro.config.mjs          # ✅ Vite alias 설정
│  ├── src/
│  │  ├── lib/
│  │  │  ├── github-storage.ts    # ✅ GitHub Releases 관리
│  │  │  ├── wordpress-manager.ts # ✅ WordPress 관리
│  │  │  ├── hybrid-db.ts         # ✅ SQLite + JSON DB
│  │  │  ├── plan-policy.ts       # ✅ 플랜 정책
│  │  │  ├── cloudflare-oauth.ts  # ✅ OAuth (이미 설정됨)
│  │  │  └── session.ts           # ✅ 세션 관리
│  │  ├── pages/
│  │  │  ├── dashboard/
│  │  │  │  ├── hosting/
│  │  │  │  │  └── [id].astro    # ✅ 호스팅 상세 (새 UI)
│  │  │  │  └── wordpress/        # ✅ 신규 디렉토리
│  │  │  │     └── [id].astro    # ✅ WordPress 상세
│  │  │  └── api/
│  │  │     ├── wordpress/[id]/
│  │  │     │  ├── admin.ts       # ✅ 관리자 관리
│  │  │     │  ├── cache-settings.ts # ✅ 캐싱 설정
│  │  │     │  ├── migrate.ts     # ✅ 마이그레이션
│  │  │     │  ├── purge-cache.ts # ✅ 캐시 비우기
│  │  │     │  └── index.ts       # ✅ CRUD 작업
│  │  │     └── hosting/[id]/
│  │  │        └── plan.ts        # ✅ 플랜 정책
│  │  └── components/
│  │     └── (기존 유지)
│  └── package.json
├── workers/
│  ├── platform-api/             # 기존
│  ├── cms-site/                 # 기존
│  ├── media-processor/          # 기존
│  └── wordpress-runtime/        # ⏳ 신규 (구현 필요)
├── shared/                      # 기존
└── database/                    # 기존
```

---

## 🔧 구현 체크리스트

### Phase 1: 기본 구조 (✅ 완료)
- ✅ 빌드 에러 수정 (Astro alias)
- ✅ GitHub Releases 저장소 관리자
- ✅ WordPress 매니저
- ✅ 하이브리드 DB 레이어
- ✅ 플랜 정책 관리자
- ✅ 대시보드 UI 재설계
- ✅ API 엔드포인트

### Phase 2: Workers 런타임 (⏳ 필요)
```typescript
// workers/wordpress-runtime/src/index.ts

import { Router } from 'itty-router';
import { PHPWasm } from '@php-wasm/web';

const router = Router();

// 1. GitHub Releases에서 WordPress 파일 로드
// 2. SQLite/JSON DB 초기화
// 3. 도메인별 라우팅
// 4. PHP-WASM 실행
// 5. WP-Rocket 캐시 레이어
// 6. 응답 최적화 (Astro SSG)

export default { fetch: router.handle };
```

### Phase 3: 마이그레이션 파이프라인 (⏳ 필요)
- 기존 CMS 데이터 → WordPress
- 사용자 계정 매핑
- 파일 시스템 변환
- DB 마이그레이션

### Phase 4: 배포 자동화 (⏳ 필요)
```yaml
# .github/workflows/deploy.yml
- Build Astro
- Run tests
- Deploy to Cloudflare Pages
- Deploy Workers
```

---

## 🚀 시작하기

### 1. 로컬 개발

```bash
cd platform
npm install
npm run dev
```

### 2. 빌드

```bash
npm run build
```

### 3. 배포

```bash
# Cloudflare Pages 배포
npm run deploy

# 또는 wrangler CLI 사용
wrangler deploy
```

---

## 📊 API 문서

### WordPress 관리

#### GET /api/wordpress/[id]
WordPress 인스턴스 상세 정보 조회

**응답:**
```json
{
  "success": true,
  "data": {
    "siteId": "wp-001",
    "siteName": "My WordPress Site",
    "phpVersion": "8.3",
    "dbType": "sqlite",
    "postsCount": 42,
    "adminUsers": [...],
    "config": {...},
    "migrations": [...]
  }
}
```

#### POST /api/wordpress/[id]/admin
관리자 정보 업데이트

**요청:**
```json
{
  "email": "admin@example.com",
  "displayName": "Administrator",
  "password": "newpassword123"
}
```

#### POST /api/wordpress/[id]/cache-settings
캐싱 설정 업데이트

**요청:**
```json
{
  "wpRocketEnabled": true,
  "cloudflarePageRuleEnabled": true,
  "cacheTTL": 3600,
  "minifyHTML": true,
  "minifyCSS": true,
  "minifyJS": true,
  "lazyLoadImages": true,
  "criticalCSSEnabled": true
}
```

#### POST /api/wordpress/[id]/migrate
마이그레이션 파일 업로드

**요청:** multipart/form-data
- 파일: .zip, .tar.gz, .sql, .json

#### POST /api/wordpress/[id]/purge-cache
캐시 비우기

#### DELETE /api/wordpress/[id]
WordPress 인스턴스 삭제

### 플랜 정책

#### GET /api/hosting/[id]/plan
호스팅 플랜 정보 조회

**응답:**
```json
{
  "success": true,
  "data": {
    "plan": {
      "planType": "business",
      "features": {
        "storageLimit": "unlimited",
        "trafficLimit": "unlimited",
        "cdnIncluded": true,
        "wafIncluded": true,
        "ddosProtectionIncluded": true,
        ...
      },
      "limits": {
        "maxWordPressSites": "unlimited",
        "maxBandwidth": "unlimited",
        ...
      }
    },
    "usage": {...},
    "features": {...}
  }
}
```

---

## 🔐 보안 고려사항

1. **인증:** Cloudflare OAuth 사용 ✅
2. **세션:** 쿠키 기반 (HttpOnly, Secure) ✅
3. **데이터베이스:** SQLite는 로컬, 민감한 데이터는 KV 암호화
4. **파일 업로드:** 파일 타입 검증, 바이러스 검사 필요
5. **플랜 정책:** 서버 측 검증 필수

---

## 📈 성능 최적화

### 1. 캐싱 계층
```
Client Request
    ↓
Cloudflare CDN (Cache)
    ↓
Worker (KV Cache)
    ↓
PHP-WASM (WP-Rocket)
    ↓
SQLite DB
```

### 2. 요청 최소화
- 임계 CSS 추출
- 이미지 지연 로딩
- JavaScript 번들 분할

### 3. 데이터베이스 최적화
- SQLite 인덱싱
- JSON 쿼리 최적화
- 정기적 VACUUM

---

## 🐛 문제 해결

### 빌드 에러
- Astro alias 설정 확인
- TypeScript 버전 호환성
- 의존성 설치 재확인

### WordPress 로드 실패
- GitHub Releases 접근 권한
- CORS 설정
- PHP-WASM 호환성

### 캐시 문제
- 캐시 TTL 조정
- 수동 캐시 비우기
- Cloudflare 규칙 확인

---

## 📚 참고 자료

- [Astro 공식 문서](https://docs.astro.build)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [PHP-WASM](https://www.php-wasm.com)
- [SQLite WebAssembly](https://sql.js.org)

---

## 🤝 기여

이 프로젝트는 오픈소스이며, 커뮤니티 기여를 환영합니다.

---

## 📝 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 🎯 로드맵

- [ ] PHP-WASM 런타임 완성
- [ ] GitHub Actions 배포 자동화
- [ ] 데이터 마이그레이션 도구
- [ ] 멀티테넌시 지원 강화
- [ ] AI 콘텐츠 생성 통합
- [ ] 고급 분석 대시보드
- [ ] 커뮤니티 마켓플레이스

---

**마지막 업데이트:** 2026년 7월 13일
**버전:** 1.0.0-alpha
