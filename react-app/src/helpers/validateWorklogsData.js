export const validateWorkLogsData = (data, isJiraValidation) => {
  const mainKeys = Object.keys(data);

  // Validate date for e,pty data
  if (!data || !Object.keys(data).length) {
    throw new Error(`Data is empty.`);
  }

  const [, firstKeyMonth, firstKeyYear] = mainKeys[0].split("-");

  // Validate date for items
  for (const key of mainKeys) {
    const [, month, year] = key.split("-");

    if (month !== firstKeyMonth || year !== firstKeyYear) {
      throw new Error(`Main keys do not have the same year and month.`);
    }
  }

  for (const key in data) {
    const [, parentMonth, parentYear] = key.split("-");

    // Validate nested data
    for (const obj of data[key]) {
      const [, month, year] = obj.date.split("-");

      // Validate if nested date is the same as parent key
      if (parentYear !== year || parentMonth !== month) {
        throw new Error(`Nested data for ${key} does not have the same date.`);
      }

      // Validate if there is no empty description
      if (!obj.description || (isJiraValidation ? !obj.task : !obj.project)) {
        throw new Error(
          `Nested data for ${key} has an empty description or ${
            isJiraValidation ? "task" : "project"
          }.`
        );
      }

      // Validate if hours are more than 0 for each task
      if (obj.hours <= 0) {
        throw new Error(
          `Nested data for ${key} has project or hours less than or equal to 0.`
        );
      }

      // Validate if total hours for the whole array is more than 8
      // const totalHours = data[key].reduce((sum, item) => sum + item.hours, 0);
      // if (totalHours > 8) {
      //   throw new Error(`Total hours for ${key} exceed 8 hours.`);
      // }
    }
  }

  return true;
};
