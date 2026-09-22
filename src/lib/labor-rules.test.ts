import { describe, expect, it } from "vitest";
import {
  checkMaxHoursPerDay,
  checkMinBreak,
  checkOvertimeLimit,
  evaluateDailyCoverage,
  evaluateSwapEligibility,
  intervalsOverlap,
} from "./labor-rules";

describe("intervalsOverlap", () => {
  it("detects overlapping intervals", () => {
    expect(
      intervalsOverlap(
        { start: "2026-09-22T09:00:00.000Z", end: "2026-09-22T17:00:00.000Z" },
        { start: "2026-09-22T16:00:00.000Z", end: "2026-09-22T20:00:00.000Z" },
      ),
    ).toBe(true);
  });

  it("allows adjacent intervals", () => {
    expect(
      intervalsOverlap(
        { start: "2026-09-22T09:00:00.000Z", end: "2026-09-22T17:00:00.000Z" },
        { start: "2026-09-22T17:00:00.000Z", end: "2026-09-22T20:00:00.000Z" },
      ),
    ).toBe(false);
  });
});

describe("checkOvertimeLimit", () => {
  it("flags projected hours over the weekly limit", () => {
    const result = checkOvertimeLimit({
      existingShifts: [
        { start: "2026-09-22T09:00:00.000Z", end: "2026-09-22T17:00:00.000Z" },
        { start: "2026-09-23T09:00:00.000Z", end: "2026-09-23T17:00:00.000Z" },
        { start: "2026-09-24T09:00:00.000Z", end: "2026-09-24T17:00:00.000Z" },
        { start: "2026-09-25T09:00:00.000Z", end: "2026-09-25T17:00:00.000Z" },
        { start: "2026-09-26T09:00:00.000Z", end: "2026-09-26T17:00:00.000Z" },
      ],
      candidateShift: {
        start: "2026-09-27T09:00:00.000Z",
        end: "2026-09-27T13:00:00.000Z",
      },
      overtimeHoursPerWeek: 40,
    });
    expect(result.projectedHours).toBe(44);
    expect(result.wouldExceed).toBe(true);
  });
});

describe("checkMaxHoursPerDay", () => {
  it("rejects days over the cap", () => {
    const result = checkMaxHoursPerDay({
      dayShifts: [{ start: "2026-09-22T08:00:00.000Z", end: "2026-09-22T16:00:00.000Z" }],
      candidateShift: { start: "2026-09-22T16:00:00.000Z", end: "2026-09-22T22:00:00.000Z" },
      maxHoursPerDay: 12,
    });
    expect(result.ok).toBe(false);
    expect(result.dayHours).toBe(14);
  });
});

describe("checkMinBreak", () => {
  it("requires gap between shifts", () => {
    const result = checkMinBreak({
      existingShifts: [{ start: "2026-09-22T08:00:00.000Z", end: "2026-09-22T12:00:00.000Z" }],
      candidateShift: { start: "2026-09-22T12:15:00.000Z", end: "2026-09-22T16:00:00.000Z" },
      minBreakMinutes: 30,
    });
    expect(result.ok).toBe(false);
  });
});

describe("evaluateSwapEligibility", () => {
  it("rejects conflicting swaps", () => {
    const result = evaluateSwapEligibility({
      targetUserShifts: [
        { start: "2026-09-22T10:00:00.000Z", end: "2026-09-22T18:00:00.000Z" },
      ],
      offeredShift: {
        start: "2026-09-22T12:00:00.000Z",
        end: "2026-09-22T16:00:00.000Z",
      },
      overtimeHoursPerWeek: 40,
    });
    expect(result.eligible).toBe(false);
    expect(result.hasConflict).toBe(true);
  });

  it("allows clean swaps under OT limit", () => {
    const result = evaluateSwapEligibility({
      targetUserShifts: [
        { start: "2026-09-22T09:00:00.000Z", end: "2026-09-22T13:00:00.000Z" },
      ],
      offeredShift: {
        start: "2026-09-23T09:00:00.000Z",
        end: "2026-09-23T13:00:00.000Z",
      },
      overtimeHoursPerWeek: 40,
      maxHoursPerDay: 12,
      minBreakMinutes: 0,
    });
    expect(result.eligible).toBe(true);
  });
});

describe("evaluateDailyCoverage", () => {
  it("flags understaffed and unassigned days", () => {
    const result = evaluateDailyCoverage({
      minStaffPerDay: 2,
      shifts: [
        { start: "2026-09-22T09:00:00.000Z", assigneeId: "a" },
        { start: "2026-09-22T14:00:00.000Z", assigneeId: null },
      ],
    });
    expect(result[0].understaffed).toBe(true);
    expect(result[0].unassignedCount).toBe(1);
  });
});
