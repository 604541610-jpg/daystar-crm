import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { crmSessionCookie, verifySession } from "../../auth/feishu/config";

function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("缺少 Supabase 后台环境配置。");
  }

  return { key, url };
}

function cleanPathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: NextRequest) {
  const session = verifySession((await cookies()).get(crmSessionCookie)?.value);

  if (!session) {
    return NextResponse.json({ message: "请先使用飞书登录。" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File) || (kind !== "license" && kind !== "dbd")) {
    return NextResponse.json({ message: "上传内容不完整。" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  const safeName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${cleanPathPart(extension)}`;
  const owner = cleanPathPart(session.userId || "feishu-user");
  const path = `${owner}/${kind}/${safeName}`;
  const { key, url } = getSupabaseAdminConfig();
  const response = await fetch(
    `${url}/storage/v1/object/customer-documents/${path}`,
    {
      body: file,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { message: body || "文件上传失败。" },
      { status: response.status },
    );
  }

  return NextResponse.json({
    url: `${url}/storage/v1/object/public/customer-documents/${path}`,
  });
}
