import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

import { parseTimeSpent } from "./getHours";

// Helper function to extract text from Atlassian Document Format (ADF)
const extractTextFromADF = (adfContent) => {
  if (!adfContent) return "";

  // If it's already a string, return it
  if (typeof adfContent === 'string') return adfContent;

  // Handle ADF structure
  if (adfContent.content && Array.isArray(adfContent.content)) {
    return adfContent.content
      .map(block => extractTextFromBlock(block))
      .filter(text => text.trim())
      .join(' ');
  }

  // Fallback
  return String(adfContent);
};

// Helper function to extract text from an ADF block
const extractTextFromBlock = (block) => {
  if (!block) return "";

  if (block.text) {
    return block.text;
  }

  if (block.content && Array.isArray(block.content)) {
    return block.content
      .map(item => extractTextFromBlock(item))
      .filter(text => text.trim())
      .join(' ');
  }

  return "";
};

export const parseDataFromJira = (data) => {
  return data.map((log) => {
    const formattedCurrentDate = log.started.replace(
      /(\+\d{2})(\d{2})$/,
      "$1:$2"
    );

    // Handle different comment structures from JIRA API v3
    let description = "";
    if (log.comment) {
      // JIRA API v3 always returns objects, so handle accordingly
      if (log.comment.content) {
        // JIRA API v3 uses Atlassian Document Format (ADF)
        description = extractTextFromADF(log.comment);
      } else if (log.comment.text) {
        // Alternative structure
        description = log.comment.text;
      } else if (typeof log.comment === 'string') {
        // Fallback for string (unlikely in v3)
        description = log.comment;
      } else {
        // Fallback to string conversion for any other object structure
        description = String(log.comment);
      }
    }

    return {
      description: `${description || ""}`.trim(),
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
