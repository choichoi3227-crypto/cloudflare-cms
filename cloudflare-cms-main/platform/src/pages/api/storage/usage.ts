// API: 스토리지 사용량
// 경로: /api/storage/usage
import { getSession } from '@lib/session';

export async function GET(context: any) {
  try {
    const session = await getSession(context);
    if (!session) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storage = {
      total: 100,
      used: 45.2,
      database: 12.5,
      media: 28.7,
      cache: 4.0,
      hostings: [
        { id: 1, name: '블로그 호스팅', domain: 'blog.example.com', used: 12.5 },
        { id: 2, name: '포트폴리오 호스팅', domain: 'portfolio.example.com', used: 8.3 },
        { id: 3, name: '회사 웹사이트', domain: 'company.example.com', used: 25.8 },
      ],
    };

    return new Response(JSON.stringify({ success: true, data: storage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
