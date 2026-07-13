// workers/ai-gateway/src/providers/base.provider.ts
export interface AIProviderResponse { content:string; usage?:{ prompt_tokens:number; completion_tokens:number; total_tokens:number }; }
export abstract class BaseAIProvider { constructor(protected apiKey:string, protected model:string) {} abstract chat(systemPrompt:string, userPrompt:string):Promise<AIProviderResponse>; }
