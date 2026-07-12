// workers/cms-site/src/services/blogger.service.ts
import type { D1Database } from '@cloudflare/workers-types';

interface BloggerPost {
  id: string;
  title: string;
  published: string;
  updated: string;
  url: string;
  content: string;
  labels: string[];
  author: {
    displayName: string;
    url: string;
    image: string;
  };
}

interface BloggerListResponse {
  kind: string;
  nextPageToken: string | null;
  items: Array<{
    id: string;
    kind: string;
    title: string;
    published: string;
    updated: string;
    url: string;
    content: string;
    labels: string[];
    author: {
      displayName: string;
      url: string;
      image: string;
    };
  }>;
}

export class BloggerService {
  constructor(private db: D1Database) {}

  async getActiveBloggerConnection(): Promise<{ id: string; blog_id: string; blog_url: string; api_key_encrypted: string } | null> {
    return this.db.prepare(
      'SELECT id, blog_id, blog_url, api_key_encrypted FROM user_blogger_connections WHERE is_active = 1 LIMIT 1'
    ).first<{ id: string; blog_id: string; blog_url: string; api_key_encrypted: string }>();
  }

  async fetchPosts(pageToken?: string): Promise<{ posts: BloggerPost[]; nextPageToken: string | null }> {
    const conn = await this.getActiveBloggerConnection();
    if (!conn) return { posts: [], nextPageToken: null };

    let url = `https://www.googleapis.com/blogger/v3/blogs/byblog?key=${conn.api_key_encrypted}&max-results=10&status=PUBLISHED`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Blogger API Error: ${res.status}`);
    }

    const data = await res.json() as BloggerListResponse;
    return {
      posts: data.items.map(item => ({
        id: item.id,
        title: item.title,
        published: item.published,
        updated: item.updated,
        url: item.url,
        content: item.content || '',
        labels: item.labels || [],
        author: {
          displayName: item.author.displayName,
          url: item.author.url,
          image: item.author.image?.replace('http://', 'https://'),
        },
      })),
      nextPageToken: data.nextPageToken || null,
    };
  }

  async fetchPostByUrl(postUrl: string): Promise<BloggerPost | null> {
    const conn = await this.getActiveBloggerConnection();
    if (!conn) return null;

    const url = `https://www.googleapis.com/blogger/v3/blogs/byurl?url=${encodeURIComponent(postUrl)}&key=${conn.api_key_encrypted}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json() as { items: BloggerPost[] };
    return data.items[0] || null;
  }
}
