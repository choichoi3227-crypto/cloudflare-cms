// API: 공지사항 검색
// 경로: /api/announcements/search
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

    // 쿼리 파라미터
    const url = new URL(context.request.url);
    const query = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const priority = url.searchParams.get('priority') || '';

    // 검색 결과 (데모 데이터)
    const results = [
      {
        id: '1',
        title: '🎉 Cloud Press 2.0 출시',
        excerpt: '새로운 성능, 보안, 디자인을 제공합니다.',
        priority: 'high',
        category: 'update',
        createdAt: '2026-07-10',
      },
    ].filter((item) => {
      if (query && !item.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (category && item.category !== category) return false;
      if (priority && item.priority !== priority) return false;
      return true;
    });

    return new Response(JSON.stringify({ success: true, data: results, total: results.length }), {
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
