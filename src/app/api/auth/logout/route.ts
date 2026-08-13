import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { crmSessionCookie, verifySession } from "../feishu/config";
import { clearAuthCookies } from "../feishu/route-utils";

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return null;
  }

  return { key, url };
}

async function markOffline(userId: string) {
  const config = getSupabaseAdminConfig();

  if (!config) {
    return;
  }

  await fetch(
    `${config.url}/rest/v1/team_members?id=eq.${encodeURIComponent(userId)}`,
    {
      body: JSON.stringify({ status: "offline" }),
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );
}

export async function POST() {
  const session = verifySession((await cookies()).get(crmSessionCookie)?.value);

  if (session?.userId) {
    await markOffline(session.userId);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
