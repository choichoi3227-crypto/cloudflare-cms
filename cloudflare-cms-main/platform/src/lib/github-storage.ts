/**
 * GitHub Releases Storage Manager
 * Manages all WordPress files, SQLite databases, and configurations via GitHub Releases
 * No token required - uses public Release API
 */

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  updated_at: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
  content_type: string;
}

export interface WordPressPackage {
  siteId: string;
  wordpressVersion: string;
  phpVersion: string;
  dbType: 'sqlite' | 'json'; // sqlite or json
  releaseTag: string; // e.g., "wp-site-001-v1.0.0"
  assets: {
    wordpressCore: string; // URL
    wpContent: string; // URL
    database: string; // URL
    config: string; // URL
  };
  metadata: {
    storageSizeBytes: number;
    lastUpdated: string;
    createdAt: string;
  };
}

export interface HostingMetrics {
  siteId: string;
  storageUsedBytes: number;
  storageUsedPercent: number;
  dbSizeBytes: number;
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  cacheHitRate: number; // percentage
  avgResponseTime: number; // ms
}

class GitHubStorageManager {
  private static readonly API_BASE = 'https://api.github.com';
  private static readonly CONTENT_ENDPOINT = 'https://raw.githubusercontent.com';
  
  private owner: string;
  private repo: string;

  constructor(owner: string, repo: string) {
    this.owner = owner;
    this.repo = repo;
  }

  /**
   * Get all WordPress site releases from GitHub Releases
   */
  async listSiteReleases(): Promise<GitHubRelease[]> {
    try {
      const response = await fetch(
        `${GitHubStorageManager.API_BASE}/repos/${this.owner}/${this.repo}/releases`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
      return response.json();
    } catch (error) {
      console.error('Failed to list site releases:', error);
      throw error;
    }
  }

  /**
   * Get WordPress package metadata from a release
   */
  async getWordPressPackage(releaseTag: string): Promise<WordPressPackage | null> {
    try {
      const releases = await this.listSiteReleases();
      const release = releases.find(r => r.tag_name === releaseTag);
      
      if (!release) return null;

      const siteId = releaseTag.split('-')[1]; // Extract siteId from tag like "wp-site-001-v1.0.0"
      const assets = release.assets;

      const wordpressCore = assets.find(a => a.name.includes('wordpress-core'))?.browser_download_url || '';
      const wpContent = assets.find(a => a.name.includes('wp-content'))?.browser_download_url || '';
      const database = assets.find(a => a.name.endsWith('.db') || a.name.endsWith('.json'))?.browser_download_url || '';
      const config = assets.find(a => a.name === 'wp-config.json')?.browser_download_url || '';

      const totalSize = release.assets.reduce((sum, asset) => sum + asset.size, 0);

      return {
        siteId,
        wordpressVersion: '6.4',
        phpVersion: '8.3',
        dbType: database.includes('.db') ? 'sqlite' : 'json',
        releaseTag,
        assets: {
          wordpressCore,
          wpContent,
          database,
          config,
        },
        metadata: {
          storageSizeBytes: totalSize,
          lastUpdated: release.updated_at,
          createdAt: release.created_at,
        },
      };
    } catch (error) {
      console.error('Failed to get WordPress package:', error);
      throw error;
    }
  }

  /**
   * Download file from GitHub Release asset
   */
  async downloadAsset(downloadUrl: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      return response.arrayBuffer();
    } catch (error) {
      console.error('Failed to download asset:', error);
      throw error;
    }
  }

  /**
   * Get asset size without downloading
   */
  async getAssetSize(downloadUrl: string): Promise<number> {
    try {
      const response = await fetch(downloadUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error) {
      console.error('Failed to get asset size:', error);
      return 0;
    }
  }

  /**
   * List all assets in a release
   */
  async listReleaseAssets(releaseTag: string): Promise<GitHubAsset[]> {
    try {
      const releases = await this.listSiteReleases();
      const release = releases.find(r => r.tag_name === releaseTag);
      return release?.assets || [];
    } catch (error) {
      console.error('Failed to list release assets:', error);
      throw error;
    }
  }

  /**
   * Get raw content from GitHub (config files, migration data, etc.)
   */
  async getRawContent(path: string, ref: string = 'main'): Promise<string> {
    try {
      const response = await fetch(
        `${GitHubStorageManager.CONTENT_ENDPOINT}/${this.owner}/${this.repo}/${ref}/${path}`
      );
      if (!response.ok) throw new Error(`Failed to fetch content: ${response.statusText}`);
      return response.text();
    } catch (error) {
      console.error('Failed to get raw content:', error);
      throw error;
    }
  }

  /**
   * Calculate total storage used across all releases
   */
  async getTotalStorageUsed(): Promise<number> {
    try {
      const releases = await this.listSiteReleases();
      return releases.reduce((total, release) => {
        return total + release.assets.reduce((sum, asset) => sum + asset.size, 0);
      }, 0);
    } catch (error) {
      console.error('Failed to calculate storage:', error);
      throw error;
    }
  }

  /**
   * Get hosting metrics for a specific site
   */
  async getHostingMetrics(siteId: string): Promise<HostingMetrics> {
    // This would integrate with Cloudflare Analytics Engine
    // For now, returns placeholder metrics
    return {
      siteId,
      storageUsedBytes: 512 * 1024 * 1024, // 512MB placeholder
      storageUsedPercent: 5,
      dbSizeBytes: 256 * 1024 * 1024, // 256MB placeholder
      requestsPerSecond: 125,
      requestsPerMinute: 7500,
      requestsPerHour: 450000,
      requestsPerDay: 10800000,
      cacheHitRate: 85.5,
      avgResponseTime: 45,
    };
  }
}

export default GitHubStorageManager;
