export type WordPressAssetType = 'plugin' | 'theme';

export interface WordPressAssetSummary {
  slug: string;
  name: string;
  version: string;
  author?: string;
  homepage?: string;
  downloadUrl?: string;
  requires?: string;
  tested?: string;
  rating?: number;
  numRatings?: number;
  description?: string;
}

interface WordPressPluginApiItem {
  slug: string;
  name: string;
  version: string;
  author?: string;
  homepage?: string;
  download_link?: string;
  requires?: string;
  tested?: string;
  rating?: number;
  num_ratings?: number;
  short_description?: string;
}

interface WordPressThemeApiItem {
  slug: string;
  name: string;
  version: string;
  author?: { display_name?: string } | string;
  homepage?: string;
  download_link?: string;
  requires?: string;
  tested?: string;
  rating?: number;
  num_ratings?: number;
  description?: string;
}

export class WordPressMarketplaceService {
  async search(type: WordPressAssetType, query: string, page = 1, perPage = 24): Promise<{ items: WordPressAssetSummary[]; page: number; totalPages: number }> {
    if (type === 'plugin') return this.searchPlugins(query, page, perPage);
    return this.searchThemes(query, page, perPage);
  }

  private async searchPlugins(query: string, page: number, perPage: number) {
    const body = new URLSearchParams();
    body.set('action', 'query_plugins');
    body.set('request[search]', query);
    body.set('request[page]', String(page));
    body.set('request[per_page]', String(perPage));
    body.set('request[fields][short_description]', '1');
    body.set('request[fields][downloadlink]', '1');

    const res = await fetch('https://api.wordpress.org/plugins/info/1.2/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`WordPress plugin API failed: ${res.status}`);
    const data = await res.json() as { plugins?: WordPressPluginApiItem[]; info?: { page?: number; pages?: number } };

    return {
      items: (data.plugins || []).map(plugin => ({
        slug: plugin.slug,
        name: stripHtml(plugin.name),
        version: plugin.version,
        author: plugin.author ? stripHtml(plugin.author) : undefined,
        homepage: plugin.homepage,
        downloadUrl: plugin.download_link,
        requires: plugin.requires,
        tested: plugin.tested,
        rating: plugin.rating,
        numRatings: plugin.num_ratings,
        description: plugin.short_description ? stripHtml(plugin.short_description) : undefined,
      })),
      page: data.info?.page || page,
      totalPages: data.info?.pages || 1,
    };
  }

  private async searchThemes(query: string, page: number, perPage: number) {
    const body = new URLSearchParams();
    body.set('action', 'query_themes');
    body.set('request[search]', query);
    body.set('request[page]', String(page));
    body.set('request[per_page]', String(perPage));
    body.set('request[fields][description]', '1');
    body.set('request[fields][downloadlink]', '1');

    const res = await fetch('https://api.wordpress.org/themes/info/1.2/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`WordPress theme API failed: ${res.status}`);
    const data = await res.json() as { themes?: WordPressThemeApiItem[]; info?: { page?: number; pages?: number } };

    return {
      items: (data.themes || []).map(theme => ({
        slug: theme.slug,
        name: stripHtml(theme.name),
        version: theme.version,
        author: typeof theme.author === 'string' ? stripHtml(theme.author) : theme.author?.display_name,
        homepage: theme.homepage,
        downloadUrl: theme.download_link,
        requires: theme.requires,
        tested: theme.tested,
        rating: theme.rating,
        numRatings: theme.num_ratings,
        description: theme.description ? stripHtml(theme.description) : undefined,
      })),
      page: data.info?.page || page,
      totalPages: data.info?.pages || 1,
    };
  }
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}
