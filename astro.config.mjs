import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const EXCLUDE = ['/404/', '/about-us/', '/consultants/', '/contact/thanks/'];

export default defineConfig({
  site: 'https://innexengineering.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  redirects: {
    '/about-us': '/about/',
    '/consultants': '/about/paul-neumann-pe/',
  },
  integrations: [
    sitemap({
      filter: (page) => !EXCLUDE.some((p) => new URL(page).pathname === p),
    }),
  ],
});
