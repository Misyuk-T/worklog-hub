const groupedDataByDate = (data) =>
  data.reduce((acc, item) => {
    const date = item.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

const getHoursFromString = (str) => {
  const regex = /^(\d+(\.\d+)?)h$/;
  const match = str.match(regex);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
};

const validateDataArray = (requiredFields) => {
  for (const field of requiredFields) {
    if (!field) {
      throw new Error(
        `Error while parsing data. Invalid or missing field value".`
      );
    }
  }
};

const VALID_EMPTY_VALUES = ["project", "task"];

const validateDataObject = (data) => {
  for (const [key, value] of Object.entries(data)) {
    if (!value && !VALID_EMPTY_VALUES.includes(key)) {
      throw new Error(
        `Error while formatted values. Invalid or missing value (${value}) for field "${key}".`
      );
    }

    if (key === "hours" && value > 8) {
      throw new Error(`Error: Invalid task working hours. The hours worked for single task cannot be more than ${8}.
         Please check the logs on ${data.date}`);
    }
  }
};

module.exports = {
  groupedDataByDate,
  validateDataObject,
  validateDataArray,
  getHoursFromString,
};
