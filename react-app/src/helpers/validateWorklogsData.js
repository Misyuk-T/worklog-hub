export const validateWorklogHours = (value) =>
  ["number", "string"].includes(typeof value) &&
  Number.isFinite(Number(value)) &&
  Number(value) > 0
    ? true
    : "Hours must be a number greater than 0";

export const validateWorkLogsData = (data, isJiraValidation) => {
  if (!data || !Object.keys(data).length) {
    throw new Error("There are no worklogs to submit.");
  }
  const mainKeys = Object.keys(data);

  const [, firstKeyMonth, firstKeyYear] = mainKeys[0].split("-");

  // Validate date for items
  for (const key of mainKeys) {
    const [, month, year] = key.split("-");

    if (month !== firstKeyMonth || year !== firstKeyYear) {
      throw new Error(
        `Worklogs span different months. Submit one month at a time (${mainKeys[0]} and ${key}).`
      );
    }
  }

  for (const key in data) {
    if (!Array.isArray(data[key]))
      throw new Error(`Worklogs for ${key} must be a list of cards.`);
    const [, parentMonth, parentYear] = key.split("-");

    // Validate nested data
    for (const obj of data[key]) {
      if (
        !obj ||
        typeof obj.date !== "string" ||
        !/^\d{2}-\d{2}-\d{4}$/.test(obj.date)
      ) {
        throw new Error(
          `Worklog on ${key}: set a valid card date before submitting.`
        );
      }
      const context = `Worklog on ${key}${
        typeof obj.description === "string" ? ` — ${obj.description.slice(0, 100)}` : ""
      }`;
      const [, month, year] = obj.date.split("-");

      // Validate if nested date is the same as parent key
      if (parentYear !== year || parentMonth !== month) {
        throw new Error(
          `${context}: the card date does not match its date group.`
        );
      }

      // Validate if there is no empty description
      if (typeof obj.description !== "string" || !obj.description.trim()) {
        throw new Error(`${context}: add a description.`);
      }
      if (isJiraValidation ? !obj.task : !obj.project) {
        throw new Error(
          `${context}: select a ${
            isJiraValidation ? "task" : "Redmine task"
          } before submitting.`
        );
      }

      // Validate if hours are more than 0 for each task
      if (validateWorklogHours(obj.hours) !== true) {
        throw new Error(`${context}: ${validateWorklogHours(obj.hours)}.`);
      }
    }
  }

  return true;
};
