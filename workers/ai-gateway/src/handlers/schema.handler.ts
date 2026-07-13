// workers/ai-gateway/src/handlers/schema.handler.ts
import type { SchemaRequest } from '../types';
import { BaseAIProvider } from '../providers/base.provider';

const SYSTEM = `당신은 Schema.org 전문가입니다. 반드시 JSON 형식으로만 응답하세요.
응답 형식: {"schema_type":"Article|BlogPosting|FAQPage 등","schema_json":"유효한 JSON-LD 문자열"}`;

export async function handleSchema(request: SchemaRequest, provider: BaseAIProvider): Promise<Response> {
  const prompt = `객체 유형: ${request.object_type}\n객체 ID: ${request.object_id}\n데이터:\n${JSON.stringify(request.data, null, 2)}`;

  try {
    const result = await provider.chat(SYSTEM, prompt);
    const json = result.content.match(/\{[\s\S]*\}/);
    if (!json) throw new Error('JSON 파싱 실패');
    return new Response(JSON.stringify({ success: true, data: JSON.parse(json[0]) }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: { code: 'AI_ERROR', message: err instanceof Error ? err.message : 'AI 오류' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
