// platform/src/pages/api/wordpress/[id]/migrate.ts
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

    const formData = await context.request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine migration type from file extension
    let migrationType = 'full-backup';
    if (file.name.endsWith('.sql')) migrationType = 'database';
    else if (file.name.endsWith('.json')) migrationType = 'content';
    else if (file.name.includes('plugins')) migrationType = 'plugins';
    else if (file.name.includes('themes')) migrationType = 'themes';

    const buffer = await file.arrayBuffer();
    const wpManager = new WordPressManager(id as string, null);
    
    // Process migration
    const migration = await wpManager.processMigration(
      file.name,
      buffer,
      migrationType
    );

    return new Response(JSON.stringify({
      success: true,
      migration,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Migration processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process migration',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
