// workers/cms-site/src/admin/templates/shell.ts (수정된 전체 코드)
import type { Env } from '../../types';
import { escapeHtml } from '../../utils/sanitize';

export async function renderAdminShell(env: Env, config: Record<string, string>): Promise<string> {
  const adminPath = config.adminPath || 'cp-admin';
  const currentPath = config.__pathname || 'dashboard';

  const navItems = [
    { key: 'dashboard', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7-7M5 10v10a1 1 0 001 1h3m10-11a2 2 0 00-2-2V5a2 2 0 00-2-2h-2m-2-4m0 0h-2m2-5H7a2 2 0 00-2-2h-2' },
    { key: 'posts', label: '게시글', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 00-2-2h-2m2 5H7m0 10h10M9 7h.01M15 8h.01M9 7h2a2 2 0 00-2-2h-2' },
    { key: 'pages', label: '페이지', icon: 'M14 2H6a2 2 0 00-2-2V5a2 2 0 00-2-2h-2' },
    { key: 'categories', label: '카테고리', icon: 'M4 6h16M4 6v12c0 1.1.0 2.924 0 00-2-2h-2' },
    { key: 'tags', label: '태그', icon: 'M7 7h.01M15 8h.01M7 21a2 2 0 01-2 0h.01M7 7a2 2 0 011 1h2a1.64 0 012 1h2a1 668h1.996c0 1.657 0 011 1h-2 1.668 1h-2' },
    { key: 'seo', label: 'SEO 설정', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0H7a2 2 0 00-2-2h-2' },
    { key: 'themes', label: '테마', icon: 'M7 21a4 4 4 0 01-2-2h-2' },
    { key: 'media', label: '미디어', icon: 'M4 16l4.586-4.586a2 2 0 012 2h-2' },
    { key: 'menus', label: '메뉴', icon: 'M4 6h16M4 12h16M4 18h7a2 2 0 00-2-2h-2' },
    { key: 'analytics', label: '분석', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2h-2' },
    { key: 'settings', label: '설정', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.066 2.573c-.29.289-.07 2.572-1.065-2.573-1.065z' },
    { key: 'system', label: '시스템 상태', icon: 'M4 6h16M4 12h16M4 18h7a2 2 0 00-2-2h-2' },
  ];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(currentPath === 'dashboard' ? '대시보드' : currentPath)} - 관리자</title>
  <style>${getGlobalStyles()}</style>
  <script>
    const API = '/api/admin';
    const ADMIN_PATH = '${adminPath}';
    const CURRENT_PATH = '${currentPath}';
    
    function toast(msg, type = 'success') {
      const c = document.getElementById('toast-container');
      const el = document.createElement('div');
      el.className = 'toast toast-' + type;
      el.textContent = msg;
      c.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
    
    async function api(path, options = {}) {
      const token = localStorage.getItem('cp_admin_token') || '';
      const res = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token } });
      const data = await res.json();
      if (!res.ok && !data.success) { toast(data.error?.message || '요청 실패', 'error'); }
      return data;
    }
    
    function formatDate(ts) { return ts ? new Date(ts * 1000).toLocaleDateString('ko-KR') : '-'; }
    
    async function loadContent(page: string) {
      const el = document.getElementById('app');
      if (!el) return;
      try {
        const html = await fetch(\`/admin/\${page}\`, { headers: { 'X-Admin-Token': localStorage.getItem('cp_admin_token') || '' } });
        el.innerHTML = html;
      } catch(e) {
        el.innerHTML = '<div class="empty-state">페이지를 불러오지 못했습니다.</div>';
      }
    }

    function showPage(page: string) {
      loadContent(page);
    }

    async function loadThemes() {
      const data = await api('/themes');
      const listEl = document.getElementById('theme-list-body');
      if (!data.success) return;
      const listHtml = data.data.map(t => \`
        <div class="theme-item \${t.id === activeThemeId ? 'active' : ''}" onclick="showThemeDetail('\${t.id}')">
          <div class="theme-info">
            <h4>\${escapeHtml(t.name)}</h4>
            <div class="theme-meta">
              <span class="badge badge-gray">v\${t.version || '1.0.0'}</span>
            </div>
            <div class="theme-actions">
              \${t.id !== activeThemeId ? \`<button class="btn btn-sm \${t.is_active ? 'btn-secondary' : 'btn-ghost'}" onclick="applyTheme('\${t.id}')" title="적용">적용</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteTheme('\${t.id}')" title="삭제">삭제</button>
            </div>
          </div>
        </div>
      `);
    }

    function showThemeDetail(themeId: string) {
      const data = await api(\`/themes/\${themeId}\`, { method: 'GET' });
      if (!data.success) return;
      const t = data.data;
      document.getElementById('detail-name').textContent = t.name;
      document.getElementById('detail-body').innerHTML = \`
        <div style="margin-bottom:24px;">
          <h4 style="margin-bottom:12px; color:#94a3b8; font-size:0.875rem; text-transform:uppercase; letter-spacing:0.05em;">파일 목록 (\${data.files.length}개)</h4>
          <div style="border-top: 1px solid #334155; margin-bottom:16px;"></div>
          <ul style="list-style:none; font-size:0.875rem; color:#cbd5e1;">
            \${data.files.map(f => \`<li style="padding:8px 0; border-bottom:1px solid #334155; font-family:monospace; color:#94a3b8; word-break:break-all;">\${f.file_path}</li>\`).join('')}
          </ul>
        </div>
      \`;
      document.getElementById('theme-detail').style.display = 'block';
    }

    async function applyTheme(themeId: string) {
      if (!confirm('이 테마를 적용하시겠습니까?')) return;
      const res = await api(\`/themes/\${themeId}/activate\`, { method: 'POST' });
      if (res.success) {
        toast('테마가 활성화되었습니다. 사이트에 반영되는 데 몇 초 걸립니다.');
        activeThemeId = themeId;
        loadThemes();
        if (document.getElementById('detail-name').textContent === res.data?.name) showThemeDetail(themeId);
      } else {
        toast(res.error?.message || '테마 활성화에 실패했습니다.', 'error');
      }
    }

    function deleteTheme(themeId: string) {
      if (!confirm('정말 이 테마를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.') return;
      const res = api(\`/themes/\${themeId}\`, { method: 'DELETE' });
      if (res.success) {
        toast('테마가 삭제되었습니다.');
        activeThemeId = 'theme_001';
        loadThemes();
      } else {
        toast(res.error?.message || '삭제 실패 (활성화된 테마는 삭제할 수 없습니다.)', 'error');
      }
    }

    loadThemes();
  </script>
`;
}
