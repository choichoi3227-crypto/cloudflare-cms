// workers/cms-site/src/admin/templates/theme-manager.ts
export function renderThemeManager(env: { ADMIN_PATH: string, siteConfig: Record<string, string> }): string {
  const activeThemeId = siteConfig.theme_active || 'theme_001';
  return `
    <div class="page-header">
      <h2>테마 관리</h2>
      <div class="page-header-actions">
        <button class="btn btn-primary" onclick="showUploadForm()">테마 업로드</button>
        <a href="/${ADMIN_PATH}/system-status" class="btn btn-secondary btn-sm">시스템 상태</a>
      </div>
    </div>

    <!-- 테마 목록 -->
    <div id="theme-list" class="card">
      <div class="card-header"><h3>설치된 테마</h3></div>
      <div id="theme-list-body" class="card-body" style="min-height: 200px;">
        <div class="empty">테마를 업로드해주세요.</div>
      </div>
    </div>

    <!-- 업로드 폼orm -->
    <div id="upload-form" class="card" style="display:none;">
      <div class="card-header"><h3>새 테마 업로드</h3></div>
      <div class="card-body">
        <div class="form-group">
          <label class="form-label">테마 ZIP 파일 (.zip)</label>
          <input type="file" id="theme-zip" accept=".zip" class="form-input" required />
          <p class="form-hint">Astro 프로젝트를 빌드(ZIP)하여 업로드해주세요. config.json과 HTML 템플릿이 포함되어야 합니다.</p>
        </div>
        <div class="form-group">
          <label class="form-label">직접 템플릿 URL (선택 사항)</label>
          <input type="url" id="template-url" class="form-input" placeholder="https://example.com/theme.zip" />
          <p class="form-hint">외부 URL에서 ZIP 파일의 주소를 입력하세요. 생략하면 빈 템플릿 URL이 자동 생성됩니다.</p>
        </div>
        <div style="display:flex; gap:8px; margin-top:20px;">
          <button class="btn btn-primary" onclick="submitThemeUpload()">업로드 및 적용</button>
          <button class="btn btn-secondary" onclick="hideUploadForm()">취소</button>
        </div>
        <div id="upload-progress" style="display:none; margin-top:16px;">
          <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
          <p class="form-hint" id="upload-status">업로드 중...</p>
        </div>
        <div id="upload-result" style="display:none; margin-top:16px;">
          <div class="toast toast-success" id="upload-result-text">테마가 적용되었습니다.</div>
        </div>
      </div>
    </div>

    <!-- 테마 상세 보기 -->
    <div id="theme-detail" class="card" style="display:none;">
      <div class="card-header"><h3 id="detail-name">테마 상세</h3>
        <div class="card-body" id="detail-body"></div>
    </div>
  </div>

    <script>
    let activeThemeId = '${activeThemeId}';

    async function loadThemes() {
      const data = await api('/themes');
      if (!data.success) return;
      const listEl = document.getElementById('theme-list-body');
      if (data.data.length === 0) {
        listEl.innerHTML = '<div class="empty">테마를 업로드해주세요.</div>';
        return;
      }
      
      listEl.innerHTML = data.data.map(t => \`
        <div class="theme-item \${t.id === activeThemeId ? 'active' : ''}" onclick="showDetail('\${t.id}')">
          <div class="theme-info">
            <h4>\${escapeHtml(t.name)}</h4>
            <div class="theme-meta">
              <span class="badge badge-gray">v\${t.version || '1.0.0'}</span>
            </div>
            <div class="theme-actions">
              \${t.id !== activeThemeId ? \`<button class="btn btn-sm \${t.is_active ? 'btn-secondary' : 'btn-ghost'}" onclick="applyTheme('\${t.id}')" title="적용하기">적용</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="deleteTheme('\${t.id}')" title="삭제">삭제</button>
            </div>
          </div>
        </div>
      `);
    }

    async function showDetail(themeId: string) {
      const data = await api(\`/themes/\${themeId}\`, { method: 'GET' });
      if (!data.success) return;

      const t = data.data;
      const files = await api(\`/themes/\${themeId}/files\`, { method: 'GET' });
      
      document.getElementById('detail-name').textContent = t.name;
      document.getElementById('detail-body').innerHTML = \`
        <div style="margin-bottom:24px;">
          <h4 style="margin-bottom:12px; color:#94a3b8; font-size:0.875rem; text-transform:uppercase; letter-spacing:0.05em;">파일 목록 (\${files.length}개)</h4>
          <div style="border-top: 1px solid #334155; margin-bottom:16px;"></div>
          <ul style="list-style:none; font-size:0.875rem; color:#cbd5e1;">
            \${files.map(f => \`<li style="padding: 8px 0; border-bottom: 1px solid #334155; font-family:monospace; color:#94a3b8; word-break:break-all;">\${f.file_path}</li>\`).join('')}
          </ul>
        </div>
      \`;
      
      document.getElementById('theme-detail').style.display = 'block';
    }

    function showUploadForm() {
      document.getElementById('upload-form').style.display = 'block';
      document.getElementById('upload-result').style.display = 'none';
      document.getElementById('upload-progress').style.display = 'none';
    }

    function hideUploadForm() {
      document.getElementById('upload-form').style.display = 'none';
    }

    async function submitThemeUpload() {
      const fileInput = document.getElementById('theme-zip') as HTMLInputElement;
      const templateUrl = (document.getElementById('template-url') as HTMLInputElement).value.trim();
      
      if (!fileInput.files || !fileInput.files[0]) {
        alert('ZIP 파일을 선택해주세요.');
        return;
      }

      const file = fileInput.files[0];
      
      // 프로그레스 바 표시
      document.getElementById('upload-progress').style.display = 'block';
      document.getElementById('upload-status').textContent = '업로드 중...';
      
      const formData = new FormData();
      if (templateUrl) {
        formData.append('template_url', templateUrl);
      }
      formData.append('theme_zip', file);

      try {
        const res = await fetch('/api/themes/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        
        if (data.success) {
          document.getElementById('upload-form').style.display = 'none';
          document.getElementById('upload-result').style.display = 'block';
          document.getElementById('upload-result-text').textContent = `✅ ${data.data.name} 테마가 적용되었습니다.`;
          
          await loadThemes();
          if (data.data.id === activeThemeId) {
            showDetail(data.data.id);
          }
        } else {
          document.getElementById('upload-form').style.display = 'block';
          document.getElementById('upload-status').style.display = 'block';
          document.getElementById('upload-status').textContent = `❌ 업로드 실패: ${data.error?.message || '알 수 없는 오류'}`;
          document.getElementById('upload-result').style.display = 'block';
          document.getElementById('upload-result').className = 'toast toast-error';
          document.getElementById('upload-result-text').textContent = data.error?.message || '업로드 실패';
        }
      } catch (err) {
        document.getElementById('upload-form').style.display = 'block';
        document.getElementById('upload-status').style.display = 'block';
        document.getElementById('upload-status').textContent = '네트워크 오류가 발생했습니다.';
      }
    }

    async function applyTheme(themeId: string) {
      if (!confirm('이 테마를 적용하시겠습니까?') return;
      
      const res = await api(`/themes/\${themeId}/activate`, { method: 'POST' });
      
      if (res.success) {
        toast('테마가 활성화되었습니다. 사이트에 반영되는 데 몇 초 걸립니다.');
        activeThemeId = themeId;
        await loadThemes();
        if (document.getElementById('detail-name').textContent === t.name) {
          showDetail(themeId);
        }
      } else {
        toast(res.error?.message || '테마 활성화에 실패했습니다.', 'error');
      }
    }

    async function deleteTheme(themeId: string) {
      if (!confirm('정말 이 테마를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.') return;

      const res = await api(`/themes/\${themeId}`, { method: 'DELETE' });
      
      if (res.success) {
        toast('테마가 삭제되었습니다.');
        activeThemeId = 'theme_001';
        loadThemes();
        if (document.getElementById('detail-name').textContent === themeId) {
          document.getElementById('detail-body').style.display = 'none';
        }
      } else {
        toast(res.error?.message || '삭제 실패 (활성화된 테마는 삭제할 수 없습니다.)', 'error');
      }
    }

    // 초기 로드
    loadThemes();
  }
  </script>
