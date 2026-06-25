import { NextResponse } from "next/server";
import {
  createState,
  getFeishuBaseUrl,
  getFeishuRedirectUri,
  getRequiredEnv,
} from "../config";
import { setStateCookie } from "../route-utils";

export async function GET() {
  const appId = getRequiredEnv("FEISHU_APP_ID");
  const state = createState();
  const url = new URL(`${getFeishuBaseUrl()}/open-apis/authen/v1/index`);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("redirect_uri", getFeishuRedirectUri());
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url);
  setStateCookie(response, state);

  return response;
}
