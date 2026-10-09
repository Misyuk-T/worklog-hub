import { format, subDays, isWeekend } from "date-fns";

// Fake workspace for the demo. Every name, key and number here is invented.
const JIRA_HOST = "acme.atlassian.net";
const TEAM_ID = "demo-team";

const lastWorkdays = (count, from = new Date()) => {
  const days = [];
  let cursor = subDays(from, 1);
  while (days.length < count) {
    if (!isWeekend(cursor)) days.push(cursor);
    cursor = subDays(cursor, 1);
  }
  return days.reverse();
};

const dmy = (date) => format(date, "dd-MM-yyyy");
const ymd = (date) => format(date, "yyyy-MM-dd");

// One template per day: [jira key, redmine issue id, clickup key, text, hours, billable]
const DAY_PLANS = [
  [
    ["WEB-112", 4101, "CU-31", "Checkout: fix rounding of discounts in cart total", 3, true],
    ["WEB-115", 4102, "CU-32", "Code review for the payments refactor", 1.5, true],
    ["OPS-7", 4105, "CU-40", "Team standup and sprint planning", 1, false],
    ["WEB-118", 4103, "CU-33", "Product page: lazy-load gallery images", 2.5, true],
  ],
  [
    ["WEB-118", 4103, "CU-33", "Product page: responsive gallery on tablets", 4, true],
    ["OPS-7", 4105, "CU-40", "Team standup", 0.5, false],
    ["WEB-121", 4104, "CU-34", "Search: debounce suggestions request", 3.5, true],
  ],
  [
    ["WEB-121", 4104, "CU-34", "Search: keyboard navigation in suggestions", 3, true],
    ["WEB-112", 4101, "CU-31", "Checkout: regression tests for discounts", 2, true],
    ["OPS-9", 4106, "CU-41", "Release notes and deploy to staging", 1.5, false],
    ["OPS-7", 4105, "CU-40", "Team standup", 0.5, false],
  ],
  [
    ["WEB-124", 4107, "CU-35", "Account settings: email change flow", 5, true],
    ["OPS-7", 4105, "CU-40", "Team standup and retro", 1.5, false],
    ["WEB-115", 4102, "CU-32", "Payments refactor: address review comments", 1.5, true],
  ],
  [
    ["WEB-124", 4107, "CU-35", "Account settings: confirmation email template", 3, true],
    ["WEB-127", 4108, "CU-36", "Fix flaky end-to-end test on login", 2, true],
    ["OPS-7", 4105, "CU-40", "Team standup", 0.5, false],
    ["OPS-9", 4106, "CU-41", "Production release and smoke check", 2.5, false],
  ],
];

const ISSUES = {
  "WEB-112": "Cart total ignores percentage discounts",
  "WEB-115": "Refactor payment provider adapters",
  "WEB-118": "Product gallery is slow on mobile",
  "WEB-121": "Search suggestions UX",
  "WEB-124": "Let users change their email",
  "WEB-127": "Stabilise e2e suite",
  "OPS-7": "Meetings",
  "OPS-9": "Releases",
};

// ClickUp tasks are referenced by key in the plans above. Cards keep the task
// id (what the real select stores), so the id has to be derived in one place.
const clickUpTaskId = (key) => `cu-${key.toLowerCase().replace("cu-", "")}`;

const REDMINE_ISSUES = {
  4101: ["Acme Shop", "Cart discounts"],
  4102: ["Acme Shop", "Payments refactor"],
  4103: ["Acme Shop", "Product gallery"],
  4104: ["Acme Shop", "Search"],
  4105: ["Internal", "Meetings"],
  4106: ["Internal", "Releases"],
  4107: ["Acme Shop", "Account settings"],
  4108: ["Acme Shop", "QA automation"],
};

export const buildDemoWorkspace = (today = new Date()) => {
  const days = lastWorkdays(DAY_PLANS.length, today);

  const jiraWorklogs = {};
  const clickUpEntries = {};
  const redmineActivity = [];
  const cards = {};
  let n = 0;

  days.forEach((day, dayIndex) => {
    const plan = DAY_PLANS[dayIndex];
    const date = dmy(day);

    plan.forEach(([jiraKey, redmineId, clickUpKey, text, hours, billable], i) => {
      n += 1;
      const blb = billable ? "blb" : "nblb";

      // Jira has every entry. ClickUp misses one on day 3 and Redmine has a
      // different number of hours on day 2, so Compare has something to show.
      (jiraWorklogs[date] ||= []).push({
        id: `demo-jira-${n}`,
        task: jiraKey,
        jiraUrl: JIRA_HOST,
        description: text,
        hours,
        blb,
        date,
      });

      if (!(dayIndex === 2 && i === 2)) {
        (clickUpEntries[date] ||= []).push({
          id: `demo-cu-${n}`,
          clickupTask: clickUpTaskId(clickUpKey),
          taskKey: clickUpKey,
          taskName: ISSUES[jiraKey],
          description: text,
          hours,
          date,
          clickupTeamId: TEAM_ID,
          teamId: TEAM_ID,
          blb,
          billable,
          url: null,
        });
      }

      // Redmine is what the cards below are meant to fill: only the first
      // three days are logged there so far.
      if (dayIndex < 3) {
        redmineActivity.push({
          id: 9000 + n,
          spent_on: ymd(day),
          hours: dayIndex === 1 && i === 0 ? hours - 1 : hours,
          comments: text,
          issue: { id: redmineId },
          project: { name: REDMINE_ISSUES[redmineId][0] },
          custom_fields: [{ id: 7, name: "Type", value: billable ? "1" : "3" }],
        });
      }

      if (dayIndex >= 3) {
        (cards[date] ||= []).push({
          id: `demo-card-${n}`,
          date,
          description: `${jiraKey}: ${text}`,
          hours,
          blb,
          project: redmineId,
          task: jiraKey,
          jiraUrl: JIRA_HOST,
          clickupTeamId: TEAM_ID,
          clickupTask: clickUpTaskId(clickUpKey),
        });
      }
    });
  });

  const clickUpTasks = [];
  DAY_PLANS.flat().forEach(([jiraKey, , clickUpKey]) => {
    if (clickUpTasks.some((task) => task.key === clickUpKey)) return;
    clickUpTasks.push({
      id: clickUpTaskId(clickUpKey),
      key: clickUpKey,
      summary: ISSUES[jiraKey],
      status: "in progress",
      teamId: TEAM_ID,
      url: null,
    });
  });

  return {
    redmine: {
      user: { id: 1, firstname: "Demo", lastname: "User" },
      organizationURL: "",
      projects: Object.entries(REDMINE_ISSUES).map(([id, [projectName, subject]]) => ({
        id: Number(id),
        projectName,
        subject,
      })),
      latestActivity: redmineActivity,
    },
    jira: {
      user: {
        accountId: "demo-account",
        displayName: "Demo User",
        emailAddress: "demo@example.com",
      },
      organizationURL: `https://${JIRA_HOST}`,
      assignedIssues: Object.entries(ISSUES).map(([key, summary], index) => ({
        id: String(10000 + index),
        key,
        summary,
        issueType: "Task",
        parent: null,
        project: key.startsWith("OPS") ? "Operations" : "Web shop",
        status: "In Progress",
        jiraUrl: JIRA_HOST,
      })),
      allJiraWorklogs: jiraWorklogs,
    },
    clickUp: {
      user: { id: 1, username: "Demo User", email: "demo@example.com" },
      teams: [{ id: TEAM_ID, name: "Acme Studio" }],
      selectedTeamId: TEAM_ID,
      assignedTasks: clickUpTasks,
      allClickUpTimeEntries: clickUpEntries,
    },
    workLogs: cards,
  };
};
