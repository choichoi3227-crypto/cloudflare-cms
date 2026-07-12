export interface PhpWasmManifest {
  wasmUrl: string;
  entrypoint: string;
  memoryPages?: number;
}

export interface PhpCompatibilityReport {
  supported: boolean;
  mode: 'php-wasm';
  missing: string[];
  warnings: string[];
}

export class PhpWasmRuntime {
  constructor(private manifest?: PhpWasmManifest) {}

  static fromEnv(env: { PHP_WASM_URL?: string; PHP_WASM_ENTRYPOINT?: string; PHP_WASM_MEMORY_PAGES?: string }): PhpWasmRuntime {
    if (!env.PHP_WASM_URL || !env.PHP_WASM_ENTRYPOINT) return new PhpWasmRuntime();
    return new PhpWasmRuntime({
      wasmUrl: env.PHP_WASM_URL,
      entrypoint: env.PHP_WASM_ENTRYPOINT,
      memoryPages: env.PHP_WASM_MEMORY_PAGES ? Number(env.PHP_WASM_MEMORY_PAGES) : undefined,
    });
  }

  inspect(): PhpCompatibilityReport {
    const missing: string[] = [];
    if (!this.manifest?.wasmUrl) missing.push('PHP_WASM_URL');
    if (!this.manifest?.entrypoint) missing.push('PHP_WASM_ENTRYPOINT');
    return {
      supported: missing.length === 0,
      mode: 'php-wasm',
      missing,
      warnings: missing.length ? ['PHP-WASM 런타임 URL과 엔트리포인트를 설정해야 WordPress PHP 코드 실행이 활성화됩니다.'] : [],
    };
  }

  async instantiate(imports: WebAssembly.Imports = {}): Promise<WebAssembly.Instance> {
    const report = this.inspect();
    if (!report.supported || !this.manifest) {
      throw new Error(`PHP-WASM 런타임 설정 누락: ${report.missing.join(', ')}`);
    }

    const res = await fetch(this.manifest.wasmUrl);
    if (!res.ok) throw new Error(`PHP-WASM 모듈 다운로드 실패: ${res.status}`);
    const bytes = await res.arrayBuffer();
    const module = await WebAssembly.compile(bytes);
    const memory = new WebAssembly.Memory({ initial: this.manifest.memoryPages || 64, maximum: 512 });
    const instance = await WebAssembly.instantiate(module, { env: { memory }, ...imports });
    if (!(this.manifest.entrypoint in instance.exports)) {
      throw new Error(`PHP-WASM 엔트리포인트를 찾을 수 없습니다: ${this.manifest.entrypoint}`);
    }
    return instance;
  }
}
