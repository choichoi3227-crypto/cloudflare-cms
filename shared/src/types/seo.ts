// shared/src/types/seo.ts
export interface SeoMeta {
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
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  focus_keyword: string | null;
  created_at: number;
  updated_at: number;
}

export interface SchemaData {
  id: string;
  object_type: string;
  object_id: string;
  schema_type: string;
  schema_json: string;
  created_at: number;
  updated_at: number;
}
