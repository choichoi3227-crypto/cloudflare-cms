// API: 공지사항 상세/수정/삭제
// 경로: /api/announcements/[id]
import { getSession } from '@lib/session';

export async function GET(context: any) {
  try {
    const { id } = context.params;

    // 데모 공지사항
    const announcement = {
      id,
      title: '🎉 Cloud Press 2.0 출시',
      content: '# Cloud Press 2.0이 출시되었습니다\n\n새로운 기능들을 소개합니다.',
      priority: 'high',
      category: 'update',
      createdAt: '2026-07-10',
      viewCount: 1234,
    };

    return new Response(JSON.stringify({ success: true, data: announcement }), {
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

export async function PUT(context: any) {
  try {
    const session = await getSession(context);
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: '권한이 없습니다' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = context.params;
    const data = await context.request.json();

    // 공지사항 수정
    const updated = {
      id,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, data: updated }), {
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

export async function DELETE(context: any) {
  try {
    const session = await getSession(context);
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: '권한이 없습니다' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = context.params;

    // 공지사항 삭제
    return new Response(JSON.stringify({ success: true, message: '공지사항이 삭제되었습니다' }), {
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
