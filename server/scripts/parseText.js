const { v4: uuidv4 } = require("uuid");
const {
  groupedDataByDate,
  validateDataObject,
  getHoursFromString,
} = require("./helpers");

const getFormattedDate = (date) => {
  const [day, month] = date.split(".");
  const currentYear = new Date().getFullYear();

  return `${day}-${month}-${currentYear}`;
};

const parseText = (data) => {
  let currentDay = "";

  const lines = data.split("\n");
  const formattedData = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^\d{2}\.\d{2}$/)) {
      currentDay = getFormattedDate(line);
    } else if (line.match(/^\d+\./)) {
      const parts = line.split(" ");
      const description = parts
        .slice(0, -1)
        .join(" ")
        .replace(/^\d+\.\s*/, "")
        .replace(/\s*\d+(\.\d+)?h$/, "")
        .trim();

      const lastPart = parts[parts.length - 1].trim();
      const preLastPart = parts[parts.length - 2].trim();
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

      validateDataObject(formattedItem);

      formattedData.push(formattedItem);
    }
  }

  return groupedDataByDate(formattedData);
};

module.exports = parseText;
