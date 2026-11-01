import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";

// Weeks start on Monday.
const WEEK = { weekStartsOn: 1 };

export const getRangePresets = (today = new Date()) => ({
  thisWeek: { from: startOfWeek(today, WEEK), to: endOfWeek(today, WEEK) },
  lastWeek: {
    from: startOfWeek(subWeeks(today, 1), WEEK),
    to: endOfWeek(subWeeks(today, 1), WEEK),
  },
  thisMonth: { from: startOfMonth(today), to: endOfMonth(today) },
});

// "27 Oct – 31 Oct 2026", "27 Oct 2026", "30 Dec 2026 – 3 Jan 2027".
export const formatRange = (range) => {
  if (!range?.from) return "Select dates";
  const to = range.to || range.from;
  const sameDay = format(range.from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd");
  if (sameDay) return format(range.from, "d MMM yyyy");
  const sameYear = range.from.getFullYear() === to.getFullYear();
  return `${format(range.from, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
};
