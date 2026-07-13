# 🚀 Cloudflare Workers 배포 가이드

## 사전 요구사항

1. Cloudflare 계정 (무료 플랜 포함)
2. Node.js 18+ 설치
3. `wrangler` CLI 설치: `npm install -g wrangler`
4. GitHub 저장소 생성 (WordPress 파일 저장소용)

## 단계별 배포

### Step 1: 환경 설정

```bash
# 저장소 클론
git clone https://github.com/your-org/cloudflare-cms-main.git
cd cloudflare-cms-main

# 의존성 설치
npm install
cd platform && npm install && cd ..
cd workers/wordpress-runtime && npm install && cd ../..
```

### Step 2: Cloudflare 로그인

```bash
wrangler login
# 브라우저에서 인증 완료
```

### Step 3: wrangler.toml 설정

**platform/wrangler.toml:**
```toml
name = "cloudflare-cms-platform"
type = "service"
main = "src/index.ts"
compatibility_date = "2024-12-20"

[env.production]
name = "cloudflare-cms-platform-prod"
route = "cloud-press.co.kr/*"
zone_id = "YOUR_ZONE_ID"

[env.staging]
name = "cloudflare-cms-platform-staging"
route = "staging.cloud-press.co.kr/*"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_NAMESPACE_ID"

[[kv_namespaces]]
binding = "SESSION"
id = "YOUR_SESSION_KV_ID"

[[d1_databases]]
binding = "DB"
database_name = "cloudflare_cms"
database_id = "YOUR_D1_ID"

[env.production.kv_namespaces]
binding = "CACHE"
id = "PROD_KV_CACHE_ID"
preview_id = "STAGING_KV_CACHE_ID"

[env.production.kv_namespaces]
binding = "SESSION"
id = "PROD_KV_SESSION_ID"
preview_id = "STAGING_KV_SESSION_ID"

[[vars]]
GITHUB_OWNER = "your-github-org"
GITHUB_REPO = "wordpress-releases"
OAUTH_CLIENT_ID = "your-cloudflare-oauth-client-id"
OAUTH_REDIRECT_URI = "https://cloud-press.co.kr/auth/callback"
```

### Step 4: KV 네임스페이스 생성

```bash
# 캐시용
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview

# 세션용
wrangler kv:namespace create "SESSION"
wrangler kv:namespace create "SESSION" --preview

# D1 데이터베이스
wrangler d1 create cloudflare_cms
```

### Step 5: 환경 변수 설정

**platform/.env.production:**
```
OAUTH_CLIENT_SECRET=your-secret-key
DATABASE_URL=your-d1-connection-string
```

**wrangler.toml의 [env.production]에 추가:**
```toml
[env.production]
vars = { GITHUB_OWNER = "your-org", GITHUB_REPO = "wordpress-releases" }
```

### Step 6: 빌드 및 배포

```bash
# 스테이징 배포 (테스트)
cd platform
npm run build
wrangler deploy --env staging

# 프로덕션 배포
wrangler deploy --env production
```

### Step 7: 도메인 연결

Cloudflare 대시보드에서:
1. DNS 레코드 추가: `cloud-press.co.kr` → Workers Route
2. SSL/TLS 인증서 자동 프로비저닝 (기본)

## 🔄 GitHub Actions 배포 자동화

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main
      - staging
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd platform && npm install && cd ..
          cd workers && cd wordpress-runtime && npm install && cd ../..
      
      - name: Build
        run: |
          cd platform
          npm run build
          cd ..
      
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
          secrets: |
            OAUTH_CLIENT_SECRET
            DATABASE_URL
        env:
          OAUTH_CLIENT_SECRET: ${{ secrets.OAUTH_CLIENT_SECRET }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Notify Deployment
        if: success()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ 배포 성공\n\n환경: ${{ github.ref }}\n시간: ${{ github.event.head_commit.timestamp }}'
            })
```

## 📊 모니터링 설정

### Cloudflare Analytics

```bash
# 대시보드에서 확인
# Analytics → Traffic
# Workers → Performance
```

### 커스텀 메트릭 (Analytics Engine)

```typescript
// workers/wordpress-runtime/src/index.ts
import { analyticsEngine } from '@cloudflare/workers-types';

// 요청 로깅
request.analytics.writeDataPoint({
  indexes: [site_id, request.url.pathname],
  blobs: [request.headers.get('user-agent')],
  doubles: [Date.now() / 1000],
});
```

## 🔐 Secrets 관리

### GitHub Secrets 설정

GitHub 저장소 Settings → Secrets:

```
CLOUDFLARE_API_TOKEN = (Cloudflare 대시보드 → My Profile → API Tokens)
OAUTH_CLIENT_SECRET = (Cloudflare OAuth 앱 설정)
DATABASE_URL = (D1 연결 문자열)
```

### Cloudflare Vault

```bash
# 로컬에서 secrets 설정
wrangler secret put OAUTH_CLIENT_SECRET --env production
wrangler secret put DATABASE_URL --env production

# 확인
wrangler secret list --env production
```

## 🧪 테스트

### 로컬 테스트

```bash
# 스테이징 서버 시작
cd platform
npm run dev
# http://localhost:3000 접속

# 또는 Workers 로컬 테스트
wrangler dev --env staging
```

### 통합 테스트

```bash
# 가용성 테스트
curl -I https://staging.cloud-press.co.kr/

# WordPress 시스템 정보
curl https://staging.cloud-press.co.kr/api/wordpress/wp-001

# 캐시 테스트
curl -I https://staging.cloud-press.co.kr/ -H "CF-Cache-Status: HIT"
```

## 📈 스케일링

### 자동 스케일링

Cloudflare Workers는 기본적으로 자동 스케일링됨:
- ✅ 동시 요청 무제한
- ✅ 트래픽 제한 없음
- ✅ 자동 로드 밸런싱

### 성능 최적화

1. **Workers 최적화:**
   - 콜드 스타트 최소화 (코드 크기 감소)
   - 외부 API 호출 최소화
   - KV 쿼리 배치화

2. **PHP-WASM 최적화:**
   - 캐시 효율성 향상
   - 데이터베이스 인덱싱
   - 오토로드 최적화

3. **CDN 최적화:**
   - 캐시 규칙 세밀 조정
   - 지역별 라우팅
   - 이미지 최적화

## 🆘 문제 해결

### Workers 배포 실패

```bash
# 로그 확인
wrangler tail --format json

# 디버그 모드
DEBUG=* wrangler deploy

# 로컬에서 테스트
npm run build
wrangler dev
```

### 성능 문제

```bash
# Cloudflare 성능 분석
curl -I -w '\n%{time_total}\n' https://cloud-press.co.kr/

# Workers CPU 시간 확인
wrangler tail --format json | grep cpu_ms
```

### CORS 오류

**wrangler.toml에 추가:**
```toml
[[triggers.crons]]
cron = "0 0 * * *"

[env.production]
routes = [
  { pattern = "cloud-press.co.kr/*", zone_id = "YOUR_ZONE_ID" }
]
```

## 📋 체크리스트

배포 전 확인 사항:

- [ ] 모든 환경 변수 설정됨
- [ ] KV 네임스페이스 생성됨
- [ ] D1 데이터베이스 생성됨
- [ ] GitHub Actions secrets 설정됨
- [ ] SSL/TLS 인증서 설정됨
- [ ] 도메인 DNS 레코드 확인됨
- [ ] 로컬 테스트 완료
- [ ] 스테이징 배포 검증됨
- [ ] 모니터링 알림 설정됨

## 📞 지원

문제 발생 시:
1. [Cloudflare 문서](https://developers.cloudflare.com/workers)
2. [Wrangler 문서](https://developers.cloudflare.com/wrangler)
3. GitHub Issues
4. Cloudflare Community

---

**다음 단계:** [WordPress 런타임 구성](./WORDPRESS_RUNTIME.md)
