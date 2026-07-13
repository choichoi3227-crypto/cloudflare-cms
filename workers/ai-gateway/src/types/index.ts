// workers/ai-gateway/src/types/index.ts
export interface Env { KV: KVNamespace; ENVIRONMENT: string; }
export interface WriterRequest { keyword:string; type:string; length:string; language?:string; tone?:string; additional_instructions?:string; }
export interface SeoRequest { title:string; content:string; meta_description:string; focus_keyword:string; }
export interface SchemaRequest { object_type:string; object_id:string; data:Record<string,unknown>; }
