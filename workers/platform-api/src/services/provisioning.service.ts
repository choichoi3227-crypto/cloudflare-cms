// workers/platform-api/src/services/provisioning.service.ts
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import { SiteRepository, WorkerRepository } from '../repositories/site.repository';
import { ProvisioningError } from '../utils/errors';
import { generateId } from '@shared/utils/id';

export class ProvisioningService {
  private siteRepo: SiteRepository;
  private workerRepo: WorkerRepository;
  constructor(private db: D1Database, private kv: KVNamespace, private cfToken: string, private cfAccountId: string) { this.siteRepo = new SiteRepository(db); this.workerRepo = new WorkerRepository(db); }

  async provisionSite(userId: string, siteName: string, domain: string) {
    const existingDomain = await this.siteRepo.findByDomain(domain);
    if (existingDomain) throw new ProvisioningError('이미 사용 중인 도메인입니다.');

    const workerName = `cp-${generateId().substring(0,12)}`;
    const d1Name = `cp_site_${generateId().substring(0,8)}`;
    const kvTitle = `cp_cache_${generateId().substring(0,8)}`;

    try {
      const d1Result = await this.createD1(d1Name);
      const kvResult = await this.createKV(kvTitle);
      await this.deployWorker(workerName, siteName, domain, d1Result.database.id, kvResult.id);
      await this.createRoute(domain, workerName);
      const site = await this.siteRepo.create({ user_id:userId, site_name:siteName, domain, worker_id:null, d1_id:d1Result.database.id, kv_id:kvResult.id });
      await this.workerRepo.create({ user_id:userId, worker_name:workerName, worker_domain:`https://${domain}`, worker_type:'site' });
      await this.siteRepo.updateProvisioning(site.id, workerName, d1Result.database.id, kvResult.id);
      await this.initSiteDB(d1Result.database.id, siteName, domain);
      return { site_id:site.id, worker_name:workerName, d1_id:d1Result.database.id, kv_id:kvResult.id };
    } catch (err) { throw new ProvisioningError(`프로비저닝 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`); }
  }

  private async createD1(name: string) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/d1/database`, { method:'POST', headers:{'Authorization':`Bearer ${this.cfToken}`,'Content-Type':'application/json'}, body:JSON.stringify({name}) });
    if (!r.ok) throw new Error(`D1 생성 실패: ${await r.text()}`);
    return (await r.json() as {result:{database:{id:string}}}).result;
  }
  private async createKV(title: string) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/storage/kv/namespaces`, { method:'POST', headers:{'Authorization':`Bearer ${this.cfToken}`,'Content-Type':'application/json'}, body:JSON.stringify({title}) });
    if (!r.ok) throw new Error(`KV 생성 실패: ${await r.text()}`);
    return (await r.json() as {result:{id:string}}).result;
  }
  private async deployWorker(name: string, siteName: string, domain: string, d1Id: string, kvId: string) {
    const script = `export default { async fetch(request, env) { const url = new URL(request.url); if (url.pathname.startsWith('/api/')) return new Response(JSON.stringify({status:'ok',path:url.pathname}),{headers:{'Content-Type':'application/json'}}); return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${siteName}</title></head><body><h1>${siteName}</h1><p>CloudPress CMS</p></body></html>',{headers:{'Content-Type':'text/html'}}); } };`;
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/workers/scripts/${name}`, { method:'PUT', headers:{'Authorization':`Bearer ${this.cfToken}`,'Content-Type':'application/javascript'}, body:script });
    if (!r.ok) throw new Error(`Worker 배포 실패: ${await r.text()}`);
  }
  private async createRoute(domain: string, workerName: string) {
    const tld = domain.split('.').slice(-2).join('.');
    const zr = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${tld}`, { headers:{'Authorization':`Bearer ${this.cfToken}`} });
    if (!zr.ok) return;
    const zones = (await zr.json() as {result:Array<{id:string;name:string}>}).result;
    const zone = zones.find(z => domain.endsWith(z.name));
    if (!zone) return;
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zone.id}/workers/routes`, { method:'POST', headers:{'Authorization':`Bearer ${this.cfToken}`,'Content-Type':'application/json'}, body:JSON.stringify({pattern:domain===zone.name?`${domain}/*`:domain,script:workerName}) });
  }
  private async initSiteDB(d1Id: string, siteName: string, domain: string) {
    const schema = `CREATE TABLE IF NOT EXISTS sites(id TEXT PRIMARY KEY DEFAULT 'default',name TEXT NOT NULL,domain TEXT NOT NULL,description TEXT,language TEXT NOT NULL DEFAULT 'ko',timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',homepage_type TEXT NOT NULL DEFAULT 'posts',posts_per_page INTEGER NOT NULL DEFAULT 10,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS site_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,excerpt TEXT,content TEXT NOT NULL DEFAULT '',content_html TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft',featured_image TEXT,author_id TEXT NOT NULL DEFAULT 'owner',published_at INTEGER,scheduled_at INTEGER,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);CREATE TABLE IF NOT EXISTS pages(id TEXT PRIMARY KEY,title TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,content TEXT NOT NULL DEFAULT '',content_html TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft',sort_order INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);CREATE TABLE IF NOT EXISTS categories(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,description TEXT,parent_id TEXT,sort_order INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);CREATE TABLE IF NOT EXISTS tags(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);CREATE TABLE IF NOT EXISTS post_categories(post_id TEXT NOT NULL,category_id TEXT NOT NULL,PRIMARY KEY(post_id,category_id));CREATE TABLE IF NOT EXISTS post_tags(post_id TEXT NOT NULL,tag_id TEXT NOT NULL,PRIMARY KEY(post_id,tag_id));CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,post_id TEXT NOT NULL,author_name TEXT NOT NULL,author_email TEXT NOT NULL,author_url TEXT,content TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',parent_id TEXT,ip_address TEXT,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,file_name TEXT NOT NULL,original_name TEXT NOT NULL,mime_type TEXT NOT NULL,file_size INTEGER NOT NULL,file_url TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS menus(id TEXT PRIMARY KEY,name TEXT NOT NULL,location TEXT,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS menu_items(id TEXT PRIMARY KEY,menu_id TEXT NOT NULL,label TEXT NOT NULL,url TEXT NOT NULL,parent_id TEXT,target TEXT NOT NULL DEFAULT '_self',sort_order INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS redirects(id TEXT PRIMARY KEY,source TEXT NOT NULL UNIQUE,target TEXT NOT NULL,status_code INTEGER NOT NULL DEFAULT 301);CREATE TABLE IF NOT EXISTS seo_meta(id TEXT PRIMARY KEY,object_type TEXT NOT NULL,object_id TEXT NOT NULL,meta_title TEXT,meta_description TEXT,canonical_url TEXT,robots TEXT NOT NULL DEFAULT 'index, follow',og_title TEXT,og_description TEXT,og_image TEXT,twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',focus_keyword TEXT,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()),UNIQUE(object_type,object_id));CREATE TABLE IF NOT EXISTS schemas(id TEXT PRIMARY KEY,object_type TEXT NOT NULL,object_id TEXT NOT NULL,schema_type TEXT NOT NULL,schema_json TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()),UNIQUE(object_type,object_id,schema_type));CREATE TABLE IF NOT EXISTS analytics_daily(id TEXT PRIMARY KEY,date TEXT NOT NULL UNIQUE,pageviews INTEGER NOT NULL DEFAULT 0,visitors INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS search_logs(id TEXT PRIMARY KEY,keyword TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS themes(id TEXT PRIMARY KEY,name TEXT NOT NULL,version TEXT NOT NULL,author TEXT,is_active INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS theme_files(id TEXT PRIMARY KEY,theme_id TEXT NOT NULL,file_path TEXT NOT NULL,content TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT (unixepoch()),updated_at INTEGER NOT NULL DEFAULT (unixepoch()),UNIQUE(theme_id,file_path));CREATE TABLE IF NOT EXISTS deployments(id TEXT PRIMARY KEY,version TEXT NOT NULL,status TEXT NOT NULL,deployed_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS backups(id TEXT PRIMARY KEY,backup_id TEXT NOT NULL UNIQUE,backup_location TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT (unixepoch()));CREATE TABLE IF NOT EXISTS ai_generations(id TEXT PRIMARY KEY,provider TEXT NOT NULL,type TEXT NOT NULL,prompt TEXT NOT NULL,response TEXT NOT NULL,created_at INTEGER NOT NULL DEFAULT (unixepoch()));`;
    const seeds = `INSERT INTO sites(id,name,domain,language,timezone,homepage_type,posts_per_page) VALUES('default','${siteName.replace(/'/g,"''")}','${domain}','ko','Asia/Seoul','posts',10);INSERT INTO site_settings(key,value) VALUES('site_title','${siteName.replace(/'/g,"''")}'),('site_description','CloudPress로 만든 사이트입니다.'),('admin_path','cp-admin'),('timezone','Asia/Seoul'),('posts_per_page','10'),('show_author','true'),('show_date','true'),('show_categories','true'),('show_tags','true'),('comment_enabled','true'),('comment_moderation','true'),('rss_enabled','true'),('rss_limit','20'),('analytics_enabled','true'),('robots_index','true'),('robots_follow','true'),('theme_active','default');INSERT INTO categories(id,name,slug,description,sort_order) VALUES('cat_001','미분류','uncategorized','분류되지 않은 글',0);INSERT INTO menus(id,name,location) VALUES('menu_001','메인 메뉴','primary');INSERT INTO menu_items(id,menu_id,label,url,sort_order) VALUES('mi_001','menu_001','홈','/',0),('mi_002','menu_001','카테고리','/categories',1);INSERT INTO themes(id,name,version,author,is_active) VALUES('theme_001','default','1.0.0','CloudPress',1);`;
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/d1/database/${d1Id}/query`, { method:'POST', headers:{'Authorization':`Bearer ${this.cfToken}`,'Content-Type':'application/json'}, body:JSON.stringify({sql:schema,params:[]}) });
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/d1/database/${d1Id}/query`, { method:'POST', headers:{'Authorization':`Bearer ${this.cfToken}`,'Content-Type':'application/json'}, body:JSON.stringify({sql:seeds,params:[]}) });
  }
}
