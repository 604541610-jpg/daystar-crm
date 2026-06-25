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

    const session: CrmSession = {
      accessToken: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
      email: user.email || `${user.open_id}@feishu.local`,
      fullName: user.name || user.en_name || user.email || "Feishu User",
      userId: process.env.CRM_SUPABASE_OWNER_ID || user.union_id || user.open_id,
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
