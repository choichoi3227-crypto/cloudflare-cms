// workers/cms-site/src/index.ts (CMS 전용 JS Glue)
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_PATH: string;
  ADMIN_SECRET: string;
}

declare const GO_WASM: WebAssembly.Module;
declare const MEDIA_WASM: WebAssembly.Module;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 보안 헤더
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    // 관리자 페이지 처리 (간소화됨)
    if (path.startsWith(`/${env.ADMIN_PATH || 'cp-admin'}/`)) {
      return handleAdmin(request, env);
    }

    // 미디어 업로드 처리 (Rust Wasm 위임)
    if (path === '/api/upload' && request.method === 'POST') {
      return handleMediaUpload(request, env);
    }

    // 공개 API 처리 (Go Wasm 위임)
    if (path.startsWith('/api/')) {
      return handlePublicApi(request, env, url);
    }

    // HTML 페이지 처리 (정적 생성 또는 캐시)
    return handleHtmlRoute(path, env, securityHeaders);
  },

  async queue(batch: MessageBatch<{}>, env: Env): Promise<void> {
    // 분석 데이터 비동기 처리 등
  }
};

async function handlePublicApi(request: Request, env: Env, url: URL): Promise<Response> {
  const goInstance = await WebAssembly.instantiate(GO_WASM, {
    cp_malloc: (size: number) => new Uint8Array(size),
    cp_free: () => {},
  });

  const body = request.method !== 'GET' ? new Uint8Array(await request.arrayBuffer()) : new Uint8Array(0);
  const queryParams: Record<string, string[]> = {};
  url.searchParams.forEach((v, k) => { (queryParams[k] = queryParams[k] || []).push(v); });

  const resultPtr = (goInstance.exports.HandleRequest as Function)(
    url.pathname,
    request.method,
    body,
    queryParams,
    (sql: string, ...params: any[]) => {
      return JSON.stringify(env.DB.prepare(sql).bind(...params).run());
    }
  );

  const memory = new Uint8Array(goInstance.exports.memory.buffer);
  let end = resultPtr;
  while (end < memory.length && memory[end] !== 0) end++;
  
  return new Response(new TextDecoder().decode(memory.slice(resultPtr, end)), {
    headers: { 'Content-Type': 'application/json', ...securityHeaders },
  });
}

async function handleMediaUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return new Response(JSON.stringify({error: 'No file'}), { status: 400 });

  // 1. Rust Wasm 로드
  const mediaInstance = await WebAssembly.instantiate(MEDIA_WASM, {
    cp_malloc: (size: number) => new Uint8Array(size),
    cp_free: () => {},
  });

  // 2. 파일을 Wasm 메모리로 복사
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const inputPtr = (mediaInstance.exports.cp_malloc as Function)(fileBuffer.length);
  const memory = new Uint8Array(mediaInstance.exports.memory.buffer);
  memory.set(fileBuffer, inputPtr);

  // 3. Rust 이미지 처리 실행 (최대 1200px, 품질 85)
  const resultPtr = (mediaInstance.exports.process_image as Function)(
    inputPtr,
    fileBuffer.length,
    1200, // max_width
    800,  // max_height
    85    // quality
  );

  // 4. 결과 파싱
  let end = resultPtr;
  while (end < memory.length && memory[end] !== 0) end++;
  const resultJson = JSON.parse(new TextDecoder().decode(memory.slice(resultPtr, end)));

  if (!resultJson.success) {
    return new Response(JSON.stringify({error: resultJson.error}), { status: 500 });
  }

  // 5. 실제 운영에서는 resultJson.data (base64 webp)를 R2에 저장
  // 현재는 data URI를 DB에 기록
  await env.DB.prepare(
    'INSERT INTO media (id, file_name, original_name, mime_type, file_size, file_url, created_at) VALUES (lower(hex(randomblob(8))), ?, ?, ?, ?, ?, unixepoch())'
  ).bind(
    `${file.name.split('.')[0]}_${Date.now()}.webp`,
    file.name,
    'image/webp',
    file.size,
    resultJson.data,
  ).run();

  return new Response(JSON.stringify({ success: true, url: resultJson.data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function handleHtmlRoute(path: string, env: Env, headers: Record<string, string>): Promise<Response> {
  // 실제 운영에서는 Astro 빌드 결과를 KV에서 읽어오거나 Go에서 HTML 템플릿 렌더링
  return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CloudPress</title></head><body><h1>CloudPress CMS</h1></body></html>`, {
    headers: { 'Content-Type': 'text/html', ...headers },
  });
}

function handleAdmin(request: Request, env: Env): Promise<Response> {
  // 관리자 인증 미들웨어
  const token = request.headers.get('X-Admin-Token');
  if (env.ENVIRONMENT !== 'development' && token !== env.ADMIN_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  return new Response('Admin Panel (SPA)', { headers: { 'Content-Type': 'text/html' } });
}
