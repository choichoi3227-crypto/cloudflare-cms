// shared/src/constants/routes.ts
export const PLATFORM_DOMAIN = 'cloud-press.co.kr';
export const ADMIN_PATH = 'cp-admin';

export const PUBLIC_ROUTES = {
  HOME: '/',
  POST: '/post/:slug',
  PAGE: '/page/:slug',
  CATEGORY: '/category/:slug',
  TAG: '/tag/:slug',
  SEARCH: '/search',
  RSS: '/rss.xml',
  SITEMAP: '/sitemap.xml',
  ROBOTS: '/robots.txt',
} as const;

export const ADMIN_ROUTES = {
  DASHBOARD: `/${ADMIN_PATH}`,
  POSTS: `/${ADMIN_PATH}/posts`,
  POST_NEW: `/${ADMIN_PATH}/posts/new`,
  PAGES: `/${ADMIN_PATH}/pages`,
  CATEGORIES: `/${ADMIN_PATH}/categories`,
  TAGS: `/${ADMIN_PATH}/tags`,
  COMMENTS: `/${ADMIN_PATH}/comments`,
  SEO: `/${ADMIN_PATH}/seo`,
  THEMES: `/${ADMIN_PATH}/themes`,
  ANALYTICS: `/${ADMIN_PATH}/analytics`,
  MEDIA: `/${ADMIN_PATH}/media`,
  MENUS: `/${ADMIN_PATH}/menus`,
  SETTINGS: `/${ADMIN_PATH}/settings`,
  DEPLOYMENTS: `/${ADMIN_PATH}/deployments`,
} as const;
