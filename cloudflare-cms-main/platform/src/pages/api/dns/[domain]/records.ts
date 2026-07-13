// API: DNS 레코드 조회/생성
// 경로: /api/dns/[domain]/records
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

    const { domain } = context.params;

    const records = [
      {
        id: '1',
        type: 'A',
        name: '@',
        content: '192.0.2.1',
        ttl: 3600,
        proxied: true,
      },
      {
        id: '2',
        type: 'CNAME',
        name: 'www',
        content: 'example.com',
        ttl: 3600,
        proxied: false,
      },
      {
        id: '3',
        type: 'MX',
        name: '@',
        content: 'mail.example.com',
        ttl: 3600,
        priority: 10,
      },
    ];

    return new Response(JSON.stringify({ success: true, domain, data: records }), {
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
    const session = await getSession(context);
    if (!session) {
      return new Response(JSON.stringify({ error: '인증이 필요합니다' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { domain } = context.params;
    const data = await context.request.json();

    if (!data.type || !data.name || !data.content) {
      return new Response(JSON.stringify({ error: '필수 필드가 없습니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const record = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, data: record }), {
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
