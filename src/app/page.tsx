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
  adAccountName: string;
  adAccountId: string;
  businessCenterId: string;
  rebateRate: string;
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

type AuthSession = {
  accessToken: string;
  email: string;
  fullName: string;
  userId: string;
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
  cooperation_start: string | null;
  business_license_url: string | null;
  dbd_url: string | null;
  source: string;
  status: CustomerStatus;
  owner_name: string | null;
  notes: string | null;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

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

const emptyForm: CustomerForm = {
  company: "",
  contact: "",
  phone: "",
  wechat: "",
  lineLark: "",
  email: "",
  region: "",
  industry: "",
  tiktok: "",
  adAccountName: "",
  adAccountId: "",
  businessCenterId: "",
  rebateRate: "",
  cooperationStart: "",
  businessLicenseUrl: "",
  dbdUrl: "",
  source: "TikTok",
  status: "新客户",
  ownerName: "",
  notes: "",
};

function formatDate(value: string) {
  return value ? value.slice(0, 10) : "";
}

function mapCustomer(row: SupabaseCustomerRow): Customer {
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
    adAccountName: row.ad_account_name ?? "",
    adAccountId: row.ad_account_id ?? "",
    businessCenterId: row.business_center_id ?? "",
    rebateRate: row.rebate_rate ?? "",
    cooperationStart: row.cooperation_start ?? "",
    businessLicenseUrl: row.business_license_url ?? "",
    dbdUrl: row.dbd_url ?? "",
    source: row.source,
    status: row.status,
    ownerName: row.owner_name ?? "",
    notes: row.notes ?? "",
    createdAt: formatDate(row.created_at),
  };
}

function toCustomerPayload(
  form: CustomerForm,
  session: AuthSession,
  options: { includeOwnership: boolean },
) {
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
    ad_account_name: form.adAccountName || null,
    ad_account_id: form.adAccountId || null,
    business_center_id: form.businessCenterId || null,
    rebate_rate: form.rebateRate || null,
    cooperation_start: form.cooperationStart || null,
    business_license_url: form.businessLicenseUrl || null,
    dbd_url: form.dbdUrl || null,
    source: form.source,
    status: form.status,
    owner_name: form.ownerName || session.fullName || session.email,
    notes: form.notes || null,
  };

  if (options.includeOwnership) {
    payload.owner_id = session.userId;
    payload.created_by = session.userId;
  }

  return payload;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "操作失败，请稍后重试。";
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

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function uploadCustomerDocument(
  file: File,
  kind: "license" | "dbd",
  session: AuthSession,
) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("缺少 Supabase 环境配置。");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "file";
  const safeName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`;
  const path = `${session.userId}/${kind}/${safeName}`;
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/customer-documents/${path}`,
    {
      body: file,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "文件上传失败。");
  }

  return `${supabaseUrl}/storage/v1/object/public/customer-documents/${path}`;
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
    body: JSON.stringify({
      data: { full_name: fullName },
      email,
      password,
    }),
    method: "POST",
  });

  if (!data.access_token) {
    throw new Error("账号已创建。请先完成邮箱确认，或在 Supabase Auth 设置里关闭邮箱确认。");
  }

  return {
    accessToken: data.access_token,
    email: data.user.email ?? email,
    fullName: data.user.user_metadata?.full_name ?? fullName,
    userId: data.user.id,
  };
}

async function fetchCustomers(session: AuthSession) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    "/rest/v1/customers?select=*&order=created_at.desc",
    {},
    session.accessToken,
  );

  return rows.map(mapCustomer);
}

async function createCustomer(form: CustomerForm, session: AuthSession) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    "/rest/v1/customers",
    {
      body: JSON.stringify(
        toCustomerPayload(form, session, { includeOwnership: true }),
      ),
      headers: { Prefer: "return=representation" },
      method: "POST",
    },
    session.accessToken,
  );

  return mapCustomer(rows[0]);
}

async function updateCustomer(
  customerId: string,
  form: CustomerForm,
  session: AuthSession,
) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    `/rest/v1/customers?id=eq.${customerId}`,
    {
      body: JSON.stringify(
        toCustomerPayload(form, session, { includeOwnership: false }),
      ),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    },
    session.accessToken,
  );

  return mapCustomer(rows[0]);
}

async function updateCustomerStatus(
  customerId: string,
  status: CustomerStatus,
  session: AuthSession,
) {
  const rows = await supabaseRequest<SupabaseCustomerRow[]>(
    `/rest/v1/customers?id=eq.${customerId}`,
    {
      body: JSON.stringify({ status }),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    },
    session.accessToken,
  );

  return mapCustomer(rows[0]);
}

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "全部">(
    "全部",
  );
  const [ownerFilter, setOwnerFilter] = useState("全部");
  const [sourceFilter, setSourceFilter] = useState("全部");
  const [regionFilter, setRegionFilter] = useState("全部");
  const [industryFilter, setIndustryFilter] = useState("全部");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [dbdFile, setDbdFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.setTimeout(() => {
      try {
        const storedSession = window.localStorage.getItem("daystar-session");

        if (!storedSession) {
          return;
        }

        const parsedSession = JSON.parse(storedSession) as unknown;

        if (!isValidSession(parsedSession)) {
          window.localStorage.removeItem("daystar-session");
          return;
        }

        setSession(parsedSession);
        fetchCustomers(parsedSession)
          .then((items) => {
            setCustomers(items);
            setSelectedId(items[0]?.id ?? "");
          })
          .catch((error: unknown) => {
            window.localStorage.removeItem("daystar-session");
            setSession(null);
            setMessage(getErrorMessage(error));
          });
      } catch (error: unknown) {
        window.localStorage.removeItem("daystar-session");
        setMessage(getErrorMessage(error));
      }
    }, 0);
  }, []);

  const owners = useMemo(
    () =>
      Array.from(
        new Set(customers.map((item) => item.ownerName).filter(Boolean)),
      ),
    [customers],
  );
  const sources = useMemo(
    () => Array.from(new Set(customers.map((item) => item.source).filter(Boolean))),
    [customers],
  );
  const regions = useMemo(
    () => Array.from(new Set(customers.map((item) => item.region).filter(Boolean))),
    [customers],
  );
  const industries = useMemo(
    () =>
      Array.from(new Set(customers.map((item) => item.industry).filter(Boolean))),
    [customers],
  );

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
        customer.adAccountName,
        customer.adAccountId,
        customer.businessCenterId,
        customer.rebateRate,
        customer.cooperationStart,
        customer.ownerName,
      ]
        .join(" ")
        .toLowerCase();

      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesStatus =
        statusFilter === "全部" || customer.status === statusFilter;
      const matchesOwner =
        ownerFilter === "全部" || customer.ownerName === ownerFilter;
      const matchesSource =
        sourceFilter === "全部" || customer.source === sourceFilter;
      const matchesRegion =
        regionFilter === "全部" || customer.region === regionFilter;
      const matchesIndustry =
        industryFilter === "全部" || customer.industry === industryFilter;

      return (
        matchesKeyword &&
        matchesStatus &&
        matchesOwner &&
        matchesSource &&
        matchesRegion &&
        matchesIndustry
      );
    });
  }, [
    customers,
    industryFilter,
    ownerFilter,
    query,
    regionFilter,
    sourceFilter,
    statusFilter,
  ]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedId) ??
    filteredCustomers[0] ??
    customers[0];

  const stats = useMemo(() => {
    const active = customers.filter(
      (customer) => !["暂停", "流失"].includes(customer.status),
    ).length;
    const won = customers.filter((customer) =>
      ["已成交", "服务中"].includes(customer.status),
    ).length;
    const uploadedDocuments = customers.filter(
      (customer) => customer.businessLicenseUrl || customer.dbdUrl,
    ).length;

    return [
      { label: "客户总数", value: customers.length },
      { label: "活跃客户", value: active },
      { label: "已成交/服务中", value: won },
      { label: "已上传文件", value: uploadedDocuments },
    ];
  }, [customers]);

  function updateField<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const submitter = (event.nativeEvent as SubmitEvent)
        .submitter as HTMLButtonElement | null;
      const mode = submitter?.value === "sign-up" ? "sign-up" : "sign-in";
      const nextSession =
        mode === "sign-in"
          ? await signIn(authEmail, authPassword)
          : await signUp(authEmail, authPassword, authName || authEmail);

      window.localStorage.setItem("daystar-session", JSON.stringify(nextSession));
      setSession(nextSession);

      const items = await fetchCustomers(nextSession);
      setCustomers(items);
      setSelectedId(items[0]?.id ?? "");
      setMessage("");
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessage("请先登录。");
      return;
    }

    if (!form.company.trim() || !form.contact.trim()) {
      setMessage("公司名和联系人不能为空。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const nextForm = { ...form };

      if (licenseFile) {
        nextForm.businessLicenseUrl = await uploadCustomerDocument(
          licenseFile,
          "license",
          session,
        );
      }

      if (dbdFile) {
        nextForm.dbdUrl = await uploadCustomerDocument(dbdFile, "dbd", session);
      }

      if (editingId) {
        const updated = await updateCustomer(editingId, nextForm, session);
        setCustomers((current) =>
          current.map((customer) =>
            customer.id === editingId ? updated : customer,
          ),
        );
        setSelectedId(editingId);
      } else {
        const created = await createCustomer(nextForm, session);
        setCustomers((current) => [created, ...current]);
        setSelectedId(created.id);
      }

      setForm(emptyForm);
      setLicenseFile(null);
      setDbdFile(null);
      setEditingId(null);
      setCustomerModalOpen(false);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(customer: Customer) {
    const editable: CustomerForm = {
      company: customer.company,
      contact: customer.contact,
      phone: customer.phone,
      wechat: customer.wechat,
      lineLark: customer.lineLark,
      email: customer.email,
      region: customer.region,
      industry: customer.industry,
      tiktok: customer.tiktok,
      adAccountName: customer.adAccountName,
      adAccountId: customer.adAccountId,
      businessCenterId: customer.businessCenterId,
      rebateRate: customer.rebateRate,
      cooperationStart: customer.cooperationStart,
      businessLicenseUrl: customer.businessLicenseUrl,
      dbdUrl: customer.dbdUrl,
      source: customer.source,
      status: customer.status,
      ownerName: customer.ownerName,
      notes: customer.notes,
    };
    setForm(editable);
    setLicenseFile(null);
    setDbdFile(null);
    setEditingId(customer.id);
    setCustomerModalOpen(true);
  }

  function startCreate() {
    setForm(emptyForm);
    setLicenseFile(null);
    setDbdFile(null);
    setEditingId(null);
    setMessage("");
    setCustomerModalOpen(true);
  }

  function closeCustomerModal() {
    setCustomerModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setLicenseFile(null);
    setDbdFile(null);
  }

  async function archiveCustomer(id: string) {
    if (!session) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const updated = await updateCustomerStatus(id, "流失", session);
      setCustomers((current) =>
        current.map((customer) => (customer.id === id ? updated : customer)),
      );
    } catch (error: unknown) {
      setMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem("daystar-session");
    setSession(null);
    setCustomers([]);
    setSelectedId("");
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5 text-[#141414]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6">
          <p className="text-sm font-medium text-[#55708d]">Daystar CRM</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#111827]">
            内部系统登录
          </h1>

          <form className="mt-5 grid gap-4" onSubmit={handleAuth}>
            <label className="grid gap-1.5 text-sm font-medium">
              姓名
              <input
                className="field"
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="注册时填写，登录时可留空"
                value={authName}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              邮箱
              <input
                className="field"
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={authEmail}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              密码
              <input
                className="field"
                minLength={6}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="至少 6 位"
                required
                type="password"
                value={authPassword}
              />
            </label>
            {message ? (
              <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">
                {message}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="rounded-md bg-[#176b87] px-4 py-3 text-sm font-semibold text-white hover:bg-[#145b73] disabled:opacity-60"
                disabled={saving}
                type="submit"
                value="sign-in"
              >
                {saving ? "处理中..." : "登录"}
              </button>
              <button
                className="rounded-md border border-[#176b87] bg-white px-4 py-3 text-sm font-semibold text-[#176b87] hover:bg-[#eef8fb] disabled:opacity-60"
                disabled={saving}
                type="submit"
                value="sign-up"
              >
                注册账号
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-[#141414]">
      <header className="border-b border-[#dfe3ea] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#55708d]">Daystar CRM</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#111827]">
              客户录入与管理后台
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <button
              className="rounded-md bg-[#176b87] px-4 py-2.5 text-white hover:bg-[#145b73]"
              onClick={startCreate}
              type="button"
            >
              新增客户
            </button>
            <span className="rounded-md border border-[#d7dce4] px-3 py-2 text-[#334155]">
              {session.fullName || session.email}
            </span>
            <button
              className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-[#2d3748] hover:border-[#94a3b8] hover:bg-[#f8fafc]"
              onClick={signOut}
              type="button"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6">
        <section className="grid content-start gap-5" id="customers">
          <div className="grid auto-rows-max gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <div
                className="rounded-lg border border-[#dfe3ea] bg-white p-4"
                key={item.label}
              >
                <p className="text-sm text-[#667085]">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-[#111827]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#dfe3ea] bg-white">
            <div className="border-b border-[#e5e7eb] p-5">
              <div className="grid gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">客户管理</h2>
                    <p className="mt-1 text-sm text-[#667085]">
                      搜索、筛选、编辑客户，并查看合作与账户资料。
                    </p>
                  </div>
                  <button
                    className="rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#145b73]"
                    onClick={startCreate}
                    type="button"
                  >
                    新增客户
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="grid gap-1.5 text-sm font-medium">
                    搜索
                    <input
                      className="field"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="公司、联系人、账户ID"
                      value={query}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    状态
                    <select
                      className="field"
                      onChange={(event) =>
                        setStatusFilter(event.target.value as CustomerStatus | "全部")
                      }
                      value={statusFilter}
                    >
                      <option>全部</option>
                      {statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    负责人
                    <select
                      className="field"
                      onChange={(event) => setOwnerFilter(event.target.value)}
                      value={ownerFilter}
                    >
                      <option>全部</option>
                      {owners.map((owner) => (
                        <option key={owner}>{owner}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    来源
                    <select
                      className="field"
                      onChange={(event) => setSourceFilter(event.target.value)}
                      value={sourceFilter}
                    >
                      <option>全部</option>
                      {sources.map((source) => (
                        <option key={source}>{source}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    地区
                    <select
                      className="field"
                      onChange={(event) => setRegionFilter(event.target.value)}
                      value={regionFilter}
                    >
                      <option>全部</option>
                      {regions.map((region) => (
                        <option key={region}>{region}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    行业
                    <select
                      className="field"
                      onChange={(event) => setIndustryFilter(event.target.value)}
                      value={industryFilter}
                    >
                      <option>全部</option>
                      {industries.map((industry) => (
                        <option key={industry}>{industry}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-[#f8fafc] text-xs uppercase text-[#64748b]">
                  <tr>
                    {[
                      "公司名",
                      "联系人",
                      "地区",
                      "广告账户名称",
                      "广告账户ID",
                      "合作时间",
                      "来源",
                      "状态",
                      "负责人",
                      "操作",
                    ].map((heading) => (
                      <th className="px-4 py-3 font-semibold" key={heading}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr
                      className={`border-t border-[#edf0f4] ${
                        selectedCustomer?.id === customer.id ? "bg-[#eef8fb]" : ""
                      }`}
                      key={customer.id}
                    >
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {customer.company}
                      </td>
                      <td className="px-4 py-3">{customer.contact}</td>
                      <td className="px-4 py-3">{customer.region || "-"}</td>
                      <td className="px-4 py-3">
                        {customer.adAccountName || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {customer.adAccountId || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {customer.cooperationStart || "-"}
                      </td>
                      <td className="px-4 py-3">{customer.source}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[#eef2f7] px-2 py-1 text-xs font-semibold text-[#344054]">
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{customer.ownerName || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="table-action"
                            onClick={() => setSelectedId(customer.id)}
                            type="button"
                          >
                            查看
                          </button>
                          <button
                            className="table-action"
                            onClick={() => startEdit(customer)}
                            type="button"
                          >
                            编辑
                          </button>
                          <button
                            className="table-action"
                            onClick={() => archiveCustomer(customer.id)}
                            type="button"
                          >
                            归档
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCustomers.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-[#667085]">
                  暂无客户数据。
                </div>
              ) : null}
            </div>
          </div>

          {selectedCustomer ? (
            <aside className="rounded-lg border border-[#dfe3ea] bg-white p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#55708d]">
                    客户详情
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedCustomer.company}
                  </h2>
                  <p className="mt-2 text-sm text-[#667085]">
                    {selectedCustomer.notes || "暂无备注"}
                  </p>
                </div>
                <button
                  className="rounded-md border border-[#d7dce4] px-3 py-2 text-sm font-semibold text-[#334155]"
                  onClick={() => startEdit(selectedCustomer)}
                  type="button"
                >
                  编辑客户
                </button>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["联系人", selectedCustomer.contact],
                  ["电话", selectedCustomer.phone || "-"],
                  ["微信", selectedCustomer.wechat || "-"],
                  ["Line/Lark", selectedCustomer.lineLark || "-"],
                  ["邮箱", selectedCustomer.email || "-"],
                  ["行业", selectedCustomer.industry || "-"],
                  ["TikTok", selectedCustomer.tiktok || "-"],
                  ["广告账户名称", selectedCustomer.adAccountName || "-"],
                  ["广告账户ID", selectedCustomer.adAccountId || "-"],
                  ["商务中心ID", selectedCustomer.businessCenterId || "-"],
                  ["返点倍率", selectedCustomer.rebateRate || "-"],
                  ["客户合作时间", selectedCustomer.cooperationStart || "-"],
                  ["创建日期", selectedCustomer.createdAt],
                ].map(([label, value]) => (
                  <div
                    className="rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3"
                    key={label}
                  >
                    <dt className="text-xs font-semibold text-[#667085]">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-medium text-[#111827]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["营业执照", selectedCustomer.businessLicenseUrl],
                  ["DBD", selectedCustomer.dbdUrl],
                ].map(([label, url]) => (
                  <div
                    className="rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3"
                    key={label}
                  >
                    <p className="text-xs font-semibold text-[#667085]">
                      {label}
                    </p>
                    {url ? (
                      <a
                        className="mt-1 inline-block text-sm font-semibold text-[#176b87] hover:underline"
                        href={url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        查看文件
                      </a>
                    ) : (
                      <p className="mt-1 text-sm font-medium text-[#111827]">
                        未上传
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          ) : null}
        </section>
      </div>

      {customerModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4 py-6">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? "编辑客户" : "新增客户"}
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  数据将保存到 Supabase 数据库。
                </p>
              </div>
              <button
                className="rounded-md border border-[#d7dce4] px-3 py-2 text-sm font-medium text-[#334155]"
                onClick={closeCustomerModal}
                type="button"
              >
                关闭
              </button>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-sm font-medium">
              公司名
              <input
                className="field"
                onChange={(event) => updateField("company", event.target.value)}
                placeholder="例如 Aurora Beauty"
                required
                value={form.company}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                联系人
                <input
                  className="field"
                  onChange={(event) => updateField("contact", event.target.value)}
                  placeholder="联系人姓名"
                  required
                  value={form.contact}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                负责人
                <input
                  className="field"
                  onChange={(event) =>
                    updateField("ownerName", event.target.value)
                  }
                  placeholder="内部负责人"
                  value={form.ownerName}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                电话
                <input
                  className="field"
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="+66..."
                  value={form.phone}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                微信
                <input
                  className="field"
                  onChange={(event) => updateField("wechat", event.target.value)}
                  placeholder="微信号"
                  value={form.wechat}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                Line/Lark
                <input
                  className="field"
                  onChange={(event) =>
                    updateField("lineLark", event.target.value)
                  }
                  placeholder="Line ID 或 Lark 联系方式"
                  value={form.lineLark}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                邮箱
                <input
                  className="field"
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="name@company.com"
                  type="email"
                  value={form.email}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                国家/地区
                <input
                  className="field"
                  onChange={(event) => updateField("region", event.target.value)}
                  placeholder="Thailand / Malaysia"
                  value={form.region}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                行业
                <input
                  className="field"
                  onChange={(event) => updateField("industry", event.target.value)}
                  placeholder="美妆、家居、3C..."
                  value={form.industry}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              TikTok账号/店铺链接
              <input
                className="field"
                onChange={(event) => updateField("tiktok", event.target.value)}
                placeholder="https://www.tiktok.com/@..."
                value={form.tiktok}
              />
            </label>

            <div className="border-t border-[#edf0f4] pt-4">
              <h3 className="text-sm font-semibold text-[#111827]">
                账户信息
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                广告账户名称
                <input
                  className="field"
                  onChange={(event) =>
                    updateField("adAccountName", event.target.value)
                  }
                  placeholder="例如 Aurora Ads TH"
                  value={form.adAccountName}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                广告账户ID
                <input
                  className="field"
                  onChange={(event) =>
                    updateField("adAccountId", event.target.value)
                  }
                  placeholder="例如 act_1029384756"
                  value={form.adAccountId}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                商务中心ID
                <input
                  className="field"
                  onChange={(event) =>
                    updateField("businessCenterId", event.target.value)
                  }
                  placeholder="例如 bc_5647382910"
                  value={form.businessCenterId}
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              返点倍率
              <input
                className="field"
                inputMode="decimal"
                onChange={(event) => updateField("rebateRate", event.target.value)}
                placeholder="例如 1.05 / 5%"
                value={form.rebateRate}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                客户来源
                <select
                  className="field"
                  onChange={(event) => updateField("source", event.target.value)}
                  value={form.source}
                >
                  {["TikTok", "转介绍", "广告", "展会", "官网", "其他"].map(
                    (source) => (
                      <option key={source}>{source}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                客户合作时间
                <input
                  className="field"
                  onChange={(event) =>
                    updateField("cooperationStart", event.target.value)
                  }
                  type="date"
                  value={form.cooperationStart}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                当前状态
                <select
                  className="field"
                  onChange={(event) =>
                    updateField("status", event.target.value as CustomerStatus)
                  }
                  value={form.status}
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="border-t border-[#edf0f4] pt-4">
              <h3 className="text-sm font-semibold text-[#111827]">
                文件上传
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-1.5 text-sm font-medium">
                营业执照
                <input
                  className="field"
                  onChange={(event) =>
                    setLicenseFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
                {form.businessLicenseUrl ? (
                  <a
                    className="text-sm font-semibold text-[#176b87] hover:underline"
                    href={form.businessLicenseUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    已有文件：查看
                  </a>
                ) : null}
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                DBD
                <input
                  className="field"
                  onChange={(event) =>
                    setDbdFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
                {form.dbdUrl ? (
                  <a
                    className="text-sm font-semibold text-[#176b87] hover:underline"
                    href={form.dbdUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    已有文件：查看
                  </a>
                ) : null}
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-medium">
              备注
              <textarea
                className="field min-h-24 resize-y"
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="需求、预算、沟通重点、下一步动作"
                value={form.notes}
              />
            </label>

            {message ? (
              <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">
                {message}
              </div>
            ) : null}

            <button
              className="rounded-md bg-[#176b87] px-4 py-3 text-sm font-semibold text-white hover:bg-[#145b73] disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? "保存中..." : editingId ? "保存修改" : "保存客户"}
            </button>
          </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
