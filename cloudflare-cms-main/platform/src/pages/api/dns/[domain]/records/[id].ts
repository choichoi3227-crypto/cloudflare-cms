// API: DNS 레코드 수정/삭제
// 경로: /api/dns/[domain]/records/[id]
import { getSession } from '@lib/session';

export async function PUT(context: any) {
  try {
    const session = await getSession(context);
    if (!session) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { domain, id } = context.params;
    const data = await context.request.json();

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
    if (!session) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { domain, id } = context.params;

    return new Response(JSON.stringify({ success: true, message: 'DNS 레코드가 삭제되었습니다' }), {
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
