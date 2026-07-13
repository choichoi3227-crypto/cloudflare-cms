// API: 어드민 통계
// 경로: /api/admin/stats
import { getSession } from '@lib/session';

export async function GET(context: any) {
  try {
    const session = await getSession(context);
    
    // 어드민만 접근 가능
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: '권한이 없습니다' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stats = {
      totalUsers: 1234,
      activeUsers: 856,
      totalHostings: 567,
      activeHostings: 512,
      serverUptime: 99.98,
      avgResponseTime: 125,
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 78,
      requests: {
        lastHour: 45678,
        last24h: 856321,
      },
      errors: {
        lastHour: 12,
        last24h: 287,
        errorRate: 0.034,
      },
    };

    return new Response(JSON.stringify({ success: true, data: stats }), {
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
