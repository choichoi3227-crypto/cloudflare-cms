// platform/src/pages/api/hosting/[id]/plan.ts
import type { APIRoute } from 'astro';
import { parseSessionCookie } from '@lib/session';
import PlanPolicyManager from '@lib/plan-policy';

export const GET: APIRoute = async (context) => {
  const { id } = context.params;
  
  try {
    const session = parseSessionCookie(context.request.headers.get('cookie'));
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const planManager = new PlanPolicyManager(id as string);
    const plan = await planManager.getPlan();
    const usage = await planManager.getUsage();
    const features = await planManager.getFeatureAccess();

    return new Response(JSON.stringify({
      success: true,
      data: { plan, usage, features },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get plan error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch plan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async (context) => {
  const { id } = context.params;
  
  try {
    const session = parseSessionCookie(context.request.headers.get('cookie'));
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = (await context.request.json()) as any;
    const planManager = new PlanPolicyManager(id as string);
    
    // All plans are identical, so upgrade is a no-op
    const upgradedPlan = await planManager.upgradePlan(data.planType);

    return new Response(JSON.stringify({
      success: true,
      message: '플랜 정책이 적용되었습니다.',
      plan: upgradedPlan,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upgrade plan error:', error);
    return new Response(JSON.stringify({ error: 'Failed to upgrade plan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
