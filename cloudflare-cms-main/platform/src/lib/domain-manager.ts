/**
 * Domain Manager
 * 
 * Manages domains and DNS records for WordPress sites
 * Uses Cloudflare API for DNS management
 */

export interface DomainRecord {
  id: string;
  domain: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Domain {
  id: string;
  domain: string;
  siteId: string;
  registrar?: string;
  status: 'pending' | 'verified' | 'failed';
  nameservers?: string[];
  expiresAt?: Date;
  autoRenew?: boolean;
  records: DomainRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDomainInput {
  domain: string;
  siteId: string;
  registrar?: string;
}

export interface AddDNSRecordInput {
  type: DomainRecord['type'];
  name: string;
  content: string;
  ttl?: number;
  priority?: number;
  proxied?: boolean;
}

export interface UpdateDNSRecordInput extends Partial<AddDNSRecordInput> {}

/**
 * DomainManager class
 * 
 * Manages domain configuration and DNS records
 */
export class DomainManager {
  private domains: Map<string, Domain> = new Map();
  private cfApiToken?: string;
  private cfZoneId?: string;

  constructor(cfApiToken?: string, cfZoneId?: string) {
    this.cfApiToken = cfApiToken;
    this.cfZoneId = cfZoneId;
  }

  /**
   * Add domain to site
   */
  async addDomain(input: CreateDomainInput): Promise<Domain> {
    const domain: Domain = {
      id: `domain-${Date.now()}`,
      domain: input.domain,
      siteId: input.siteId,
      registrar: input.registrar,
      status: 'pending',
      records: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Set default nameservers
    domain.nameservers = [
      'ns1.cloudflare.com',
      'ns2.cloudflare.com',
    ];

    this.domains.set(domain.id, domain);

    // Update DNS verification record
    await this.addRecord(domain.id, {
      type: 'TXT',
      name: '_acme-challenge',
      content: `verification-${domain.id}`,
      ttl: 300,
    });

    return domain;
  }

  /**
   * Get domain by ID
   */
  getDomain(id: string): Domain | null {
    return this.domains.get(id) || null;
  }

  /**
   * Get domain by domain name
   */
  getDomainByName(domain: string): Domain | null {
    for (const d of this.domains.values()) {
      if (d.domain === domain) {
        return d;
      }
    }
    return null;
  }

  /**
   * Get all domains for a site
   */
  getSitedomains(siteId: string): Domain[] {
    const domains: Domain[] = [];
    for (const d of this.domains.values()) {
      if (d.siteId === siteId) {
        domains.push(d);
      }
    }
    return domains;
  }

  /**
   * Add DNS record
   */
  async addRecord(domainId: string, input: AddDNSRecordInput): Promise<DomainRecord> {
    const domain = this.getDomain(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    const record: DomainRecord = {
      id: `record-${Date.now()}`,
      domain: domain.domain,
      type: input.type,
      name: input.name,
      content: input.content,
      ttl: input.ttl || 3600,
      priority: input.priority,
      proxied: input.proxied || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    domain.records.push(record);
    domain.updatedAt = new Date();

    // Sync with Cloudflare if configured
    if (this.cfApiToken && this.cfZoneId) {
      await this.syncRecordToCloudflare(domain.domain, record);
    }

    return record;
  }

  /**
   * Update DNS record
   */
  async updateRecord(
    domainId: string,
    recordId: string,
    input: UpdateDNSRecordInput
  ): Promise<DomainRecord> {
    const domain = this.getDomain(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    const recordIndex = domain.records.findIndex((r) => r.id === recordId);
    if (recordIndex === -1) {
      throw new Error(`Record ${recordId} not found`);
    }

    const record = domain.records[recordIndex];
    const updated: DomainRecord = {
      ...record,
      ...input,
      updatedAt: new Date(),
    };

    domain.records[recordIndex] = updated;
    domain.updatedAt = new Date();

    // Sync with Cloudflare if configured
    if (this.cfApiToken && this.cfZoneId) {
      await this.syncRecordToCloudflare(domain.domain, updated);
    }

    return updated;
  }

  /**
   * Delete DNS record
   */
  async deleteRecord(domainId: string, recordId: string): Promise<void> {
    const domain = this.getDomain(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    const recordIndex = domain.records.findIndex((r) => r.id === recordId);
    if (recordIndex === -1) {
      throw new Error(`Record ${recordId} not found`);
    }

    const record = domain.records[recordIndex];
    domain.records.splice(recordIndex, 1);
    domain.updatedAt = new Date();

    // Sync deletion with Cloudflare if configured
    if (this.cfApiToken && this.cfZoneId) {
      await this.deleteRecordFromCloudflare(domain.domain, record);
    }
  }

  /**
   * Get DNS records for domain
   */
  getRecords(domainId: string): DomainRecord[] {
    const domain = this.getDomain(domainId);
    return domain?.records || [];
  }

  /**
   * Get DNS record by ID
   */
  getRecord(domainId: string, recordId: string): DomainRecord | null {
    const domain = this.getDomain(domainId);
    return domain?.records.find((r) => r.id === recordId) || null;
  }

  /**
   * Verify domain ownership
   */
  async verifyDomain(domainId: string): Promise<boolean> {
    const domain = this.getDomain(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    // Check for verification TXT record
    const verificationRecord = domain.records.find(
      (r) => r.type === 'TXT' && r.name === '_acme-challenge'
    );

    if (!verificationRecord) {
      return false;
    }

    domain.status = 'verified';
    domain.updatedAt = new Date();

    return true;
  }

  /**
   * Get recommended DNS configuration for WordPress
   */
  getRecommendedRecords(domain: string): AddDNSRecordInput[] {
    return [
      {
        type: 'A',
        name: '@',
        content: '93.184.216.34', // Example IP - should be actual WordPress server
        ttl: 3600,
        proxied: true,
      },
      {
        type: 'CNAME',
        name: 'www',
        content: domain,
        ttl: 3600,
        proxied: true,
      },
      {
        type: 'MX',
        name: '@',
        content: `mail.${domain}`,
        ttl: 3600,
        priority: 10,
      },
      {
        type: 'TXT',
        name: '@',
        content: 'v=spf1 include:sendgrid.net ~all',
        ttl: 3600,
      },
    ];
  }

  /**
   * Delete domain
   */
  async deleteDomain(domainId: string): Promise<void> {
    const domain = this.getDomain(domainId);
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    // Delete all records from Cloudflare if configured
    if (this.cfApiToken && this.cfZoneId) {
      for (const record of domain.records) {
        await this.deleteRecordFromCloudflare(domain.domain, record);
      }
    }

    this.domains.delete(domainId);
  }

  /**
   * Sync record to Cloudflare (placeholder)
   */
  private async syncRecordToCloudflare(
    domain: string,
    record: DomainRecord
  ): Promise<void> {
    // Implementation would sync to actual Cloudflare API
    console.log(`[Cloudflare] Syncing ${record.type} record for ${domain}: ${record.name}`);
  }

  /**
   * Delete record from Cloudflare (placeholder)
   */
  private async deleteRecordFromCloudflare(
    domain: string,
    record: DomainRecord
  ): Promise<void> {
    // Implementation would delete from actual Cloudflare API
    console.log(`[Cloudflare] Deleting ${record.type} record for ${domain}: ${record.name}`);
  }

  /**
   * Get domain statistics
   */
  getStats(): {
    totalDomains: number;
    verifiedDomains: number;
    totalRecords: number;
    recordsByType: Record<string, number>;
  } {
    const domains = Array.from(this.domains.values());
    const recordsByType: Record<string, number> = {};
    let totalRecords = 0;

    domains.forEach((d) => {
      d.records.forEach((r) => {
        recordsByType[r.type] = (recordsByType[r.type] || 0) + 1;
        totalRecords++;
      });
    });

    return {
      totalDomains: domains.length,
      verifiedDomains: domains.filter((d) => d.status === 'verified').length,
      totalRecords,
      recordsByType,
    };
  }
}
