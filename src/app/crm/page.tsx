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

const sourceOptions = ["TikTok", "转介绍", "广告", "展会", "官网", "其他"];

function emptyAdAccount(): AdAccount {
  return {
    accountName: "",
    accountId: "",
    businessCenterId: "",
    rebateRate: "",
    status: "启用",
    notes: "",
  };
}

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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。";
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function compactAccounts(accounts: AdAccount[]) {
  const compacted = accounts.filter((account) =>
    [
      account.accountName,
      account.accountId,
      account.businessCenterId,
      account.rebateRate,
      account.notes,
    ].some((value) => value.trim()),
  );

  return compacted.length ? compacted : [emptyAdAccount()];
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
  const relatedAccounts = row.customer_ad_accounts?.map(mapAdAccount) ?? [];
  const legacyAccounts =
    row.ad_account_name || row.ad_account_id || row.business_center_id || row.rebate_rate
      ? [
          {
            accountName: row.ad_account_name ?? "",
            accountId: row.ad_account_id ?? "",
            businessCenterId: row.business_center_id ?? "",
            rebateRate: row.rebate_rate ?? "",
            status: "启用" as const,
            notes: "",
          },
        ]
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
    adAccounts: relatedAccounts.length ? relatedAccounts : legacyAccounts,
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

async function crmRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch("/api/crm/supabase", {
    body: JSON.stringify({
      body: typeof options.body === "string" ? options.body : undefined,
      headers: options.headers,
      method: options.method || "GET",
      path,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || response.statusText);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function uploadDocument(file: File, kind: "license" | "dbd") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const response = await fetch("/api/crm/upload", {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "文件上传失败。");
  }

  return ((await response.json()) as { url: string }).url;
}

function customerPayload(form: CustomerForm, session: AuthSession) {
  return {
    business_license_url: form.businessLicenseUrl || null,
    company: form.company.trim(),
    contact: form.contact.trim(),
    cooperation_start: form.cooperationStart || null,
    dbd_url: form.dbdUrl || null,
    email: form.email || null,
    industry: form.industry || null,
    line_lark: form.lineLark || null,
    notes: form.notes || null,
    owner_name: form.ownerName || session.fullName || session.email,
    phone: form.phone || null,
    region: form.region || null,
    source: form.source,
    status: form.status,
    tiktok: form.tiktok || null,
    wechat: form.wechat || null,
  };
}

function adAccountPayload(customerId: string, account: AdAccount) {
  return {
    account_id: account.accountId || null,
    account_name: account.accountName || null,
    business_center_id: account.businessCenterId || null,
    customer_id: customerId,
    notes: account.notes || null,
    rebate_rate: account.rebateRate || null,
    status: account.status,
  };
}

async function fetchCustomers() {
  const rows = await crmRequest<SupabaseCustomerRow[]>(
    "/rest/v1/customers?select=*,customer_ad_accounts(*)&order=created_at.desc&customer_ad_accounts.order=created_at.asc",
  );

  return rows.map(mapCustomer);
}

async function replaceAdAccounts(customerId: string, accounts: AdAccount[]) {
  await crmRequest<null>(`/rest/v1/customer_ad_accounts?customer_id=eq.${customerId}`, {
    method: "DELETE",
  });

  const payload = compactAccounts(accounts)
    .filter((account) =>
      [
        account.accountName,
        account.accountId,
        account.businessCenterId,
        account.rebateRate,
        account.notes,
      ].some((value) => value.trim()),
    )
    .map((account) => adAccountPayload(customerId, account));

  if (!payload.length) {
    return [];
  }

  const rows = await crmRequest<SupabaseAdAccountRow[]>(
    "/rest/v1/customer_ad_accounts",
    {
      body: JSON.stringify(payload),
      headers: { Prefer: "return=representation" },
      method: "POST",
    },
  );

  return rows.map(mapAdAccount);
}

async function createCustomer(form: CustomerForm, session: AuthSession) {
  const rows = await crmRequest<SupabaseCustomerRow[]>("/rest/v1/customers", {
    body: JSON.stringify(customerPayload(form, session)),
    headers: { Prefer: "return=representation" },
    method: "POST",
  });
  const customer = mapCustomer(rows[0]);
  const adAccounts = await replaceAdAccounts(customer.id, form.adAccounts);

  return { ...customer, adAccounts };
}

async function updateCustomer(id: string, form: CustomerForm, session: AuthSession) {
  const rows = await crmRequest<SupabaseCustomerRow[]>(
    `/rest/v1/customers?id=eq.${id}&select=*,customer_ad_accounts(*)`,
    {
      body: JSON.stringify(customerPayload(form, session)),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    },
  );
  const customer = mapCustomer(rows[0]);
  const adAccounts = await replaceAdAccounts(id, form.adAccounts);

  return { ...customer, adAccounts };
}

async function updateCustomerStatus(id: string, status: CustomerStatus) {
  const rows = await crmRequest<SupabaseCustomerRow[]>(
    `/rest/v1/customers?id=eq.${id}&select=*,customer_ad_accounts(*)`,
    {
      body: JSON.stringify({ status }),
      headers: { Prefer: "return=representation" },
      method: "PATCH",
    },
  );

  return mapCustomer(rows[0]);
}

export default function CrmPage() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "全部">("全部");
  const [selectedId, setSelectedId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [dbdFile, setDbdFile] = useState<File | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSession() {
      try {
        const params = new URLSearchParams(window.location.search);
        const loginError = params.get("error");

        if (loginError) {
          setMessage(loginError);
        }

        const response = await fetch("/api/auth/session");
        const data = (await response.json()) as { session: AuthSession | null };

        if (!data.session) {
          return;
        }

        setSession(data.session);
        const items = await fetchCustomers();
        setCustomers(items);
        setSelectedId(items[0]?.id ?? "");
      } catch (error: unknown) {
        setMessage(errorMessage(error));
      } finally {
        setCheckingSession(false);
      }
    }

    loadSession();
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const searchable = [
        customer.company,
        customer.contact,
        customer.phone,
        customer.email,
        customer.region,
        customer.industry,
        customer.ownerName,
        customer.notes,
        ...customer.adAccounts.flatMap((account) => [
          account.accountName,
          account.accountId,
          account.businessCenterId,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || searchable.includes(keyword)) &&
        (statusFilter === "全部" || customer.status === statusFilter)
      );
    });
  }, [customers, query, statusFilter]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedId) ??
    filteredCustomers[0] ??
    customers[0];

  const stats = [
    { label: "客户总数", value: customers.length },
    {
      label: "活跃客户",
      value: customers.filter((customer) => !["暂停", "流失"].includes(customer.status)).length,
    },
    {
      label: "已成交/服务中",
      value: customers.filter((customer) => ["已成交", "服务中"].includes(customer.status)).length,
    },
    {
      label: "已上传文件",
      value: customers.filter((customer) => customer.businessLicenseUrl || customer.dbdUrl).length,
    },
  ];

  function updateField<K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAdAccount<K extends keyof AdAccount>(index: number, key: K, value: AdAccount[K]) {
    setForm((current) => ({
      ...current,
      adAccounts: current.adAccounts.map((account, accountIndex) =>
        accountIndex === index ? { ...account, [key]: value } : account,
      ),
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
      adAccounts: compactAccounts(customer.adAccounts),
      businessLicenseUrl: customer.businessLicenseUrl,
      company: customer.company,
      contact: customer.contact,
      cooperationStart: customer.cooperationStart,
      dbdUrl: customer.dbdUrl,
      email: customer.email,
      industry: customer.industry,
      lineLark: customer.lineLark,
      notes: customer.notes,
      ownerName: customer.ownerName,
      phone: customer.phone,
      region: customer.region,
      source: customer.source,
      status: customer.status,
      tiktok: customer.tiktok,
      wechat: customer.wechat,
    });
    setLicenseFile(null);
    setDbdFile(null);
    setSelectedId(customer.id);
    setModalOpen(true);
  }

  async function refresh() {
    try {
      setCustomers(await fetchCustomers());
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
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
        nextForm.businessLicenseUrl = await uploadDocument(licenseFile, "license");
      }

      if (dbdFile) {
        nextForm.dbdUrl = await uploadDocument(dbdFile, "dbd");
      }

      const saved = editingId
        ? await updateCustomer(editingId, nextForm, session)
        : await createCustomer(nextForm, session);

      setCustomers((current) =>
        editingId
          ? current.map((customer) => (customer.id === saved.id ? saved : customer))
          : [saved, ...current],
      );
      setSelectedId(saved.id);
      setModalOpen(false);
      setMessage(editingId ? "客户资料已更新。" : "客户已保存。");
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(customer: Customer) {
    setSaving(true);
    setMessage("");

    try {
      const updated = await updateCustomerStatus(customer.id, "流失");
      setCustomers((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
      );
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setCustomers([]);
    setSelectedId("");
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef3f4] px-5 text-[#111827]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-[#55708d]">Raysense Global CRM</p>
          <h1 className="mt-2 text-xl font-semibold">正在验证飞书登录状态</h1>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef3f4] px-5 text-[#111827]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
          <a className="text-sm font-semibold text-[#0d5b4d]" href="/">
            Raysense Global
          </a>
          <h1 className="mt-2 text-2xl font-semibold">使用飞书登录</h1>
          <p className="mt-3 text-sm leading-6 text-[#667085]">
            CRM 仅允许公司飞书账号访问。请使用飞书完成身份验证后进入系统。
          </p>
          <div className="mt-5 grid gap-4">
            {message ? (
              <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">
                {message}
              </div>
            ) : null}
            <a
              className="rounded-md bg-[#176b87] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#145b73]"
              href="/api/auth/feishu/start"
            >
              使用飞书登录
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f4] text-[#111827]">
      <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
        <aside className="border-b border-[#17362f] bg-[#10241f] px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[#22a88a] text-lg font-semibold">
              R
            </span>
            <div>
              <p className="text-sm font-semibold">Raysense Global</p>
              <p className="text-xs text-[#a9c8bf]">CRM Workspace</p>
            </div>
          </div>
          <nav className="mt-6 grid gap-1 text-sm font-medium">
            {["客户管理", "广告账户", "合同资料", "数据报表", "系统设置"].map((label, index) => (
              <button
                className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left ${
                  index === 0 ? "bg-white text-[#10241f]" : "text-[#d9e8e3] hover:bg-white/10"
                }`}
                key={label}
                type="button"
              >
                <span>{label}</span>
                <span className={index === 0 ? "text-xs text-[#55708d]" : "text-xs text-[#8ab1a7]"}>
                  {index === 0 ? "当前模块" : "待扩展"}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#dfe3ea] bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-[#55708d]">客户管理</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal">客户录入与管理后台</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <button className="rounded-md bg-[#176b87] px-4 py-2.5 text-white hover:bg-[#145b73]" onClick={openCreate} type="button">
                  新增客户
                </button>
                <button className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-[#334155]" onClick={refresh} type="button">
                  刷新
                </button>
                <span className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-[#334155]">
                  {session.fullName || session.email}
                </span>
                <button className="rounded-md bg-[#0d5b4d] px-3 py-2 text-white" onClick={signOut} type="button">
                  退出
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-5 px-5 py-6">
            <div className="grid gap-3 md:grid-cols-4">
              {stats.map((stat) => (
                <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm" key={stat.label}>
                  <p className="text-sm text-[#667085]">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>

            {message ? (
              <div className="rounded-md border border-[#f2c4c4] bg-[#fff5f5] p-3 text-sm text-[#9f1d1d]">
                {message}
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
              <section className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
                <div className="border-b border-[#e5e7eb] bg-[#fbfcfd] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">客户管理</h2>
                      <p className="mt-1 text-sm text-[#667085]">搜索、筛选、编辑客户，并查看合作与账户资料。</p>
                    </div>
                    <button className="rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-semibold text-white" onClick={openCreate} type="button">
                      新增客户
                    </button>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.6fr)_220px]">
                    <label className="grid gap-1.5 text-sm font-medium">
                      搜索
                      <input className="field" onChange={(event) => setQuery(event.target.value)} placeholder="公司、联系人、电话、邮箱、广告账户" value={query} />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      状态
                      <select className="field" onChange={(event) => setStatusFilter(event.target.value as CustomerStatus | "全部")} value={statusFilter}>
                        <option>全部</option>
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="max-h-[calc(100vh-310px)] overflow-auto">
                  <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#f8fafc] text-xs uppercase text-[#64748b]">
                      <tr>
                        {["公司", "联系人", "电话", "地区", "行业", "广告账户", "状态", "负责人", "操作"].map((heading) => (
                          <th className="px-4 py-3 font-semibold" key={heading}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr className={`border-t border-[#edf0f4] transition-colors hover:bg-[#f8fbfc] ${selectedCustomer?.id === customer.id ? "bg-[#eef8fb]" : ""}`} key={customer.id}>
                          <td className="px-4 py-3 font-semibold">
                            <button className="text-left hover:text-[#176b87]" onClick={() => setSelectedId(customer.id)} type="button">
                              {customer.company}
                            </button>
                          </td>
                          <td className="px-4 py-3">{customer.contact}</td>
                          <td className="px-4 py-3">{customer.phone || "-"}</td>
                          <td className="px-4 py-3">{customer.region || "-"}</td>
                          <td className="px-4 py-3">{customer.industry || "-"}</td>
                          <td className="px-4 py-3">{customer.adAccounts[0]?.accountId || customer.adAccounts[0]?.accountName || "-"}</td>
                          <td className="px-4 py-3">{customer.status}</td>
                          <td className="px-4 py-3">{customer.ownerName || "-"}</td>
                          <td className="px-4 py-3">
                            <button className="table-action mr-2" onClick={() => openEdit(customer)} type="button">编辑</button>
                            <button className="table-action" disabled={saving} onClick={() => handleArchive(customer)} type="button">流失</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredCustomers.length ? <div className="px-5 py-12 text-center text-sm text-[#667085]">暂无客户数据。</div> : null}
                </div>
              </section>

              {selectedCustomer ? (
                <aside className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm xl:sticky xl:top-24">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#176b87]">客户详情</p>
                      <h2 className="mt-1 text-xl font-semibold">{selectedCustomer.company}</h2>
                      <p className="mt-2 text-sm text-[#667085]">{selectedCustomer.notes || "暂无备注"}</p>
                    </div>
                    <button className="rounded-md border border-[#d7dce4] px-3 py-2 text-sm font-semibold" onClick={() => openEdit(selectedCustomer)} type="button">
                      编辑客户
                    </button>
                  </div>
                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      ["联系人", selectedCustomer.contact],
                      ["电话", selectedCustomer.phone || "-"],
                      ["微信", selectedCustomer.wechat || "-"],
                      ["Line/Lark", selectedCustomer.lineLark || "-"],
                      ["邮箱", selectedCustomer.email || "-"],
                      ["TikTok", selectedCustomer.tiktok || "-"],
                      ["合作时间", selectedCustomer.cooperationStart || "-"],
                      ["创建日期", selectedCustomer.createdAt || "-"],
                    ].map(([label, value]) => (
                      <div className="rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3" key={label}>
                        <dt className="text-xs font-semibold text-[#667085]">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3">
                    <h3 className="text-sm font-semibold">广告账户</h3>
                    <div className="mt-3 grid gap-2">
                      {(selectedCustomer.adAccounts.length ? selectedCustomer.adAccounts : [emptyAdAccount()]).map((account, index) => (
                        <div className="rounded-md border border-[#edf0f4] bg-white p-3 text-sm" key={index}>
                          <p className="font-semibold">{account.accountName || `广告账户 ${index + 1}`}</p>
                          <p className="mt-1 text-[#667085]">ID: {account.accountId || "-"} / BC: {account.businessCenterId || "-"} / 返点: {account.rebateRate || "-"}</p>
                          <p className="mt-1 text-[#667085]">状态: {account.status}{account.notes ? ` / ${account.notes}` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      ["营业执照", selectedCustomer.businessLicenseUrl],
                      ["DBD", selectedCustomer.dbdUrl],
                    ].map(([label, url]) => (
                      <div className="rounded-md border border-[#edf0f4] bg-[#fbfcfd] p-3" key={label}>
                        <p className="text-xs font-semibold text-[#667085]">{label}</p>
                        {url ? <a className="mt-1 inline-block text-sm font-semibold text-[#176b87] hover:underline" href={url} rel="noreferrer" target="_blank">查看文件</a> : <p className="mt-1 text-sm">未上传</p>}
                      </div>
                    ))}
                  </div>
                </aside>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 py-6">
          <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] bg-[#fbfcfd] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">{editingId ? "编辑客户" : "新增客户"}</h2>
                <p className="mt-1 text-sm text-[#667085]">数据将保存到 Raysense CRM。</p>
              </div>
              <button className="rounded-md border border-[#d7dce4] px-3 py-2 text-sm font-medium" onClick={() => setModalOpen(false)} type="button">关闭</button>
            </div>
            <form className="grid max-h-[calc(92vh-82px)] gap-5 overflow-y-auto p-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">公司名<input className="field" onChange={(event) => updateField("company", event.target.value)} required value={form.company} /></label>
                <label className="grid gap-1.5 text-sm font-medium">联系人<input className="field" onChange={(event) => updateField("contact", event.target.value)} required value={form.contact} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">电话<input className="field" onChange={(event) => updateField("phone", event.target.value)} value={form.phone} /></label>
                <label className="grid gap-1.5 text-sm font-medium">邮箱<input className="field" onChange={(event) => updateField("email", event.target.value)} type="email" value={form.email} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">微信<input className="field" onChange={(event) => updateField("wechat", event.target.value)} value={form.wechat} /></label>
                <label className="grid gap-1.5 text-sm font-medium">Line/Lark<input className="field" onChange={(event) => updateField("lineLark", event.target.value)} value={form.lineLark} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">国家/地区<input className="field" onChange={(event) => updateField("region", event.target.value)} value={form.region} /></label>
                <label className="grid gap-1.5 text-sm font-medium">行业<input className="field" onChange={(event) => updateField("industry", event.target.value)} value={form.industry} /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium">TikTok账号/店铺链接<input className="field" onChange={(event) => updateField("tiktok", event.target.value)} value={form.tiktok} /></label>

              <div className="border-t border-[#edf0f4] pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">广告账户</h3>
                  <button className="rounded-md border border-[#176b87] px-3 py-2 text-sm font-semibold text-[#176b87]" onClick={() => setForm((current) => ({ ...current, adAccounts: [...current.adAccounts, emptyAdAccount()] }))} type="button">+ 添加广告账户</button>
                </div>
              </div>
              <div className="grid gap-3">
                {form.adAccounts.map((account, index) => (
                  <div className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-3" key={index}>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">广告账户 {index + 1}</p>
                      <button className="rounded-md border border-[#d7dce4] px-3 py-1.5 text-sm" onClick={() => setForm((current) => ({ ...current, adAccounts: current.adAccounts.length > 1 ? current.adAccounts.filter((_, accountIndex) => accountIndex !== index) : [emptyAdAccount()] }))} type="button">删除</button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="grid gap-1.5 text-sm font-medium">账户名称<input className="field" onChange={(event) => updateAdAccount(index, "accountName", event.target.value)} value={account.accountName} /></label>
                      <label className="grid gap-1.5 text-sm font-medium">账户ID<input className="field" onChange={(event) => updateAdAccount(index, "accountId", event.target.value)} value={account.accountId} /></label>
                      <label className="grid gap-1.5 text-sm font-medium">商务中心ID<input className="field" onChange={(event) => updateAdAccount(index, "businessCenterId", event.target.value)} value={account.businessCenterId} /></label>
                      <label className="grid gap-1.5 text-sm font-medium">返点倍率<input className="field" onChange={(event) => updateAdAccount(index, "rebateRate", event.target.value)} value={account.rebateRate} /></label>
                      <label className="grid gap-1.5 text-sm font-medium">状态<select className="field" onChange={(event) => updateAdAccount(index, "status", event.target.value as AdAccount["status"])} value={account.status}><option>启用</option><option>暂停</option><option>已关闭</option></select></label>
                      <label className="grid gap-1.5 text-sm font-medium">备注<input className="field" onChange={(event) => updateAdAccount(index, "notes", event.target.value)} value={account.notes} /></label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1.5 text-sm font-medium">客户来源<select className="field" onChange={(event) => updateField("source", event.target.value)} value={form.source}>{sourceOptions.map((source) => <option key={source}>{source}</option>)}</select></label>
                <label className="grid gap-1.5 text-sm font-medium">合作时间<input className="field" onChange={(event) => updateField("cooperationStart", event.target.value)} type="date" value={form.cooperationStart} /></label>
                <label className="grid gap-1.5 text-sm font-medium">状态<select className="field" onChange={(event) => updateField("status", event.target.value as CustomerStatus)} value={form.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="grid gap-1.5 text-sm font-medium">负责人<input className="field" onChange={(event) => updateField("ownerName", event.target.value)} value={form.ownerName} /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">营业执照<input className="field" onChange={(event) => setLicenseFile(event.target.files?.[0] ?? null)} type="file" /></label>
                <label className="grid gap-1.5 text-sm font-medium">DBD<input className="field" onChange={(event) => setDbdFile(event.target.files?.[0] ?? null)} type="file" /></label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium">备注<textarea className="field min-h-24 resize-y" onChange={(event) => updateField("notes", event.target.value)} value={form.notes} /></label>
              <button className="rounded-md bg-[#176b87] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" disabled={saving} type="submit">
                {saving ? "保存中..." : editingId ? "保存修改" : "保存客户"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
