// API: 도메인 조회/생성
// 경로: /api/domains
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

    // 사용자의 도메인 조회
    const domains = [
      {
        id: '1',
        domain: 'example.com',
        status: 'verified',
        registrar: 'GoDaddy',
        expiresAt: '2027-06-15',
        dnsConfigured: true,
      },
      {
        id: '2',
        domain: 'blog.example.com',
        status: 'verified',
        registrar: 'Namecheap',
        expiresAt: '2028-03-20',
        dnsConfigured: true,
      },
    ];

    return new Response(JSON.stringify({ success: true, data: domains }), {
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

    const data = await context.request.json();

    // 유효성 검증
    if (!data.domain || !data.hosting) {
      return new Response(JSON.stringify({ error: '도메인과 호스팅 ID는 필수입니다' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 도메인 추가
    const domain = {
      id: Date.now().toString(),
      domain: data.domain,
      hostingId: data.hosting,
      status: 'pending',
      registrar: data.registrar || '기타',
      dnsConfigured: false,
      createdAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, data: domain }), {
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
