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
  if (typeof str !== "string") return null;
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

const validateDataObject = (data, context = {}) => {
  for (const [key, value] of Object.entries(data)) {
    if ((value === undefined || value === null || value === "") && !VALID_EMPTY_VALUES.includes(key)) {
      const error = new Error(`Invalid or missing value for field "${key}".`);
      error.field = key;
      error.context = context;
      throw error;
    }

    if (key === "description" && (typeof value !== "string" || !value.trim())) {
      const error = new Error("Description must contain text.");
      error.field = key;
      throw error;
    }
    if (key === "hours" && (!["number", "string"].includes(typeof value) || !Number.isFinite(Number(value)) || Number(value) <= 0)) {
      const error = new Error("Hours must be a finite number greater than zero.");
      error.field = key;
      error.context = context;
      throw error;
    }
  }
};

module.exports = {
  groupedDataByDate,
  validateDataObject,
  validateDataArray,
  getHoursFromString,
};
