// platform/src/lib/cloudflare-oauth.ts
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code', client_id: import.meta.env.OAUTH_CLIENT_ID,
    redirect_uri: import.meta.env.OAUTH_REDIRECT_URI, scope: 'account:read', state,
  });
  return `https://dash.cloudflare.com/oauth2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const response = await fetch('https://dash.cloudflare.com/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type:'authorization_code', code, client_id:import.meta.env.OAUTH_CLIENT_ID, client_secret:import.meta.env.OAUTH_CLIENT_SECRET, redirect_uri:import.meta.env.OAUTH_REDIRECT_URI }),
  });
  if (!response.ok) throw new Error(`OAuth token exchange failed: ${response.statusText}`);
  return response.json();
}

export async function getCloudflareUser(accessToken: string) {
  const response = await fetch('https://api.cloudflare.com/client/v4/user', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error(`Failed to fetch Cloudflare user: ${response.statusText}`);
  const data = await response.json() as { result: { id: string; email: string; name: string; avatar_url: string } };
  return data.result;
}
