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


// Colleagues for the Compare "Whose logs" picker. Each exists in Redmine (with a
// mail); Marek's Jira email is hidden, so he can only be found by name and has
// to be confirmed; Iryna is not in ClickUp at all.
const DEMO_PEOPLE = [
  {
    key: "olena",
    name: "Olena Koval",
    mail: "olena.koval@acme.example",
    redmineId: 201,
    jira: {
      accountId: "712020:0a1b2c3d-1111-4a00-8000-000000000001",
      displayName: "Olena Koval",
      email: "olena.koval@acme.example",
    },
    clickUp: { id: "50001", username: "Olena Koval", email: "olena.koval@acme.example" },
    // [jira key, redmine issue, clickup key, text, hours] per entry, one list per day
    days: [
      [["WEB-121", 4104, "CU-34", "Search: ranking tweaks", 4], ["OPS-7", 4105, "CU-40", "Team standup", 1]],
      [["WEB-121", 4104, "CU-34", "Search: highlight matched words", 3.5], ["WEB-115", 4102, "CU-32", "Review payments adapters", 2]],
      [["WEB-127", 4108, "CU-36", "Stabilise login e2e test", 3], ["OPS-9", 4106, "CU-41", "Staging deploy", 2]],
      [["WEB-118", 4103, "CU-33", "Gallery: swipe on touch devices", 5], ["OPS-7", 4105, "CU-40", "Team standup", 0.5]],
      [["WEB-124", 4107, "CU-35", "Email change: confirmation page", 4], ["WEB-112", 4101, "CU-31", "Discount rounding follow-up", 2]],
    ],
    // Real gaps between the trackers, keyed "dayIndex:entryIndex".
    skip: { jira: ["2:1"] },
    shortBy: { redmine: { "1:0": 1 } },
  },
  {
    key: "marek",
    name: "Marek Dudek",
    mail: "marek.dudek@acme.example",
    redmineId: 202,
    jira: {
      accountId: "712020:0a1b2c3d-2222-4a00-8000-000000000002",
      displayName: "Dudek Marek",
      email: "",
    },
    clickUp: { id: "50002", username: "Marek Dudek", email: "marek.dudek@acme.example" },
    days: [
      [["WEB-112", 4101, "CU-31", "Cart: percentage discount edge cases", 5], ["OPS-7", 4105, "CU-40", "Team standup", 0.5]],
      [["WEB-115", 4102, "CU-32", "Payments: retry failed captures", 6]],
      [["WEB-115", 4102, "CU-32", "Payments: webhook signature check", 4], ["OPS-9", 4106, "CU-41", "Release notes", 1.5]],
      [["WEB-127", 4108, "CU-36", "Fix flaky checkout test", 3], ["WEB-112", 4101, "CU-31", "Cart totals regression tests", 3]],
      [["OPS-9", 4106, "CU-41", "Production release", 2.5], ["OPS-7", 4105, "CU-40", "Team standup and retro", 1.5]],
    ],
    skip: { redmine: ["4:0", "4:1"] },
    shortBy: {},
  },
  {
    key: "iryna",
    name: "Iryna Bondar",
    mail: "iryna.bondar@acme.example",
    redmineId: 203,
    jira: {
      accountId: "712020:0a1b2c3d-3333-4a00-8000-000000000003",
      displayName: "Iryna Bondar",
      email: "iryna.bondar@acme.example",
    },
    clickUp: null,
    days: [
      [["WEB-124", 4107, "CU-35", "Account: password rules copy", 3], ["OPS-7", 4105, "CU-40", "Team standup", 1]],
      [["WEB-124", 4107, "CU-35", "Account: email change tests", 4.5]],
      [["WEB-118", 4103, "CU-33", "Gallery: lazy-load placeholders", 5], ["OPS-7", 4105, "CU-40", "Team standup", 0.5]],
      [["WEB-121", 4104, "CU-34", "Search: empty state", 3], ["WEB-127", 4108, "CU-36", "E2E: search suite", 3]],
      [["WEB-118", 4103, "CU-33", "Gallery: keyboard navigation", 4], ["OPS-9", 4106, "CU-41", "Release smoke check", 1.5]],
    ],
    skip: {},
    shortBy: { redmine: { "0:0": 1 } },
  },
];

const buildDemoPeople = (days) =>
  DEMO_PEOPLE.map((person) => {
    const logs = { redmine: [], jira: {}, clickup: {} };
    let n = 0;
    const skipped = (tracker, key) => (person.skip[tracker] || []).includes(key);

    days.forEach((day, dayIndex) => {
      const date = dmy(day);
      (person.days[dayIndex] || []).forEach(
        ([jiraKey, redmineId, clickUpKey, text, hours], i) => {
          n += 1;
          const key = `${dayIndex}:${i}`;
          const blb = jiraKey.startsWith("OPS") ? "nblb" : "blb";

          if (!skipped("jira", key)) {
            (logs.jira[date] ||= []).push({
              id: `demo-${person.key}-jira-${n}`,
              task: jiraKey,
              jiraUrl: JIRA_HOST,
              description: text,
              hours,
              blb,
              date,
            });
          }

          if (person.clickUp && !skipped("clickup", key)) {
            (logs.clickup[date] ||= []).push({
              id: `demo-${person.key}-cu-${n}`,
              clickupTask: clickUpTaskId(clickUpKey),
              taskKey: clickUpKey,
              taskName: ISSUES[jiraKey],
              description: text,
              hours,
              date,
              clickupTeamId: TEAM_ID,
              teamId: TEAM_ID,
              blb,
              billable: blb === "blb",
              url: null,
            });
          }

          if (!skipped("redmine", key)) {
            logs.redmine.push({
              id: 9500 + person.redmineId * 10 + n,
              spent_on: ymd(day),
              hours: hours - (person.shortBy.redmine?.[key] || 0),
              comments: text,
              issue: { id: redmineId },
              project: { name: REDMINE_ISSUES[redmineId][0] },
              custom_fields: [{ id: 7, name: "Type", value: blb === "blb" ? "1" : "3" }],
            });
          }
        },
      );
    });

    return { ...person, logs };
  });

export const buildDemoWorkspace = (today = new Date()) => {
  const days = lastWorkdays(DAY_PLANS.length, today);

  const jiraWorklogs = {};
  const clickUpEntries = {};
  const redmineActivity = [];
  const cards = {};
  const generated = {}; // cards for every demo day: what Generate hands out
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

      const card = {
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
      };
      (generated[date] ||= []).push(card);
      // The last two days start as cards; the earlier ones are logged everywhere.
      if (dayIndex >= 3) (cards[date] ||= []).push({ ...card });
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
    generated,
    people: buildDemoPeople(days),
    clickUpTeam: { id: TEAM_ID, name: "Acme Studio" },
    jiraHost: JIRA_HOST,
  };
};
