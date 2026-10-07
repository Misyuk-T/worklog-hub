const { v4: uuidv4 } = require("uuid");
const {
  groupedDataByDate,
  validateDataObject,
  getHoursFromString,
} = require("./helpers");
const { AppError } = require("../errors");

const getFormattedDate = (date) => {
  const [day, month] = date.split(".");
  const currentYear = new Date().getFullYear();

  return `${day}-${month}-${currentYear}`;
};

const isValidDate = (value) => {
  const [day, month] = value.split(".").map(Number);
  const year = new Date().getFullYear();
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const parseText = (data) => {
  if (typeof data !== "string" || !data.trim()) {
    throw new AppError(400, "EMPTY_FILE", "The TXT file is empty.");
  }
  let currentDay = "";

  const lines = data.split("\n");
  const formattedData = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^\d{2}\.\d{2}$/)) {
      if (!isValidDate(line)) {
        throw new AppError(400, "INVALID_TXT", "The TXT file contains an invalid date.", [
          { line: i + 1, field: "date", message: "Use a real calendar date in DD.MM format." },
        ]);
      }
      currentDay = getFormattedDate(line);
    } else if (line.match(/^\d+\./)) {
      if (!currentDay) {
        throw new AppError(400, "INVALID_TXT", "A worklog entry appears before its date.", [
          { line: i + 1, field: "date", message: "Add a DD.MM date line before this entry." },
        ]);
      }
      const parts = line.split(/\s+/);
      const description = parts
        .slice(0, -1)
        .join(" ")
        .replace(/^\d+\.\s*/, "")
        .replace(/\s*\d+(\.\d+)?h$/, "")
        .trim();

      const lastPart = parts[parts.length - 1].trim();
      const preLastPart = (parts[parts.length - 2] || "").trim();
      const blb =
        lastPart.includes("nblb") || lastPart.includes("blb")
          ? lastPart
          : "nblb";

      let hours;

      if (preLastPart.match(/^\d+(\.\d+)?h$/)) {
        hours = preLastPart;
      }
      if (lastPart.match(/^\d+(\.\d+)?h$/)) {
        hours = lastPart;
      }

      const formattedItem = {
        id: uuidv4(),
        date: currentDay,
        description,
        hours: getHoursFromString(hours),
        blb,
        project: "",
        task: "",
      };

      try {
        validateDataObject(formattedItem, { line: i + 1 });
      } catch (error) {
        throw new AppError(400, "INVALID_TXT", "The TXT file contains an invalid worklog entry.", [
          { line: i + 1, field: error.field, message: error.message },
        ]);
      }

      formattedData.push(formattedItem);
    } else if (line) {
      throw new AppError(400, "INVALID_TXT", "The TXT file contains an unrecognized line.", [
        { line: i + 1, field: "line", message: "Expected a DD.MM date or a numbered worklog entry ending in hours, such as 2h." },
      ]);
    }
  }

  if (!formattedData.length) {
    throw new AppError(400, "NO_WORKLOGS", "The TXT file does not contain any worklog entries.", [
      "Expected a DD.MM date line followed by entries such as: 1. Description 2h",
    ]);
  }
  return groupedDataByDate(formattedData);
};

module.exports = parseText;
