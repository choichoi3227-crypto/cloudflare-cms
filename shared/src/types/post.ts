// shared/src/types/post.ts
export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_html: string;
  status: PostStatus;
  featured_image: string | null;
  author_id: string;
  published_at: number | null;
  scheduled_at: number | null;
  created_at: number;
  updated_at: number;
  categories?: Category[];
  tags?: Tag[];
  seo_meta?: SeoMeta;
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'private';

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  content_html: string;
  status: PostStatus;
  sort_order: number;
  created_at: number;
  updated_at: number;
  seo_meta?: SeoMeta;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  post_count?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  post_count?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  author_url: string | null;
  content: string;
  status: CommentStatus;
  parent_id: string | null;
  created_at: number;
}

export type CommentStatus = 'pending' | 'approved' | 'spam' | 'deleted';
