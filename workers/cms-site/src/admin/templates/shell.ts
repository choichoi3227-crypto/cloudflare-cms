import type { Env } from '../../types';
import { escapeHtml } from '../../utils/sanitize';

export async function renderAdminShell(_env: Env, config: Record<string, string>): Promise<string> {
  const adminPath = config.adminPath || 'cp-admin';
  const currentPath = config.__pathname || 'dashboard';
  const navItems = ['dashboard','posts','pages','categories','tags','seo','themes','plugins','marketplace','media','menus','analytics','settings','system-status'];
  const nav = navItems.map(item => `<a class="nav-item${item === currentPath ? ' active' : ''}" href="/${escapeHtml(adminPath)}/${escapeHtml(item)}">${escapeHtml(labelFor(item))}</a>`).join('');
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapeHtml(labelFor(currentPath))} - CloudPress</title>
  <style>${styles()}</style>
</head>
<body>
  <aside class="sidebar"><h1>CloudPress</h1><nav>${nav}</nav></aside>
  <main class="main">
    <header class="topbar"><strong>${escapeHtml(labelFor(currentPath))}</strong><span>API: /api/admin</span></header>
    <section id="app" class="card">
      <h2>${escapeHtml(labelFor(currentPath))}</h2>
      <p>관리자 API와 연결된 CMS 관리 화면입니다. 테마/플러그인/마켓플레이스 기능은 API 우선으로 동작합니다.</p>
      <pre id="status">loading...</pre>
    </section>
  </main>
  <script>
    const token = localStorage.getItem('cp_admin_token') || '';
    const page = ${JSON.stringify(currentPath)};
    const endpoint = page === 'marketplace' ? '/api/admin/marketplace?type=plugin&q=popular' : '/api/admin/' + page;
    fetch(endpoint, { headers: { 'X-Admin-Token': token } })
      .then(r => r.json())
      .then(data => { document.getElementById('status').textContent = JSON.stringify(data, null, 2); })
      .catch(err => { document.getElementById('status').textContent = err.message; });
  </script>
</body>
</html>`;
}

function labelFor(key: string): string {
  return ({ dashboard: '대시보드', posts: '게시글', pages: '페이지', categories: '카테고리', tags: '태그', seo: 'SEO', themes: '테마', plugins: '플러그인', marketplace: '마켓플레이스', media: '미디어', menus: '메뉴', analytics: '분석', settings: '설정', 'system-status': '시스템 상태' } as Record<string, string>)[key] || key;
}

function styles(): string {
  return `body{margin:0;background:#0f172a;color:#e2e8f0;font-family:Inter,system-ui,sans-serif}.sidebar{position:fixed;inset:0 auto 0 0;width:240px;background:#020617;padding:24px}.sidebar h1{font-size:20px}.nav-item{display:block;color:#cbd5e1;text-decoration:none;padding:10px 12px;border-radius:8px}.nav-item:hover,.nav-item.active{background:#1e293b;color:#fff}.main{margin-left:288px;padding:32px}.topbar{display:flex;justify-content:space-between;margin-bottom:24px}.card{background:#111827;border:1px solid #334155;border-radius:16px;padding:24px}pre{white-space:pre-wrap;overflow:auto}`;
}
