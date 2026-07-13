// API: 공지사항 조회/생성
// 경로: /api/announcements
import { getSession } from '@lib/session';

export async function GET(context: any) {
  try {
    // 세션 검증
    const session = await getSession(context);
    if (!session) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 데모 공지사항 데이터
    const announcements = [
      {
        id: '1',
        title: '🎉 Cloud Press 2.0 출시',
        excerpt: '새로운 성능, 보안, 디자인을 제공합니다.',
        priority: 'high',
        category: 'update',
        createdAt: '2026-07-10',
        viewCount: 1234,
      },
      {
        id: '2',
        title: '🚨 서버 점검 안내',
        excerpt: '7월 15일 00:00 ~ 06:00 서비스 중단',
        priority: 'critical',
        category: 'maintenance',
        createdAt: '2026-07-08',
        viewCount: 892,
      },
    ];

    return new Response(JSON.stringify({ success: true, data: announcements }), {
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

export async function POST(context: any) {
  try {
    // 세션 검증 (어드민만)
    const session = await getSession(context);
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: '권한이 없습니다' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await context.request.json();

    // 유효성 검증
    if (!data.title || !data.content) {
      return new Response(JSON.stringify({ error: '제목과 내용은 필수입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 공지사항 생성 (실제로는 DB에 저장)
    const announcement = {
      id: Date.now().toString(),
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || '',
      priority: data.priority || 'normal',
      category: data.category || 'notice',
      author: session.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, data: announcement }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
