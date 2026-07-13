// workers/ai-gateway/src/handlers/writer.handler.ts
import type { WriterRequest } from '../types';
import { BaseAIProvider } from '../providers/base.provider';
const SYSTEM = `당신은 전문 SEO 콘텐츠 작가입니다. 반드시 JSON 형식으로만 응답하세요. 한국어로 작성하세요.
응답 형식: {"title":"SEO 제목","slug":"url-슬러그","excerpt":"200자 이내 요약","content":"HTML 본문","faq":[{"question":"질문","answer":"답변"}],"meta_description":"160자 이내","og_description":"200자 이내","tags":["태그1"],"focus_keyword":"핵심 키워드"}`;

export async function handleWriter(request: WriterRequest, provider: BaseAIProvider): Promise<Response> {
  const lengthMap: Record<string,string> = { short:'1000~1500자', medium:'2000~3000자', long:'4000~6000자' };
  const typeMap: Record<string,string> = { informational:'정보성 글', news:'뉴스 기사', policy:'정책 안내', review:'리뷰', comparison:'비교 분석', tutorial:'튜토리얼' };
  const prompt = `키워드: ${request.keyword}\n글 유형: ${typeMap[request.type]||'정보성 글'}\n글 길이: ${lengthMap[request.length]||'2000~3000자'}\n${request.tone?`어조: ${request.tone}\n`:''}${request.additional_instructions?`추가 지시: ${request.additional_instructions}`:''}\n위 조건에 맞게 작성하세요.`;
  try {
    const result = await provider.chat(SYSTEM, prompt);
    const json = result.content.match(/\{[\s\S]*\}/);
    if (!json) throw new Error('JSON 파싱 실패');
    return new Response(JSON.stringify({success:true, data:JSON.parse(json[0])}), { headers:{'Content-Type':'application/json'} });
  } catch (err) { return new Response(JSON.stringify({success:false,error:{code:'AI_ERROR',message:err instanceof Error?err.message:'AI 오류'}}), { status:500, headers:{'Content-Type':'application/json'} }); }
}
