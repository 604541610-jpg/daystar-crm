import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { crmSessionCookie, verifySession } from "../../auth/feishu/config";

type ProxyPayload = {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
  path?: string;
};

const allowedPaths = ["/rest/v1/customers", "/rest/v1/customer_ad_accounts"];

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("缺少 Supabase 后台环境配置。");
  }

  return { key, url };
}

function isAllowedPath(path: string) {
  return allowedPaths.some((item) => path.startsWith(item));
}

export async function POST(request: NextRequest) {
  const session = verifySession((await cookies()).get(crmSessionCookie)?.value);

  if (!session) {
    return NextResponse.json({ message: "请先使用飞书登录。" }, { status: 401 });
  }

  const payload = (await request.json()) as ProxyPayload;
  const path = payload.path || "";
  const method = (payload.method || "GET").toUpperCase();

  if (!isAllowedPath(path)) {
    return NextResponse.json({ message: "不允许访问该数据接口。" }, { status: 403 });
  }

  const { key, url } = getSupabaseAdminConfig();
  const response = await fetch(`${url}${path}`, {
    body: payload.body,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(payload.headers?.Prefer ? { Prefer: payload.headers.Prefer } : {}),
    },
    method,
  });
  const body = await response.text();

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json; charset=utf-8",
    },
    status: response.status,
  });
}
