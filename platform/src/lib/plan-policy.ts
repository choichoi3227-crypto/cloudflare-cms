/**
 * Paid hosting-level plan policy.
 * Billing is always per hosting/site, never per account.
 */

export type PlanType = 'lite' | 'standard' | 'smart' | 'intelligent';
export type LoadBalancingLevel = 'single' | 'basic' | 'smart' | 'intelligent';

export interface PlanDefinition {
  planType: PlanType;
  name: string;
  slug: string;
  monthlyKRW: number;
  monthlyUSD: number;
  loadBalancingLevel: LoadBalancingLevel;
  loadBalancingDescription: string;
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  { planType: 'lite', name: '라이트 플랜', slug: 'lite', monthlyKRW: 9900, monthlyUSD: 7.5, loadBalancingLevel: 'single', loadBalancingDescription: '단일 호스팅 워커에 CPU 런타임 보호를 적용합니다.' },
  { planType: 'standard', name: '스탠다드 플랜', slug: 'standard', monthlyKRW: 19900, monthlyUSD: 15, loadBalancingLevel: 'basic', loadBalancingDescription: '트래픽 급증 시 예비 워커를 자동 등록합니다.' },
  { planType: 'smart', name: '스마트 플랜', slug: 'smart', monthlyKRW: 34900, monthlyUSD: 26, loadBalancingLevel: 'smart', loadBalancingDescription: '실시간 부하 지표 기반 스마트 분산 워커를 운영합니다.' },
  { planType: 'intelligent', name: '인텔리전트 플랜', slug: 'intelligent', monthlyKRW: 59000, monthlyUSD: 44, loadBalancingLevel: 'intelligent', loadBalancingDescription: '예측형 분산, 워커 웜업, 과부하 원천 차단 정책을 적용합니다.' },
];

export const COMMON_PLAN_FEATURES = [
  '트래픽 무제한',
  '스토리지/DB/호스팅/WordPress 통합 관리',
  '커스터마이징, DB 관리, FTP 관리 전면 제공',
  '전체 기본 플러그인 제공',
  'CPU 런타임 보호 및 과부하 원천 방지',
  'Cloudflare Workflow 기본 제공(예약 발행 포함)',
  'WAF 및 DDoS 방어',
  'GitHub Releases 관리자 계정 저장소 연동',
];

export interface PlanPolicy {
  planId: string;
  planType: PlanType;
  hostingId: string;
  billingScope: 'hosting';
  features: {
    trafficLimit: 'unlimited';
    storageLimit: 'unlimited';
    databaseLimit: 'unlimited';
    customizationManagement: true;
    databaseManagement: true;
    ftpManagement: true;
    bundledPluginsIncluded: true;
    cpuRuntimeProtection: true;
    overloadPrevention: true;
    cloudflareWorkflowIncluded: true;
    scheduledPublishing: true;
    wafIncluded: true;
    ddosProtectionIncluded: true;
    githubReleaseAdminStorage: true;
    workerLoadBalancing: LoadBalancingLevel;
  };
  pricing: {
    monthlyKRW: number;
    monthlyUSD: number;
    setupFeeUSD: 0;
    billingCycle: 'monthly';
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'cancelled' | 'suspended';
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
    activeUsersCount: number;
  };
  metrics: {
    avgResponseTime: number;
    cacheHitRate: number;
    uptime: number;
    totalRequests: number;
    cpuOverloadPrevented: boolean;
  };
}

export interface PlanFeatureAccess {
  canCreateWordPressSites: boolean;
  canAddDomains: boolean;
  canUseWAF: boolean;
  canUseDDosProtection: boolean;
  canUseCustomPlugins: boolean;
  canManageDatabase: boolean;
  canManageFtp: boolean;
  canUseWorkflow: boolean;
  workerLoadBalancing: LoadBalancingLevel;
  supportChannels: ('email' | 'chat')[];
}

export function getPlanDefinition(planType: PlanType): PlanDefinition {
  return PLAN_DEFINITIONS.find((plan) => plan.planType === planType) ?? PLAN_DEFINITIONS[0];
}

export function planTypeFromSlug(slug: string): PlanType | null {
  return PLAN_DEFINITIONS.find((plan) => plan.slug === slug || plan.planType === slug)?.planType ?? null;
}

class PlanPolicyManager {
  constructor(private hostingId: string, private planType: PlanType = 'lite') {}

  async getPlan(): Promise<PlanPolicy> {
    const definition = getPlanDefinition(this.planType);
    const now = new Date().toISOString();
    return {
      planId: `plan-${this.hostingId}-${definition.slug}`,
      planType: definition.planType,
      hostingId: this.hostingId,
      billingScope: 'hosting',
      features: {
        trafficLimit: 'unlimited',
        storageLimit: 'unlimited',
        databaseLimit: 'unlimited',
        customizationManagement: true,
        databaseManagement: true,
        ftpManagement: true,
        bundledPluginsIncluded: true,
        cpuRuntimeProtection: true,
        overloadPrevention: true,
        cloudflareWorkflowIncluded: true,
        scheduledPublishing: true,
        wafIncluded: true,
        ddosProtectionIncluded: true,
        githubReleaseAdminStorage: true,
        workerLoadBalancing: definition.loadBalancingLevel,
      },
      pricing: { monthlyKRW: definition.monthlyKRW, monthlyUSD: definition.monthlyUSD, setupFeeUSD: 0, billingCycle: 'monthly' },
      metadata: { createdAt: now, updatedAt: now, status: 'active', autoRenew: true },
    };
  }

  async getFeatureAccess(): Promise<PlanFeatureAccess> {
    const plan = await this.getPlan();
    return {
      canCreateWordPressSites: true,
      canAddDomains: true,
      canUseWAF: true,
      canUseDDosProtection: true,
      canUseCustomPlugins: true,
      canManageDatabase: true,
      canManageFtp: true,
      canUseWorkflow: true,
      workerLoadBalancing: plan.features.workerLoadBalancing,
      supportChannels: ['email', 'chat'],
    };
  }

  async getUsage(): Promise<HostingUsage> {
    const plan = await this.getPlan();
    return {
      hostingId: this.hostingId,
      currentPlanType: plan.planType,
      usageStats: { wordPressSitesCount: 1, totalStorageUsedBytes: 0, totalBandwidthUsedGB: 0, activeUsersCount: 1 },
      metrics: { avgResponseTime: 45, cacheHitRate: 85, uptime: 99.99, totalRequests: 0, cpuOverloadPrevented: true },
    };
  }

  async getAvailablePlans(): Promise<PlanPolicy[]> {
    return Promise.all(PLAN_DEFINITIONS.map((plan) => new PlanPolicyManager(this.hostingId, plan.planType).getPlan()));
  }

  async canPerformAction(action: string): Promise<{ allowed: boolean; reason?: string }> {
    if (action === 'create_wordpress_site') {
      return { allowed: true };
    }
    return { allowed: true };
  }

  async upgradePlan(newPlanType: PlanType): Promise<PlanPolicy> {
    this.planType = newPlanType;
    return this.getPlan();
  }
}

export default PlanPolicyManager;
