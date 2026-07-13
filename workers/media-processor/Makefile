# workers/media-processor/Makefile

.PHONY: build-rust deploy clean

build-rust:
    # Rust를 Wasm으로 컴파일 (wasm32-wasi 타겟)
    rustup target add wasm32-wasi
    CARGO_TARGET_DIR=./build cargo build --release --target wasm32-wasi
    # Wrangler가 읽을 수 있도록 index.js 래퍼 생성 (필요시)
    @echo "export default { fetch() { return new Response('Media Processor Wasm'); } }" > build/index.js

deploy: build-rust
    wrangler deploy

clean:
    rm -rf build/
