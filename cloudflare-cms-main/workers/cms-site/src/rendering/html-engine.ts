// workers/cms-site/src/rendering/html-engine.ts

interface SeoHeadInput {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  publishedTime?: string;
  robots?: string;
}

interface SchemaInput {
  type: string;
  json: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getSeoHead(input: SeoHeadInput): string {
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);
  const url = input.url;
  const image = input.image ? escapeHtml(input.image) : '';
  const type = input.type || 'website';
  const robots = input.robots || 'index, follow';

  return `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="${type}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description"="${description}" />
    <meta property="og:url" content="${url}" />
    ${image ? `<meta property="og:image" content="${image}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${image ? `<meta name="twitter:image" content="${image}" />` : ''}`;
}

export function buildSchemaScripts(schemas: SchemaInput[]): string {
  return schemas.map(s => {
    try {
      // JSON 파싱 후 다시 직렬화하여 악의성 보장
      const parsed = JSON.parse(s.json);
      return `<script type="application/ld+json">${JSON.stringify(parsed)}</script>`;
    } catch {
      return '';
    }
  }).filter(Boolean).join('\n');
}

export function buildHtmlDocument(
  seoHead: string,
  title: string,
  body: string,
  baseUrl: string,
  schemaScripts?: string,
): string {
  const webSiteSchema = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": title,
    "url": baseUrl,
  })}</script>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="CloudPress" />
  <link rel="icon" href="/favicon.ico" />
  ${seoHead}
  ${schemaScripts || webSiteSchema}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Pretendard', sans-serif; line-height: 1.7; color: #1a1a2e; background: #fafafa; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; }
    .container { max-width: 720px; margin: 0 auto; padding: 0 20px; }
    
    /* Header */
    .site-header { padding: 24px 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 40px; }
    .site-header h1 { font-size: 1.25rem; margin-bottom: 0; }
    .site-header h1 a { color: #1a1a2e; text-decoration: none; font-weight: 700; }
    .site-nav { display: flex; gap: 16px; margin-top: 8px; font-size: 0.875rem; }
    .site-nav a { color: #6b7280; }
    
    /* Post List */
    .post-list { display: flex; flex-direction: column; gap: 0; }
    .post-card { display: flex; gap: 24px; padding: 24px 0; border-bottom: 1px solid #f3f4f6; text-decoration: none; color: inherit; }
    .post-card:hover { background: #f9fafb; }
    .post-card-image { width: 180px; height: 120px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
    .post-card-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .post-card-content time { font-size: 0.8125rem; color: #9ca3af; display: block; margin-bottom: 4px; }
    .post-card-content h2 { font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin-bottom: 4px; }
    .post-card-content p { font-size: 0.875rem; color: #4b5563; line-height: 1.5; }
    
    /* Full Post */
    .post-full { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .post-header { margin-bottom: 32px; }
    .post-header h1 { font-size: 2rem; line-height: 1.3; margin-bottom: 8px; }
    .post-meta { display: flex; align-items: center; gap: 8px; color: #9ca3af; font-size: 0.875rem; margin-bottom: 32px; flex-wrap: wrap; }
    .post-meta-categories a { color: #2563eb; }
    .post-meta-tags a { color: #6b7280; margin-right: 4px; }
    .post-featured-image { width: 100%; border-radius: 12px; margin-bottom: 32px; }
    .post-content { line-height: 1.9; font-size: 1.0625rem; }
    .post-content h2 { font-size: 1.5rem; margin: 48px 0 16px; font-weight: 700; }
    .post-content h3 { font-size: 1.25rem; margin: 32px 0 12px; font-weight: 600; }
    .post-content p { margin-bottom: 16px; }
    .post-content ul, .post-content ol { margin-bottom: 16px; padding-left: 24px; }
    .post-content blockquote { border-left: 4px solid #e5e7eb; padding: 12px 16px; color: #4b5563; margin: 16px 0; background: #f9fafb; border-radius: 0 8px 8px 0; }
    .post-content pre { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 0.875rem; }
    .post-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    .post-content p code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #e11d48; font-size: 0.875em; }
    
    /* Search */
    .search-form { display: flex; gap: 8px; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; }
    .search-form input { flex: 1; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; outline: none; }
    .search-form input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); }
    .search-form button { padding: 12px 24px; background: #111827; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; }
    
    /* Category List */
    .category-list { list-style: none; }
    .category-list li { padding: 16px 0; border-bottom: 1px solid #f3f4f6; }
    .category-list a { color: #1a1a2e; font-size: 1.125rem; text-decoration: none; font-weight: 500; }
    .category-list a:hover { color: #f97316; }
    .category-list p { font-size: 0.875rem; color: #9ca3af; margin-top: 4px; }
    
    /* Pagination */
    .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin: 40px 0; }
    .pagination a, .pagination span { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; height: 40px; padding: 0 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 0.875rem; text-decoration: none; color: #374151; }
    .pagination a:hover { background: #f9fafb; border-color: #f97316; color: #f97316; }
    .pagination .current { background: #111827; color: #fff; border-color: #111827; font-weight: 600; }
    .pagination .prev, .pagination .next { padding: 0 16px; }
    
    /* Empty State */
    .empty-state { text-align: center; padding: 60px 20px; color: #9ca3af; }
    
    /* Footer */
    .site-footer { padding: 24px 0; margin-top: 60px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.875rem; color: #9ca3af; }
    .site-footer a { color: #6b7280; text-decoration: none; }
    .site-footer a:hover { color: #f97316; }
    
    @media (max-width: 640px) {
      .post-card { flex-direction: column; gap: 12px; }
      .post-card-image { width: 100%; height: 180px; }
      .post-header h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <h1><a href="/">${escapeHtml(title)}</a></h1>
      <nav class="site-nav">
        <a href="/">홈</a>
        <a href="/categories">카테고리</a>
        <a href="/rss.xml">RSS</a>
      </nav>
    </div>
  </header>
  ${body}
  <footer class="site-footer">
    <div class="container">
      <p>Powered by <a href="https://cloud-press.co.kr" target="_blank" rel="noopener">CloudPress</a></p>
    </div>
  </footer>
</body>
</html>`;
}
