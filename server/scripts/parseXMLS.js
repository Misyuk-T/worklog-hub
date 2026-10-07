const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const {
  groupedDataByDate,
  validateDataObject,
  getHoursFromString,
} = require("./helpers");
const { AppError } = require("../errors");

const getFormattedDate = (date) => {
  const serial = Number(date);
  if (!Number.isFinite(serial) || serial <= 0 || serial > 2958465) {
    return;
  }

  const dateObj = new Date((serial - 25569) * 86400 * 1000);
  if (Number.isNaN(dateObj.getTime())) return;
  const year = dateObj.getUTCFullYear();
  const month = ("0" + (dateObj.getUTCMonth() + 1)).slice(-2);
  const day = ("0" + dateObj.getUTCDate()).slice(-2);
  return `${day}-${month}-${year}`;
};

const getFormatWorksheetData = (worksheetData, sheetName) => {
  const formattedData = worksheetData.map((item, index) => {
    const row = Number.isInteger(item.__rowNum__) ? item.__rowNum__ + 1 : index + 2;
    const date = item["Log Date & Time"];
    const description = item.Comment || item.Summary;
    const taskHours = item["Hr. Spent"];
    const isHoursFormatted = taskHours?.[taskHours?.length - 1] === "h";
    const hours = isHoursFormatted ? getHoursFromString(taskHours) : taskHours;

    const formattedData = {
      id: uuidv4(),
      date: getFormattedDate(date),
      description,
      hours,
      blb: "nblb",
      project: "",
      task: item["Ticket No"] || "",
    };

    try {
      const requiredFields = [
        ["Comment or Summary", description],
        ["Hr. Spent", taskHours],
        ["Log Date & Time", date],
      ];
      const missing = requiredFields.find(([, value]) => value === undefined || value === null || value === "");
      if (missing) {
        const error = new Error(`Invalid or missing value for field "${missing[0]}".`);
        error.field = missing[0];
        throw error;
      }
      if (!getFormattedDate(date)) {
        const error = new Error("Date must be a valid Excel date value.");
        error.field = "Log Date & Time";
        throw error;
      }
      validateDataObject(formattedData, { sheet: sheetName, row: index + 2 });
    } catch (error) {
      const field = {
        hours: "Hr. Spent",
        date: "Log Date & Time",
        description: "Comment or Summary",
      }[error.field] || error.field;
      throw new AppError(400, "INVALID_XLSX", "The XLSX file contains an invalid worklog row.", [
        { sheet: sheetName, row, field, message: error.message },
      ]);
    }

    return formattedData;
  });

  return groupedDataByDate(formattedData);
};

const parseXMLS = (file) => {
  if (!Buffer.isBuffer(file) || !file.length) {
    throw new AppError(400, "EMPTY_FILE", "The XLSX file is empty.");
  }
  let workbook;
  try {
    workbook = XLSX.read(file, { type: "buffer" });
  } catch (error) {
    throw new AppError(400, "INVALID_XLSX", "The file is not a readable XLSX workbook.");
  }
  const sheetName = workbook.SheetNames[1];
  if (!sheetName) {
    throw new AppError(400, "INVALID_XLSX", "The XLSX workbook is missing its worklog sheet.", [
      { field: "sheet", message: "Expected the worklog data in the second worksheet." },
    ]);
  }
  const worksheet = workbook.Sheets[sheetName];
  const worksheetData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  if (!worksheetData.length) {
    throw new AppError(400, "NO_WORKLOGS", "The XLSX worklog sheet is empty.", [
      { sheet: sheetName, message: "Add at least one worklog row." },
    ]);
  }

  return getFormatWorksheetData(worksheetData, sheetName);
};

module.exports = parseXMLS;
