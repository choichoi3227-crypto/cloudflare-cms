# workers/platform-api/Makefile

.PHONY: build-go deploy clean

# TinyGo 설치 필요: https://tinygo.org/getting-started/install/
build-go:
    # Go 소스를 Cloudflare Workers용 Wasm으로 컴파일
    tinygo build -o build/go.wasm \
        -target=wasi \
        -scheduler=none \
        -no-debug \
        -src=src/go/

deploy: build-go
    wrangler deploy

clean:
    rm -rf build/
