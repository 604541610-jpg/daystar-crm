import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type CrmSession = {
  accessToken: string;
  email: string;
  fullName: string;
  userId: string;
};

export const crmSessionCookie = "raysense_crm_session";
export const feishuStateCookie = "raysense_feishu_state";

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.raysenseglobal.com";
}

export function getFeishuBaseUrl() {
  return process.env.FEISHU_OPEN_BASE_URL || "https://open.feishu.cn";
}

export function getFeishuRedirectUri() {
  return (
    process.env.FEISHU_REDIRECT_URI ||
    `${getBaseUrl()}/api/auth/feishu/callback`
  );
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createState() {
  return randomBytes(24).toString("base64url");
}

export function signSession(session: CrmSession) {
  const secret = getRequiredEnv("CRM_SESSION_SECRET");
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

export function verifySession(value?: string) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const secret = getRequiredEnv("CRM_SESSION_SECRET");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CrmSession;
}

export function isAllowedUser(user: {
  email?: string;
  tenant_key?: string;
}) {
  const allowedTenant = process.env.FEISHU_ALLOWED_TENANT_KEY;

  if (allowedTenant && user.tenant_key !== allowedTenant) {
    return false;
  }

  const email = user.email?.toLowerCase();
  const allowedEmails = (process.env.FEISHU_ALLOWED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const allowedDomains = (process.env.FEISHU_ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.length && !allowedDomains.length) {
    return true;
  }

  if (!email) {
    return false;
  }

  return (
    allowedEmails.includes(email) ||
    allowedDomains.some((domain) => email.endsWith(`@${domain}`))
  );
}
