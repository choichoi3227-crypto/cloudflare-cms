// platform/src/pages/api/wordpress/[id]/admin.ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '@lib/session';
import WordPressManager from '@lib/wordpress-manager';
import HybridDatabase from '@lib/hybrid-db';

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

    const data = await context.request.json();
    const wpManager = new WordPressManager(id as string, null);
    
    // Validate and update admin user
    const updatedUser = await wpManager.updateAdminUser(1, {
      email: data.email,
      displayName: data.displayName,
      ...(data.password && { passwordHash: data.password }),
    });

    return new Response(JSON.stringify({
      success: true,
      user: updatedUser,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin update error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update admin user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
