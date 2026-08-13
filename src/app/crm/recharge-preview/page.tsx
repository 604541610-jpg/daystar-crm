"use client";

import {
  BriefcaseBusiness,
  CircleDollarSign,
  FileText,
  Home as HomeIcon,
  LayoutDashboard,
  ListTodo,
  Settings,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import RechargeCenter, { RechargeCustomer } from "../recharge-center";

const demoCustomers: RechargeCustomer[] = [
  {
    id: "preview-ceo-aura-rich",
    company: "CEO Aura Rich",
    adAccounts: [
      {
        accountId: "7500••••••••8455",
        accountName: "CEO Aura Rich - GMV Max",
        businessCenterId: "已绑定 BC（预览脱敏）",
        rebateRate: "1.00",
        status: "启用",
      },
    ],
  },
  {
    id: "preview-th-market",
    company: "泰国市场示例客户",
    adAccounts: [
      {
        accountId: "7500••••••••0412",
        accountName: "TH Shop Ads 01",
        businessCenterId: "7280••••••••9011",
        rebateRate: "1.05",
        status: "启用",
      },
    ],
  },
];

const navItems = [
  { label: "首页", icon: HomeIcon },
  { label: "客户管理", icon: UserRound },
  { label: "广告账户", icon: BriefcaseBusiness },
  { label: "文件资料", icon: FileText },
  { label: "财务管理", icon: CircleDollarSign, active: true },
  { label: "每日工作台", icon: ListTodo },
  { label: "团队管理", icon: Users },
  { label: "操作日志", icon: LayoutDashboard },
  { label: "系统设置", icon: Settings },
];

export default function RechargePreviewPage() {
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
              const Icon = item.icon;

              return (
                <div
                  className={`flex items-center justify-between rounded-md px-3 py-3 text-left ${
                    item.active
                      ? "bg-[#0876a7] text-white shadow-sm"
                      : "text-white/58"
                  }`}
                  key={item.label}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  {!item.active ? (
                    <span className="text-xs text-white/38">预览</span>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/65 xl:mt-auto">
            当前账号：预览访客
            <br />
            权限：主管（演示）
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-[#dfe3ea] bg-white/95 backdrop-blur">
            <div className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold text-[#176b87]">财务管理</p>
                <h1 className="text-xl font-semibold">TikTok 充值中心</h1>
              </div>
              <span className="w-fit rounded-full border border-[#d6e6ec] bg-[#f1f8fa] px-3 py-1.5 text-xs font-semibold text-[#176b87]">
                Daystar CRM · V1 评审版
              </span>
            </div>
          </header>

          <div className="px-5 py-5">
            <RechargeCenter
              canApprove
              currentName="何震洋"
              customers={demoCustomers}
              previewMode
            />
          </div>
        </div>
      </div>
    </main>
  );
}
