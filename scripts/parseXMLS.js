const XLSX = require("xlsx");
const { v4: uuidv4 } = require("uuid");
const {
  groupedDataByDate,
  validateDataObject,
  validateDataArray,
  getHoursFromString,
} = require("./helpers");

const getFormattedDate = (date) => {
  if (!date) {
    return;
  }

  const dateObj = new Date((date - 25569) * 86400 * 1000);
  const year = dateObj.getFullYear();
  const month = ("0" + (dateObj.getMonth() + 1)).slice(-2);
  const day = ("0" + dateObj.getDate()).slice(-2);
  return `${day}-${month}-${year}`;
};

const getFormatWorksheetData = (worksheetData) => {
  const formattedData = worksheetData.map((item) => {
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

    validateDataObject(formattedData);
    validateDataArray([description, taskHours, date]);

    return formattedData;
  });

  return groupedDataByDate(formattedData);
};

const parseXMLS = (file) => {
  const workbook = XLSX.read(file, { type: "buffer" });
  const sheetName = workbook.SheetNames[1];
  const worksheet = workbook.Sheets[sheetName];
  const worksheetData = XLSX.utils.sheet_to_json(worksheet);

  return getFormatWorksheetData(worksheetData);
};

module.exports = parseXMLS;
