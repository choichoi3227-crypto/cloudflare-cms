// API: 도메인 상세/수정/삭제
// 경로: /api/domains/[id]
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

    const { id } = context.params;

    const domain = {
      id,
      domain: 'example.com',
      status: 'verified',
      registrar: 'GoDaddy',
      expiresAt: '2027-06-15',
      dnsConfigured: true,
      records: [
        { type: 'A', name: '@', content: '192.0.2.1', ttl: 3600 },
        { type: 'CNAME', name: 'www', content: 'example.com', ttl: 3600 },
      ],
    };

    return new Response(JSON.stringify({ success: true, data: domain }), {
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
    if (!session) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = context.params;
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

    const { id } = context.params;

    return new Response(JSON.stringify({ success: true, message: '도메인이 삭제되었습니다' }), {
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
