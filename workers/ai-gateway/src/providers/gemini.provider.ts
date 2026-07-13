// workers/ai-gateway/src/providers/gemini.provider.ts
import { BaseAIProvider, type AIProviderResponse } from './base.provider';
export class GeminiProvider extends BaseAIProvider {
  async chat(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system_instruction:{parts:[{text:systemPrompt}]}, contents:[{parts:[{text:userPrompt}]}], generationConfig:{temperature:0.7,maxOutputTokens:8192} }) });
    if (!r.ok) throw new Error(`Gemini 오류: ${await r.text()}`);
    const d = await r.json() as { candidates:Array<{content:{parts:Array<{text:string}>}}> ; usageMetadata?:{promptTokenCount:number;candidatesTokenCount:number;totalTokenCount:number} };
    return { content:d.candidates[0]?.content?.parts[0]?.text||'', usage:d.usageMetadata?{prompt_tokens:d.usageMetadata.promptTokenCount,completion_tokens:d.usageMetadata.candidatesTokenCount,total_tokens:d.usageMetadata.totalTokenCount}:undefined };
  }
}
