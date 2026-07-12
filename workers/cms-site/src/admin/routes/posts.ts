// workers/cms-site/src/admin/routes/posts.ts
import type { Env } from '../../types';
import { jsonResponse } from '../../utils/response';
import { generateId, now } from '@shared/utils/id';

export async function handleAdminPosts(request: Request, env: Env, id?: string): Promise<Response> {
  const method = request.method;
  const db = env.DB;

  // 목록 조회
  if (method === 'GET' && !id) {
    const page = parseInt(new URL(request.url).searchParams.get('page') || '1';
    const perPage = parseInt(new URL(request.url).searchParams.get('per_page') || '10';
    const offset = (page - 1) * perPage;
    const result = await db.prepare(
      "SELECT id, title, slug, status, featured_image, published_at, created_at FROM posts ORDER BY published_at DESC LIMIT ? OFFSET ?"
    ).bind(perPage, offset).all();

    const totalResult = await db.prepare("SELECT COUNT(*) as count FROM posts WHERE status = 'published'").first<{ count: number }>();
    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / perPage);

    return jsonResponse({
      success: true,
      data: result.results.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        featured_image: p.featured_image,
        published_at: p.published_at,
        created_at: p.created_at,
      })),
      meta: { page, per_page: perPage, total, total_pages: totalPages },
    });
  }

  // 단건 조회
  if (method === 'GET' && id) {
    const post = await db.prepare(
      "SELECT *, (SELECT GROUP_CONCAT(ARRAY_AGG(b.label)) as categories FROM post_categories pc JOIN categories b ON pc.post_id = p.id WHERE p.id = ?)"
    ).bind(id).first<{
      id: string;
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      content_html: string;
      status: string;
      featured_image: string | null;
      published_at: number | null;
      created_at: number;
      updated_at: number;
      categories: Array<{ id: string; name: string; slug: string }>;
    }>();

    if (!post) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404);
    }

    // 카테고리/태그 조회
    const cats = await db.prepare(
      "SELECT c.id, c.name, c.slug, c.description FROM categories c INNER JOIN post_categories pc ON c.id = pc.post_id WHERE pc.post_id = ?"
    ).bind(id).all<{ id: string; name: string; slug: string; description: string | null }>();

    // 태그 조회
    const tags = await db.prepare(
      "SELECT t.id, t.name, t.slug FROM tags t INNER JOIN post_tags pt ON t.id = pt.tag_id WHERE pt.post_id = ?"
    ).bind(id).all<{ id: string; name: string; slug: string }>();

    return jsonResponse({
      success: true,
      data: {
        ...post,
        categories: cats,
        tags,
      },
    });
  }

  // 생성
  if (method === 'POST' && !id) {
    const body = await request.json() as {
      title: string;
      slug?: string;
      content: string;
      content_html?: string;
      excerpt?: string;
      status?: string;
      featured_image?: string;
    };

    if (!body.title || !body.content) {
      return jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: '제목과 본문은 필수입니다.' } }, 400);
    }

    const id = body.slug ? slugify(body.title) : generateId('post');
    
    // Slug 중복 확인
    const existingSlug = await db.prepare('SELECT id FROM posts WHERE slug = ?').bind(id).first();
    if (existingSlug) {
      id = `${id}-${generateId()}`;
    }

    const now = now();
    const status = body.status || 'draft';
    const publishedAt = status === 'published' ? now : null;

    await db.prepare(
      'INSERT INTO posts (id, title, slug, excerpt, content, content_html, status, featured_image, author_id, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, body.title, id, body.excerpt || null, body.content, body.content_html || body.content, status, body.featured_image || null, 'owner', publishedAt, now, now).run();

    // 카테고리/태그 연결
    if (body.categories && body.categories.length > 0) {
      for (const catId of body.categories) {
        await db.prepare('INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)').bind(id, catId).run();
      }
    }

    if (body.tags && body.tags && body.tags.length > 0) {
      for (const tagId of body.tags) {
        await db.prepare('INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)').bind(id, tagId).run();
      }
    }

    return jsonResponse({ success: true, data: { id, slug, status } }, 201);
  }

  // 수정
  if (method === 'PUT' && id) {
    const body = await request.json() as Record<string, unknown>;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
    if (body.slug !== undefined) { fields.push('slug = ?'); values.push(body.slug); }
    if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
    if (body.content_html !== undefined) { fields.push('content_html = ?'); values.push(body.content_html); }
    if (body.excerpt !== undefined) { fields.push('excerpt = ?'); values.push(body.excerpt); }
    if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
    if (body.featured_image !== undefined) { fields.push('featured_image = ?'); values.push(body.featured_image); }

    if (fields.length === 0) {
      return jsonResponse({ success: false, error: { code: 'NO_BODY', message: '수정할 내용이 없습니다.' } }, 400);
    }

    fields.push('updated_at = ?'); values.push(now);

    const result = await db.prepare(
      `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values, id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { updated: true } });
  }

  // 삭제
  if (method === 'DELETE' && id) {
    await db.prepare('DELETE FROM post_categories WHERE post_id = ?').bind(id).run();
    await db.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(id).run();
    
    const deleteResult = await db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').bind(id, 'owner').run();

    if (deleteResult.meta.changes === 0) {
      return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' } }, 404);
    }

    return jsonResponse({ success: true, data: { deleted: true } });
  }
}
