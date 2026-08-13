"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Ban,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Landmark,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";

export type RechargeCustomer = {
  id: string;
  company: string;
  adAccounts: {
    accountId: string;
    accountName: string;
    businessCenterId: string;
    rebateRate: string;
    status: "启用" | "暂停" | "已关闭";
  }[];
};

type RechargeStatus = "pending" | "approved" | "rejected" | "completed";

type RechargeRequest = {
  id: string;
  company: string;
  accountName: string;
  advertiserId: string;
  businessCenterId: string;
  amount: number;
  currency: "THB" | "USD";
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: RechargeStatus;
};

type AccountOption = {
  key: string;
  customerId: string;
  company: string;
  accountName: string;
  advertiserId: string;
  businessCenterId: string;
  rebateRate: string;
  status: string;
};

type BusinessCenterOption = {
  id: string;
  name: string;
  currency: "THB" | "USD";
  financeRole: string;
  accounts: AccountOption[];
};

type RechargeCenterProps = {
  customers: RechargeCustomer[];
  currentName: string;
  canApprove: boolean;
  previewMode?: boolean;
};

const demoBusinessCenters: BusinessCenterOption[] = [
  {
    id: "7280••••••••9011",
    name: "Daystar Thailand Agency",
    currency: "THB",
    financeRole: "Finance Manager",
    accounts: [
      {
        key: "demo-ceo-aura-rich",
        customerId: "demo-ceo-aura-rich",
        company: "CEO Aura Rich",
        accountName: "CEO Aura Rich - GMV Max",
        advertiserId: "7500••••••••8455",
        businessCenterId: "7280••••••••9011",
        rebateRate: "1.00",
        status: "Active",
      },
      {
        key: "demo-th-market",
        customerId: "demo-th-market",
        company: "泰国市场示例客户",
        accountName: "TH Shop Ads 01",
        advertiserId: "7500••••••••0412",
        businessCenterId: "7280••••••••9011",
        rebateRate: "1.05",
        status: "Active",
      },
      {
        key: "demo-beauty-live",
        customerId: "demo-beauty-live",
        company: "美妆直播示例客户",
        accountName: "Beauty Live - Always On",
        advertiserId: "7498••••••••2236",
        businessCenterId: "7280••••••••9011",
        rebateRate: "1.00",
        status: "Active",
      },
    ],
  },
  {
    id: "7279••••••••1804",
    name: "Daystar SEA USD",
    currency: "USD",
    financeRole: "Finance Manager",
    accounts: [
      {
        key: "demo-sea-always-on",
        customerId: "demo-sea-always-on",
        company: "跨境品牌示例",
        accountName: "SEA Always On",
        advertiserId: "7499••••••••6710",
        businessCenterId: "7279••••••••1804",
        rebateRate: "1.00",
        status: "Active",
      },
      {
        key: "demo-sea-scale",
        customerId: "demo-sea-scale",
        company: "东南亚增长示例",
        accountName: "SEA Scale Campaign",
        advertiserId: "7497••••••••5902",
        businessCenterId: "7279••••••••1804",
        rebateRate: "1.00",
        status: "Active",
      },
    ],
  },
];

const demoRequests: RechargeRequest[] = [
  {
    id: "RC20260813003",
    company: "CEO Aura Rich",
    accountName: "CEO Aura Rich - GMV Max",
    advertiserId: "7500••••••••8455",
    businessCenterId: "已绑定 BC（预览脱敏）",
    amount: 50000,
    currency: "THB",
    reason: "GMV Max 日常预算补充",
    requestedBy: "何震洋",
    requestedAt: "2026-08-13 10:24",
    status: "pending",
  },
  {
    id: "RC20260812008",
    company: "泰国市场示例客户",
    accountName: "TH Shop Ads 01",
    advertiserId: "7500••••••••0412",
    businessCenterId: "7280••••••••9011",
    amount: 20000,
    currency: "THB",
    reason: "大促前预算补充",
    requestedBy: "Jay",
    requestedAt: "2026-08-12 16:40",
    status: "approved",
  },
  {
    id: "RC20260811005",
    company: "跨境品牌示例",
    accountName: "SEA Always On",
    advertiserId: "7499••••••••6710",
    businessCenterId: "7279••••••••1804",
    amount: 1200,
    currency: "USD",
    reason: "常规账户余额补充",
    requestedBy: "Finance",
    requestedAt: "2026-08-11 14:12",
    status: "completed",
  },
];

const statusMeta: Record<
  RechargeStatus,
  { label: string; className: string; icon: typeof Clock3 }
> = {
  pending: {
    label: "待审批",
    className: "bg-[#fff7e6] text-[#9a5b08]",
    icon: Clock3,
  },
  approved: {
    label: "已批准 · 待执行",
    className: "bg-[#e8f1ff] text-[#175cd3]",
    icon: FileCheck2,
  },
  rejected: {
    label: "已驳回",
    className: "bg-[#fff0f0] text-[#b42318]",
    icon: XCircle,
  },
  completed: {
    label: "已完成",
    className: "bg-[#e7f6ee] text-[#167044]",
    icon: CheckCircle2,
  },
};

function formatMoney(amount: number, currency: "THB" | "USD") {
  return new Intl.NumberFormat("zh-CN", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);
}

function requestId() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  return `RC${date}${String(now.getTime()).slice(-4)}`;
}

export default function RechargeCenter({
  customers,
  currentName,
  canApprove,
  previewMode = false,
}: RechargeCenterProps) {
  const businessCenters = useMemo(() => {
    const items = customers.flatMap((customer) =>
      customer.adAccounts
        .filter(
          (account) =>
            account.status === "启用" &&
            account.accountId &&
            account.businessCenterId,
        )
        .map((account, index) => ({
          key: `${customer.id}-${account.accountId}-${index}`,
          customerId: customer.id,
          company: customer.company,
          accountName: account.accountName || "未命名广告账户",
          advertiserId: account.accountId,
          businessCenterId: account.businessCenterId,
          rebateRate: account.rebateRate || "1.00",
          status: "Active",
        })),
    );

    if (!items.length) {
      return previewMode ? demoBusinessCenters : [];
    }

    const grouped = new Map<string, AccountOption[]>();

    items.forEach((account) => {
      grouped.set(account.businessCenterId, [
        ...(grouped.get(account.businessCenterId) || []),
        account,
      ]);
    });

    return Array.from(grouped.entries()).map(([businessCenterId, accounts]) => ({
      id: businessCenterId,
      name: `Business Center · ${businessCenterId}`,
      currency: "THB" as const,
      financeRole: "CRM 已绑定",
      accounts,
    }));
  }, [customers, previewMode]);

  const [requests, setRequests] = useState<RechargeRequest[]>(
    previewMode ? demoRequests : [],
  );
  const [activeTab, setActiveTab] = useState<"requests" | "audit">("requests");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RechargeStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBusinessCenterId, setSelectedBusinessCenterId] = useState(
    businessCenters[0]?.id || "",
  );
  const [selectedAccountKey, setSelectedAccountKey] = useState(
    businessCenters[0]?.accounts[0]?.key || "",
  );
  const [advertiserSearch, setAdvertiserSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"THB" | "USD">("THB");
  const [reason, setReason] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [message, setMessage] = useState("");

  const selectedBusinessCenter =
    businessCenters.find((item) => item.id === selectedBusinessCenterId) ??
    businessCenters[0];
  const visibleAdvertisers = useMemo(() => {
    const keyword = advertiserSearch.trim().toLowerCase();

    return (selectedBusinessCenter?.accounts || []).filter((account) =>
      [account.company, account.accountName, account.advertiserId]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [advertiserSearch, selectedBusinessCenter]);
  const selectedAccount =
    selectedBusinessCenter?.accounts.find(
      (item) => item.key === selectedAccountKey,
    ) ?? selectedBusinessCenter?.accounts[0];

  function selectBusinessCenter(id: string) {
    const next = businessCenters.find((item) => item.id === id);

    setSelectedBusinessCenterId(id);
    setSelectedAccountKey(next?.accounts[0]?.key || "");
    setAdvertiserSearch("");
    if (next) {
      setCurrency(next.currency);
    }
  }

  const visibleRequests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return requests.filter((request) => {
      const searchable = [
        request.id,
        request.company,
        request.accountName,
        request.advertiserId,
        request.businessCenterId,
        request.requestedBy,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || searchable.includes(keyword)) &&
        (statusFilter === "all" || request.status === statusFilter)
      );
    });
  }, [requests, search, statusFilter]);

  const pendingCount = requests.filter((item) => item.status === "pending").length;
  const approvedCount = requests.filter((item) => item.status === "approved").length;
  const thbTotal = requests
    .filter((item) => item.currency === "THB" && item.status !== "rejected")
    .reduce((sum, item) => sum + item.amount, 0);

  function submitRequest(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const numericAmount = Number(amount);

    if (!selectedAccount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("请选择广告账户并填写正确的充值金额。");
      return;
    }

    const now = new Intl.DateTimeFormat("zh-CN", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .format(new Date())
      .replaceAll("/", "-");

    setRequests((current) => [
      {
        id: requestId(),
        company: selectedAccount.company,
        accountName: selectedAccount.accountName,
        advertiserId: selectedAccount.advertiserId,
        businessCenterId: selectedAccount.businessCenterId,
        amount: numericAmount,
        currency,
        reason: reason.trim() || "账户余额补充",
        requestedBy: currentName,
        requestedAt: now,
        status: "pending",
      },
      ...current,
    ]);
    setAmount("");
    setReason("");
    setEvidenceName("");
    setFormOpen(false);
    setMessage("充值申请已加入预览审批队列；未调用 TikTok 资金接口。");
  }

  function changeStatus(id: string, status: RechargeStatus) {
    if (!canApprove && (status === "approved" || status === "rejected")) {
      setMessage("当前账号没有审批权限。");
      return;
    }

    setRequests((current) =>
      current.map((request) => (request.id === id ? { ...request, status } : request)),
    );
    setMessage(
      status === "approved"
        ? "审批模拟已完成；资金执行仍保持锁定。"
        : status === "rejected"
          ? "申请已在预览队列中驳回。"
          : "已标记为模拟完成；没有发生真实充值。",
    );
  }

  return (
    <section className="grid content-start gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-[#f0cf8a] bg-[#fffaf0] px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[#fff0c2] text-[#9a5b08]">
            <LockKeyhole className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#7a4709]">
              第一版预览 · 真实充值已锁定
            </p>
            <p className="mt-1 text-xs leading-5 text-[#8a5c22]">
              本页面只演示申请、审批和审计流程，不会调用 TikTok BC Transfer，也不会改变任何广告设置。
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#e7c77c] bg-white px-3 py-1.5 text-xs font-semibold text-[#7a4709]">
          <ShieldCheck className="size-3.5" />
          安全预览模式
        </span>
      </div>

      {message ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[#b7d9ce] bg-[#f0fbf7] px-4 py-3 text-sm text-[#176b57]">
          <span>{message}</span>
          <button onClick={() => setMessage("")} type="button">
            <XCircle className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "TikTok MCP",
            value: "只读已验证",
            detail: "开发会话快照",
            icon: BadgeCheck,
            tone: "text-[#167044] bg-[#e7f6ee]",
          },
          {
            label: "可访问 Business Center",
            value: "45",
            detail: "其中 Finance Manager 24 个",
            icon: Landmark,
            tone: "text-[#175cd3] bg-[#e8f1ff]",
          },
          {
            label: "待处理申请",
            value: String(pendingCount + approvedCount),
            detail: `${pendingCount} 待审批 · ${approvedCount} 待执行`,
            icon: Clock3,
            tone: "text-[#9a5b08] bg-[#fff7e6]",
          },
          {
            label: "队列金额（THB）",
            value: new Intl.NumberFormat("zh-CN").format(thbTotal),
            detail: "预览数据，不代表真实余额",
            icon: WalletCards,
            tone: "text-[#7f3f98] bg-[#f6ebfb]",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm"
              key={item.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#667085]">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-[#111827]">{item.value}</p>
                  <p className="mt-1 text-xs text-[#98a2b3]">{item.detail}</p>
                </div>
                <span className={`grid size-9 place-items-center rounded-md ${item.tone}`}>
                  <Icon className="size-4.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
          <div className="border-b border-[#e5e7eb] px-5 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">充值申请</h2>
                <p className="mt-1 text-xs text-[#667085]">
                  客户、广告账户和 BC ID 来自 CRM 客户档案。
                </p>
              </div>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#075f8d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#064f75]"
                onClick={() => setFormOpen((current) => !current)}
                type="button"
              >
                <Plus className="size-4" />
                新建充值申请
              </button>
            </div>
            <div className="mt-4 flex gap-5 text-sm font-semibold">
              {[
                ["requests", "申请队列"],
                ["audit", "审批与审计"],
              ].map(([key, label]) => (
                <button
                  className={`border-b-2 pb-3 ${
                    activeTab === key
                      ? "border-[#176b87] text-[#176b87]"
                      : "border-transparent text-[#667085]"
                  }`}
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {formOpen ? (
            <form
              className="grid gap-4 border-b border-[#dfe3ea] bg-[#f8fbfc] p-5"
              onSubmit={submitRequest}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">创建内部充值申请</h3>
                  <p className="mt-1 text-xs text-[#667085]">
                    提交后仅进入审批队列，不会直接执行资金转移。
                  </p>
                </div>
                <button
                  className="rounded-md p-1.5 text-[#667085] hover:bg-white"
                  onClick={() => setFormOpen(false)}
                  type="button"
                >
                  <XCircle className="size-4.5" />
                </button>
              </div>
              {businessCenters.length ? (
                <div className="grid gap-5">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      ["1", "选择 Business Center"],
                      ["2", "选择广告账户"],
                      ["3", "填写充值金额"],
                    ].map(([step, label]) => (
                      <div
                        className="flex items-center gap-2 rounded-md border border-[#d7e4e9] bg-white px-3 py-2.5"
                        key={step}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#176b87] text-xs font-semibold text-white">
                          {step}
                        </span>
                        <span className="text-xs font-semibold text-[#344054]">
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <section className="grid gap-3 rounded-lg border border-[#dfe3ea] bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">
                          1. 选择 Business Center
                        </p>
                        <p className="mt-1 text-xs text-[#667085]">
                          选择资金来源 BC，系统随后读取该 BC 下的全部广告账户。
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-[#e7f6ee] px-2.5 py-1 text-xs font-semibold text-[#167044]">
                        {selectedBusinessCenter?.financeRole}
                      </span>
                    </div>
                    <label className="grid gap-1.5 text-sm font-medium">
                      Business Center
                      <select
                        className="field"
                        onChange={(event) => selectBusinessCenter(event.target.value)}
                        value={selectedBusinessCenter?.id || ""}
                      >
                        {businessCenters.map((businessCenter) => (
                          <option key={businessCenter.id} value={businessCenter.id}>
                            {businessCenter.name} · {businessCenter.id} ·{" "}
                            {businessCenter.currency}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-md bg-[#f8fafc] px-3 py-2.5">
                        <p className="text-xs text-[#667085]">BC ID</p>
                        <p className="mt-1 font-mono text-xs font-semibold text-[#344054]">
                          {selectedBusinessCenter?.id || "-"}
                        </p>
                      </div>
                      <div className="rounded-md bg-[#f8fafc] px-3 py-2.5">
                        <p className="text-xs text-[#667085]">账户币种</p>
                        <p className="mt-1 text-sm font-semibold text-[#344054]">
                          {selectedBusinessCenter?.currency || "-"}
                        </p>
                      </div>
                      <div className="rounded-md bg-[#f8fafc] px-3 py-2.5">
                        <p className="text-xs text-[#667085]">广告账户数量</p>
                        <p className="mt-1 text-sm font-semibold text-[#344054]">
                          {selectedBusinessCenter?.accounts.length || 0} 个
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="grid gap-3 rounded-lg border border-[#dfe3ea] bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">
                          2. 选择广告账户
                        </p>
                        <p className="mt-1 text-xs text-[#667085]">
                          当前显示 {selectedBusinessCenter?.name} 下的全部广告账户。
                        </p>
                      </div>
                      <label className="relative block w-full lg:max-w-[340px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" />
                        <input
                          className="field pl-9"
                          onChange={(event) => setAdvertiserSearch(event.target.value)}
                          placeholder="搜索账户名称或 Advertiser ID"
                          value={advertiserSearch}
                        />
                      </label>
                    </div>
                    <div className="grid max-h-[300px] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
                      {visibleAdvertisers.map((account) => {
                        const selected = selectedAccount?.key === account.key;

                        return (
                          <button
                            aria-pressed={selected}
                            className={`flex items-start gap-3 rounded-md border p-3 text-left transition ${
                              selected
                                ? "border-[#176b87] bg-[#eef8fb] ring-1 ring-[#176b87]/20"
                                : "border-[#dfe3ea] bg-white hover:border-[#9db8c5] hover:bg-[#fbfdfe]"
                            }`}
                            key={account.key}
                            onClick={() => setSelectedAccountKey(account.key)}
                            type="button"
                          >
                            <span
                              className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-md ${
                                selected
                                  ? "bg-[#176b87] text-white"
                                  : "bg-[#edf3f6] text-[#176b87]"
                              }`}
                            >
                              {selected ? (
                                <Check className="size-4" />
                              ) : (
                                <Building2 className="size-4" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-[#111827]">
                                  {account.accountName}
                                </span>
                                <span className="shrink-0 rounded-full bg-[#e7f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#167044]">
                                  {account.status}
                                </span>
                              </span>
                              <span className="mt-1 block truncate text-xs text-[#667085]">
                                {account.company}
                              </span>
                              <span className="mt-2 block font-mono text-xs text-[#475467]">
                                Advertiser ID: {account.advertiserId}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {!visibleAdvertisers.length ? (
                      <div className="rounded-md bg-[#f8fafc] px-4 py-8 text-center text-sm text-[#667085]">
                        没有找到符合条件的广告账户。
                      </div>
                    ) : null}
                  </section>

                  {selectedAccount ? (
                    <section className="grid gap-4 rounded-lg border border-[#b8d4df] bg-[#f4fafc] p-4">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">
                          3. 填写充值金额
                        </p>
                        <p className="mt-1 text-xs text-[#667085]">
                          已选择 {selectedAccount.accountName}（{selectedAccount.advertiserId}）
                        </p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <label className="grid gap-1.5 text-sm font-medium">
                          充值金额
                          <input
                            className="field"
                            min="0.01"
                            onChange={(event) => setAmount(event.target.value)}
                            placeholder="50000"
                            required
                            step="0.01"
                            type="number"
                            value={amount}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                          币种
                          <select
                            className="field"
                            onChange={(event) =>
                              setCurrency(event.target.value as "THB" | "USD")
                            }
                            value={currency}
                          >
                            <option value="THB">THB · 泰铢</option>
                            <option value="USD">USD · 美元</option>
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium lg:col-span-2">
                          申请原因
                          <textarea
                            className="field min-h-20 resize-y"
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="例如：GMV Max 日常预算补充"
                            value={reason}
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium lg:col-span-2">
                          付款凭证（预览）
                          <input
                            className="block rounded-md border border-dashed border-[#b8c5d1] bg-white px-3 py-3 text-sm text-[#667085]"
                            onChange={(event) =>
                              setEvidenceName(event.target.files?.[0]?.name || "")
                            }
                            type="file"
                          />
                          {evidenceName ? (
                            <span className="text-xs text-[#176b87]">
                              已选择：{evidenceName}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-md border border-[#f0cf8a] bg-white p-4 text-sm text-[#8a4b0f]">
                  还没有可用的 Business Center。请先完成 TikTok MCP 连接或在客户档案中录入 BC ID。
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-[#667085]">
                  <LockKeyhole className="size-3.5" />
                  资金执行接口未启用
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-[#d7dce4] bg-white px-4 py-2 text-sm font-semibold text-[#334155]"
                    onClick={() => setFormOpen(false)}
                    type="button"
                  >
                    取消
                  </button>
                  <button
                    className="rounded-md bg-[#176b87] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!selectedAccount}
                    onClick={() => submitRequest()}
                    type="button"
                  >
                    提交审批
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {activeTab === "requests" ? (
            <>
              <div className="grid gap-3 border-b border-[#edf0f4] p-4 md:grid-cols-[1fr_170px_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" />
                  <input
                    className="field pl-9"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="搜索申请编号、客户、广告账户"
                    value={search}
                  />
                </label>
                <select
                  className="field"
                  onChange={(event) =>
                    setStatusFilter(event.target.value as RechargeStatus | "all")
                  }
                  value={statusFilter}
                >
                  <option value="all">全部状态</option>
                  <option value="pending">待审批</option>
                  <option value="approved">已批准 · 待执行</option>
                  <option value="completed">已完成</option>
                  <option value="rejected">已驳回</option>
                </select>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[#d7dce4] bg-white px-3 py-2 text-sm font-semibold text-[#334155]"
                  type="button"
                >
                  <RefreshCw className="size-4" />
                  刷新
                </button>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs text-[#64748b]">
                    <tr>
                      {[
                        "申请编号",
                        "客户 / 广告账户",
                        "目标账户",
                        "金额",
                        "状态",
                        "申请人 / 时间",
                        "操作",
                      ].map((heading) => (
                        <th className="px-4 py-3 font-semibold" key={heading}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((request) => {
                      const meta = statusMeta[request.status];
                      const StatusIcon = meta.icon;

                      return (
                        <tr className="border-t border-[#edf0f4] align-top" key={request.id}>
                          <td className="px-4 py-4 font-mono text-xs font-semibold text-[#075f8d]">
                            {request.id}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#111827]">{request.company}</p>
                            <p className="mt-1 text-xs text-[#667085]">{request.accountName}</p>
                          </td>
                          <td className="px-4 py-4 text-xs leading-5 text-[#667085]">
                            <p className="font-mono text-[#344054]">{request.advertiserId}</p>
                            <p>BC: {request.businessCenterId}</p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-[#111827]">
                            {formatMoney(request.amount, request.currency)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${meta.className}`}
                            >
                              <StatusIcon className="size-3.5" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs leading-5 text-[#667085]">
                            <p className="font-medium text-[#344054]">{request.requestedBy}</p>
                            <p>{request.requestedAt}</p>
                          </td>
                          <td className="px-4 py-4">
                            {request.status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  className="table-action text-[#167044]"
                                  onClick={() => changeStatus(request.id, "approved")}
                                  type="button"
                                >
                                  批准
                                </button>
                                <button
                                  className="table-action text-[#b42318]"
                                  onClick={() => changeStatus(request.id, "rejected")}
                                  type="button"
                                >
                                  驳回
                                </button>
                              </div>
                            ) : request.status === "approved" ? (
                              <button
                                className="table-action inline-flex items-center gap-1.5 text-[#175cd3]"
                                onClick={() => changeStatus(request.id, "completed")}
                                type="button"
                              >
                                模拟完成
                                <ArrowRight className="size-3.5" />
                              </button>
                            ) : (
                              <span className="text-xs text-[#98a2b3]">已归档</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!visibleRequests.length ? (
                  <div className="px-5 py-12 text-center text-sm text-[#667085]">
                    暂无符合条件的充值申请。
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="grid gap-4 p-5">
              {requests.slice(0, 6).map((request, index) => (
                <div className="flex gap-3" key={`${request.id}-${request.status}`}>
                  <div className="flex flex-col items-center">
                    <span className="grid size-8 place-items-center rounded-full bg-[#e9f3f7] text-[#176b87]">
                      {request.status === "rejected" ? (
                        <Ban className="size-3.5" />
                      ) : (
                        <FileCheck2 className="size-3.5" />
                      )}
                    </span>
                    {index < Math.min(requests.length, 6) - 1 ? (
                      <span className="h-full w-px bg-[#dfe3ea]" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#111827]">
                        {request.id} · {statusMeta[request.status].label}
                      </p>
                      <span className="text-xs text-[#98a2b3]">{request.requestedAt}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#667085]">
                      {request.requestedBy} · {request.company} · {request.accountName} ·{" "}
                      {formatMoney(request.amount, request.currency)}
                    </p>
                    <p className="mt-1 text-xs text-[#98a2b3]">{request.reason}</p>
                  </div>
                </div>
              ))}
              {!requests.length ? (
                <div className="py-10 text-center text-sm text-[#667085]">暂无审计记录。</div>
              ) : null}
            </div>
          )}
        </section>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-5 text-[#176b87]" />
              <h2 className="text-base font-semibold">资金安全规则</h2>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              {[
                ["双人审批", "申请人与审批人必须分离"],
                ["目标校验", "Advertiser ID 必须属于所选 BC"],
                ["余额校验", "执行前重新读取 BC 可用余额"],
                ["幂等保护", "同一申请只能执行一次"],
                ["审计留痕", "保存操作人、时间与 TikTok 回执"],
              ].map(([title, detail]) => (
                <div className="flex gap-3" key={title}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#167044]" />
                  <div>
                    <p className="font-medium text-[#344054]">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#667085]">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">连接状态</h2>
              <span className="size-2 rounded-full bg-[#22a06b]" />
            </div>
            <div className="mt-4 grid gap-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#667085]">CRM 客户与广告账户</span>
                <span className="font-semibold text-[#167044]">已接入</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#667085]">TikTok MCP 读取</span>
                <span className="font-semibold text-[#9a5b08]">开发会话</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#667085]">真实资金执行</span>
                <span className="font-semibold text-[#b42318]">已锁定</span>
              </div>
            </div>
            <div className="mt-4 rounded-md border border-[#f0cf8a] bg-[#fffaf0] p-3 text-xs leading-5 text-[#8a5c22]">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                上线真实充值前，还需确认 API 授权范围、审批阈值、汇率/返点规则及财务对账口径。
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
