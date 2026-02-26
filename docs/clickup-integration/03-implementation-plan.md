# ClickUp Integration - Implementation Plan

## Phase 1: Backend Setup

### 1.1. Add ClickUp Route
**File**: `server/routes/routes.js`

```javascript
router.all("/clickup/*", async (req, res) => {
  try {
    const { clickupApiKey } = req.query;
    const url = `https://api.clickup.com/api/v2${req.originalUrl.replace("/clickup", "")}`;

    const axiosConfig = {
      method: req.method,
      url,
      headers: {
        Authorization: clickupApiKey,
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET") {
      axiosConfig.data = req.body;
    }

    const response = await limiter.schedule(() => axios(axiosConfig));
    res.send(response.data);
  } catch (error) {
    console.error("Error while connecting to ClickUp: ", JSON.stringify(error));
    res.status(500).send("Error while connecting to ClickUp");
  }
});
```

**Note**: Використовуємо той самий `limiter` що і для Jira (333ms).

---

## Phase 2: Frontend Store

### 2.1. Create ClickUp Store
**File**: `react-app/src/store/clickupStore.js`

```javascript
import { create } from "zustand";

const initialState = {
  user: null,
  teams: [],
  selectedTeamId: null,
  allClickUpTimeEntries: null,
  assignedTasks: [],
  additionalAssignedTasks: {},
};

const useClickUpStore = create((set) => ({
  user: null,
  teams: [],
  selectedTeamId: null,
  allClickUpTimeEntries: null,
  assignedTasks: [],
  additionalAssignedTasks: {},
  
  addUser: (user) => set({ user }),
  resetUser: () => set({ user: null }),
  
  addTeams: (teams) => set({ teams }),
  resetTeams: () => set({ teams: [] }),
  
  setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),
  
  addAllClickUpTimeEntries: (allClickUpTimeEntries) => set({ allClickUpTimeEntries }),
  resetAllClickUpTimeEntries: () => set({ allClickUpTimeEntries: null }),
  
  addAssignedTasks: (assignedTasks) => set({ assignedTasks }),
  resetAssignedTasks: () => set({ assignedTasks: [] }),
  
  addAdditionalAssignedTasks: (teamId, tasks) =>
    set((state) => ({
      additionalAssignedTasks: {
        ...state.additionalAssignedTasks,
        [teamId]: tasks,
      },
    })),
  
  resetAdditionalAssignedTasks: () => set({ additionalAssignedTasks: {} }),
  resetAll: () => set({ ...initialState }),
}));

export default useClickUpStore;
```

---

## Phase 3: Frontend Actions

### 3.1. Create ClickUp Actions
**File**: `react-app/src/actions/clickup.jsx`

**Functions to implement**:

1. `clickupLogin(apiKey)` - перевірка токена
2. `getClickUpTeams()` - отримання списку teams
3. `getClickUpTimeEntries(teamId, startDate, endDate, userId)` - отримання time entries
4. `getAssignedTasks(teamId, userId)` - отримання тасків користувача
5. `createClickUpTimeEntries(worklogs)` - створення time entries
6. `fetchAllClickUpTimeEntries({userId, teamId, additionalTeams, startDate, endDate})` - агрегація всіх time entries
7. `getLatestClickUpTimeEntries()` - отримання останніх time entries за поточний місяць

---

## Phase 4: Helpers

### 4.1. Parse Data from ClickUp
**File**: `react-app/src/helpers/parseDataFromClickUp.js`

Transform ClickUp time entries to internal format:
```javascript
{
  id: string,
  task: string, // task ID or custom_id
  description: string,
  hours: number, // duration in hours
  date: string, // ISO date
  teamId: string,
}
```

### 4.2. Filter Worklogs for ClickUp
**File**: `react-app/src/helpers/filterWorklogsForClickUp.js`

Filter worklogs by team ID and validate data.

---

## Phase 5: Components

### 5.1. ClickUp Modal
**File**: `react-app/src/components/GenerateCards/ClickUp/ClickUpModal.jsx`

Modal for ClickUp login:
- Input for API Token
- Team selector (after login)
- Save to localStorage

### 5.2. ClickUp Active Table
**File**: `react-app/src/components/LatestActivity/ClickUpActiveTable/ClickUpActiveTable.jsx`

Display ClickUp time entries in table format.

### 5.3. ClickUp Instance Select
**File**: `react-app/src/components/Tabs/WorklogItem/ClickUpInstanceSelect.jsx`

Dropdown to select team for worklog entry.

---

## Phase 6: Integration with Existing UI

### 6.1. Update Main Components
- Add ClickUp tab/section to main interface
- Update worklog form to support ClickUp
- Add ClickUp to "Latest Activity" section

### 6.2. LocalStorage Keys
```javascript
const STORAGE_KEYS = {
  CLICKUP_API_KEY: 'clickup_api_key',
  CLICKUP_USER: 'clickup_user',
  CLICKUP_TEAMS: 'clickup_teams',
  CLICKUP_SELECTED_TEAM: 'clickup_selected_team',
};
```

---

## Phase 7: Testing

### 7.1. Manual Testing Checklist
- [ ] Login with valid API token
- [ ] Login with invalid API token (error handling)
- [ ] Fetch teams
- [ ] Select team
- [ ] Fetch time entries for current month
- [ ] Fetch assigned tasks
- [ ] Create single time entry
- [ ] Create multiple time entries
- [ ] Test with multiple teams
- [ ] Test rate limiting (many requests)
- [ ] Test error scenarios (network errors, API errors)

### 7.2. Edge Cases
- [ ] Empty time entries
- [ ] Time entry without task
- [ ] Task without custom_id
- [ ] Multiple teams with same task IDs
- [ ] Very long descriptions
- [ ] Special characters in descriptions

---

## Data Flow Comparison

### Jira Flow:
1. User enters: email + API key + Jira URL
2. Login → get user info
3. Fetch worklogs by JQL query
4. Fetch assigned issues
5. Create worklogs with issue key

### Redmine Flow:
1. User enters: API key + Redmine URL
2. Login → get user info
3. Fetch time entries by user
4. Fetch projects
5. Create time entries with issue ID

### ClickUp Flow (planned):
1. User enters: API key
2. Login → get user info + teams
3. User selects team
4. Fetch time entries by team + user
5. Fetch assigned tasks
6. Create time entries with task ID (optional)

---

## Questions to Resolve

1. **Multiple Teams**: 
   - Підтримувати декілька teams одночасно (як multiple Jira instances)?
   - Або один team за раз?
   - **Decision**: Підтримувати декілька teams (аналогічно до Jira)

2. **Task ID Format**:
   - Використовувати `task.id` чи `task.custom_id` для відображення?
   - **Decision**: Використовувати `custom_id` якщо є, інакше `id`

3. **Time Entry без Task**:
   - Дозволяти створювати time entries без прив'язки до таски?
   - **Decision**: Так, але показувати warning

4. **Team Selector**:
   - Де розмістити селектор team?
   - **Decision**: В ClickUpModal після логіна + в WorklogItem для вибору team при створенні worklog

---

## Timeline Estimate

- **Phase 1 (Backend)**: 30 хв
- **Phase 2 (Store)**: 20 хв
- **Phase 3 (Actions)**: 1-2 год
- **Phase 4 (Helpers)**: 30 хв
- **Phase 5 (Components)**: 2-3 год
- **Phase 6 (Integration)**: 1-2 год
- **Phase 7 (Testing)**: 1 год

**Total**: 6-9 годин роботи
