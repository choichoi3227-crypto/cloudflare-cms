// platform/src/pages/api/wordpress/[id]/purge-cache.ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '@lib/session';
import WordPressManager from '@lib/wordpress-manager';

export const POST: APIRoute = async (context) => {
  const { id } = context.params;
  
  try {
    const session = parseSessionCookie(context.request.headers.get('cookie'));
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const wpManager = new WordPressManager(id as string, null);
    
    // Clear all caches
    await wpManager.clearCache();

    return new Response(JSON.stringify({
      success: true,
      message: 'Cache cleared successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cache purge error:', error);
    return new Response(JSON.stringify({ error: 'Failed to purge cache' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
