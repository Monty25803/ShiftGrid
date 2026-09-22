export type Interval = {
  start: Date | string | number;
  end: Date | string | number;
};

export type LaborRules = {
  overtimeHoursPerWeek: number;
  maxHoursPerDay: number;
  minBreakMinutes: number;
  minStaffPerDay: number;
};

function toMs(value: Date | string | number): number {
  return new Date(value).getTime();
}

/** True when two half-open intervals overlap. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  const aStart = toMs(a.start);
  const aEnd = toMs(a.end);
  const bStart = toMs(b.start);
  const bEnd = toMs(b.end);
  if (!(aEnd > aStart) || !(bEnd > bStart)) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function hoursBetween(start: Date | string | number, end: Date | string | number): number {
  return Math.max(0, (toMs(end) - toMs(start)) / (1000 * 60 * 60));
}

export function sumScheduledHours(shifts: Interval[]): number {
  return shifts.reduce((total, shift) => total + hoursBetween(shift.start, shift.end), 0);
}

export type OvertimeCheckInput = {
  existingShifts: Interval[];
  candidateShift: Interval;
  overtimeHoursPerWeek: number;
};

export type OvertimeCheckResult = {
  ok: boolean;
  projectedHours: number;
  overtimeHoursPerWeek: number;
  wouldExceed: boolean;
};

export function checkOvertimeLimit(input: OvertimeCheckInput): OvertimeCheckResult {
  const withoutExact = input.existingShifts.filter(
    (s) =>
      !(toMs(s.start) === toMs(input.candidateShift.start) && toMs(s.end) === toMs(input.candidateShift.end)),
  );
  const projectedHours =
    sumScheduledHours(withoutExact) + hoursBetween(input.candidateShift.start, input.candidateShift.end);
  const wouldExceed = projectedHours > input.overtimeHoursPerWeek;
  return {
    ok: !wouldExceed,
    projectedHours,
    overtimeHoursPerWeek: input.overtimeHoursPerWeek,
    wouldExceed,
  };
}

export function checkMaxHoursPerDay(input: {
  dayShifts: Interval[];
  candidateShift: Interval;
  maxHoursPerDay: number;
}): { ok: boolean; dayHours: number; reasons: string[] } {
  const others = input.dayShifts.filter(
    (s) =>
      !(toMs(s.start) === toMs(input.candidateShift.start) && toMs(s.end) === toMs(input.candidateShift.end)),
  );
  const dayHours =
    sumScheduledHours(others) + hoursBetween(input.candidateShift.start, input.candidateShift.end);
  const ok = dayHours <= input.maxHoursPerDay;
  return {
    ok,
    dayHours,
    reasons: ok
      ? []
      : [`Would exceed max hours/day (${dayHours.toFixed(1)}h > ${input.maxHoursPerDay}h)`],
  };
}

export function checkMinBreak(input: {
  existingShifts: Interval[];
  candidateShift: Interval;
  minBreakMinutes: number;
}): { ok: boolean; reasons: string[] } {
  if (input.minBreakMinutes <= 0) return { ok: true, reasons: [] };
  const gapMs = input.minBreakMinutes * 60 * 1000;
  const cStart = toMs(input.candidateShift.start);
  const cEnd = toMs(input.candidateShift.end);

  for (const s of input.existingShifts) {
    const sStart = toMs(s.start);
    const sEnd = toMs(s.end);
    if (intervalsOverlap(s, input.candidateShift)) continue;
    // existing ends before candidate starts
    if (sEnd <= cStart && cStart - sEnd < gapMs) {
      return {
        ok: false,
        reasons: [`Less than ${input.minBreakMinutes} minutes break after a previous shift`],
      };
    }
    // candidate ends before existing starts
    if (cEnd <= sStart && sStart - cEnd < gapMs) {
      return {
        ok: false,
        reasons: [`Less than ${input.minBreakMinutes} minutes break before the next shift`],
      };
    }
  }
  return { ok: true, reasons: [] };
}

export type CoverageDay = {
  dateKey: string;
  staffCount: number;
  unassignedCount: number;
  understaffed: boolean;
};

export function evaluateDailyCoverage(input: {
  shifts: Array<{ start: Date | string; assigneeId: string | null }>;
  minStaffPerDay: number;
}): CoverageDay[] {
  const byDay = new Map<string, { staff: Set<string>; unassigned: number }>();
  for (const shift of input.shifts) {
    const key = new Date(shift.start).toISOString().slice(0, 10);
    const bucket = byDay.get(key) ?? { staff: new Set<string>(), unassigned: 0 };
    if (shift.assigneeId) bucket.staff.add(shift.assigneeId);
    else bucket.unassigned += 1;
    byDay.set(key, bucket);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, bucket]) => ({
      dateKey,
      staffCount: bucket.staff.size,
      unassignedCount: bucket.unassigned,
      understaffed: bucket.staff.size < input.minStaffPerDay || bucket.unassigned > 0,
    }));
}

export type SwapConflictInput = {
  targetUserShifts: Interval[];
  offeredShift: Interval;
  overtimeHoursPerWeek: number;
  maxHoursPerDay?: number;
  minBreakMinutes?: number;
};

export type SwapConflictResult = {
  hasConflict: boolean;
  overtime: OvertimeCheckResult;
  eligible: boolean;
  reasons: string[];
};

export function evaluateSwapEligibility(input: SwapConflictInput): SwapConflictResult {
  const reasons: string[] = [];
  const hasConflict = input.targetUserShifts.some((s) => intervalsOverlap(s, input.offeredShift));
  if (hasConflict) reasons.push("Overlapping shift on the target user's schedule");

  const overtime = checkOvertimeLimit({
    existingShifts: input.targetUserShifts,
    candidateShift: input.offeredShift,
    overtimeHoursPerWeek: input.overtimeHoursPerWeek,
  });
  if (overtime.wouldExceed) {
    reasons.push(
      `Would exceed overtime limit (${overtime.projectedHours.toFixed(1)}h > ${overtime.overtimeHoursPerWeek}h)`,
    );
  }

  if (input.maxHoursPerDay != null) {
    const dayKey = new Date(input.offeredShift.start).toDateString();
    const dayShifts = input.targetUserShifts.filter(
      (s) => new Date(s.start).toDateString() === dayKey,
    );
    const dayCheck = checkMaxHoursPerDay({
      dayShifts,
      candidateShift: input.offeredShift,
      maxHoursPerDay: input.maxHoursPerDay,
    });
    reasons.push(...dayCheck.reasons);
  }

  if (input.minBreakMinutes != null) {
    const breakCheck = checkMinBreak({
      existingShifts: input.targetUserShifts,
      candidateShift: input.offeredShift,
      minBreakMinutes: input.minBreakMinutes,
    });
    reasons.push(...breakCheck.reasons);
  }

  return {
    hasConflict,
    overtime,
    eligible: reasons.length === 0,
    reasons,
  };
}
