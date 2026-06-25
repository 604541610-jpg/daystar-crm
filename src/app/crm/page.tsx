"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AuthSession = {
  accessToken: string;
  email: string;
  fullName: string;
  userId: string;
};

type CustomerRow = {
  id: string;
  company: string;
  contact: string;
  phone: string | null;
  email: string | null;
  region: string | null;
  industry: string | null;
  tiktok: string | null;
  source: string | null;
  status: string | null;
  owner_name: string | null;
  notes: string | null;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const sessionKey = "raysense-session";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。";
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthSession>;
  return Boolean(session.accessToken && session.email && session.userId);
}

async function supabaseRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("缺少 Supabase 环境配置。");
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken ?? supabaseKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || response.statusText);
  }

  return (await response.json()) as T;
}

async function signIn(email: string, password: string) {
  const data = await supabaseRequest<{
    access_token: string;
    user: { email?: string; id: string; user_metadata?: { full_name?: string } };
  }>("/auth/v1/token?grant_type=password", {
    body: JSON.stringify({ email, password }),
    method: "POST",
  });

  return {
    accessToken: data.access_token,
    email: data.user.email ?? email,
    fullName: data.user.user_metadata?.full_name ?? email.split("@")[0],
    userId: data.user.id,
  };
}

async function fetchCustomers(session: AuthSession) {
  return supabaseRequest<CustomerRow[]>(
    "/rest/v1/customers?select=id,company,contact,phone,email,region,industry,tiktok,source,status,owner_name,notes,created_at&order=created_at.desc",
    {},
    session.accessToken,
  );
}

export default function CrmPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(sessionKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as unknown;
      if (!isValidSession(parsed)) {
        window.localStorage.removeItem(sessionKey);
        return;
      }

      window.setTimeout(() => {
        setSession(parsed);
        setLoading(true);
        fetchCustomers(parsed)
          .then(setCustomers)
          .catch((error: unknown) => setMessage(getErrorMessage(error)))
          .finally(() => setLoading(false));
      }, 0);
    } catch (error: unknown) {
      window.setTimeout(() => setMessage(getErrorMessage(error)), 0);
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return customers;
    }

    return customers.filter((customer) =>
      [
        customer.company,
        customer.contact,
        customer.phone,
        customer.email,
        customer.region,
        customer.industry,
        customer.tiktok,
        customer.source,
        customer.status,
        customer.owner_name,
        customer.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [customers, query]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const nextSession = await signIn(email, password);
      window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
      setCustomers(await fetchCustomers(nextSession));
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      setCustomers(await fetchCustomers(session));
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem(sessionKey);
    setSession(null);
    setCustomers([]);
    setPassword("");
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5 text-[#141414]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6">
          <Link className="text-sm font-semibold text-[#0d5b4d]" href="/">
            Raysense Global
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-[#111827]">
            CRM 系统登录
          </h1>

          <form className="mt-5 grid gap-4" onSubmit={handleSignIn}>
            <label className="grid gap-1.5 text-sm font-medium">
              邮箱
              <input
                className="field"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              密码
              <input
                className="field"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                required
                type="password"
                value={password}
              />
            </label>
            {message ? (
              <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">
                {message}
              </div>
            ) : null}
            <button
              className="rounded-md bg-[#0d5b4d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#09483d] disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#141414]">
      <header className="border-b border-[#dfe3ea] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="text-sm font-semibold text-[#0d5b4d]" href="/">
              Raysense Global
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#111827]">
              CRM 客户资料
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <button
              className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-[#2d3748] hover:border-[#94a3b8]"
              onClick={refresh}
              type="button"
            >
              刷新
            </button>
            <span className="rounded-md border border-[#d7dce4] px-3 py-2 text-[#334155]">
              {session.fullName || session.email}
            </span>
            <button
              className="rounded-md bg-[#0d5b4d] px-3 py-2 text-white hover:bg-[#09483d]"
              onClick={signOut}
              type="button"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["客户总数", customers.length],
            ["当前显示", filteredCustomers.length],
            ["活跃客户", customers.filter((item) => item.status !== "流失").length],
          ].map(([label, value]) => (
            <div
              className="rounded-lg border border-[#dfe3ea] bg-white p-4"
              key={label}
            >
              <p className="text-sm text-[#667085]">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#111827]">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[#dfe3ea] bg-white">
          <div className="border-b border-[#e5e7eb] p-5">
            <label className="grid max-w-xl gap-1.5 text-sm font-medium">
              搜索
              <input
                className="field"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="公司、联系人、邮箱、地区、行业"
                value={query}
              />
            </label>
            {message ? (
              <div className="mt-4 rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">
                {message}
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-[#fbfcfd] text-xs uppercase text-[#64748b]">
                <tr>
                  {["公司", "联系人", "电话", "邮箱", "地区", "行业", "来源", "状态", "负责人", "创建日期"].map((heading) => (
                    <th className="px-4 py-3 font-semibold" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr className="border-t border-[#edf0f4]" key={customer.id}>
                    <td className="px-4 py-3 font-semibold text-[#111827]">{customer.company}</td>
                    <td className="px-4 py-3">{customer.contact}</td>
                    <td className="px-4 py-3">{customer.phone || "-"}</td>
                    <td className="px-4 py-3">{customer.email || "-"}</td>
                    <td className="px-4 py-3">{customer.region || "-"}</td>
                    <td className="px-4 py-3">{customer.industry || "-"}</td>
                    <td className="px-4 py-3">{customer.source || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-[#eef2f7] px-2 py-1 text-xs font-semibold text-[#344054]">
                        {customer.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{customer.owner_name || "-"}</td>
                    <td className="px-4 py-3">{customer.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredCustomers.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#667085]">暂无客户数据。</div>
            ) : null}
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-[#667085]">加载中...</div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
