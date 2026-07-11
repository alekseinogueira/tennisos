// supabase/functions/_shared/coach-auth.ts
//
// Shared guard for coach-facing Edge Functions (Fase F2). A request is
// authorized when EITHER:
//   (a) it carries the service-role key (server-to-server — the n8n "Supabase
//       Service" credential sends it as both apikey and Authorization), OR
//   (b) it carries a valid Supabase user JWT whose profiles.role is
//       coach/admin (the portal's supabase.functions.invoke() attaches the
//       signed-in coach's access token).
// Anything else → not authorized. SUPABASE_URL / SUPABASE_ANON_KEY /
// SUPABASE_SERVICE_ROLE_KEY are injected automatically by the Edge runtime.

export async function isCoachOrService(req: Request): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return false;

  const apikeyHeader = req.headers.get("apikey") ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );

  // (a) server-to-server with the service-role key.
  if (apikeyHeader === serviceKey || bearer === serviceKey) return true;

  // (b) a user JWT — resolve the user, then check their role.
  if (!bearer || !anonKey || bearer === anonKey) return false;

  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${bearer}` },
  });
  if (!userRes.ok) return false;
  const user = await userRes.json().catch(() => null);
  const userId: string | undefined = user?.id;
  if (!userId) return false;

  const profileRes = await fetch(
    `${url}/rest/v1/profiles?id=eq.${userId}&select=role`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );
  if (!profileRes.ok) return false;
  const rows = await profileRes.json().catch(() => []);
  const role = Array.isArray(rows) ? rows[0]?.role : undefined;
  return role === "coach" || role === "admin";
}
