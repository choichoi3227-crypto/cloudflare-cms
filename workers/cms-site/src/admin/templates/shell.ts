// workers/cms-site/src/admin/templates/shell.ts
import { escapeHtml } from '../../utils/sanitize';

export async function renderAdminShell(env: Env, config: Record<string, string>): Promise<string> {
  const adminPath = config.adminPath || 'cp-admin';
  const siteName = config.site_title || 'CloudPress Site';
  const currentPath = config.__pathname || 'dashboard';

  const navItems = [
    { key: 'dashboard', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7-7M5 10v10a1 1 0 001 1h3m10-11a2 2 0 00-2-2V5a2 2 0 00-2-2h-2' },
    { key: 'posts', label: '게시글', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 002-2V7m0 10h10M9.5 2h.5' },
    { key: 'pages', label: '페이지', icon: 'M14 2H6a2 2 0 00-2-2v16a2 2 0 002 2h8a2 2 0 002 2V4a2 2 0 00-2-2h2' },
    { key: 'categories', label: '카테고리', icon: 'M4 6h16M4 6v12c0 1.1 0 2-.9 2H6c-1.1 0-2-.9-2V8c0-1.1 0-2 .9-2h12c1.1 0 2 .9 2v12c0 1.1 0 2-.9 2H6c-1.1 0-2-.9-2V8' },
    { key: 'tags', label: '태그', icon: 'M20.59 13.41l-7.17-7.17a2 2 0 0 0-2.83-2.83l-1.06 1.06a2 2 0 0 0 2.83 2.83M7 7.76V6a2 2 0 0 0 2-2h.01M7 21a2 2 0 0 0 2-2h.01' },
    { key: 'seo', label: 'SEO 설정', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0H7a2 2 0 01-2-2V9a2 2 0 012-2h2m-2 0v10a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2' },
    { key: 'themes', label: '테마', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 0 01-4 4H7' },
    {  divider: true, label: '시스템' },
    { key: 'media', label: '미디어', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L4 12m0 8H2m2 5h16a2 2 0 002 2V6a2 2 0 00-2-2H6a2 2 0 00-2-2h2m2 5H6a2 2 0 00-2-2V4m0 8h.01M21 12a9 9 0 11-18 0 9 9 0 01-18 0' },
    { key: 'menus', label: '메뉴', icon: 'M4 6h16M4 12h16M4 18h16' },
    { key: 'analytics', label: '분석', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v-4m0 0h.01M9 13h6m-6 0h.01M9 7h.01M15 21v-6a2 2 0 00-2-2h-6m0 0h.01M15 15v6m0 0h.01' },
    { key: 'settings', label: '설정', icon: 'M12.22 2h-.07a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c-.29.289-.652.07-2.573-1.065-2.573-1.066C12.924 4.325 13.31 2.924 13.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-.94 1.543.826 3.31 2.37 2.37.996.608.07 2.296.07 2.572-1.065z' },
  ];

  const navHtml = navItems.map(item => {
    if (item.divider) return '<hr style="border-color: #1e293b; margin: 12px 0;">';
    const isActive = currentPath === item.key || (currentPath.startsWith(item.key) && item.key !== 'dashboard');
    const href = item.key === 'dashboard' ? `/${adminPath}` : `/${adminPath}/${item.key}`;
    const editHref = item.key === 'posts/new' ? `/${adminPath}/posts/new` : item.key === 'pages/new' ? `/${adminPath}/pages/new` : null;

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapeHtml(currentPath)} - ${escapeHtml(siteName)} 관리자</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; display: flex; min-height: 100vh; }
    
    /* Sidebar */
    .sidebar { width: 260px; background: #0f172a; border-right: 1px solid #1e293b; position: fixed; top: 0; left: 0; bottom: 0; z-index: 40; display: flex; flex-direction: column; }
    .sidebar-header { padding: 20px; border-bottom: 1px solid #1e293b; }
    .sidebar-header h1 { font-size: 1.1rem; color: #f8fafc; }
    .sidebar-header a { text-decoration: none; }
    .sidebar-header h1 span { color: #f97316; }
    .sidebar-nav { flex: 1; padding: 12px; overflow-y: auto; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: #94a3b8; text-decoration: none; font-size: 0.875rem; margin-bottom: 2px; transition: all 0.15s; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
    .nav-item:hover { background: #1e293b; color: #e2e8f0; }
    .nav-item.active { background: #f97316; color: #fff; }
    .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
    .sidebar-footer { padding: 16px 20px; border-top: 1px solid #1e293b; font-size: 0.75rem; color: #64748b; margin-top: auto; }
    .sidebar-footer a { color: #94a3b8; text-decoration: none; }
    
    /* Main */
    .main { flex: 1; margin-left: 260px; display: flex; flex-direction: column; }
    .topbar { background: #1e293b; border-bottom: 1px solid #334155; padding: 16px 32px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 30; min-height: 64px; }
    .topbar h2 { font-size: 1.25rem; font-weight: 600; }
    .content { padding: 32px; flex: 1; }
    
    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; text-decoration: none; }
    .btn-primary { background: #f97316; color: #fff; }
    .btn-primary:hover { background: #ea580c; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: #dc2626; color: #fff; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-sm { padding: 5px 10px; font-size: 0.8125rem; }
    .btn-ghost { background: transparent; color: #94a3b8; }
    .btn-ghost:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
    
    /* Cards */
    .card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
    .card-header h3 { font-size: 1rem; font-weight: 600; }
    .card-body { padding: 20px; }
    
    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 20px; }
    .stat-label { font-size: 0.8125rem; color: #64748b; margin-bottom: 4px; }
    .stat-value { font-size: 1.75rem; font-weight: 700; color: #f8fafc; }
    
    /* Table */
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155; font-size: 0.875rem; }
    th { color: #64748b; font-weight: 500; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:hover { background: #1e293b; }
    
    /* Badge */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    .badge-green { background: #166534; color: #bbf7d0; }
    .badge-yellow { background: #854d0e; color: #fef08a; }
    .badge-gray { background: #374151; color: #d1d5db; }
    .badge-red { background: #991b1b; color: #fecaca; }
    
    /* Form */
    .form-group { margin-bottom: 20px; }
    .form-label { display: block; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; margin-bottom: 6px; }
    .form-input, .form-textarea, .form-select { width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; font-size: 0.875rem; outline: none; transition: border-color 0.15s; }
    .form-input:focus, .form-textarea:focus, .form-select:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); }
    .form-textarea { min-height: 300px; resize: vertical; font-family: 'JetBrains Mono', monospace; line-height: 1.6; }
    .form-hint { font-size: 0.75rem; color: #64748b; margin-top: 4px; }
    
    /* Empty */
    .empty { text-align: center; padding: 60px 20px; color: #64748b; }
    
    /* Toast */
    #toast-container { position: fixed; top: 20px; right: 20px; z-index: 100; display: flex; flex-direction: column; gap: 8px; }
    .toast { padding: 12px 20px; border-radius: 8px; font-size: 0.875rem; animation: slideIn 0.3s ease-out; }
    .toast-success { background: #166534; color: #fff; }
    .toast-error { background: #991b1b; color: #fff; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
    
    /* Page Specific */
    .page-header { margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
    .page-header-actions { display: flex; gap: 8px; }
    
    /* Post Editor */
    .editor-layout { display: grid; grid-template-columns: 1fr 300px; gap: 24px; height: calc(100vh - 64px - 64px); }
    .editor-main { display: flex; flex-direction: column; min-height: 0; }
    .editor-sidebar { display: flex; flex-direction: column; gap: 16px; }
    .sidebar-section { background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 16px; }
    .sidebar-section h4 { font-size: 0.8125rem; font-weight: 600; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    
    @media (max-width: 1024px) {
      .sidebar { display: none; }
      .main { margin-left: 0; }
      .editor-layout { grid-template-columns: 1fr; }
      .editor-sidebar { display: none; }
    }
  </style>
  <script>
    const API = '/api/admin';
    const ADMIN_PATH = '${adminPath}';
    const CURRENT_PATH = '${currentPath}';
    const SITE_NAME = '${escapeHtml(siteName)}';
    
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
  </script>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-header"><a href="/"><h1>Cloud<span>Press</span></h1></a></div>
    <nav class="sidebar-nav">
      ${navHtml}
    </nav>
    <div class="sidebar-footer">
      <a href="/">← 사이트 보기</a>
    </div>
  </aside>
  <div class="main">
    <header class="topbar">
      <h2>${escapeHtml(currentPath === 'dashboard' ? '대시보드' : currentPath)}</h2>
      <div class="page-header-actions">
        <a href="/" target="_blank" class="btn btn-ghost btn-sm">사이트 보기</a>
      </div>
    </header>
    <div class="content"><div id="app"></div></div>
  </div>
  <div id="toast-container"></div>
</body>
</html>`;
}
