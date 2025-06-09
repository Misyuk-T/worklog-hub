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

