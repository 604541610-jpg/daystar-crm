"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CircleAlert,
  Eye,
  Filter,
  Flag,
  ListTodo,
  Plus,
  Search,
} from "lucide-react";

type TeamRole = "admin" | "manager" | "staff";
type TaskStatus = "todo" | "doing" | "done" | "blocked";
type Priority = "高" | "中" | "低";

type Member = {
  id: string;
  name: string;
  role: TeamRole;
  team: string;
};

type TeamMember = {
  email: string | null;
  full_name: string;
  id: string;
  role: TeamRole;
};

type WorkTask = {
  id: string;
  assigneeId: string;
  title: string;
  details: string;
  ddl: string;
  priority: Priority;
  status: TaskStatus;
  publisher: string;
};

type WorkLog = {
  memberId: string;
  content: string;
  focus: string;
  mood: "稳定" | "忙碌" | "需协助";
};

const roleLabels: Record<TeamRole, string> = {
  admin: "管理员",
  manager: "主管",
  staff: "成员",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "未开始",
  doing: "进行中",
  done: "已完成",
  blocked: "需协助",
};

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-[#eef2f7] text-[#475569]",
  doing: "bg-[#e8f1ff] text-[#1d4f91]",
  done: "bg-[#e7f6ee] text-[#1b7045]",
  blocked: "bg-[#fff1e7] text-[#a14b16]",
};

const priorityStyles: Record<Priority, string> = {
  高: "border-[#e9b4a9] bg-[#fff4f1] text-[#9d3325]",
  中: "border-[#f1d48f] bg-[#fff9e8] text-[#8a5f05]",
  低: "border-[#cbd5e1] bg-[#f8fafc] text-[#475569]",
};

function nextStatus(status: TaskStatus): TaskStatus {
  const order: TaskStatus[] = ["todo", "doing", "done", "blocked"];
  return order[(order.indexOf(status) + 1) % order.length];
}

function todayDdl() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day} 18:00`;
}

export default function DailyWorkbench({
  currentName,
  currentRole,
  teamMembers,
}: {
  currentName: string;
  currentRole: TeamRole;
  teamMembers: TeamMember[];
}) {
  const canManage = currentRole === "admin" || currentRole === "manager";
  const members = useMemo<Member[]>(() => {
    const realMembers = teamMembers.map((member) => ({
      id: member.id,
      name: member.full_name || member.email || "未命名成员",
      role: member.role,
      team: roleLabels[member.role],
    }));

    if (realMembers.length) {
      return realMembers;
    }

    return [
      {
        id: "current-user",
        name: currentName || "当前成员",
        role: currentRole,
        team: roleLabels[currentRole],
      },
    ];
  }, [currentName, currentRole, teamMembers]);
  const fallbackMemberId = canManage
    ? members[0]?.id
    : members.find((member) => member.name === currentName)?.id ?? members[0]?.id;
  const [selectedMemberId, setSelectedMemberId] = useState(fallbackMemberId);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [taskForm, setTaskForm] = useState({
    assigneeId: fallbackMemberId ?? "",
    title: "",
    details: "",
    ddl: todayDdl(),
    priority: "中" as Priority,
  });

  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? members[0];
  const selectedAssigneeId = members.some(
    (member) => member.id === taskForm.assigneeId,
  )
    ? taskForm.assigneeId
    : members[0].id;
  const visibleMembers = canManage
    ? members
    : members.filter((member) => member.id === selectedMember.id);
  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.assigneeId === selectedMember.id),
    [selectedMember.id, tasks],
  );
  const selectedLog = logs.find((log) => log.memberId === selectedMember.id);

  const stats = useMemo(() => {
    const scopedTasks = canManage ? tasks : selectedTasks;
    const done = scopedTasks.filter((task) => task.status === "done").length;

    return [
      { label: "今日任务", value: `${done}/${scopedTasks.length}` },
      {
        label: "高优先级未完成",
        value: scopedTasks.filter(
          (task) => task.priority === "高" && task.status !== "done",
        ).length,
      },
      {
        label: "需要协助",
        value: scopedTasks.filter((task) => task.status === "blocked").length,
      },
      { label: "可查看成员", value: visibleMembers.length },
    ];
  }, [canManage, selectedTasks, tasks, visibleMembers.length]);
  const displayTasks = canManage ? tasks : selectedTasks;

  function publishTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      return;
    }

    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        assigneeId: selectedAssigneeId,
        title: taskForm.title.trim(),
        details: taskForm.details.trim() || "主管发布的待办事项。",
        ddl: taskForm.ddl,
        priority: taskForm.priority,
        status: "todo",
        publisher: currentName || roleLabels[currentRole],
      },
      ...current,
    ]);
    setSelectedMemberId(selectedAssigneeId);
    setTaskForm((current) => ({ ...current, title: "", details: "" }));
  }

  function updateLog<K extends keyof WorkLog>(key: K, value: WorkLog[K]) {
    setLogs((current) =>
      current.some((log) => log.memberId === selectedMember.id)
        ? current.map((log) =>
            log.memberId === selectedMember.id ? { ...log, [key]: value } : log,
          )
        : [
            ...current,
            {
              content: "",
              focus: "",
              memberId: selectedMember.id,
              mood: "稳定",
              [key]: value,
            },
          ],
    );
  }

  return (
    <section className="grid content-start gap-5" id="workbench">
      <div className="grid auto-rows-max gap-4 md:grid-cols-4">
        {stats.map((item, index) => {
          const icons = [ListTodo, Flag, CircleAlert, Eye];
          const Icon = icons[index] ?? ListTodo;
          const tones = [
            "bg-[#fff1f1] text-[#e54848]",
            "bg-[#fff7e6] text-[#f59e0b]",
            "bg-[#eef6ff] text-[#0b66c3]",
            "bg-[#e8f7ef] text-[#17824d]",
          ];

          return (
            <div
              className="flex items-center gap-5 rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm"
              key={item.label}
            >
              <span className={`grid size-14 place-items-center rounded-full ${tones[index]}`}>
                <Icon className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#667085]">{item.label}</p>
                <p className="mt-1 text-3xl font-semibold text-[#0f172a]">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">成员</h2>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a2b3]" />
            <input className="field pl-9" placeholder="搜索成员" readOnly />
          </div>
          <select className="field mt-3">
            <option>全部状态</option>
          </select>
          <div className="mt-4 grid gap-3">
            {visibleMembers.map((member) => {
              const memberTasks = tasks.filter(
                (task) => task.assigneeId === member.id,
              );
              const done = memberTasks.filter((task) => task.status === "done").length;
              const selected = member.id === selectedMember.id;

              return (
                <button
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                    selected
                      ? "border-[#b7d9ec] bg-[#eef8fc]"
                      : "border-transparent hover:border-[#dfe3ea] hover:bg-[#f8fafc]"
                  }`}
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  type="button"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e7eef6] text-sm font-semibold text-[#075f8d]">
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{member.name}</span>
                    <span className="mt-1 block text-xs text-[#667085]">
                      {roleLabels[member.role]} · {done}/{memberTasks.length}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">今日任务</h2>
              <div className="mt-3 flex flex-wrap gap-6 text-sm font-semibold">
                <span className="border-b-2 border-[#075f8d] pb-2 text-[#075f8d]">
                  任务列表
                </span>
                <span className="text-[#667085]">
                  未开始 {displayTasks.filter((task) => task.status === "todo").length}
                </span>
                <span className="text-[#667085]">
                  进行中 {displayTasks.filter((task) => task.status === "doing").length}
                </span>
                <span className="text-[#667085]">
                  已完成 {displayTasks.filter((task) => task.status === "done").length}
                </span>
                <span className="text-[#667085]">
                  需协助 {displayTasks.filter((task) => task.status === "blocked").length}
                </span>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-[#334155]" type="button">
              <Filter className="size-4" />
              筛选
            </button>
          </div>

          <div className="overflow-auto p-5">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="rounded-lg bg-[#f8fafc] text-xs text-[#667085]">
                <tr>
                  {["任务名称", "负责人", "截止时间", "优先级", "状态"].map((heading) => (
                    <th className="px-4 py-3 font-semibold" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayTasks.map((task) => {
                  const assignee = members.find((member) => member.id === task.assigneeId);

                  return (
                    <tr className="border-b border-[#edf0f4]" key={task.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{task.title}</p>
                        <p className="mt-1 text-xs text-[#667085]">{task.details}</p>
                      </td>
                      <td className="px-4 py-3">{assignee?.name ?? "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{task.ddl}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
                          onClick={() =>
                            setTasks((current) =>
                              current.map((item) =>
                                item.id === task.id
                                  ? { ...item, status: nextStatus(item.status) }
                                  : item,
                              ),
                            )
                          }
                          type="button"
                        >
                          {statusLabels[task.status]}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!displayTasks.length ? (
              <div className="grid min-h-52 place-items-center text-sm text-[#667085]">
                暂无任务。发布任务后会显示在这里。
              </div>
            ) : null}
          </div>
        </section>

        <div className="grid content-start gap-4">
          <section className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">今日工作记录</h2>
            <label className="mt-4 grid gap-1.5 text-sm font-medium">
              今日重点
              <textarea
                className="field min-h-28 resize-y"
                onChange={(event) => updateLog("focus", event.target.value)}
                placeholder="记录今天重点事项"
                value={selectedLog?.focus ?? ""}
              />
            </label>
            <label className="mt-4 grid gap-1.5 text-sm font-medium">
              工作记录
              <textarea
                className="field min-h-32 resize-y"
                onChange={(event) => updateLog("content", event.target.value)}
                placeholder="记录沟通、处理、跟进事项"
                value={selectedLog?.content ?? ""}
              />
            </label>
            <label className="mt-4 grid gap-1.5 text-sm font-medium">
              状态
              <select
                className="field"
                onChange={(event) =>
                  updateLog("mood", event.target.value as WorkLog["mood"])
                }
                value={selectedLog?.mood ?? "稳定"}
              >
                <option>稳定</option>
                <option>忙碌</option>
                <option>需协助</option>
              </select>
            </label>
            <button
              className="mt-4 w-full rounded-md bg-[#075f8d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#064f75]"
              type="button"
            >
              保存记录
            </button>
          </section>

          {canManage ? (
            <section className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">发布任务</h2>
              <form className="mt-4 grid gap-4" onSubmit={publishTask}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    任务名称
                    <input
                      className="field"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="请输入任务名称"
                      value={taskForm.title}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    负责人
                    <select
                      className="field"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          assigneeId: event.target.value,
                        }))
                      }
                      value={selectedAssigneeId}
                    >
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    截止时间
                    <input
                      className="field"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          ddl: event.target.value,
                        }))
                      }
                      value={taskForm.ddl}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    优先级
                    <select
                      className="field"
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          priority: event.target.value as Priority,
                        }))
                      }
                      value={taskForm.priority}
                    >
                      <option>高</option>
                      <option>中</option>
                      <option>低</option>
                    </select>
                  </label>
                </div>
                <textarea
                  className="field min-h-20 resize-y"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      details: event.target.value,
                    }))
                  }
                  placeholder="任务说明"
                  value={taskForm.details}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[#075f8d] px-4 py-3 text-sm font-semibold text-white hover:bg-[#064f75]"
                  type="submit"
                >
                  <Plus className="size-4" />
                  发布任务
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
