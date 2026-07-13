/**
 * Announcement Manager
 * 
 * Manages announcements using GitHub Releases API
 * Repository format: announcements-{domain}
 * Each announcement = one release
 */

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
}

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  author?: {
    name: string;
    avatar: string;
  };
  priority: 'low' | 'normal' | 'high' | 'critical';
  category: 'notice' | 'update' | 'maintenance' | 'security' | 'other';
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
  tags: string[];
  viewCount?: number;
}

export interface Announcement extends AnnouncementData {
  url: string;
  editUrl: string;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  excerpt?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  category?: 'notice' | 'update' | 'maintenance' | 'security' | 'other';
  tags?: string[];
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {}

/**
 * AnnouncementManager class
 * 
 * Uses GitHub Releases as storage backend
 * No authentication required (public API)
 */
export class AnnouncementManager {
  private owner: string;
  private repo: string;
  private apiBase = 'https://api.github.com';

  constructor(owner: string, domain: string) {
    this.owner = owner;
    this.repo = `announcements-${domain}`;
  }

  /**
   * Parse announcement metadata from release
   */
  private parseMetadata(body: string): {
    metadata: Record<string, string>;
    content: string;
  } {
    const metadataMatch = body.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!metadataMatch) {
      return {
        metadata: {},
        content: body,
      };
    }

    const metadataStr = metadataMatch[1];
    const content = metadataMatch[2];
    const metadata: Record<string, string> = {};

    metadataStr.split('\n').forEach((line) => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(':').trim();
      }
    });

    return { metadata, content };
  }

  /**
   * Convert GitHub Release to Announcement
   */
  private releaseToAnnouncement(release: any): Announcement {
    const { metadata, content } = this.parseMetadata(release.body || '');

    const tags = metadata.tags ? metadata.tags.split(',').map((t) => t.trim()) : [];
    const priority = (metadata.priority || 'normal') as AnnouncementData['priority'];
    const category = (metadata.category || 'notice') as AnnouncementData['category'];

    return {
      id: release.id.toString(),
      title: release.name,
      content,
      excerpt: metadata.excerpt,
      author: release.author
        ? {
            name: release.author.login,
            avatar: release.author.avatar_url,
          }
        : undefined,
      priority,
      category,
      createdAt: new Date(release.created_at),
      updatedAt: new Date(release.updated_at),
      publishedAt: new Date(release.published_at),
      tags,
      viewCount: parseInt(metadata.viewCount || '0'),
      url: release.html_url,
      editUrl: `${release.html_url}/edit`,
    };
  }

  /**
   * Create announcement metadata string
   */
  private createMetadataString(input: CreateAnnouncementInput): string {
    const metadata = {
      priority: input.priority || 'normal',
      category: input.category || 'notice',
      tags: input.tags?.join(',') || '',
      excerpt: input.excerpt || '',
      viewCount: '0',
    };

    let metadataStr = '---\n';
    metadataStr += Object.entries(metadata)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    metadataStr += '\n---\n';

    return metadataStr + input.content;
  }

  /**
   * Ensure repository exists
   */
  private async ensureRepoExists(): Promise<void> {
    try {
      await fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}`);
    } catch {
      throw new Error(
        `Repository ${this.owner}/${this.repo} not found. Please create it first.`
      );
    }
  }

  /**
   * Get all announcements
   */
  async getAll(options?: { limit?: number; page?: number }): Promise<Announcement[]> {
    const limit = options?.limit || 30;
    const page = options?.page || 1;

    try {
      const response = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/releases?per_page=${limit}&page=${page}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch announcements: ${response.statusText}`);
      }

      const releases = await response.json();
      return releases.map((release: any) => this.releaseToAnnouncement(release));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  }

  /**
   * Get announcement by ID
   */
  async getById(id: string): Promise<Announcement | null> {
    try {
      const response = await fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}/releases/${id}`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const release = await response.json();
      return this.releaseToAnnouncement(release);
    } catch (error) {
      console.error('Error fetching announcement:', error);
      return null;
    }
  }

  /**
   * Get announcements by category
   */
  async getByCategory(
    category: AnnouncementData['category'],
    options?: { limit?: number; page?: number }
  ): Promise<Announcement[]> {
    const announcements = await this.getAll(options);
    return announcements.filter((a) => a.category === category);
  }

  /**
   * Get announcements by priority
   */
  async getByPriority(
    priority: AnnouncementData['priority'],
    options?: { limit?: number; page?: number }
  ): Promise<Announcement[]> {
    const announcements = await this.getAll(options);
    return announcements.filter((a) => a.priority === priority);
  }

  /**
   * Search announcements by title or content
   */
  async search(query: string): Promise<Announcement[]> {
    const announcements = await this.getAll({ limit: 100 });
    const lowerQuery = query.toLowerCase();

    return announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(lowerQuery) ||
        a.content.toLowerCase().includes(lowerQuery) ||
        a.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get featured announcements (high/critical priority)
   */
  async getFeatured(limit: number = 5): Promise<Announcement[]> {
    const announcements = await this.getAll({ limit: 50 });
    return announcements
      .filter((a) => a.priority === 'high' || a.priority === 'critical')
      .slice(0, limit);
  }

  /**
   * Create announcement (admin only)
   */
  async create(input: CreateAnnouncementInput, authToken: string): Promise<Announcement> {
    const response = await fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `token ${authToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        tag_name: `announcement-${Date.now()}`,
        name: input.title,
        body: this.createMetadataString(input),
        draft: false,
        prerelease: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create announcement: ${response.statusText}`);
    }

    const release = await response.json();
    return this.releaseToAnnouncement(release);
  }

  /**
   * Update announcement (admin only)
   */
  async update(
    id: string,
    input: UpdateAnnouncementInput,
    authToken: string
  ): Promise<Announcement> {
    const current = await this.getById(id);
    if (!current) {
      throw new Error(`Announcement ${id} not found`);
    }

    const merged = {
      title: input.title || current.title,
      content: input.content || current.content,
      excerpt: input.excerpt || current.excerpt,
      priority: input.priority || current.priority,
      category: input.category || current.category,
      tags: input.tags || current.tags,
    };

    const response = await fetch(
      `${this.apiBase}/repos/${this.owner}/${this.repo}/releases/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `token ${authToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          name: merged.title,
          body: this.createMetadataString(merged),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update announcement: ${response.statusText}`);
    }

    const release = await response.json();
    return this.releaseToAnnouncement(release);
  }

  /**
   * Delete announcement (admin only)
   */
  async delete(id: string, authToken: string): Promise<void> {
    const response = await fetch(
      `${this.apiBase}/repos/${this.owner}/${this.repo}/releases/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `token ${authToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to delete announcement: ${response.statusText}`);
    }
  }

  /**
   * Get announcement statistics
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const announcements = await this.getAll({ limit: 100 });

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    announcements.forEach((a) => {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      byPriority[a.priority] = (byPriority[a.priority] || 0) + 1;
    });

    return {
      total: announcements.length,
      byCategory,
      byPriority,
    };
  }
}
