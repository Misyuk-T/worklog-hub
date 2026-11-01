export const moveDayWorkLogs = (workLogs, fromDate, toDate) => {
  if (fromDate === toDate || !workLogs?.[fromDate]) return workLogs;

  const next = { ...workLogs };
  next[toDate] = [
    ...(workLogs[toDate] || []),
    ...workLogs[fromDate].map((card) => ({ ...card, date: toDate })),
  ];
  delete next[fromDate];
  return next;
};
