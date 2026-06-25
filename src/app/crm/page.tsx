"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type CustomerStatus =
  | "新客户"
  | "已联系"
  | "需求确认"
  | "已报价"
  | "合同中"
  | "已成交"
  | "服务中"
  | "暂停"
  | "流失";

type AuthSession = {
  accessToken: string;
  email: string;
  fullName: string;
  userId: string;
};

type AdAccount = {
  id?: string;
  accountName: string;
  accountId: string;
  businessCenterId: string;
  rebateRate: string;
  status: "启用" | "暂停" | "已关闭";
  notes: string;
};

type Customer = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  wechat: string;
  lineLark: string;
  email: string;
  region: string;
  industry: string;
  tiktok: string;
  adAccounts: AdAccount[];
  cooperationStart: string;
  businessLicenseUrl: string;
  dbdUrl: string;
  source: string;
  status: CustomerStatus;
  ownerName: string;
  notes: string;
  createdAt: string;
};

type CustomerForm = Omit<Customer, "id" | "createdAt">;

type SupabaseAdAccountRow = {
  id: string;
  customer_id: string;
  account_name: string | null;
  account_id: string | null;
  business_center_id: string | null;
  rebate_rate: string | null;
  status: AdAccount["status"] | null;
  notes: string | null;
};

type SupabaseCustomerRow = {
  id: string;
  company: string;
  contact: string;
  phone: string | null;
  wechat: string | null;
  line_lark: string | null;
  email: string | null;
  region: string | null;
  industry: string | null;
  tiktok: string | null;
  ad_account_name: string | null;
  ad_account_id: string | null;
  business_center_id: string | null;
  rebate_rate: string | null;
  customer_ad_accounts?: SupabaseAdAccountRow[];
  cooperation_start: string | null;
  business_license_url: string | null;
  dbd_url: string | null;
  source: string | null;
  status: CustomerStatus | null;
  owner_name: string | null;
  notes: string | null;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const sessionKey = "raysense-session";

const statuses: CustomerStatus[] = [
  "新客户",
  "已联系",
  "需求确认",
  "已报价",
  "合同中",
  "已成交",
  "服务中",
  "暂停",
  "流失",
];

const sources = ["TikTok", "转介绍", "广告", "展会", "官网", "其他"];

const emptyAdAccount = (): AdAccount => ({
  accountName: "",
  accountId: "",
  businessCenterId: "",
  rebateRate: "",
  status: "启用",
  notes: "",
});

const emptyForm: CustomerForm = {
  company: "",
  contact: "",
  phone: "",
  wechat: "",
  lineLark: "",
  email: "",
  region: "Thailand",
  industry: "",
  tiktok: "",
  adAccounts: [emptyAdAccount()],
  cooperationStart: "",
  businessLicenseUrl: "",
  dbdUrl: "",
  source: "TikTok",
  status: "新客户",
  ownerName: "",
  notes: "",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。";
}

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<AuthSession>;
  return Boolean(session.accessToken && session.email && session.userId);
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function compactAccounts(accounts: AdAccount[]) {
  const next = accounts.filter((account) =>
    [account.accountName, account.accountId, account.businessCenterId, account.rebateRate, account.notes].some((value) => value.trim()),
  );
  return next.length ? next : [emptyAdAccount()];
}

function mapAdAccount(row: SupabaseAdAccountRow): AdAccount {
  return {
    id: row.id,
    accountName: row.account_name ?? "",
    accountId: row.account_id ?? "",
    businessCenterId: row.business_center_id ?? "",
    rebateRate: row.rebate_rate ?? "",
    status: row.status ?? "启用",
    notes: row.notes ?? "",
  };
}

function mapCustomer(row: SupabaseCustomerRow): Customer {
  const related = row.customer_ad_accounts?.map(mapAdAccount) ?? [];
  const legacy = row.ad_account_name || row.ad_account_id || row.business_center_id || row.rebate_rate
    ? [{
        accountName: row.ad_account_name ?? "",
        accountId: row.ad_account_id ?? "",
        businessCenterId: row.business_center_id ?? "",
        rebateRate: row.rebate_rate ?? "",
        status: "启用" as const,
        notes: "",
      }]
    : [];

  return {
    id: row.id,
    company: row.company,
    contact: row.contact,
    phone: row.phone ?? "",
    wechat: row.wechat ?? "",
    lineLark: row.line_lark ?? "",
    email: row.email ?? "",
    region: row.region ?? "",
    industry: row.industry ?? "",
    tiktok: row.tiktok ?? "",
    adAccounts: related.length ? related : legacy,
    cooperationStart: row.cooperation_start ?? "",
    businessLicenseUrl: row.business_license_url ?? "",
    dbdUrl: row.dbd_url ?? "",
    source: row.source ?? "TikTok",
    status: row.status ?? "新客户",
    ownerName: row.owner_name ?? "",
    notes: row.notes ?? "",
    createdAt: formatDate(row.created_at),
  };
}

async function supabaseRequest<T>(path: string, options: RequestInit = {}, accessToken?: string) {
  if (!supabaseUrl || !supabaseKey) throw new Error("缺少 Supabase 环境配置。");

  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken ?? supabaseKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) throw new Error((await response.text()) || response.statusText);
  if (response.status === 204) return null as T;
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

async function signUp(email: string, password: string, fullName: string) {
  const data = await supabaseRequest<{
    access_token?: string;
    user: { email?: string; id: string; user_metadata?: { full_name?: string } };
  }>("/auth/v1/signup", {
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
    method: "POST",
  });

  if (!data.access_token) throw new Error("账号已创建，请先完成邮箱确认或直接登录。");
  return {
    accessToken: data.access_token,
    email: data.user.email ?? email,
    fullName: data.user.user_metadata?.full_name ?? fullName,
    userId: data.user.id,
  };
}

async function uploadDocument(file: File, kind: "license" | "dbd", session: AuthSession) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  const path = `${session.userId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/customer-documents/${path}`, {
    body: file,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    method: "POST",
  });

  if (!response.ok) throw new Error((await response.text()) || "文件上传失败。");
  return `${supabaseUrl}/storage/v1/object/public/customer-documents/${path}`;
}

function customerPayload(form: CustomerForm, session: AuthSession, includeOwner: boolean) {
  const payload: Record<string, string | null> = {
    company: form.company.trim(),
    contact: form.contact.trim(),
    phone: form.phone || null,
    wechat: form.wechat || null,
    line_lark: form.lineLark || null,
    email: form.email || null,
    region: form.region || null,
    industry: form.industry || null,
    tiktok: form.tiktok || null,
    cooperation_start: form.cooperationStart || null,
    business_license_url: form.businessLicenseUrl || null,
    dbd_url: form.dbdUrl || null,
    source: form.source,
    status: form.status,
    owner_name: form.ownerName || session.fullName || session.email,
    notes: form.notes || null,
  };

  if (includeOwner) {
    payload.owner_id = session.userId;
    payload.created_by = session.userId;
  }

  return payload;
}

function adAccountPayload(customerId: string, account: AdAccount) {
  return {
    account_name: account.accountName || null,
    account_id: account.accountId || null,
    business_center_id: account.businessCenterId || null,
    customer_id: customerId,
    rebate_rate: account.rebateRate || null,
    status: account.status,
    notes: account.notes || null,
  };
}

async function fetchCustomers(session: AuthSession) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    "/rest/v1/customers?select=*,customer_ad_accounts(*)&order=created_at.desc&customer_ad_accounts.order=created_at.asc",
    {},
    session.accessToken,
  );
  return rows.map(mapCustomer);
}

async function replaceAdAccounts(customerId: string, accounts: AdAccount[], session: AuthSession) {
  await supabaseRequest<null>(`/rest/v1/customer_ad_accounts?customer_id=eq.${customerId}`, { method: "DELETE" }, session.accessToken);
  const payload = compactAccounts(accounts)
    .filter((account) => [account.accountName, account.accountId, account.businessCenterId, account.rebateRate, account.notes].some((value) => value.trim()))
    .map((account) => adAccountPayload(customerId, account));

  if (!payload.length) return [];
  const rows = await supabaseRequest<SupabaseAdAccountRow[]>(
    "/rest/v1/customer_ad_accounts",
    { body: JSON.stringify(payload), headers: { Prefer: "return=representation" }, method: "POST" },
    session.accessToken,
  );
  return rows.map(mapAdAccount);
}

async function createCustomer(form: CustomerForm, session: AuthSession) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    "/rest/v1/customers",
    { body: JSON.stringify(customerPayload(form, session, true)), headers: { Prefer: "return=representation" }, method: "POST" },
    session.accessToken,
  );
  const customer = mapCustomer(rows[0]);
  const adAccounts = await replaceAdAccounts(customer.id, form.adAccounts, session);
  return { ...customer, adAccounts };
}

async function updateCustomer(customerId: string, form: CustomerForm, session: AuthSession) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    `/rest/v1/customers?id=eq.${customerId}&select=*,customer_ad_accounts(*)`,
    { body: JSON.stringify(customerPayload(form, session, false)), headers: { Prefer: "return=representation" }, method: "PATCH" },
    session.accessToken,
  );
  const customer = mapCustomer(rows[0]);
  const adAccounts = await replaceAdAccounts(customerId, form.adAccounts, session);
  return { ...customer, adAccounts };
}

async function updateStatus(customerId: string, status: CustomerStatus, session: AuthSession) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    `/rest/v1/customers?id=eq.${customerId}&select=*,customer_ad_accounts(*)`,
    { body: JSON.stringify({ status }), headers: { Prefer: "return=representation" }, method: "PATCH" },
    session.accessToken,
  );
  return mapCustomer(rows[0]);
}

export default function CrmPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "全部">("全部");
  const [selectedId, setSelectedId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [dbdFile, setDbdFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(sessionKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      if (!isValidSession(parsed)) {
        window.localStorage.removeItem(sessionKey);
        return;
      }
      setSession(parsed);
      fetchCustomers(parsed)
        .then((items) => {
          setCustomers(items);
          setSelectedId(items[0]?.id ?? "");
        })
        .catch((error: unknown) => setMessage(getErrorMessage(error)));
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const text = [
        customer.company,
        customer.contact,
        customer.phone,
        customer.wechat,
        customer.lineLark,
        customer.email,
        customer.region,
        customer.industry,
        customer.tiktok,
        customer.source,
        customer.status,
        customer.ownerName,
        customer.notes,
        ...customer.adAccounts.flatMap((account) => [account.accountName, account.accountId, account.businessCenterId, account.rebateRate, account.status, account.notes]),
      ].join(" ").toLowerCase();

      return (!keyword || text.includes(keyword)) && (statusFilter === "全部" || customer.status === statusFilter);
    });
  }, [customers, query, statusFilter]);

  const selectedCustomer = customers.find((item) => item.id === selectedId) ?? filteredCustomers[0] ?? customers[0];
  const activeCustomers = customers.filter((item) => !["暂停", "流失"].includes(item.status)).length;
  const servedCustomers = customers.filter((item) => ["已成交", "服务中"].includes(item.status)).length;
  const uploadedDocuments = customers.filter((item) => item.businessLicenseUrl || item.dbdUrl).length;

  const stats = [
    ["客户总数", customers.length],
    ["活跃客户", activeCustomers],
    ["成交/服务中", servedCustomers],
    ["已上传资料", uploadedDocuments],
  ];

  function updateField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAdAccount<K extends keyof AdAccount>(index: number, key: K, value: AdAccount[K]) {
    setForm((current) => ({
      ...current,
      adAccounts: current.adAccounts.map((account, accountIndex) => accountIndex === index ? { ...account, [key]: value } : account),
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setLicenseFile(null);
    setDbdFile(null);
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      company: customer.company,
      contact: customer.contact,
      phone: customer.phone,
      wechat: customer.wechat,
      lineLark: customer.lineLark,
      email: customer.email,
      region: customer.region,
      industry: customer.industry,
      tiktok: customer.tiktok,
      adAccounts: compactAccounts(customer.adAccounts),
      cooperationStart: customer.cooperationStart,
      businessLicenseUrl: customer.businessLicenseUrl,
      dbdUrl: customer.dbdUrl,
      source: customer.source,
      status: customer.status,
      ownerName: customer.ownerName,
      notes: customer.notes,
    });
    setLicenseFile(null);
    setDbdFile(null);
    setSelectedId(customer.id);
    setModalOpen(true);
  }

  async function refresh(nextSession = session) {
    if (!nextSession) return;
    const items = await fetchCustomers(nextSession);
    setCustomers(items);
    setSelectedId((current) => current || items[0]?.id || "");
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const nextSession = submitter?.value === "sign-up" ? await signUp(authEmail, authPassword, authName || authEmail) : await signIn(authEmail, authPassword);
      window.localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
      await refresh(nextSession);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (!form.company.trim() || !form.contact.trim()) {
      setMessage("公司名和联系人不能为空。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const nextForm = { ...form };
      if (licenseFile) nextForm.businessLicenseUrl = await uploadDocument(licenseFile, "license", session);
      if (dbdFile) nextForm.dbdUrl = await uploadDocument(dbdFile, "dbd", session);
      const saved = editingId ? await updateCustomer(editingId, nextForm, session) : await createCustomer(nextForm, session);
      setCustomers((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setSelectedId(saved.id);
      setModalOpen(false);
      setMessage(editingId ? "客户资料已更新。" : "客户已保存。");
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(customer: Customer, status: CustomerStatus) {
    if (!session) return;
    setSaving(true);
    setMessage("");

    try {
      const updated = await updateStatus(customer.id, status, session);
      setCustomers((current) => current.map((item) => item.id === updated.id ? { ...item, status: updated.status } : item));
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem(sessionKey);
    setSession(null);
    setCustomers([]);
    setAuthPassword("");
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef3f4] px-5 text-[#111827]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
          <a className="text-sm font-semibold text-[#0d5b4d]" href="/">Raysense Global</a>
          <h1 className="mt-2 text-2xl font-semibold">CRM 系统登录</h1>
          <form className="mt-5 grid gap-4" onSubmit={handleAuth}>
            <label className="grid gap-1.5 text-sm font-medium">姓名<input className="field" onChange={(event) => setAuthName(event.target.value)} placeholder="注册时填写，登录可留空" value={authName} /></label>
            <label className="grid gap-1.5 text-sm font-medium">邮箱<input className="field" onChange={(event) => setAuthEmail(event.target.value)} required type="email" value={authEmail} /></label>
            <label className="grid gap-1.5 text-sm font-medium">密码<input className="field" minLength={6} onChange={(event) => setAuthPassword(event.target.value)} required type="password" value={authPassword} /></label>
            {message ? <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">{message}</div> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="rounded-md bg-[#0d5b4d] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} type="submit" value="sign-in">{saving ? "处理中..." : "登录"}</button>
              <button className="rounded-md border border-[#0d5b4d] px-4 py-3 text-sm font-semibold text-[#0d5b4d] disabled:opacity-60" disabled={saving} type="submit" value="sign-up">注册</button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f4] text-[#111827]">
      <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-[#17362f] bg-[#10241f] px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[#22a88a] text-lg font-semibold">R</span>
            <div><p className="text-sm font-semibold">Raysense Global</p><p className="text-xs text-[#a9c8bf]">CRM Workspace</p></div>
          </div>
          <nav className="mt-6 grid gap-1 text-sm font-medium">
            {[["客户管理", "当前模块"], ["广告账户", "待扩展"], ["合同资料", "待扩展"], ["数据报表", "待扩展"], ["系统设置", "待扩展"]].map(([label, meta], index) => <button className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left ${index === 0 ? "bg-white text-[#10241f]" : "text-[#d9e8e3] hover:bg-white/10"}`} key={label} type="button"><span>{label}</span><span className={index === 0 ? "text-xs text-[#55708d]" : "text-xs text-[#8ab1a7]"}>{meta}</span></button>)}
          </nav>
          <div className="mt-6 rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-[#c9ddd7]">后续新增功能时，可以直接放进左侧导航，不影响客户录入主流程。</div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#dfe3ea] bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-sm font-medium text-[#55708d]">客户管理</p><h1 className="mt-1 text-2xl font-semibold tracking-normal">客户录入与管理后台</h1></div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium"><button className="rounded-md bg-[#176b87] px-4 py-2.5 text-white hover:bg-[#145b73]" onClick={openCreate} type="button">新增客户</button><button className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-[#334155]" onClick={() => refresh()} type="button">刷新</button><span className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-[#334155]">{session.fullName || session.email}</span><button className="rounded-md bg-[#0d5b4d] px-3 py-2 text-white" onClick={signOut} type="button">退出</button></div>
            </div>
          </header>

          <section className="grid gap-5 px-5 py-6">
            <div className="grid gap-3 md:grid-cols-4">{stats.map(([label, value]) => <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm" key={label}><p className="text-sm text-[#667085]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
              <section className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
                <div className="border-b border-[#e5e7eb] bg-[#fbfcfd] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-lg font-semibold">客户管理</h2><p className="mt-1 text-sm text-[#667085]">搜索、筛选、编辑客户，并查看合作与账户资料。</p></div><button className="rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-semibold text-white" onClick={openCreate} type="button">新增客户</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.6fr)_220px]"><label className="grid gap-1.5 text-sm font-medium">搜索<input className="field" onChange={(event) => setQuery(event.target.value)} placeholder="公司、联系人、电话、邮箱、广告账户" value={query} /></label><label className="grid gap-1.5 text-sm font-medium">状态<select className="field" onChange={(event) => setStatusFilter(event.target.value as CustomerStatus | "全部")} value={statusFilter}><option>全部</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div></div>
                {message ? <div className="m-5 rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">{message}</div> : null}
                <div className="max-h-[calc(100vh-310px)] overflow-auto"><table className="w-full min-w-[1000px] border-collapse text-left text-sm"><thead className="sticky top-0 z-10 bg-[#f8fafc] text-xs uppercase text-[#64748b]"><tr>{["公司", "联系人", "电话", "地区", "行业", "广告账户", "状态", "负责人", "操作"].map((heading) => <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>)}</tr></thead><tbody>{filteredCustomers.map((customer) => <tr className={`border-t border-[#edf0f4] transition-colors hover:bg-[#f8fbfc] ${selectedCustomer?.id === customer.id ? "bg-[#eef8fb]" : ""}`} key={customer.id}><td className="px-4 py-3 font-semibold"><button className="text-left hover:text-[#176b87]" onClick={() => setSelectedId(customer.id)} type="button">{customer.company}</button></td><td className="px-4 py-3">{customer.contact}</td><td className="px-4 py-3">{customer.phone || "-"}</td><td className="px-4 py-3">{customer.region || "-"}</td><td className="px-4 py-3">{customer.industry || "-"}</td><td className="px-4 py-3">{customer.adAccounts[0]?.accountId || customer.adAccounts[0]?.accountName || "-"}</td><td className="px-4 py-3"><select className="rounded-md border border-[#d7dce4] bg-white px-2 py-1" disabled={saving} onChange={(event) => handleStatus(customer, event.target.value as CustomerStatus)} value={customer.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td><td className="px-4 py-3">{customer.ownerName || "-"}</td><td className="px-4 py-3"><button className="table-action" onClick={() => openEdit(customer)} type="button">编辑</button></td></tr>)}</tbody></table>{!filteredCustomers.length ? <div className="px-5 py-12 text-center text-sm text-[#667085]">暂无客户数据。</div> : null}</div>
              </section>

              {selectedCustomer ? <aside className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm xl:sticky xl:top-24"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#176b87]">客户详情</p><h2 className="mt-1 text-xl font-semibold">{selectedCustomer.company}</h2><p className="mt-2 text-sm text-[#667085]">{selectedCustomer.notes || "暂无备注"}</p></div><button className="rounded-md border border-[#d7dce4] px-3 py-2 text-sm font-semibold" onClick={() => openEdit(selectedCustomer)} type="button">编辑客户</button></div><dl className="mt-5 grid gap-3 sm:grid-cols-2">{[["联系人", selectedCustomer.contact], ["电话", selectedCustomer.phone || "-"], ["微信", selectedCustomer.wechat || "-"], ["Line/Lark", selectedCustomer.lineLark || "-"], ["邮箱", selectedCustomer.email || "-"], ["TikTok", selectedCustomer.tiktok || "-"], ["合作时间", selectedCustomer.cooperationStart || "-"], ["创建日期", selectedCustomer.createdAt || "-"]].map(([label, value]) => <div className="rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3" key={label}><dt className="text-xs font-semibold text-[#667085]">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}</dl><div className="mt-4 rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3"><h3 className="text-sm font-semibold">广告账户</h3><div className="mt-3 grid gap-2">{(selectedCustomer.adAccounts.length ? selectedCustomer.adAccounts : [emptyAdAccount()]).map((account, index) => <div className="rounded-md border border-[#edf0f4] bg-white p-3 text-sm" key={index}><p className="font-semibold">{account.accountName || `广告账户 ${index + 1}`}</p><p className="mt-1 text-[#667085]">ID: {account.accountId || "-"} / BC: {account.businessCenterId || "-"} / 返点: {account.rebateRate || "-"}</p><p className="mt-1 text-[#667085]">状态: {account.status}{account.notes ? ` / ${account.notes}` : ""}</p></div>)}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["营业执照", selectedCustomer.businessLicenseUrl], ["DBD", selectedCustomer.dbdUrl]].map(([label, url]) => <div className="rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3" key={label}><p className="text-xs font-semibold text-[#667085]">{label}</p>{url ? <a className="mt-1 inline-block text-sm font-semibold text-[#176b87] hover:underline" href={url} rel="noreferrer" target="_blank">查看文件</a> : <p className="mt-1 text-sm">未上传</p>}</div>)}</div></aside> : null}
            </div>
          </section>
        </div>
      </div>

      {modalOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6"><section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-xl"><div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] bg-[#fbfcfd] px-6 py-4"><div><h2 className="text-lg font-semibold">{editingId ? "编辑客户" : "新增客户"}</h2><p className="mt-1 text-sm text-[#667085]">数据将保存到 Supabase 数据库。</p></div><button className="rounded-md border border-[#d7dce4] px-3 py-2 text-sm font-medium" onClick={() => setModalOpen(false)} type="button">关闭</button></div><form className="grid max-h-[calc(92vh-82px)] gap-5 overflow-y-auto p-6" onSubmit={handleSubmit}><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">公司名<input className="field" onChange={(event) => updateField("company", event.target.value)} required value={form.company} /></label><label className="grid gap-1.5 text-sm font-medium">联系人<input className="field" onChange={(event) => updateField("contact", event.target.value)} required value={form.contact} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">电话<input className="field" onChange={(event) => updateField("phone", event.target.value)} value={form.phone} /></label><label className="grid gap-1.5 text-sm font-medium">邮箱<input className="field" onChange={(event) => updateField("email", event.target.value)} type="email" value={form.email} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">微信<input className="field" onChange={(event) => updateField("wechat", event.target.value)} value={form.wechat} /></label><label className="grid gap-1.5 text-sm font-medium">Line/Lark<input className="field" onChange={(event) => updateField("lineLark", event.target.value)} value={form.lineLark} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">国家/地区<input className="field" onChange={(event) => updateField("region", event.target.value)} value={form.region} /></label><label className="grid gap-1.5 text-sm font-medium">行业<input className="field" onChange={(event) => updateField("industry", event.target.value)} value={form.industry} /></label></div><label className="grid gap-1.5 text-sm font-medium">TikTok账号/店铺链接<input className="field" onChange={(event) => updateField("tiktok", event.target.value)} value={form.tiktok} /></label><div className="border-t border-[#edf0f4] pt-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">广告账户</h3><button className="rounded-md border border-[#176b87] px-3 py-2 text-sm font-semibold text-[#176b87]" onClick={() => setForm((current) => ({ ...current, adAccounts: [...current.adAccounts, emptyAdAccount()] }))} type="button">+ 添加广告账户</button></div></div><div className="grid gap-3">{form.adAccounts.map((account, index) => <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3" key={index}><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">广告账户 {index + 1}</p><button className="rounded-md border border-[#d7dce4] px-3 py-1.5 text-sm" onClick={() => setForm((current) => ({ ...current, adAccounts: current.adAccounts.length > 1 ? current.adAccounts.filter((_, accountIndex) => accountIndex !== index) : [emptyAdAccount()] }))} type="button">删除</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label className="grid gap-1.5 text-sm font-medium">账户名称<input className="field" onChange={(event) => updateAdAccount(index, "accountName", event.target.value)} value={account.accountName} /></label><label className="grid gap-1.5 text-sm font-medium">账户ID<input className="field" onChange={(event) => updateAdAccount(index, "accountId", event.target.value)} value={account.accountId} /></label><label className="grid gap-1.5 text-sm font-medium">商务中心ID<input className="field" onChange={(event) => updateAdAccount(index, "businessCenterId", event.target.value)} value={account.businessCenterId} /></label><label className="grid gap-1.5 text-sm font-medium">返点倍率<input className="field" onChange={(event) => updateAdAccount(index, "rebateRate", event.target.value)} value={account.rebateRate} /></label><label className="grid gap-1.5 text-sm font-medium">状态<select className="field" onChange={(event) => updateAdAccount(index, "status", event.target.value as AdAccount["status"])} value={account.status}><option>启用</option><option>暂停</option><option>已关闭</option></select></label><label className="grid gap-1.5 text-sm font-medium">备注<input className="field" onChange={(event) => updateAdAccount(index, "notes", event.target.value)} value={account.notes} /></label></div></div>)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1.5 text-sm font-medium">客户来源<select className="field" onChange={(event) => updateField("source", event.target.value)} value={form.source}>{sources.map((source) => <option key={source}>{source}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">合作时间<input className="field" onChange={(event) => updateField("cooperationStart", event.target.value)} type="date" value={form.cooperationStart} /></label><label className="grid gap-1.5 text-sm font-medium">状态<select className="field" onChange={(event) => updateField("status", event.target.value as CustomerStatus)} value={form.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium">负责人<input className="field" onChange={(event) => updateField("ownerName", event.target.value)} value={form.ownerName} /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">营业执照<input className="field" onChange={(event) => setLicenseFile(event.target.files?.[0] ?? null)} type="file" />{form.businessLicenseUrl ? <a className="text-sm font-semibold text-[#176b87] hover:underline" href={form.businessLicenseUrl} rel="noreferrer" target="_blank">已有文件：查看</a> : null}</label><label className="grid gap-1.5 text-sm font-medium">DBD<input className="field" onChange={(event) => setDbdFile(event.target.files?.[0] ?? null)} type="file" />{form.dbdUrl ? <a className="text-sm font-semibold text-[#176b87] hover:underline" href={form.dbdUrl} rel="noreferrer" target="_blank">已有文件：查看</a> : null}</label></div><label className="grid gap-1.5 text-sm font-medium">备注<textarea className="field min-h-24 resize-y" onChange={(event) => updateField("notes", event.target.value)} value={form.notes} /></label>{message ? <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">{message}</div> : null}<button className="rounded-md bg-[#176b87] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "保存中..." : editingId ? "保存修改" : "保存客户"}</button></form></section></div> : null}
    </main>
  );
}
