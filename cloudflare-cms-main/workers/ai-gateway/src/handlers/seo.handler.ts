// workers/ai-gateway/src/handlers/seo.handler.ts
import type { SeoRequest } from '../types';
import { BaseAIProvider } from '../providers/base.provider';
const SYSTEM = `당신은 SEO 분석 전문가입니다. 반드시 JSON 형식으로만 응답하세요.
응답 형식: {"score":0~100,"suggestions":[{"type":"info|warning|error","category":"분류","message":"내용"}],"keyword_density":0~100,"readability_score":0~100,"title_analysis":{"score":0~100,"suggestions":[]},"meta_analysis":{"score":0~100,"suggestions":[]}}`;

export async function handleSeo(request: SeoRequest, provider: BaseAIProvider): Promise<Response> {
  const prompt = `제목: ${request.title}\n메타 설명: ${request.meta_description}\n핵심 키워드: ${request.focus_keyword}\n본문:\n${request.content.substring(0,5000)}`;
  try {
    const result = await provider.chat(SYSTEM, prompt);
    const json = result.content.match(/\{[\s\S]*\}/);
    if (!json) throw new Error('JSON 파싱 실패');
    return new Response(JSON.stringify({success:true, data:JSON.parse(json[0])}), { headers:{'Content-Type':'application/json'} });
  } catch (err) { return new Response(JSON.stringify({success:false,error:{code:'AI_ERROR',message:err instanceof Error?err.message:'AI 오류'}}), { status:500, headers:{'Content-Type':'application/json'} }); }
}
