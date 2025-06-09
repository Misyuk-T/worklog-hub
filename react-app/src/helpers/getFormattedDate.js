import { format } from "date-fns";

//21-06-2021
export const getFormattedStringDate = (date) => {
  if (!date) return;

  const dateObject = new Date(date);
  return format(dateObject, "dd-MM-yyyy");
};

//enable working DD/MM/YYYY for new Date
export const getCorrectGMTDateObject = (dateString) => {
  const [day, month, year] = dateString.split("-");

  return new Date(year, month - 1, day);
};

export const formatDateForJira = (date) => {
  const [day, month, year] = date.split("-");
  return `${year}-${month}-${day}T12:00:00.000+0000`;
};
