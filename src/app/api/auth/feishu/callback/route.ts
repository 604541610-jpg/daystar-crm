import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  CrmSession,
  feishuStateCookie,
  getBaseUrl,
  getFeishuBaseUrl,
  getRequiredEnv,
  isAllowedUser,
  signSession,
} from "../config";
import { clearAuthCookies, setSessionCookie } from "../route-utils";

type FeishuResponse<T> = {
  code: number;
  msg?: string;
  data?: T;
};

type AppAccessTokenData = {
  app_access_token: string;
};

type AppAccessTokenResponse = FeishuResponse<AppAccessTokenData> &
  AppAccessTokenData;

type UserAccessTokenData = {
  access_token: string;
  avatar_url?: string;
  email?: string;
  en_name?: string;
  name?: string;
  open_id: string;
  tenant_key?: string;
  union_id?: string;
};

type TeamRole = "admin" | "manager" | "staff";

async function feishuPost<T>(
  path: string,
  body: Record<string, string>,
  token?: string,
) {
  const response = await fetch(`${getFeishuBaseUrl()}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    method: "POST",
  });
  const data = (await response.json()) as FeishuResponse<T>;

  if (!response.ok || data.code !== 0 || !data.data) {
    throw new Error(data.msg || "飞书登录失败。");
  }

  return data.data;
}

async function getAppAccessToken() {
  const response = await fetch(
    `${getFeishuBaseUrl()}/open-apis/auth/v3/app_access_token/internal`,
    {
      body: JSON.stringify({
        app_id: getRequiredEnv("FEISHU_APP_ID"),
        app_secret: getRequiredEnv("FEISHU_APP_SECRET"),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const data = (await response.json()) as AppAccessTokenResponse;

  if (!response.ok || data.code !== 0 || !data.app_access_token) {
    throw new Error(data.msg || "无法获取飞书应用凭证。");
  }

  return data.app_access_token;
}

async function getUserAccessToken(code: string, appAccessToken: string) {
  const data = await feishuPost<UserAccessTokenData>(
    "/open-apis/authen/v1/access_token",
    {
      code,
      grant_type: "authorization_code",
    },
    appAccessToken,
  );

  return data;
}

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return null;
  }

  return { key, url };
}

function getInitialRole(user: UserAccessTokenData): TeamRole {
  const adminNames = (process.env.CRM_ADMIN_NAMES || "Jay")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const adminEmails = (process.env.CRM_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const name = user.name || user.en_name || "";
  const email = user.email?.toLowerCase() || "";

  if (adminNames.includes(name) || (email && adminEmails.includes(email))) {
    return "admin";
  }

  return "staff";
}

async function syncTeamMember(user: UserAccessTokenData) {
  const config = getSupabaseAdminConfig();
  const id = user.union_id || user.open_id;

  if (!config || !id) {
    return getInitialRole(user);
  }

  const headers = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    "Content-Type": "application/json",
  };
  const existing = await fetch(
    `${config.url}/rest/v1/team_members?id=eq.${encodeURIComponent(id)}&select=role`,
    { headers },
  );
  let role = getInitialRole(user);

  if (existing.ok) {
    const rows = (await existing.json()) as { role?: TeamRole }[];
    role = rows[0]?.role || role;
  }

  const response = await fetch(`${config.url}/rest/v1/team_members?on_conflict=id`, {
    body: JSON.stringify({
      avatar_url: user.avatar_url || null,
      email: user.email || null,
      full_name: user.name || user.en_name || user.email || "Feishu User",
      id,
      last_seen_at: new Date().toISOString(),
      role,
      status: "online",
      tenant_key: user.tenant_key || null,
    }),
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    method: "POST",
  });

  if (!response.ok) {
    return role;
  }

  return role;
}

export async function GET(request: NextRequest) {
  const target = new URL("/crm", getBaseUrl());

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = (await cookies()).get(feishuStateCookie)?.value;

    if (!code || !state || !storedState || state !== storedState) {
      throw new Error("飞书登录校验失败，请重新登录。");
    }

    const appAccessToken = await getAppAccessToken();
    const user = await getUserAccessToken(code, appAccessToken);

    if (!isAllowedUser(user)) {
      throw new Error("该飞书账号未被允许访问 CRM。");
    }

    const role = await syncTeamMember(user);
    const session: CrmSession = {
      accessToken: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
      email: user.email || `${user.open_id}@feishu.local`,
      fullName: user.name || user.en_name || user.email || "Feishu User",
      role,
      userId: user.union_id || user.open_id,
    };
    const response = NextResponse.redirect(target);

    setSessionCookie(response, signSession(session));
    return response;
  } catch (error) {
    target.searchParams.set(
      "error",
      error instanceof Error ? error.message : "飞书登录失败。",
    );

    const response = NextResponse.redirect(target);
    clearAuthCookies(response);
    return response;
  }
}
