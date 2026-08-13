"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  FileText,
  Filter,
  HelpCircle,
  Home as HomeIcon,
  LayoutDashboard,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";
import DailyWorkbench from "./daily-workbench";
import RechargeCenter from "./recharge-center";

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
type TeamRole = "admin" | "manager" | "staff";

type AuthSession = {
  accessToken: string;
  email: string;
  fullName: string;
  role?: TeamRole;
  userId: string;
};

type TeamMember = {
  avatar_url: string | null;
  email: string | null;
  full_name: string;
  id: string;
  last_seen_at: string | null;
  role: TeamRole;
  status: "online" | "offline";
  tenant_key: string | null;
  updated_at: string | null;
};

type SupabaseAdAccountRow = {
  id: string;
  customer_id: string;
  account_name: string | null;
  account_id: string | null;
  business_center_id: string | null;
  rebate_rate: string | null;
  status: AdAccount["status"];
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
  source: string;
  status: CustomerStatus;
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

const roleLabels: Record<TeamRole, string> = {
  admin: "管理员",
  manager: "主管",
  staff: "成员",
};

const navItems = [
  { key: "home", label: "首页", icon: HomeIcon },
  { key: "customers", label: "客户管理", icon: UserRound },
  { key: "ads", label: "广告账户", icon: BriefcaseBusiness },
  { key: "files", label: "文件资料", icon: FileText },
  { key: "finance", label: "财务管理", icon: CircleDollarSign },
  { key: "workbench", label: "每日工作台", icon: ListTodo },
  { key: "team", label: "团队管理", icon: Users },
  { key: "logs", label: "操作日志", icon: LayoutDashboard },
  { key: "settings", label: "系统设置", icon: Settings },
] as const;

type ActiveModule = "customers" | "finance" | "team" | "workbench";

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
  region: "",
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
    row.ad_account_name ||
    row.ad_account_id ||
    row.business_center_id ||
    row.rebate_rate
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
    source: row.source,
    status: row.status,
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

async function fetchTeamMembers() {
  const response = await fetch("/api/crm/team");

  if (!response.ok) {
    throw new Error((await response.text()) || "无法读取团队成员。");
  }

  return (await response.json()) as {
    currentRole: TeamRole;
    members: TeamMember[];
  };
}

async function sendTeamHeartbeat() {
  await fetch("/api/crm/team", { method: "POST" });
}

async function updateTeamMemberRole(memberId: string, role: TeamRole) {
  const response = await fetch("/api/crm/team", {
    body: JSON.stringify({ id: memberId, role }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "无法更新成员权限。");
  }

  const rows = (await response.json()) as TeamMember[];
  return rows[0];
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

function isMemberOnline(member: TeamMember) {
  if (member.status !== "online" || !member.last_seen_at) {
    return false;
  }

  return Date.now() - new Date(member.last_seen_at).getTime() < 5 * 60 * 1000;
}

function formatLastSeen(value: string | null) {
  if (!value) {
    return "暂无记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: CustomerStatus) {
  if (status === "流失" || status === "暂停") {
    return "bg-[#eef2f7] text-[#475569]";
  }

  if (status === "已成交" || status === "服务中") {
    return "bg-[#e7f6ee] text-[#167044]";
  }

  if (status === "已报价" || status === "合同中") {
    return "bg-[#e8f1ff] text-[#175cd3]";
  }

  if (status === "新客户" || status === "已联系") {
    return "bg-[#fff7e6] text-[#a15c07]";
  }

  return "bg-[#fff1e7] text-[#a14b16]";
}

function toForm(customer: Customer): CustomerForm {
  return {
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
  };
}

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ActiveModule>("customers");
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    "basic" | "contact" | "accounts" | "files"
  >("basic");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "全部">(
    "全部",
  );
  const [ownerFilter, setOwnerFilter] = useState("全部");
  const [regionFilter, setRegionFilter] = useState("全部");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [dbdFile, setDbdFile] = useState<File | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamSavingId, setTeamSavingId] = useState("");
  const [message, setMessage] = useState("");

  const canManageTeam =
    session?.role === "admin" ||
    session?.role === "manager" ||
    session?.fullName === "Jay" ||
    session?.fullName === "何震洋";

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
        if (items[0]) {
          setForm(toForm(items[0]));
          setEditingId(items[0].id);
          setDrawerOpen(true);
          setActiveDrawerTab("basic");
        }

        try {
          const team = await fetchTeamMembers();
          setTeamMembers(team.members);
          setSession((current) =>
            current ? { ...current, role: team.currentRole } : current,
          );
        } catch {
          setTeamMembers([]);
        }
      } catch (error: unknown) {
        setMessage(errorMessage(error));
      } finally {
        setCheckingSession(false);
      }
    }

    loadSession();
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    const refresh = async () => {
      try {
        await sendTeamHeartbeat();
        const team = await fetchTeamMembers();
        setTeamMembers(team.members);
      } catch {
        // Presence should never block customer work.
      }
    };
    const interval = window.setInterval(refresh, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [session]);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const searchable = [
        customer.company,
        customer.contact,
        customer.phone,
        customer.wechat,
        customer.lineLark,
        customer.email,
        customer.region,
        customer.industry,
        customer.ownerName,
        customer.notes,
        ...customer.adAccounts.flatMap((account) => [
          account.accountName,
          account.accountId,
          account.businessCenterId,
          account.rebateRate,
          account.notes,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || searchable.includes(keyword)) &&
        (statusFilter === "全部" || customer.status === statusFilter) &&
        (ownerFilter === "全部" || customer.ownerName === ownerFilter) &&
        (regionFilter === "全部" || customer.region === regionFilter)
      );
    });
  }, [customers, ownerFilter, query, regionFilter, statusFilter]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedId) ??
    filteredCustomers[0] ??
    customers[0];

  const teamStats = useMemo(() => {
    const online = teamMembers.filter(isMemberOnline).length;
    const admins = teamMembers.filter((member) => member.role === "admin").length;

    return [
      { label: "团队成员", value: teamMembers.length },
      { label: "当前在线", value: online },
      { label: "管理员", value: admins },
      { label: "普通成员", value: teamMembers.length - admins },
    ];
  }, [teamMembers]);

  function updateField<K extends keyof CustomerForm>(
    key: K,
    value: CustomerForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAdAccount<K extends keyof AdAccount>(
    index: number,
    key: K,
    value: AdAccount[K],
  ) {
    setForm((current) => ({
      ...current,
      adAccounts: current.adAccounts.map((account, accountIndex) =>
        accountIndex === index ? { ...account, [key]: value } : account,
      ),
    }));
  }

  function addAdAccount() {
    setForm((current) => ({
      ...current,
      adAccounts: [...current.adAccounts, emptyAdAccount()],
    }));
  }

  function removeAdAccount(index: number) {
    setForm((current) => ({
      ...current,
      adAccounts:
        current.adAccounts.length > 1
          ? current.adAccounts.filter((_, accountIndex) => accountIndex !== index)
          : [emptyAdAccount()],
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      ownerName: session?.fullName || session?.email || "",
    });
    setLicenseFile(null);
    setDbdFile(null);
    setMessage("");
    setActiveDrawerTab("basic");
    setDrawerOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm(toForm(customer));
    setLicenseFile(null);
    setDbdFile(null);
    setSelectedId(customer.id);
    setMessage("");
    setActiveDrawerTab("basic");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setLicenseFile(null);
    setDbdFile(null);
  }

  async function refreshCustomers() {
    try {
      const items = await fetchCustomers();
      setCustomers(items);
      setSelectedId((current) => current || items[0]?.id || "");
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!session) {
      setMessage("请先登录。");
      return;
    }

    if (!form.company.trim() || !form.contact.trim()) {
      setMessage("公司名称和联系人不能为空。");
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
      setDrawerOpen(false);
      setEditingId(null);
      setLicenseFile(null);
      setDbdFile(null);
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
        current.map((item) =>
          item.id === updated.id ? { ...item, status: updated.status } : item,
        ),
      );
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function changeMemberRole(memberId: string, role: TeamRole) {
    if (!canManageTeam) {
      setMessage("只有管理员可以修改成员权限。");
      return;
    }

    setTeamSavingId(memberId);
    setMessage("");

    try {
      const updated = await updateTeamMemberRole(memberId, role);
      setTeamMembers((current) =>
        current.map((member) => (member.id === memberId ? updated : member)),
      );
      setMessage("成员权限已更新。");
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    } finally {
      setTeamSavingId("");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setCustomers([]);
    setTeamMembers([]);
    setSelectedId("");
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5 text-[#111827]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-[#176b87]">Daystar CRM</p>
          <h1 className="mt-2 text-xl font-semibold">正在验证飞书登录状态</h1>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-5 text-[#111827]">
        <section className="w-full max-w-md rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#176b87]">Daystar CRM</p>
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
    <main className="min-h-screen bg-[#f5f7fb] text-[#111827]">
      <div className="min-h-screen xl:grid xl:grid-cols-[250px_1fr]">
        <aside className="border-b border-[#0c4b64] bg-gradient-to-b from-[#075985] via-[#075070] to-[#06394e] px-4 py-5 text-white xl:sticky xl:top-0 xl:h-screen xl:border-b-0 xl:border-r">
          <div className="flex items-center gap-3 px-1">
            <span className="grid size-10 place-items-center rounded-lg bg-white/10 text-white ring-1 ring-white/15">
              <Star className="size-7" strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-lg font-semibold">Daystar CRM</p>
              <p className="text-xs text-white/65">CRM Workspace</p>
            </div>
          </div>

          <nav className="mt-8 grid gap-2 text-sm font-medium">
            {navItems.map((item) => {
              const enabled =
                item.key === "customers" ||
                item.key === "finance" ||
                item.key === "team" ||
                item.key === "workbench";
              const active = activeModule === item.key;
              const Icon = item.icon;

              return (
                <button
                  className={`flex items-center justify-between rounded-md px-3 py-3 text-left ${
                    active
                      ? "bg-[#0876a7] text-white shadow-sm"
                      : enabled
                        ? "text-white/82 hover:bg-white/10"
                        : "text-white/55"
                  }`}
                  disabled={!enabled}
                  key={item.key}
                  onClick={() => {
                    if (
                      item.key === "customers" ||
                      item.key === "finance" ||
                      item.key === "team" ||
                      item.key === "workbench"
                    ) {
                      setActiveModule(item.key);
                      if (item.key !== "customers") {
                        setDrawerOpen(false);
                      } else if (selectedCustomer) {
                        openEdit(selectedCustomer);
                      }
                    }
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  {!enabled ? <span className="text-xs text-white/45">待扩展</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden pt-8 xl:block">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/65">
              当前账号：{session.fullName || session.email}
              <br />
              权限：{roleLabels[session.role || "staff"]}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#dfe3ea] bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#176b87]">
                    {activeModule === "customers"
                      ? "客户管理"
                      : activeModule === "finance"
                        ? "财务管理"
                      : activeModule === "workbench"
                        ? "每日工作台"
                        : "团队管理"}
                  </p>
                  <h1 className="text-xl font-semibold">
                    {activeModule === "customers"
                      ? "客户资料"
                      : activeModule === "finance"
                        ? "TikTok 充值中心"
                      : activeModule === "workbench"
                        ? "每日工作台"
                        : "团队成员与权限"}
                  </h1>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeModule === "workbench" ? (
                  <>
                    <div className="hidden min-w-[420px] items-center gap-2 rounded-lg border border-[#d7dce4] bg-white px-3 py-2 text-sm text-[#98a2b3] lg:flex">
                      <Search className="size-4" />
                      搜索客户、联系人、任务、文件...
                    </div>
                    <button className="rounded-full border border-[#e1e6ee] bg-white p-2.5 text-[#111827]" type="button">
                      <Bell className="size-5" />
                    </button>
                    <button className="rounded-full border border-[#e1e6ee] bg-white p-2.5 text-[#111827]" type="button">
                      <HelpCircle className="size-5" />
                    </button>
                  </>
                ) : null}
                {activeModule === "customers" ? (
                  <button
                    className="rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#145b73]"
                    onClick={openCreate}
                    type="button"
                  >
                    新建客户
                  </button>
                ) : null}
                <button
                  className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                  onClick={signOut}
                  type="button"
                >
                  退出
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-5 px-5 py-5">
            {message ? (
              <div className="rounded-md border border-[#f0d6a4] bg-[#fffaf0] px-4 py-3 text-sm text-[#8a4b0f]">
                {message}
              </div>
            ) : null}

            {activeModule === "customers" ? (
              <section className="grid gap-0">
                <section className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
                  <div className="border-b border-[#e5e7eb] bg-white p-4">
                    <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_160px_auto_auto_auto] xl:items-center">
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" />
                        <input
                          className="field pl-9"
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="搜索公司名称 / 联系人 / 电话"
                          value={query}
                        />
                      </label>
                      <select
                        className="field"
                        onChange={(event) =>
                          setStatusFilter(event.target.value as CustomerStatus | "全部")
                        }
                        value={statusFilter}
                      >
                        <option value="全部">全部状态</option>
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-[#d7dce4] bg-white px-3 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                        onClick={() => {
                          setOwnerFilter("全部");
                          setRegionFilter("全部");
                        }}
                        type="button"
                      >
                        <Filter className="size-4" />
                        更多筛选
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-md border border-[#d7dce4] bg-white p-2.5 text-[#334155] hover:bg-[#f8fafc]"
                        onClick={refreshCustomers}
                        type="button"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-[#075f8d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#064f75]"
                        onClick={openCreate}
                        type="button"
                      >
                        <Plus className="size-4" />
                        新建客户
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[calc(100vh-205px)] overflow-auto">
                      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-white text-xs text-[#667085]">
                          <tr className="border-b border-[#edf0f4]">
                            {[
                              "公司名称",
                              "联系人",
                              "地区",
                              "行业",
                              "状态",
                              "创建时间",
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
                              className={`cursor-pointer border-b border-[#edf0f4] transition hover:bg-[#f8fbfc] ${
                                selectedCustomer?.id === customer.id ? "bg-[#eef8fb]" : ""
                              }`}
                              key={customer.id}
                              onClick={() => openEdit(customer)}
                            >
                              <td className="min-w-[220px] px-4 py-3">
                                <button
                                  className="text-left font-semibold text-[#075f8d] hover:text-[#064f75]"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEdit(customer);
                                  }}
                                  type="button"
                                >
                                  {customer.company}
                                </button>
                                <p className="mt-1 text-xs text-[#667085]">
                                  {customer.ownerName || "未分配负责人"}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-medium">{customer.contact}</p>
                                <p className="mt-1 text-xs text-[#667085]">
                                  {customer.phone || customer.email || "-"}
                                </p>
                              </td>
                              <td className="px-4 py-3">{customer.region || "-"}</td>
                              <td className="px-4 py-3">{customer.industry || "-"}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass(
                                    customer.status,
                                  )}`}
                                >
                                  {customer.status}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {customer.createdAt || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!filteredCustomers.length ? (
                        <div className="px-5 py-12 text-center text-sm text-[#667085]">
                          暂无客户数据。
                        </div>
                      ) : null}
                    </div>
                </section>
              </section>
            ) : activeModule === "finance" ? (
              <RechargeCenter
                canApprove={canManageTeam}
                currentName={session.fullName || session.email}
                customers={customers}
              />
            ) : activeModule === "workbench" ? (
              <DailyWorkbench
                currentName={session.fullName || session.email}
                currentRole={canManageTeam ? "manager" : session.role || "staff"}
                teamMembers={teamMembers}
              />
            ) : (
              <section className="grid content-start gap-5">
                <div className="grid auto-rows-max gap-3 md:grid-cols-4">
                  {teamStats.map((item) => (
                    <div
                      className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm"
                      key={item.label}
                    >
                      <p className="text-sm text-[#667085]">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-[#111827]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
                  <div className="border-b border-[#e5e7eb] bg-[#fbfcfd] p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">团队成员</h2>
                        <p className="mt-1 text-sm text-[#667085]">
                          查看飞书登录成员、在线状态，并为成员分配 CRM 操作权限。
                        </p>
                      </div>
                      <button
                        className="rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-sm font-semibold text-[#334155] hover:bg-[#f8fafc]"
                        onClick={async () => {
                          try {
                            const team = await fetchTeamMembers();
                            setTeamMembers(team.members);
                            setSession((current) =>
                              current ? { ...current, role: team.currentRole } : current,
                            );
                          } catch (error: unknown) {
                            setMessage(errorMessage(error));
                          }
                        }}
                        type="button"
                      >
                        刷新状态
                      </button>
                    </div>
                  </div>

                  <div className="overflow-auto">
                    <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                      <thead className="bg-[#f8fafc] text-xs text-[#64748b]">
                        <tr>
                          {["成员", "邮箱", "在线状态", "最后活跃", "权限", "操作"].map(
                            (heading) => (
                              <th className="px-4 py-3 font-semibold" key={heading}>
                                {heading}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => {
                          const online = isMemberOnline(member);

                          return (
                            <tr
                              className="border-t border-[#edf0f4] hover:bg-[#f8fbfc]"
                              key={member.id}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="grid size-9 place-items-center rounded-md bg-[#e6f4f0] text-sm font-semibold text-[#176b87]">
                                    {(member.full_name || member.email || "?")
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-[#111827]">
                                      {member.full_name}
                                    </p>
                                    <p className="text-xs text-[#667085]">
                                      {member.id === session.userId ? "当前账号" : "团队成员"}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#334155]">
                                {member.email || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                                    online
                                      ? "bg-[#e8f7ef] text-[#197247]"
                                      : "bg-[#eef2f7] text-[#64748b]"
                                  }`}
                                >
                                  {online ? "在线" : "离线"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {formatLastSeen(member.last_seen_at)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-md bg-[#eef2f7] px-2 py-1 text-xs font-semibold text-[#344054]">
                                  {roleLabels[member.role]}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  className="field max-w-36 py-2 text-sm"
                                  disabled={
                                    !canManageTeam ||
                                    teamSavingId === member.id ||
                                    member.id === session.userId
                                  }
                                  onChange={(event) =>
                                    changeMemberRole(
                                      member.id,
                                      event.target.value as TeamRole,
                                    )
                                  }
                                  value={member.role}
                                >
                                  {(["admin", "manager", "staff"] as TeamRole[]).map(
                                    (role) => (
                                      <option key={role} value={role}>
                                        {roleLabels[role]}
                                      </option>
                                    ),
                                  )}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {teamMembers.length === 0 ? (
                      <div className="px-5 py-12 text-center text-sm text-[#667085]">
                        暂无团队成员。成员完成飞书登录后会自动出现在这里。
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className="pointer-events-none fixed inset-y-0 right-0 z-50 w-full max-w-[42vw] min-w-[620px]">
          <form
            className="pointer-events-auto ml-auto flex h-full w-full flex-col rounded-l-xl border-l border-[#dfe3ea] bg-white shadow-2xl"
            onSubmit={handleSubmit}
          >
            <div className="border-b border-[#e5e7eb] px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">客户详情</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="grid size-10 place-items-center rounded-full bg-[#dbeafe] text-[#075f8d]">
                      <Building2 className="size-5" />
                    </span>
                    <h2 className="text-xl font-semibold">
                      {editingId ? form.company || "编辑客户" : "新增客户"}
                    </h2>
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClass(form.status)}`}>
                      {form.status}
                    </span>
                  </div>
                </div>
                <button
                  className="rounded-md p-2 text-[#111827] hover:bg-[#f2f5f8]"
                  onClick={closeDrawer}
                  type="button"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="mt-4 flex gap-4 border-b border-[#edf0f4] text-sm font-semibold">
                {[
                  ["basic", "基础信息"],
                  ["contact", "联系方式"],
                  ["accounts", "广告账户"],
                  ["files", "文件资料"],
                ].map(([key, label]) => (
                  <button
                    className={`border-b-2 px-1 pb-2 ${
                      activeDrawerTab === key
                        ? "border-[#176b87] text-[#176b87]"
                        : "border-transparent text-[#667085]"
                    }`}
                    key={key}
                    onClick={() =>
                      setActiveDrawerTab(key as typeof activeDrawerTab)
                    }
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid flex-1 content-start gap-5 overflow-y-auto px-5 py-5">
              {activeDrawerTab === "basic" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      公司名称
                      <input
                        className="field"
                        onChange={(event) => updateField("company", event.target.value)}
                        placeholder="例如 广州云海贸易有限公司"
                        required
                        value={form.company}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      地区
                      <input
                        className="field"
                        onChange={(event) => updateField("region", event.target.value)}
                        placeholder="广东 广州"
                        value={form.region}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      行业
                      <input
                        className="field"
                        onChange={(event) => updateField("industry", event.target.value)}
                        placeholder="贸易/批发"
                        value={form.industry}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      来源
                      <select
                        className="field"
                        onChange={(event) => updateField("source", event.target.value)}
                        value={form.source}
                      >
                        {sourceOptions.map((source) => (
                          <option key={source}>{source}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      状态
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
                    <label className="grid gap-1.5 text-sm font-medium">
                      负责人
                      <input
                        className="field"
                        onChange={(event) => updateField("ownerName", event.target.value)}
                        placeholder="内部负责人"
                        value={form.ownerName}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium">
                      合作开始时间
                      <input
                        className="field"
                        onChange={(event) =>
                          updateField("cooperationStart", event.target.value)
                        }
                        type="date"
                        value={form.cooperationStart}
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                      备注
                      <textarea
                        className="field min-h-24 resize-y"
                        onChange={(event) => updateField("notes", event.target.value)}
                        placeholder="客户主要经营范围、预算、当前跟进情况"
                        value={form.notes}
                      />
                    </label>
                  </div>
                </>
              ) : null}

              {activeDrawerTab === "contact" ? (
                <div className="grid gap-4 sm:grid-cols-2">
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
                    电话
                    <input
                      className="field"
                      onChange={(event) => updateField("phone", event.target.value)}
                      placeholder="+66 / +86"
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
                  <label className="grid gap-1.5 text-sm font-medium">
                    Line / Lark
                    <input
                      className="field"
                      onChange={(event) => updateField("lineLark", event.target.value)}
                      placeholder="Line 或 Lark"
                      value={form.lineLark}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    邮箱
                    <input
                      className="field"
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      value={form.email}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    TikTok 店铺
                    <input
                      className="field"
                      onChange={(event) => updateField("tiktok", event.target.value)}
                      placeholder="@shop 或 URL"
                      value={form.tiktok}
                    />
                  </label>
                </div>
              ) : null}

              {activeDrawerTab === "accounts" ? (
                <div className="grid gap-4">
                  {form.adAccounts.map((account, index) => (
                    <section
                      className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-4"
                      key={index}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">广告账户 {index + 1}</h3>
                        <button
                          className="table-action"
                          onClick={() => removeAdAccount(index)}
                          type="button"
                        >
                          移除
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm font-medium">
                          账户名称
                          <input
                            className="field"
                            onChange={(event) =>
                              updateAdAccount(index, "accountName", event.target.value)
                            }
                            placeholder="云海贸易-TikTok-001"
                            value={account.accountName}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                          账户 ID
                          <input
                            className="field"
                            onChange={(event) =>
                              updateAdAccount(index, "accountId", event.target.value)
                            }
                            placeholder="广告账户 ID"
                            value={account.accountId}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                          Business Center ID
                          <input
                            className="field"
                            onChange={(event) =>
                              updateAdAccount(index, "businessCenterId", event.target.value)
                            }
                            placeholder="BC ID"
                            value={account.businessCenterId}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                          返点倍率
                          <input
                            className="field"
                            onChange={(event) =>
                              updateAdAccount(index, "rebateRate", event.target.value)
                            }
                            placeholder="1.20"
                            value={account.rebateRate}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                          状态
                          <select
                            className="field"
                            onChange={(event) =>
                              updateAdAccount(
                                index,
                                "status",
                                event.target.value as AdAccount["status"],
                              )
                            }
                            value={account.status}
                          >
                            <option>启用</option>
                            <option>暂停</option>
                            <option>已关闭</option>
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                          账户备注
                          <input
                            className="field"
                            onChange={(event) =>
                              updateAdAccount(index, "notes", event.target.value)
                            }
                            placeholder="异常账户、来源、负责人备注"
                            value={account.notes}
                          />
                        </label>
                      </div>
                    </section>
                  ))}
                  <button
                    className="rounded-md border border-[#c7d7df] bg-white px-4 py-2.5 text-sm font-semibold text-[#176b87] hover:bg-[#f8fbfc]"
                    onClick={addAdAccount}
                    type="button"
                  >
                    添加广告账户
                  </button>
                </div>
              ) : null}

              {activeDrawerTab === "files" ? (
                <div className="grid gap-4">
                  {[
                    {
                      current: form.businessLicenseUrl,
                      file: licenseFile,
                      label: "营业执照",
                      onChange: setLicenseFile,
                    },
                    {
                      current: form.dbdUrl,
                      file: dbdFile,
                      label: "DBD 文件",
                      onChange: setDbdFile,
                    },
                  ].map((item) => (
                    <section
                      className="rounded-lg border border-[#dfe3ea] bg-[#fbfcfd] p-4"
                      key={item.label}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold">{item.label}</h3>
                          <p className="mt-1 text-xs text-[#667085]">
                            {item.file
                              ? item.file.name
                              : item.current
                                ? "已上传，可重新选择文件覆盖"
                                : "未上传"}
                          </p>
                        </div>
                        {item.current ? (
                          <a
                            className="text-sm font-semibold text-[#176b87] hover:underline"
                            href={item.current}
                            rel="noreferrer"
                            target="_blank"
                          >
                            查看文件
                          </a>
                        ) : null}
                      </div>
                      <input
                        className="mt-4 block w-full text-sm"
                        onChange={(event) =>
                          item.onChange(event.target.files?.[0] ?? null)
                        }
                        type="file"
                      />
                    </section>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#e5e7eb] px-5 py-4">
              {editingId && selectedCustomer ? (
                <button
                  className="rounded-md border border-[#f0c4c4] px-4 py-2.5 text-sm font-semibold text-[#9f1d1d] hover:bg-[#fff5f5]"
                  disabled={saving}
                  onClick={() => handleArchive(selectedCustomer)}
                  type="button"
                >
                  标记流失
                </button>
              ) : (
                <span className="text-sm text-[#667085]">保存后将写入客户数据库</span>
              )}
              <div className="flex gap-2">
                <button
                  className="rounded-md border border-[#d7dce4] px-4 py-2.5 text-sm font-semibold text-[#334155]"
                  onClick={closeDrawer}
                  type="button"
                >
                  关闭
                </button>
                <button
                  className="rounded-md bg-[#176b87] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#145b73] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "保存中..." : "保存变更"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
