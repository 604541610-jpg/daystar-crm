import { NextResponse } from "next/server";
import { clearAuthCookies } from "../feishu/route-utils";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
