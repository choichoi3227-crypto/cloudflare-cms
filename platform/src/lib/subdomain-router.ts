/**
 * Subdomain-based routing utility
 * 
 * Domain Structure:
 * - Public: @ (example.com)
 * - SSO: sso.{domain} (sso.example.com)
 * - Console: console.{domain} (console.example.com)
 * - Admin: adm-console.{domain} (adm-console.example.com)
 */

export interface DomainConfig {
  type: 'public' | 'sso' | 'console' | 'admin';
  subdomain: string | null;
  domain: string;
  host: string;
}

export interface RouteContext {
  config: DomainConfig;
  basePath: string;
  apiPrefix: string;
  layout: string;
}

/**
 * Parse Host header and determine routing context
 */
export function parseDomainConfig(hostHeader: string): DomainConfig {
  if (!hostHeader) {
    throw new Error('Host header is required');
  }

  // Remove port if present
  const host = hostHeader.split(':')[0];
  const parts = host.split('.');

  // Handle different subdomain patterns
  let type: 'public' | 'sso' | 'console' | 'admin' = 'public';
  let subdomain: string | null = null;
  let domain = host;

  if (parts.length >= 3) {
    // Has subdomain(s)
    const possibleSubdomain = parts[0];

    if (possibleSubdomain === 'sso') {
      type = 'sso';
      domain = parts.slice(1).join('.');
      subdomain = 'sso';
    } else if (possibleSubdomain === 'console') {
      type = 'console';
      domain = parts.slice(1).join('.');
      subdomain = 'console';
    } else if (possibleSubdomain === 'adm-console') {
      type = 'admin';
      domain = parts.slice(1).join('.');
      subdomain = 'adm-console';
    }
  }

  return {
    type,
    subdomain,
    domain,
    host,
  };
}

/**
 * Get routing context based on domain config
 */
export function getRouteContext(config: DomainConfig): RouteContext {
  const contexts = {
    public: {
      basePath: '/',
      apiPrefix: '/api',
      layout: 'PublicLayout',
    },
    sso: {
      basePath: '/',
      apiPrefix: '/api/sso',
      layout: 'SSOLayout',
    },
    console: {
      basePath: '/',
      apiPrefix: '/api/console',
      layout: 'ConsoleLayout',
    },
    admin: {
      basePath: '/',
      apiPrefix: '/api/admin',
      layout: 'AdminLayout',
    },
  };

  return {
    config,
    ...contexts[config.type],
  };
}

/**
 * Check if current domain requires authentication
 */
export function requiresAuth(type: 'public' | 'sso' | 'console' | 'admin'): boolean {
  return type === 'console' || type === 'admin';
}

/**
 * Check if current domain is admin area
 */
export function isAdminArea(type: 'public' | 'sso' | 'console' | 'admin'): boolean {
  return type === 'admin';
}

/**
 * Construct URL for different subdomains
 */
export function getSubdomainUrl(
  baseDomain: string,
  subdomain: 'public' | 'sso' | 'console' | 'admin',
  path: string = '/'
): string {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  
  if (subdomain === 'public') {
    return `${protocol}//${baseDomain}${path}`;
  } else if (subdomain === 'admin') {
    return `${protocol}//adm-console.${baseDomain}${path}`;
  } else {
    return `${protocol}//${subdomain}.${baseDomain}${path}`;
  }
}

/**
 * Extract domain from current location
 */
export function getCurrentDomain(): string {
  if (typeof window === 'undefined') return '';
  
  const host = window.location.hostname;
  const parts = host.split('.');
  
  // Remove subdomain (first part if exists)
  if (parts.length > 2) {
    return parts.slice(1).join('.');
  }
  
  return host;
}

/**
 * Extract subdomain from current location
 */
export function getCurrentSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  
  const host = window.location.hostname;
  const parts = host.split('.');
  
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (['sso', 'console', 'adm-console'].includes(subdomain)) {
      return subdomain;
    }
  }
  
  return null;
}

/**
 * Navigation helper for subdomain URLs
 */
export class SubdomainNavigator {
  private baseDomain: string;

  constructor(baseDomain: string) {
    this.baseDomain = baseDomain;
  }

  toPublic(path: string = '/'): string {
    return getSubdomainUrl(this.baseDomain, 'public', path);
  }

  toSSO(path: string = '/'): string {
    return getSubdomainUrl(this.baseDomain, 'sso', path);
  }

  toConsole(path: string = '/'): string {
    return getSubdomainUrl(this.baseDomain, 'console', path);
  }

  toAdmin(path: string = '/'): string {
    return getSubdomainUrl(this.baseDomain, 'admin', path);
  }

  navigate(subdomain: 'public' | 'sso' | 'console' | 'admin', path: string = '/'): void {
    window.location.href = getSubdomainUrl(this.baseDomain, subdomain, path);
  }
}
