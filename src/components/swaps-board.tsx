"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import type { SwapDto } from "@/lib/types";

export function SwapsBoard() {
  const { data: session } = useSession();
  const canManage =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";
  const queryClient = useQueryClient();

  const { data: swaps = [], isLoading } = useQuery({
    queryKey: ["swaps"],
    queryFn: async () => {
      const res = await fetch("/api/swaps");
      if (!res.ok) throw new Error("Failed to load swaps");
      return res.json() as Promise<SwapDto[]>;
    },
  });

  const act = useMutation({
    mutationFn: async (payload: { id: string; action: string }) => {
      const res = await fetch(`/api/swaps/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: payload.action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Action failed");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["swaps"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Shift swaps
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Offer, claim, and approve swaps with conflict and overtime checks.
        </p>
      </div>

      {act.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {act.error.message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : swaps.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No swap requests yet.</p>
      ) : (
        <ul className="space-y-3">
          {swaps.map((swap) => (
            <li
              key={swap.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--muted)]">
                    {swap.status}
                  </div>
                  <div className="font-medium text-[var(--ink)]">
                    {format(new Date(swap.shift.start), "EEE MMM d · HH:mm")}–
                    {format(new Date(swap.shift.end), "HH:mm")}
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    From {swap.fromUser.name ?? swap.fromUser.email}
                    {swap.toUser
                      ? ` → ${swap.toUser.name ?? swap.toUser.email}`
                      : " → marketplace"}
                  </p>
                  {swap.note ? <p className="mt-1 text-sm">{swap.note}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {swap.status === "OFFERED" && !swap.toUserId && swap.fromUserId !== session?.user?.id ? (
                    <button
                      type="button"
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
                      onClick={() => act.mutate({ id: swap.id, action: "claim" })}
                    >
                      Claim
                    </button>
                  ) : null}
                  {swap.status === "PENDING" && swap.toUserId === session?.user?.id ? (
                    <>
                      <button
                        type="button"
                        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
                        onClick={() => act.mutate({ id: swap.id, action: "accept" })}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                        onClick={() => act.mutate({ id: swap.id, action: "reject" })}
                      >
                        Decline
                      </button>
                    </>
                  ) : null}
                  {canManage && swap.status === "ACCEPTED" ? (
                    <>
                      <button
                        type="button"
                        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
                        onClick={() => act.mutate({ id: swap.id, action: "approve" })}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                        onClick={() => act.mutate({ id: swap.id, action: "deny" })}
                      >
                        Deny
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
