export const getHours = (workLogs) => {
  let nblbHours = 0;
  let blbHours = 0;

  workLogs.forEach((log) => {
    if (log.blb === "nblb") {
      nblbHours += log.hours;
    } else {
      blbHours += log.hours;
    }
  });

  const totalHours = nblbHours + blbHours;

  return {
    nblbHours,
    blbHours,
    totalHours,
  };
};

export const getTotalHours = (workLogs) => {
  let totalHours = 0;

  workLogs.forEach(([_, logs]) => {
    logs.forEach((log) => {
      totalHours += log.hours;
    });
  });

  return totalHours;
};

export const getTotalHoursFromObject = (data) => {
  let totalHours = 0;

  for (const date in data) {
    if (data.hasOwnProperty(date)) {
      const entries = data[date];
      totalHours += entries.reduce((sum, entry) => sum + entry.hours, 0);
    }
  }

  return totalHours;
};

export const round = (number, decimalPlaces = 2) => {
  const factor = 10 ** decimalPlaces;
  return Math.round(number * factor) / factor;
};

// ClickUp reports durations in milliseconds; worklog hours carry two decimals
// so the hours field (see hoursInput.js) can edit them.
export const msToHours = (ms) => round(parseInt(ms, 10) / 3600000);

// Rounds `hours` on every entry of a { date: [worklog, ...] } map (file import).
// Entries whose hours are not numeric are left for the usual validation.
export const roundWorklogsHours = (worklogsByDate) => {
  if (!worklogsByDate || typeof worklogsByDate !== "object") return worklogsByDate;

  return Object.fromEntries(
    Object.entries(worklogsByDate).map(([date, logs]) => [
      date,
      Array.isArray(logs)
        ? logs.map((log) => {
            const hours = log?.hours;
            const isNumeric =
              (typeof hours === "number" || (typeof hours === "string" && hours.trim() !== "")) &&
              Number.isFinite(Number(hours));
            return isNumeric ? { ...log, hours: round(Number(hours)) } : log;
          })
        : logs,
    ]),
  );
};

export const parseTimeSpent = (timeSpent) => {
  const daysMatch = timeSpent.match(/(\d+)d/);
  const hoursMatch = timeSpent.match(/(\d+)h/);
  const minutesMatch = timeSpent.match(/(\d+)m/);

  let days = 0;
  let hours = 0;
  let minutes = 0;

  if (daysMatch) {
    days = parseInt(daysMatch[1]);
  }

  if (hoursMatch) {
    hours = parseInt(hoursMatch[1]);
  }

  if (minutesMatch) {
    minutes = parseInt(minutesMatch[1]);
  }

  const totalHours = days * 8 + hours + minutes / 60;

  return round(totalHours, 2); // Round to 2 decimal places
};

