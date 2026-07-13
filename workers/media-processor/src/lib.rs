// workers/media-processor/src/lib.rs
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;

extern "C" {
    // Cloudflare Workers Wasm 환경에서 제공하는 메모리 할당/해제 함수
    fn cp_malloc(size: usize) -> *mut u8;
    fn cp_free(ptr: *mut u8);
}

/// Wasm으로 노출되는 메인 이미지 처리 함수
/// 입력: 바이트 배열 포인터, 길이, 최대 너비, 최대 높이, 품질(1-100)
/// 출력: JSON 문자열 포인터 (에러 또는 base64 인코딩된 결과)
#[no_mangle]
pub unsafe extern "C" fn process_image(
    input_ptr: *const u8,
    input_len: usize,
    max_width: u32,
    max_height: u32,
    quality: u8,
) -> *mut u8 {
    let input_bytes = std::slice::from_raw_parts(input_ptr, input_len);
    
    // 1. 이미지 디코딩
    let img = match image::load_from_memory_with_format(input_bytes, ImageFormat::from_guess_format(input_bytes).unwrap_or(ImageFormat::Png)) {
        Ok(img) => img,
        Err(e) => return alloc_string(&format!("{{\"error\":\"Failed to decode image: {}\"}}", e)),
    };

    // 2. 비율 유지 리사이징 (원본보다 작을 경우 리사이즈 생략)
    let (orig_w, orig_h) = (img.width(), img.height());
    let ratio = if orig_w > max_width || orig_h > max_height {
        let w_ratio = max_width as f64 / orig_w as f64;
        let h_ratio = max_height as f64 / orig_h as f64;
        w_ratio.min(h_ratio)
    } else {
        1.0
    };

    let new_w = (orig_w as f64 * ratio).round() as u32;
    let new_h = (orig_h as f64 * ratio).round() as u32;
    
    let resized = img.resize_exact(new_w, new_h, image::imageops::FilterType::Lanczos3);

    // 3. WebP 인코딩
    let mut output_buf = Cursor::new(Vec::new());
    let encoder = image::codecs::webp::WebPEncoder::new_with_quality(&mut output_buf, quality as f32);
    
    match resized.write_with_encoder(encoder) {
        Ok(_) => {
            let webp_bytes = output_buf.into_inner();
            let b64 = base64_encode(&webp_bytes);
            alloc_string(&format!("{{\"success\":true,\"format\":\"webp\",\"width\":{},\"height\":{},\"size\":{},\"data\":\"data:image/webp;base64,{}\"}}", new_w, new_h, webp_bytes.len(), b64))
        },
        Err(e) => alloc_string(&format!("{{\"error\":\"WebP encoding failed: {}\"}}", e))
    }
}

// 보안: Wasm 메모리 밖으로 문자열을 안전하게 복사하는 헬퍼 함수
unsafe fn alloc_string(s: &str) -> *mut u8 {
    let bytes = s.as_bytes();
    let ptr = cp_malloc(bytes.len() + 1) as *mut u8;
    if ptr.is_null() { return std::ptr::null_mut(); }
    std::ptr::copy_nonoverlapping(bytes.as_ptr(), ptr, bytes.len());
    *ptr.add(bytes.len()) = 0; // C-string null terminator
    ptr
}

// 빠른 Base64 인코딩 (외부 크레이트 의존 없이 구현하여 Wasm 크기 최소화)
fn base64_encode(input: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((input.len() / 3) * 4);
    
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        
        let n = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((n >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((n >> 12) & 0x3F) as usize] as char);
        result.push(if chunk.len() > 1 { CHARS[((n >> 6) & 0x3F) as usize] as char } else { '=' });
        result.push(if chunk.len() > 2 { CHARS[(n & 0x3F) as usize] as char } else { '=' });
    }
    result
}
