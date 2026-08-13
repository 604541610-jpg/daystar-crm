import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { CrmSession, crmSessionCookie, verifySession } from "../../auth/feishu/config";

type TeamRole = "admin" | "manager" | "staff";

type TeamMemberRow = {
  avatar_url?: string | null;
  email?: string | null;
  full_name?: string | null;
  id: string;
  last_seen_at?: string | null;
  role: TeamRole;
  status?: "online" | "offline";
  tenant_key?: string | null;
  updated_at?: string | null;
};

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("缺少 Supabase 后台环境配置。");
  }

  return { key, url };
}

async function readSession() {
  return verifySession((await cookies()).get(crmSessionCookie)?.value);
}

function isAdmin(session: CrmSession) {
  return session.role === "admin" || session.fullName === "Jay";
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  const { key, url } = getSupabaseAdminConfig();

  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

async function updateCurrentMember(session: CrmSession) {
  const now = new Date().toISOString();
  const current = await supabaseFetch(
    `/rest/v1/team_members?id=eq.${encodeURIComponent(session.userId)}&select=role`,
  );
  let role = session.role || (session.fullName === "Jay" ? "admin" : "staff");

  if (current.ok) {
    const rows = (await current.json()) as Pick<TeamMemberRow, "role">[];
    role = rows[0]?.role || role;
  }

  await supabaseFetch("/rest/v1/team_members?on_conflict=id", {
    body: JSON.stringify({
      email: session.email,
      full_name: session.fullName,
      id: session.userId,
      last_seen_at: now,
      role,
      status: "online",
    }),
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    method: "POST",
  });

  return role;
}

export async function GET() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "请先使用飞书登录。" }, { status: 401 });
  }

  const role = await updateCurrentMember(session);
  const response = await supabaseFetch(
    "/rest/v1/team_members?select=*&order=last_seen_at.desc",
  );

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { message: body || "无法读取团队成员，请确认数据库表已创建。" },
      { status: response.status },
    );
  }

  const members = (await response.json()) as TeamMemberRow[];

  return NextResponse.json({
    currentRole: role,
    members,
  });
}

export async function POST() {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "请先使用飞书登录。" }, { status: 401 });
  }

  const role = await updateCurrentMember(session);

  return NextResponse.json({ ok: true, role });
}

export async function PATCH(request: NextRequest) {
  const session = await readSession();

  if (!session) {
    return NextResponse.json({ message: "请先使用飞书登录。" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ message: "只有管理员可以修改成员权限。" }, { status: 403 });
  }

  const payload = (await request.json()) as { id?: string; role?: TeamRole };
  const roles: TeamRole[] = ["admin", "manager", "staff"];

  if (!payload.id || !payload.role || !roles.includes(payload.role)) {
    return NextResponse.json({ message: "成员或权限不正确。" }, { status: 400 });
  }

  const response = await supabaseFetch(
    `/rest/v1/team_members?id=eq.${encodeURIComponent(payload.id)}`,
    {
      body: JSON.stringify({ role: payload.role }),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    },
  );

  const body = await response.text();

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/json; charset=utf-8",
    },
    status: response.status,
  });
}
