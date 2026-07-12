// workers/platform-api/src/index.ts
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
}

// Wasm 모듈 타입 선언
declare const GO_WASM: WebAssembly.Module;
declare const MEDIA_WASM: WebAssembly.Module;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://cloud-press.co.kr',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-CF-Token, X-CF-Account-Id',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // 1. Go Wasm 인스턴스 초기화
      const goInstance = await WebAssembly.instantiate(GO_WASM, {
        // Go에서 사용할 보안 메모리 함수 바인딩
        cp_malloc: (size: number) => new Uint8Array(size),
        cp_free: (_ptr: number) => {}, // 실제 운영에서는 메모리 풀링 구현
      });

      // 2. Go 비즈니스 로직 실행
      const headers = Object.fromEntries(request.headers);
      const body = request.method !== 'GET' && request.method !== 'HEAD' 
        ? new Uint8Array(await request.arrayBuffer()) 
        : new Uint8Array(0);

      // Go의 HandleRequest 함수 호출
      const goResultPtr = (goInstance.exports.HandleRequest as Function)(
        url.pathname,
        request.method,
        body,
        headers,
        // D1 Executor 콜백: Go가 DB 쿼리를 요청하면 이 함수가 실행됨
        (sql: string, ...params: any[]) => {
          const stmt = env.DB.prepare(sql);
          // D1 바인딩 처리
          if (params.length > 0) {
            return JSON.stringify(stmt.bind(...params).run());
          }
          return JSON.stringify(stmt.run());
        },
        // Cloudflare API 콜백: Go가 CF 리소스 생성을 요청하면 이 함수가 실행됨
        (url: string, method: string, token: string, body: Uint8Array) => {
          return fetch(url, {
            method,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: method !== 'GET' ? body : undefined,
          }).then(r => r.arrayBuffer()).then(buf => new Uint8Array(buf));
        }
      );

      // 3. Go Wasm 메모리에서 결과 JSON 읽기
      const goMemory = new Uint8Array(goInstance.exports.memory.buffer);
      let end = goResultPtr;
      while (end < goMemory.length && goMemory[end] !== 0) end++;
      const resultBytes = goMemory.slice(goResultPtr, end);
      const jsonString = new TextDecoder().decode(resultBytes);

      // 4. 클라이언트에 응답 반환
      return new Response(jsonString, {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  },
};
