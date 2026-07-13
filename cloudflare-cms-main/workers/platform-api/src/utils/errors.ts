// workers/platform-api/src/utils/errors.ts
export class AppError extends Error { constructor(public code:string, message:string, public status:number=400, public details?:Record<string,string[]>) { super(message); this.name='AppError'; } }
export class NotFoundError extends AppError { constructor(r='리소스') { super('NOT_FOUND',`${r}를 찾을 수 없습니다.`,404); } }
export class ConflictError extends AppError { constructor(m:string) { super('CONFLICT',m,409); } }
export class ValidationError extends AppError { constructor(d:Record<string,string[]>) { super('VALIDATION_ERROR','입력값을 확인해주세요.',400,d); } }
export class ProvisioningError extends AppError { constructor(m:string) { super('PROVISIONING_ERROR',m,500); } }
