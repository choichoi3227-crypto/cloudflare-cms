// workers/ai-gateway/src/providers/openai.provider.ts
import { BaseAIProvider, type AIProviderResponse } from './base.provider';
export class OpenAIProvider extends BaseAIProvider {
  async chat(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${this.apiKey}`}, body:JSON.stringify({model:this.model,messages:[{role:'system',content:systemPrompt},{role:'user',content:userPrompt}],temperature:0.7,max_tokens:4096}) });
    if (!r.ok) throw new Error(`OpenAI 오류: ${await r.text()}`);
    const d = await r.json() as { choices:Array<{message:{content:string}}>; usage?:{prompt_tokens:number;completion_tokens:number;total_tokens:number} };
    return { content:d.choices[0]?.message?.content||'', usage:d.usage };
  }
}
