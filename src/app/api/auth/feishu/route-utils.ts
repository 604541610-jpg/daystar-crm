import { NextResponse } from "next/server";
import { crmSessionCookie, feishuStateCookie } from "./config";

const secure = process.env.NODE_ENV === "production";

export function setStateCookie(response: NextResponse, state: string) {
  response.cookies.set(feishuStateCookie, state, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

export function setSessionCookie(response: NextResponse, value: string) {
  response.cookies.set(crmSessionCookie, value, {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(crmSessionCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
  response.cookies.set(feishuStateCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
}
