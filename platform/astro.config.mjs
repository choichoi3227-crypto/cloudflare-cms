// platform/astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [tailwind()],
  site: 'https://cloud-press.co.kr',
  vite: {
    define: { 'import.meta.env.PUBLIC_SITE_URL': JSON.stringify('https://cloud-press.co.kr') },
  },
});
