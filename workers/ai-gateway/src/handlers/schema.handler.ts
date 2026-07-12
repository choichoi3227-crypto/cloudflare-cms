// workers/ai-gateway/src/handlers/schema.handler.ts
import type { SchemaRequest } from '../types';
import { BaseAIProvider } from '../providers/base.provider';
const SYSTEM = `당신은 Schema.org 전문가입니다. 반드시 JSON 형식으로만 응답하세요.
응답 형식: {"schema_type":"Article|BlogPosting|FAQPage 등","schema_json":"유효한 JSON-LD 문자열"}`;

export async function handleSchema(request:
