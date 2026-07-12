import type { Env } from './types';
import { handleWriter } from './handlers/writer.handler';
import { handleSeo } from './handlers/seo.handler';
import { handleSchema } from './handlers/schema.handler';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { BaseAIProvider } from './providers/base.provider';

type AIEnv = Env & {
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function readJson<T>(request: Request): Promise<T> {
  return await request.json<T>();
}

function createProvider(env: AIEnv, requestedProvider?: string): BaseAIProvider {
  const provider = (requestedProvider || env.AI_PROVIDER || 'openai').toLowerCase();
  if (provider === 'gemini') return new GeminiProvider(env.GEMINI_API_KEY || '', env.AI_MODEL || 'gemini-1.5-pro');
  if (provider === 'claude' || provider === 'anthropic') return new ClaudeProvider(env.CLAUDE_API_KEY || '', env.AI_MODEL || 'claude-3-5-sonnet-latest');
  return new OpenAIProvider(env.OPENAI_API_KEY || '', env.AI_MODEL || 'gpt-4o-mini');
}

export default {
  async fetch(request: Request, env: AIEnv): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
    if (request.method === 'GET' && url.pathname === '/health') return json({ success: true, service: 'ai-gateway' });
    if (request.method !== 'POST') return json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'POST 요청만 지원합니다.' } }, 405);

    const provider = createProvider(env, url.searchParams.get('provider') || undefined);

    if (url.pathname === '/writer') return handleWriter(await readJson(request), provider);
    if (url.pathname === '/seo') return handleSeo(await readJson(request), provider);
    if (url.pathname === '/schema') return handleSchema(await readJson(request), provider);

    return json({ success: false, error: { code: 'NOT_FOUND', message: 'AI Gateway 엔드포인트를 찾을 수 없습니다.' } }, 404);
  },
};
