# CloudPress Easy Migration

A WordPress admin plugin for full-site ZIP export/import/restore into CloudPress WordPress Hosting.

The ZIP package includes:
- `manifest.json`
- WordPress database tables as JSON
- plugins
- themes
- uploads/media
- posts, pages, categories, tags, comments, and metadata through the database export

Imports are queued so CloudPress can restore large sites in small Cloudflare Workflow/Durable Object batches rather than uploading all files in one request.
