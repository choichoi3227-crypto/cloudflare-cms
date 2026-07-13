// platform/src/pages/api/wordpress/[id]/cache-settings.ts
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

    const data = await context.request.json();
    const wpManager = new WordPressManager(id as string, null);
    
    // Update cache settings
    const updatedSettings = await wpManager.updateCacheSettings({
      wpRocketEnabled: data.wpRocketEnabled,
      cloudflarePageRuleEnabled: data.cloudflarePageRuleEnabled,
      cacheTTL: data.cacheTTL,
      minifyHTML: data.minifyHTML,
      minifyCSS: data.minifyCSS,
      minifyJS: data.minifyJS,
      lazyLoadImages: data.lazyLoadImages,
      criticalCSSEnabled: data.criticalCSSEnabled,
    });

    return new Response(JSON.stringify({
      success: true,
      settings: updatedSettings,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cache settings update error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update cache settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
