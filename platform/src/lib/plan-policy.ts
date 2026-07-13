/**
 * Plan Policy Manager
 * Manages hosting-level (not account-level) plan features and limits
 * All plans have identical specs - no differentiation
 */

export type PlanType = 'free' | 'pro' | 'business' | 'enterprise';

export interface PlanPolicy {
  planId: string;
  planType: PlanType;
  hostingId: string; // Per-hosting basis, not per-account
  features: {
    // Storage & Database
    storageLimit: 'unlimited';
    databaseLimit: 'unlimited';
    backupsRetention: 'unlimited'; // days
    
    // Traffic & Performance
    trafficLimit: 'unlimited'; // bandwidth
    requestsPerMonth: 'unlimited';
    cdnIncluded: true;
    wafIncluded: true;
    ddosProtectionIncluded: true;
    
    // WordPress Features
    wordPressVersions: 'all';
    pluginCount: 'unlimited';
    themeCount: 'unlimited';
    customPluginsAllowed: true;
    
    // Performance
    cachingEnabled: true;
    wpRocketEnabled: true;
    edgeCachingEnabled: true;
    criticaCSSOptimization: true;
    imageOptimization: true;
    
    // Security
    sslCertificate: 'free' | 'paid'; // Let's Encrypt always free
    advancedSecurityRules: true;
    malwareScanning: true;
    automaticBackups: 'daily' | 'hourly';
    
    // Support
    supportLevel: 'community' | 'email' | 'priority';
    responseTimeTarget: number; // hours
  };
  limits: {
    maxWordPressSites: 'unlimited';
    maxDomains: 'unlimited';
    maxUsers: 'unlimited';
    maxApiRequests: 'unlimited';
    maxStorageGB: 'unlimited';
    maxBandwidthGB: 'unlimited';
  };
  pricing: {
    monthlyUSD: number;
    annualUSD?: number;
    setupFeeUSD: number;
    includesMonths: number; // billing cycle
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    activeFrom: string;
    activeTo?: string;
    status: 'active' | 'cancelled' | 'suspended';
    billingCycle: 'monthly' | 'annual';
    autoRenew: boolean;
  };
}

export interface HostingUsage {
  hostingId: string;
  currentPlanType: PlanType;
  usageStats: {
    wordPressSitesCount: number;
    totalStorageUsedBytes: number;
    totalBandwidthUsedGB: number;
    apiRequestsThisMonth: number;
    activeUsersCount: number;
  };
  usagePercent: {
    storage: number; // Always 0 since unlimited
    bandwidth: number;
    apiRequests: number;
  };
  metrics: {
    avgResponseTime: number; // ms
    cacheHitRate: number; // percentage
    uptime: number; // percentage
    totalRequests: number;
  };
}

export interface PlanFeatureAccess {
  canCreateWordPressSites: boolean;
  canAddDomains: boolean;
  canUseAdvancedCaching: boolean;
  canUseWAF: boolean;
  canUseDDosProtection: boolean;
  canUseCustomPlugins: boolean;
  canAccessAnalytics: boolean;
  canUseAPI: boolean;
  canHaveMultipleUsers: boolean;
  canSetupSSL: boolean;
  supportChannels: ('email' | 'chat' | 'phone')[];
}

class PlanPolicyManager {
  private hostingId: string;
  private currentPlan: PlanPolicy | null = null;

  constructor(hostingId: string) {
    this.hostingId = hostingId;
  }

  /**
   * Get or create default plan for hosting
   * All plans are identical - no differentiation
   */
  async getPlan(): Promise<PlanPolicy> {
    if (this.currentPlan) return this.currentPlan;

    // Load from database or create default
    const plan: PlanPolicy = {
      planId: `plan-${this.hostingId}-unlimited`,
      planType: 'business', // All equal, so use 'business' as default
      hostingId: this.hostingId,
      features: {
        // All plans identical
        storageLimit: 'unlimited',
        databaseLimit: 'unlimited',
        backupsRetention: 'unlimited',
        trafficLimit: 'unlimited',
        requestsPerMonth: 'unlimited',
        cdnIncluded: true,
        wafIncluded: true,
        ddosProtectionIncluded: true,
        wordPressVersions: 'all',
        pluginCount: 'unlimited',
        themeCount: 'unlimited',
        customPluginsAllowed: true,
        cachingEnabled: true,
        wpRocketEnabled: true,
        edgeCachingEnabled: true,
        criticaCSSOptimization: true,
        imageOptimization: true,
        sslCertificate: 'free',
        advancedSecurityRules: true,
        malwareScanning: true,
        automaticBackups: 'hourly',
        supportLevel: 'priority',
        responseTimeTarget: 1, // hour
      },
      limits: {
        maxWordPressSites: 'unlimited',
        maxDomains: 'unlimited',
        maxUsers: 'unlimited',
        maxApiRequests: 'unlimited',
        maxStorageGB: 'unlimited',
        maxBandwidthGB: 'unlimited',
      },
      pricing: {
        monthlyUSD: 0, // Free tier by default
        annualUSD: 0,
        setupFeeUSD: 0,
        includesMonths: 1,
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeFrom: new Date().toISOString(),
        status: 'active',
        billingCycle: 'monthly',
        autoRenew: false,
      },
    };

    this.currentPlan = plan;
    return plan;
  }

  /**
   * Check if feature is available in plan
   */
  async hasFeature(feature: keyof PlanPolicy['features']): Promise<boolean> {
    const plan = await this.getPlan();
    const featureValue = plan.features[feature];
    
    // All features are available/true in all plans
    if (typeof featureValue === 'boolean') return featureValue;
    if (featureValue === 'unlimited') return true;
    if (featureValue === 'all') return true;
    if (featureValue === true) return true;
    
    return false;
  }

  /**
   * Get feature access details for hosting
   */
  async getFeatureAccess(): Promise<PlanFeatureAccess> {
    const plan = await this.getPlan();

    return {
      canCreateWordPressSites: true,
      canAddDomains: true,
      canUseAdvancedCaching: plan.features.cachingEnabled,
      canUseWAF: plan.features.wafIncluded,
      canUseDDosProtection: plan.features.ddosProtectionIncluded,
      canUseCustomPlugins: plan.features.customPluginsAllowed,
      canAccessAnalytics: true,
      canUseAPI: true,
      canHaveMultipleUsers: true,
      canSetupSSL: true,
      supportChannels: ['email', 'chat'],
    };
  }

  /**
   * Get current usage against plan limits
   */
  async getUsage(): Promise<HostingUsage> {
    const plan = await this.getPlan();

    return {
      hostingId: this.hostingId,
      currentPlanType: plan.planType,
      usageStats: {
        wordPressSitesCount: 0, // Would load from database
        totalStorageUsedBytes: 0,
        totalBandwidthUsedGB: 0,
        apiRequestsThisMonth: 0,
        activeUsersCount: 0,
      },
      usagePercent: {
        storage: 0, // Always 0 since unlimited
        bandwidth: 0,
        apiRequests: 0,
      },
      metrics: {
        avgResponseTime: 45,
        cacheHitRate: 85,
        uptime: 99.99,
        totalRequests: 0,
      },
    };
  }

  /**
   * Get all available plans (they're all identical)
   */
  async getAvailablePlans(): Promise<PlanPolicy[]> {
    const basePlan = await this.getPlan();

    // Return same plan for all tiers - no differentiation
    return [
      { ...basePlan, planType: 'free', pricing: { monthlyUSD: 0, setupFeeUSD: 0, includesMonths: 1 } },
      { ...basePlan, planType: 'pro', pricing: { monthlyUSD: 0, setupFeeUSD: 0, includesMonths: 1 } },
      { ...basePlan, planType: 'business', pricing: { monthlyUSD: 0, setupFeeUSD: 0, includesMonths: 1 } },
      { ...basePlan, planType: 'enterprise', pricing: { monthlyUSD: 0, setupFeeUSD: 0, includesMonths: 1 } },
    ];
  }

  /**
   * Validate action against plan limits
   */
  async canPerformAction(action: string, params?: Record<string, any>): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const plan = await this.getPlan();

    // All actions allowed on all plans
    switch (action) {
      case 'create_wordpress_site':
        return { allowed: true };
      case 'add_domain':
        return { allowed: true };
      case 'install_plugin':
        return { allowed: plan.features.customPluginsAllowed };
      case 'enable_waf':
        return { allowed: plan.features.wafIncluded };
      case 'enable_ddos_protection':
        return { allowed: plan.features.ddosProtectionIncluded };
      case 'api_request':
        return { allowed: true };
      default:
        return { allowed: true };
    }
  }

  /**
   * Upgrade hosting plan (but all plans are identical, so this is a no-op)
   */
  async upgradePlan(newPlanType: PlanType): Promise<PlanPolicy> {
    // Since all plans are identical, just return current plan
    // This is mainly for UI/UX consistency
    return this.getPlan();
  }
}

export default PlanPolicyManager;
