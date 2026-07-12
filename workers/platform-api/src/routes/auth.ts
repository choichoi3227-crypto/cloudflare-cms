// workers/platform-api/src/routes/auth.ts
import type { Env } from '../types';
import { jsonResponse } from '../../utils/response';
import { getAuthorizationUrl } from '../../lib/cloudflare-oauth';
import { exchangeCodeForToken } from '../../lib/cloudflare-oauth';

export async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // POST /auth/login
  if (pathname === '/auth/login') {
    const state = crypto.randomUUID();
    const authUrl = getAuthorizationUrl(state);
    return new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  }

  // POST /auth/callback (Astro callback)
  if (pathname === '/auth/callback') {
    const code = url.searchParams.get('code') || '';
    if (!code) {
      return new Response(null, { status: 302 });
    }

    try {
      const token = await exchangeCodeForToken(code);

      // Cloudflare 사용자 정보 조회
      const user = await getCloudflareUser(token.access_token);
      
      // CloudPress 사용자 등록 또 자동 생성
      const userRecord = await env.DB.prepare(
        'SELECT id, email, username, avatar_url FROM users WHERE email = ?'
      ).first<{ id: string; email: string; username: string; avatar_url: string | null; }>();

      if (!userRecord) {
        const username = user.username || user.email.split('@')[0];
        const usernameStr = username.substring(0, 16); // 최대 16자 제한
        if (await env.DB.prepare('SELECT id FROM users WHERE username = ?').first()) {
          // 이미 존재 사용자면 정보 업데이트
          await env.DB.prepare(
            "UPDATE users SET username = ? WHERE id = ?"
          ).bind(usernameStr || user.email.split('@')[0], usernameStr, null).run();
        }

        await env.DB.prepare(
          "INSERT INTO users (id, email, username, avatar_url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        user.email,
        usernameStr || user
