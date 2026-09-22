"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { ShiftDto, StaffUser } from "@/lib/types";
import { evaluateDailyCoverage } from "@/lib/labor-rules";
import { useToast } from "@/components/toast";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

function shiftColor(id: string) {
  const hues = [168, 198, 24, 32, 280];
  let hash = 0;
  for (const ch of id) hash = (hash + ch.charCodeAt(0)) % hues.length;
  return `hsl(${hues[hash]} 42% 36%)`;
}

function DraggableShift({
  shift,
  canDrag,
  onSelect,
}: {
  shift: ShiftDto;
  canDrag: boolean;
  onSelect: (shift: ShiftDto) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shift.id,
    disabled: !canDrag,
    data: { shift },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={{ ...style, background: shiftColor(shift.assigneeId ?? shift.id) }}
      className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-white shadow-sm ${
        isDragging ? "opacity-60" : ""
      } ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      onClick={() => onSelect(shift)}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      <div className="font-medium">
        {format(new Date(shift.start), "HH:mm")}–{format(new Date(shift.end), "HH:mm")}
      </div>
      <div className="truncate opacity-90">
        {shift.assignee?.name ?? "Unassigned"}
        {shift.roleRequirement ? ` · ${shift.roleRequirement}` : ""}
      </div>
    </button>
  );
}

function DayColumn({
  day,
  shifts,
  canManage,
  onSelect,
}: {
  day: Date;
  shifts: ShiftDto[];
  canManage: boolean;
  onSelect: (shift: ShiftDto) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.toISOString() });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[420px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 ${
        isOver ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="mb-2 border-b border-[var(--border)] pb-2">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
          {format(day, "EEE")}
        </div>
        <div className="font-[family-name:var(--font-display)] text-lg">{format(day, "MMM d")}</div>
      </div>
      {shifts.map((shift) => (
        <DraggableShift
          key={shift.id}
          shift={shift}
          canDrag={canManage}
          onSelect={onSelect}
        />
      ))}
      {shifts.length === 0 ? (
        <p className="px-1 text-xs text-[var(--muted)]">No shifts</p>
      ) : null}
    </div>
  );
}

export function ScheduleGrid() {
  const { data: session } = useSession();
  const { push } = useToast();
  const canManage =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [view, setView] = useState<"week" | "agenda" | "month">("week");
  const [selected, setSelected] = useState<ShiftDto | null>(null);
  const [creating, setCreating] = useState(false);

  const weekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset],
  );
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const monthStart = useMemo(
    () => addMonths(startOfMonth(new Date()), monthOffset),
    [monthOffset],
  );
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthStart]);

  const rangeFrom =
    view === "month" ? monthDays[0].toISOString() : weekStart.toISOString();
  const rangeTo =
    view === "month"
      ? addDays(monthDays[monthDays.length - 1], 1).toISOString()
      : addDays(weekStart, 7).toISOString();
  const from = rangeFrom;
  const to = rangeTo;

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/shifts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) throw new Error("Failed to load shifts");
      return res.json() as Promise<ShiftDto[]>;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json() as Promise<StaffUser[]>;
    },
  });

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const res = await fetch("/api/organization");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ minStaffPerDay: number }>;
    },
  });

  const updateShift = useMutation({
    mutationFn: async (payload: { id: string; data: Partial<ShiftDto> }) => {
      const res = await fetch(`/api/shifts/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      push("Shift updated", "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  const createShift = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Create failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCreating(false);
      push("Shift created", "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  const deleteShift = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setSelected(null);
      push("Shift deleted", "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  const clock = useMutation({
    mutationFn: async (payload: { shiftId: string; action: "in" | "out" }) => {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Clock action failed");
      }
      return res.json();
    },
    onSuccess: () => push("Attendance recorded", "ok"),
    onError: (e: Error) => push(e.message, "error"),
  });

  const offerSwap = useMutation({
    mutationFn: async (payload: { shiftId: string; toUserId?: string | null }) => {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Swap failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      push("Swap offered", "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  const copyWeek = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shifts/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStart: weekStart.toISOString(),
          toStart: addWeeks(weekStart, 1).toISOString(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Copy failed");
      return body as { copied: number };
    },
    onSuccess: (body) => {
      setWeekOffset((v) => v + 1);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      push(`Copied ${body.copied} shifts to next week`, "ok");
    },
    onError: (e: Error) => push(e.message, "error"),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    if (!canManage) return;
    const shift = event.active.data.current?.shift as ShiftDto | undefined;
    const dayIso = event.over?.id;
    if (!shift || typeof dayIso !== "string") return;
    const targetDay = new Date(dayIso);
    const oldStart = new Date(shift.start);
    const oldEnd = new Date(shift.end);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newStart = setMinutes(setHours(targetDay, oldStart.getHours()), oldStart.getMinutes());
    const newEnd = new Date(newStart.getTime() + duration);
    if (isSameDay(oldStart, newStart)) return;
    updateShift.mutate({
      id: shift.id,
      data: { start: newStart.toISOString(), end: newEnd.toISOString() },
    });
  }

  const coverage = useMemo(() => {
    return days.map((day) => {
      const dayShifts = shifts.filter((s) => isSameDay(new Date(s.start), day));
      const hours = dayShifts.reduce((sum, s) => {
        return sum + (new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000;
      }, 0);
      return { day, count: dayShifts.length, hours };
    });
  }, [days, shifts]);

  const coverageAlerts = useMemo(
    () =>
      evaluateDailyCoverage({
        shifts,
        minStaffPerDay: org?.minStaffPerDay ?? 1,
      }).filter((d) => d.understaffed),
    [shifts, org?.minStaffPerDay],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Schedule
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {view === "month"
              ? format(monthStart, "MMMM yyyy")
              : `Week of ${format(weekStart, "MMM d, yyyy")}`}
            {!canManage ? " · your shifts" : " · organization view"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["agenda", "week", "month"] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm capitalize ${
                view === v ? "bg-[var(--accent)] text-white" : "border border-[var(--border)]"
              }`}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() =>
              view === "month" ? setMonthOffset((v) => v - 1) : setWeekOffset((v) => v - 1)
            }
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() => {
              setWeekOffset(0);
              setMonthOffset(0);
            }}
          >
            Today
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            onClick={() =>
              view === "month" ? setMonthOffset((v) => v + 1) : setWeekOffset((v) => v + 1)
            }
          >
            Next
          </button>
          {canManage && view !== "month" ? (
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              onClick={() => copyWeek.mutate()}
            >
              Copy → next week
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
              onClick={() => setCreating(true)}
            >
              Add shift
            </button>
          ) : null}
        </div>
      </div>

      {coverageAlerts.length ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Coverage warnings:{" "}
          {coverageAlerts
            .map(
              (d) =>
                `${d.dateKey} (${d.staffCount} staff${d.unassignedCount ? `, ${d.unassignedCount} unassigned` : ""})`,
            )
            .join(" · ")}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {coverage.map(({ day, count, hours }) => (
          <div key={day.toISOString()} className="rounded-md bg-[var(--surface-2)] px-3 py-2 text-xs">
            <div className="text-[var(--muted)]">{format(day, "EEE")}</div>
            <div className="font-medium text-[var(--ink)]">
              {count} shifts · {hours.toFixed(1)}h
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading schedule…</p>
      ) : view === "agenda" ? (
        <ul className="space-y-2 md:hidden xl:block">
          {shifts.map((shift) => (
            <li key={shift.id}>
              <button
                type="button"
                onClick={() => setSelected(shift)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left"
              >
                <div className="font-medium">
                  {format(new Date(shift.start), "EEE MMM d · HH:mm")}–
                  {format(new Date(shift.end), "HH:mm")}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {shift.assignee?.name ?? "Unassigned"}
                  {shift.roleRequirement ? ` · ${shift.roleRequirement}` : ""}
                </div>
              </button>
            </li>
          ))}
          {!shifts.length ? <p className="text-sm text-[var(--muted)]">No shifts.</p> : null}
        </ul>
      ) : view === "month" ? (
        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const dayShifts = shifts.filter((s) => isSameDay(new Date(s.start), day));
            return (
              <button
                key={day.toISOString()}
                type="button"
                className={`min-h-20 rounded-md border border-[var(--border)] p-1 text-left ${
                  isSameMonth(day, monthStart) ? "bg-[var(--surface)]" : "bg-transparent opacity-50"
                }`}
                onClick={() => {
                  if (dayShifts[0]) setSelected(dayShifts[0]);
                }}
              >
                <div className="text-xs text-[var(--muted)]">{format(day, "d")}</div>
                <div className="text-[10px] text-[var(--ink)]">
                  {dayShifts.length ? `${dayShifts.length} shifts` : ""}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {days.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                canManage={!!canManage}
                onSelect={setSelected}
                shifts={shifts.filter((s) => isSameDay(new Date(s.start), day))}
              />
            ))}
          </div>
          <ul className="space-y-2 md:hidden">
            {shifts.map((shift) => (
              <li key={shift.id}>
                <button
                  type="button"
                  onClick={() => setSelected(shift)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left"
                >
                  <div className="font-medium">
                    {format(new Date(shift.start), "EEE MMM d · HH:mm")}–
                    {format(new Date(shift.end), "HH:mm")}
                  </div>
                  <div className="text-sm text-[var(--muted)]">
                    {shift.assignee?.name ?? "Unassigned"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </DndContext>
      )}

      {selected ? (
        <ShiftPanel
          shift={selected}
          users={users}
          canManage={!!canManage}
          isOwn={selected.assigneeId === session?.user?.id}
          onClose={() => setSelected(null)}
          onSave={(data) => updateShift.mutate({ id: selected.id, data })}
          onDelete={() => deleteShift.mutate(selected.id)}
          onClock={(action) => clock.mutate({ shiftId: selected.id, action })}
          onOfferSwap={(toUserId) =>
            offerSwap.mutate({ shiftId: selected.id, toUserId: toUserId || null })
          }
          busy={updateShift.isPending || deleteShift.isPending}
        />
      ) : null}

      {creating && canManage ? (
        <CreateShiftModal
          weekStart={weekStart}
          users={users}
          hours={HOURS}
          onClose={() => setCreating(false)}
          onCreate={(data) => createShift.mutate(data)}
          busy={createShift.isPending}
          error={createShift.error?.message}
        />
      ) : null}
    </div>
  );
}

function ShiftPanel({
  shift,
  users,
  canManage,
  isOwn,
  onClose,
  onSave,
  onDelete,
  onClock,
  onOfferSwap,
  busy,
}: {
  shift: ShiftDto;
  users: StaffUser[];
  canManage: boolean;
  isOwn: boolean;
  onClose: () => void;
  onSave: (data: Partial<ShiftDto>) => void;
  onDelete: () => void;
  onClock: (action: "in" | "out") => void;
  onOfferSwap: (toUserId?: string) => void;
  busy: boolean;
}) {
  const [assigneeId, setAssigneeId] = useState(shift.assigneeId ?? "");
  const [roleRequirement, setRoleRequirement] = useState(shift.roleRequirement ?? "");
  const [location, setLocation] = useState(shift.location ?? "");
  const [swapTarget, setSwapTarget] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Shift details</h2>
            <p className="text-sm text-[var(--muted)]">
              {format(new Date(shift.start), "EEE MMM d · HH:mm")} –{" "}
              {format(new Date(shift.end), "HH:mm")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--muted)]">
            Close
          </button>
        </div>

        {canManage ? (
          <div className="space-y-3">
            <label className="block text-sm">
              Assignee
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.filter((u) => u.active !== false).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Role
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={roleRequirement}
                onChange={(e) => setRoleRequirement(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Location
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
                onClick={() =>
                  onSave({
                    assigneeId: assigneeId || null,
                    roleRequirement: roleRequirement || null,
                    location: location || null,
                  })
                }
              >
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--muted)]">Role:</span> {shift.roleRequirement ?? "—"}
            </p>
            <p>
              <span className="text-[var(--muted)]">Location:</span> {shift.location ?? "—"}
            </p>
          </div>
        )}

        {isOwn ? (
          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                onClick={() => onClock("in")}
              >
                Clock in
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                onClick={() => onClock("out")}
              >
                Clock out
              </button>
            </div>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                value={swapTarget}
                onChange={(e) => setSwapTarget(e.target.value)}
              >
                <option value="">Marketplace (anyone)</option>
                {users
                  .filter((u) => u.id !== shift.assigneeId && u.active !== false)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-white"
                onClick={() => onOfferSwap(swapTarget || undefined)}
              >
                Offer swap
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateShiftModal({
  weekStart,
  users,
  hours,
  onClose,
  onCreate,
  busy,
  error,
}: {
  weekStart: Date;
  users: StaffUser[];
  hours: number[];
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => void;
  busy: boolean;
  error?: string;
}) {
  const [dayOffset, setDayOffset] = useState(0);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);
  const [assigneeId, setAssigneeId] = useState("");
  const [roleRequirement, setRoleRequirement] = useState("Barista");
  const [location, setLocation] = useState("Front Counter");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Create shift</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm">
            Day
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={dayOffset}
              onChange={(e) => setDayOffset(Number(e.target.value))}
            >
              {Array.from({ length: 7 }, (_, i) => (
                <option key={i} value={i}>
                  {format(addDays(weekStart, i), "EEE MMM d")}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              Start
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {`${h}:00`}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              End
              <select
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {`${h}:00`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Assignee
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.filter((u) => u.active !== false).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Role
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={roleRequirement}
              onChange={(e) => setRoleRequirement(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Location
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            className="w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
            onClick={() => {
              const day = addDays(weekStart, dayOffset);
              const start = setMinutes(setHours(day, startHour), 0);
              const end = setMinutes(setHours(day, endHour), 0);
              onCreate({
                start: start.toISOString(),
                end: end.toISOString(),
                assigneeId: assigneeId || null,
                roleRequirement,
                location,
              });
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
