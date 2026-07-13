// platform/src/pages/api/wordpress/[id]/index.ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '@lib/session';
import WordPressManager from '@lib/wordpress-manager';

export const DELETE: APIRoute = async (context) => {
  const { id } = context.params;
  
  try {
    const session = parseSessionCookie(context.request.headers.get('cookie'));
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete WordPress instance from database and storage
    // In real implementation:
    // 1. Remove from hybrid database
    // 2. Delete from GitHub Releases
    // 3. Clear Cloudflare cache
    // 4. Remove domain routing from Worker

    return new Response(JSON.stringify({
      success: true,
      message: 'WordPress instance deleted',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete WordPress error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete WordPress instance' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async (context) => {
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
    const details = await wpManager.getSiteDetails();

    return new Response(JSON.stringify({
      success: true,
      data: details,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get WordPress error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch WordPress details' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
