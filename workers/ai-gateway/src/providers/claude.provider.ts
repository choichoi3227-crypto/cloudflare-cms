// workers/ai-gateway/src/providers/claude.provider.ts
import { BaseAIProvider, type AIProviderResponse } from './base.provider';
export class ClaudeProvider extends BaseAIProvider {
  async chat(systemPrompt: string, userPrompt: string): Promise<AIProviderResponse> {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'}, body:JSON.stringify({model:this.model,max_tokens:4096,system:systemPrompt,messages:[{role:'user',content:userPrompt}]}) });
    if (!r.ok) throw new Error(`Claude 오류: ${await r.text()}`);
    const d = await r.json() as { content:Array<{type:string;text:string}>; usage?:{input_tokens:number;output_tokens:number} };
    return { content:d.content[0]?.text||'', usage:d.usage?{prompt_tokens:d.usage.input_tokens,completion_tokens:d.usage.output_tokens,total_tokens:d.usage.input_tokens+d.usage.output_tokens}:undefined };
  }
}
