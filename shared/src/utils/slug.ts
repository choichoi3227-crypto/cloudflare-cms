// shared/src/utils/slug.ts
import { generateShortId } from './id';

export function slugify(text: string): string {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w\u3131-\uD79A-]+/g, '-')
    .replace(/--+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

export function generateUniqueSlug(baseText: string, existingSlugs: string[]): string {
  let slug = slugify(baseText);
  if (!slug) slug = `post-${generateShortId()}`;
  if (!existingSlugs.includes(slug)) return slug;
  let counter = 2;
  while (existingSlugs.includes(`${slug}-${counter}`)) counter++;
  return `${slug}-${counter}`;
}

export function validateSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
