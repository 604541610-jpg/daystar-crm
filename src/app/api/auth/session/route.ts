import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { crmSessionCookie, verifySession } from "../feishu/config";

export async function GET() {
  const value = (await cookies()).get(crmSessionCookie)?.value;
  const session = verifySession(value);

  return NextResponse.json({ session });
}
