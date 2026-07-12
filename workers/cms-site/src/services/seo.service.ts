// workers/cms-site/src/services/seo.service.ts
import { escapeHtml } from '../utils/sanitize';

interface SeoMetaRow {
  id: string;
  object_type: string;
  object_id: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  robots: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string;
  focus_keyword: string | null;
}

export class SeoService {
  constructor(private db: D1Database) {}

  async getMeta(objectType: string, objectId: string): Promise<SeoMetaRow | null> {
    return this.db.prepare(
      'SELECT * FROM seo_meta WHERE object_type = ? AND object_id = ?'
    ).bind(objectType, objectId).first<SeoMetaRow>();
  }

  async upsertMeta(data: {
    object_type: string;
    object_id: string;
    meta_title?: string;
    meta_description?: string;
    canonical_url?: string;
    robots?: string;
    og_title?: string;
    og_description?: string;
    og_image?: string;
    twitter_card?: string;
    focus_keyword?: string;
  }): Promise<void> {
    const existing = await this.getMeta(data.object_type, data.object_id);

    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (data.meta_title !== undefined) { fields.push('meta_title = ?'); values.push(data.meta_title); }
      if (data.meta_description !== undefined) { fields.push('meta_description = ?'); values.push(data.meta_description); }
      if (data.canonical_url !== undefined) { fields.push('canonical_url = ?'); values.push(data.canonical_url); }
      if (data.robots !== undefined) { fields.push('robots = ?'); values.push(data.robots); }
      if (data.og_title !== undefined) { fields.push('og_title = ?'); values.push(data.og_title); }
      if (data.og_description !== undefined) { fields.push('og_description = ?'); values.push(data.og_description); }
      if (data.og_image !== undefined) { fields.push('og_image = ?'); values.push(data.og_image); }
      if (data.twitter_card !== undefined) { fields.push('twitter_card = ?'); values.push(data.twitter_card); }
      if (data.focus_keyword !== undefined) { fields.push('focus_keyword = ?'); values.push(data.focus_keyword); }

      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(Math.floor(Date.now() / 1000));
        values.push(existing.id);
        await this.db.prepare(`UPDATE seo_meta SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
      }
    } else {
      const id = `seo_${data.object_type}_${data.object_id}`;
      await this.db.prepare(
        'INSERT INTO seo_meta (id, object_type, object_id, meta_title, meta_description, canonical_url, robots, og_title, og_description, og_image, twitter_card, focus_keyword, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        id, data.object_type, data.object_id,
        data.meta_title || null, data.meta_description || null,
        data.canonical_url || null, data.robots || 'index, follow',
        data.og_title || null, data.og_description || null, data.og_image || null,
        data.twitter_card || 'summary_large_image', data.focus_keyword || null,
        Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000),
      ).run();
    }
  }

  async generatePostSchemas(postId: string, post: { title: string; excerpt: string; url: string; published_at: number | null; featured_image: string | null }): Promise<void> {
    // Article Schema
    const articleSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "description": post.excerpt,
      "url": post.url,
      "image": post.featured_image,
      "datePublished": post.published_at ? new Date(post.published_at * 1000).toISOString() : undefined,
      "dateModified": new Date().toISOString(),
      "publisher": { "@type": "Organization", "name": "CloudPress Site" },
    });

    // Breadcrumb Schema
    const breadcrumbSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "홈", "item": post.url.split('/').slice(0, 3).join('/') + '/' },
        { "@type": "ListItem", "position": 2, "name": post.title, "item": post.url },
      ],
    });

    const now = Math.floor(Date.now() / 1000);
    await this.db.batch([
      this.db.prepare('INSERT OR IGNORE INTO schemas (id, object_type, object_id, schema_type, schema_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(object_type, object_id, schema_type) DO UPDATE SET schema_json = ?, updated_at = ?').bind(`schema_post_${postId}`, 'post', postId, 'Article', articleSchema, now, now, articleSchema, now),
      this.db.prepare('INSERT OR IGNORE INTO schemas (id, object_type, object_id, schema_type, schema_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(object_type, object_id, schema_type) DO UPDATE SET schema_json = ?, updated_at = ?').bind(`schema_bread_${postId}`, 'post', postId, 'BreadcrumbList', breadcrumbSchema, now, now, breadcrumbSchema, now),
    ]);
  }
}
