cloudpress/
├── package.json
├── turbo.json
├── README.md
├── shared/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── types/
│       │   ├── user.ts
│       │   ├── site.ts
│       │   ├── post.ts
│       │   ├── seo.ts
│       │   ├── ai.ts
│       │   └── common.ts
│       ├── constants/
│       │   ├── routes.ts
│       │   └── status.ts
│       └── utils/
│           ├── id.ts
│           ├── date.ts
│           ├── slug.ts
│           └── validation.ts
├── platform/
│   ├── package.json
│   ├── astro.config.mjs
│   ├── tsconfig.json
│   ├── tailwind.config.mjs
│   ├── src/
│   │   ├── env.d.ts
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── lib/
│   │   │   ├── cloudflare-oauth.ts
│   │   │   ├── session.ts
│   │   │   ├── api-client.ts
│   │   │   └── validators.ts
│   │   ├── layouts/
│   │   │   ├── BaseLayout.astro
│   │   │   └── DashboardLayout.astro
│   │   ├── components/
│   │   │   └── landing/
│   │   │       ├── Hero.astro
│   │   │       ├── Features.astro
│   │   │       ├── HowItWorks.astro
│   │   │       └── CTA.astro
│   │   └── pages/
│   │       ├── index.astro
│   │       ├── features.astro
│   │       ├── dashboard/
│   │       │   ├── index.astro
│   │       │   └── sites/
│   │       │       └── create.astro
│   │       ├── auth/
│   │       │   ├── callback.astro
│   │       │   └── logout.ts
│   │       └── api/
│   │           ├── auth/
│   │           │   └── [...].ts
│   │           ├── sites/
│   │           │   └── [...].ts
│   │           └── ai/
│   │               └── [...].ts
│   └── public/
│       ├── favicon.svg
│       └── robots.txt
├── workers/
│   ├── platform-api/
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── router.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       ├── utils/
│   │       │   ├── response.ts
│   │       │   ├── errors.ts
│   │       │   └── crypto.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts
│   │       │   ├── cors.ts
│   │       │   └── rate-limit.ts
│   │       ├── repositories/
│   │       │   ├── user.repository.ts
│   │       │   ├── site.repository.ts
│   │       │   └── activity.repository.ts
│   │       ├── services/
│   │       │   ├── oauth.service.ts
│   │       │   └── provisioning.service.ts
│   │       └── routes/
│   │           ├── auth.ts
│   │           └── sites.ts
│   ├── ai-gateway/
│   │   ├── wrangler.toml
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       │   └── index.ts
│   │       ├── providers/
│   │       │   ├── base.provider.ts
│   │       │   ├── gemini.provider.ts
│   │       │   ├── openai.provider.ts
│   │       │   └── claude.provider.ts
│   │       ├── handlers/
│   │       │   ├── writer.handler.ts
│   │       │   ├── seo.handler.ts
│   │       │   └── schema.handler.ts
│   │       └── middleware/
│   │           └── usage-tracker.ts
│   └── cms-site/
│       ├── wrangler.toml
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/
│           │   └── index.ts
│           ├── utils/
│           │   ├── slug.ts
│           │   ├── date.ts
│           │   ├── sanitize.ts
│           │   ├── pagination.ts
│           │   └── response.ts
│           ├── middleware/
│           │   ├── security-headers.ts
│           │   ├── auth.ts
│           │   └── csrf.ts
│           ├── services/
│           │   ├── cache.service.ts
│           │   ├── seo.service.ts
│           │   ├── schema.service.ts
│           │   ├── post.service.ts
│           │   ├── search.service.ts
│           │   └── feed.service.ts
│           ├── rendering/
│           │   └── html-renderer.ts
│           ├── admin/
│           │   ├── router.ts
│           │   ├── templates/
│           │   │   └── layout.ts
│           │   └── routes/
│           │       ├── posts.ts
│           │       ├── pages.ts
│           │       ├── categories.ts
│           │       ├── tags.ts
│           │       ├── comments.ts
│           │       ├── seo.ts
│           │       ├── settings.ts
│           │       ├── themes.ts
│           │       ├── media.ts
│           │       ├── menus.ts
│           │       ├── dashboard.ts
│           │       ├── analytics.ts
│           │       └── deployments.ts
├── database/
│   ├── platform-schema.sql
│   ├── site-schema.sql
│   └── seeds/
│       ├── platform-seeds.sql
│       └── site-seeds.sql
├── themes/
│   └── default/
│       ├── theme.json
│       ├── package.json
│       └── src/
│           ├── layouts/
│           │   └── Base.astro
│           └── pages/
│               ├── index.astro
│               └── post.astro
└── .github/
    └── workflows/
        ├── deploy-platform.yml
        ├── deploy-ai-gateway.yml
        └── deploy-platform-api.yml
