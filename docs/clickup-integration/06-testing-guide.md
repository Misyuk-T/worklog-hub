# ClickUp Integration - Testing Guide

## Prerequisites

1. **ClickUp Personal API Token**
   - Зайти в ClickUp
   - Settings → My Settings → Apps
   - Generate → Personal API Token
   - Скопіювати токен

2. **Install Dependencies**
   ```bash
   cd react-app
   npm install
   ```

3. **Start Development Server**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm start
   
   # Terminal 2 - Frontend
   cd react-app
   npm run dev
   ```

---

## Testing Steps

### 1. Test Backend Route

**Test ClickUp API connection:**
```bash
curl -X GET \
  'http://localhost:3001/clickup/user?clickupApiKey=YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

**Expected Response:**
```json
{
  "user": {
    "id": 123,
    "username": "your_username",
    "email": "your@email.com",
    ...
  }
}
```

---

### 2. Test Frontend Login

1. Відкрити додаток в браузері
2. Відкрити DevTools Console
3. Додати ClickUp API key в localStorage:
   ```javascript
   localStorage.setItem('clickup_api_key', 'YOUR_TOKEN_HERE');
   ```
4. Додати в settings:
   ```javascript
   // В SettingModal або через код
   const settings = {
     ...currentSettings,
     clickupApiKey: 'YOUR_TOKEN_HERE'
   };
   ```

---

### 3. Test Generate Cards from ClickUp

1. Натиснути кнопку "Generate cards from"
2. Обрати radio button "ClickUp"
3. Натиснути "Generate cards from"
4. В модалі:
   - Обрати date range
   - Обрати teams (якщо є декілька)
   - Натиснути "Export time entries"
5. Перевірити що worklogs з'явились в таблиці

**Expected Result:**
- Toast notification: "ClickUp time entries were successfully fetched"
- Worklogs відображаються в таблиці згруповані по датах

---

### 4. Test Latest Activity - ClickUp Tab

1. Натиснути на таб "ClickUp" в Latest Activity
2. Перевірити що відображаються time entries за поточний місяць
3. Перевірити що:
   - Дати відображаються правильно
   - Години підраховуються (total hours per day)
   - Task links працюють (якщо є)
   - Weekend days помічені червоним

**Expected Result:**
- Time entries відображаються згруповані по датах
- Total hours per day підраховується
- Можна розгорнути/згорнути панель (collapsed/partial/full)

---

### 5. Test WorkLog Form (TODO)

**Note**: Ця функціональність ще не повністю імплементована.

Потрібно додати:
1. ClickUp team selector в WorkLogItem
2. ClickUp task selector (autocomplete з assigned tasks)
3. Можливість створювати нові worklogs для ClickUp

---

## Known Issues & Limitations

### Current Limitations:

1. **No Settings UI for ClickUp**
   - Поки що немає UI для додавання ClickUp API key
   - Треба додавати вручну через localStorage або код

2. **No WorkLog Form Integration**
   - Не можна створювати нові worklogs для ClickUp через форму
   - Можна тільки експортувати існуючі time entries

3. **No Team Names Display**
   - В Latest Activity показується "Team {teamId}" замість назви team
   - Треба додати завантаження team names

4. **No Task URL in Parsed Data**
   - В `parseDataFromClickUp` не зберігається `task.url`
   - Треба додати це поле

### Fixes Needed:

1. **Fix Task URL in ClickUpActiveTable**
   ```javascript
   // В clickup.jsx, функція getClickUpTimeEntries
   const parsedData = timeEntries.map((entry) => ({
     id: entry.id,
     task: entry.task?.custom_id || entry.task?.id || "No task",
     taskName: entry.task?.name || "No task",
     description: entry.description || "",
     hours: parseInt(entry.duration) / 3600000,
     date: format(new Date(parseInt(entry.start)), "yyyy-MM-dd"),
     teamId: teamId,
     billable: entry.billable,
     url: entry.task?.url || null, // ADD THIS LINE
   }));
   ```

2. **Add ClickUp to SettingModal**
   - Додати поля для ClickUp API key в SettingModalItem
   - Додати логіку для збереження в Firebase
   - Додати кнопку "Connect ClickUp"

3. **Add ClickUp to WorkLogItem**
   - Додати ClickUpTeamSelect
   - Додати ClickUp task selector (autocomplete)
   - Додати логіку для створення worklogs

---

## Debug Tips

### Check Store State:
```javascript
// In DevTools Console
import useClickUpStore from './store/clickupStore';

// Check current state
console.log(useClickUpStore.getState());

// Check user
console.log(useClickUpStore.getState().user);

// Check teams
console.log(useClickUpStore.getState().teams);

// Check time entries
console.log(useClickUpStore.getState().allClickUpTimeEntries);
```

### Check API Calls:
```javascript
// In DevTools Console
import { clickupLogin, getClickUpTeams, getClickUpTimeEntries } from './actions/clickup';

// Test login
await clickupLogin();

// Test get teams
const teams = await getClickUpTeams();
console.log(teams);

// Test get time entries
const entries = await getClickUpTimeEntries(
  'TEAM_ID',
  '2024-02-01',
  '2024-02-29',
  'USER_ID'
);
console.log(entries);
```

### Check Network Requests:
1. Відкрити DevTools → Network tab
2. Filter: XHR
3. Шукати запити до `/clickup/*`
4. Перевірити:
   - Request URL
   - Request Headers (Authorization)
   - Response Status
   - Response Body

---

## Success Criteria

✅ Backend роут працює і проксує запити до ClickUp API  
✅ Frontend може логінитись і отримувати user info  
✅ Frontend може отримувати teams  
✅ Frontend може експортувати time entries через modal  
✅ Latest Activity відображає ClickUp time entries  
⏳ Settings UI для додавання ClickUp credentials  
⏳ WorkLog form підтримує створення worklogs для ClickUp  
⏳ Підтримка декількох teams (аналогічно до multiple Jira instances)  

---

## Next Steps

1. Додати ClickUp в SettingModal
2. Додати ClickUp в WorkLogItem
3. Додати localStorage persistence
4. Тестувати з реальним API токеном
5. Додати завантаження team names
6. Додати task autocomplete
7. Додати можливість створювати нові time entries
