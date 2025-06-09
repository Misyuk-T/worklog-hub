import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

import { parseTimeSpent } from "./getHours";

export const parseDataFromJira = (data) => {
  return data.map((log) => {
    const formattedCurrentDate = log.started.replace(
      /(\+\d{2})(\d{2})$/,
      "$1:$2"
    );

    return {
      description: log.comment || "",
      hours: parseTimeSpent(log.timeSpent),
      date: format(new Date(formattedCurrentDate), "dd-MM-yyyy"),
      task: log.task,
      project: "",
      blb: "nblb",
      id: uuidv4(),
      jiraUrl: log.jiraUrl,
    };
  });
};
