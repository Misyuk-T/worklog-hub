# ClickUp Integration - Next Steps

## Що зроблено ✅

1. ✅ **Backend** - роут `/clickup/*` працює
2. ✅ **Frontend Core** - store, actions, axios interceptor
3. ✅ **UI Components** - modal, active table, team select
4. ✅ **Integration** - додано в Generate Cards і Latest Activity
5. ✅ **Стилі хідера** - прибрано фіксовану ширину, зроблено responsive
6. ✅ **Документація** - повна документація в `docs/clickup-integration/`

---

## Що залишилось (2 завдання)

### 1. Settings UI для ClickUp API key (1-2 год)

**Файли для редагування**:
- `react-app/src/components/SettingModal/SettingModal.jsx`
- `react-app/src/components/SettingModal/SettingModalItem.jsx`

**Що треба зробити**:

1. Додати поле `clickupApiKey` в `defaultSetting`:
   ```javascript
   const defaultSetting = {
     presetName: "unnamed",
     redmineUrl: "",
     jiraUrl: "",
     redmineApiKey: "",
     jiraApiKey: "",
     jiraEmail: "",
     clickupApiKey: "", // ADD THIS
   };
   ```

2. Додати функцію `fetchClickUpUser` (аналогічно до `fetchJiraUser`):
   ```javascript
   const fetchClickUpUser = async () => {
     const user = await clickupLogin();
     addClickUpUser(user);
     return user;
   };
   ```

3. В `SettingModalItem.jsx` додати Input для ClickUp API Key:
   ```jsx
   <FormControl>
     <FormLabel>ClickUp API Key</FormLabel>
     <Input
       type="password"
       value={settings.clickupApiKey || ""}
       onChange={(e) => handleChange("clickupApiKey", e.target.value)}
       placeholder="Enter ClickUp API Key"
     />
   </FormControl>
   ```

4. Додати кнопку "Connect ClickUp" (аналогічно до Jira):
   ```jsx
   <Button
     onClick={async () => {
       const user = await fetchClickUpUser();
       if (user) {
         const teams = await getClickUpTeams();
         // Show team selector or auto-select first team
       }
     }}
     isDisabled={!settings.clickupApiKey}
   >
     Connect ClickUp
   </Button>
   ```

5. Додати imports:
   ```javascript
   import useClickUpStore from "../../store/clickupStore";
   import { clickupLogin, getClickUpTeams } from "../../actions/clickup";
   ```

**Важливо**: Зберігати `clickupApiKey` в Firebase (через `updateSettings`), так само як `jiraApiKey` і `redmineApiKey`.

---

### 2. WorkLog Form Integration (2-3 год)

**Файл для редагування**:
- `react-app/src/components/Tabs/WorklogItem/WorkLogItem.jsx`

**Що треба зробити**:

1. Додати imports:
   ```javascript
   import useClickUpStore from "../../../store/clickupStore";
   import ClickUpTeamSelect from "./ClickUpTeamSelect";
   ```

2. Додати ClickUp store в компонент:
   ```javascript
   const { assignedTasks: clickUpTasks, additionalAssignedTasks: additionalClickUpTasks, selectedTeamId } =
     useClickUpStore();
   ```

3. Додати поля в `defaultValues`:
   ```javascript
   defaultValues: {
     // ... existing fields
     clickupTeamId: data.clickupTeamId || selectedTeamId,
     clickupTask: data.clickupTask,
   }
   ```

4. Додати UI після Jira секції:
   ```jsx
   <Flex alignItems="center" w="100%" gap={"5px"}>
     <Text m={0} whiteSpace={"nowrap"}>
       <strong>ClickUp Team:</strong>{" "}
     </Text>
     <ClickUpTeamSelect
       control={control}
       options={clickUpTeamOptions}
       onChange={(teamId) => {
         setValue("clickupTeamId", teamId);
         setIsEdited(true);
         setValue("clickupTask", "");
       }}
       value={clickUpTeamOptions.find(
         (item) => item.value === selectedClickUpTeamId
       )}
     />
   </Flex>

   <Flex alignItems="center" w="100%" gap={"5px"}>
     <Text m={0} whiteSpace={"nowrap"}>
       <strong>ClickUp Task:</strong>{" "}
     </Text>
     <Box width="300px">
       <IssuesSelect
         teamId={selectedClickUpTeamId}
         value={watch("clickupTask")}
         control={control}
         onChange={(task) => {
           setValue("clickupTask", task);
           setIsEdited(true);
         }}
         assignedTasks={assignedTasksForSelectedTeam}
       />
     </Box>
   </Flex>
   ```

5. Оновити `handleSave`:
   ```javascript
   const updatedData = {
     ...data,
     // ... existing fields
     clickupTeamId: clickupTeamId?.value || data.clickupTeamId,
     clickupTask: clickupTask?.value || data.clickupTask,
   };
   ```

**Альтернатива**: Можна створити окремий компонент `ClickUpWorkLogItem.jsx` якщо логіка стане занадто складною.

---

## Структура для тестування

### Крок 1: Отримати ClickUp API Token

1. Зайти в ClickUp
2. Settings → My Settings → Apps
3. Generate → Personal API Token
4. Скопіювати токен

### Крок 2: Додати в Settings

1. Відкрити додаток
2. Натиснути на Settings (іконка шестерні)
3. Додати ClickUp API Key
4. Натиснути "Connect ClickUp"
5. Обрати team (якщо декілька)

### Крок 3: Тестувати функціонал

1. **Generate Cards**:
   - Обрати "ClickUp"
   - Обрати date range
   - Обрати teams
   - Export time entries

2. **Latest Activity**:
   - Перейти на таб "ClickUp"
   - Перевірити відображення time entries
   - Перевірити total hours

3. **WorkLog Form** (після імплементації):
   - Створити новий worklog
   - Обрати ClickUp team
   - Обрати ClickUp task
   - Зберегти
   - Перевірити що створився time entry в ClickUp

---

## Додаткові покращення (опціонально)

### Team Names Display (20 хв)

Зараз показується "Team {teamId}", краще показувати назву:

```javascript
// В clickupStore додати:
const [teamNames, setTeamNames] = useState({});

// При завантаженні teams:
const teams = await getClickUpTeams();
const teamNamesMap = teams.reduce((acc, team) => {
  acc[team.id] = team.name;
  return acc;
}, {});
setTeamNames(teamNamesMap);
```

Потім в UI:
```jsx
{teamNames[teamId] || `Team ${teamId}`}
```

### Task Autocomplete (30 хв)

Додати пошук по таскам в реальному часі:

```javascript
const searchClickUpTasks = async (query, teamId) => {
  const response = await instance.get(`/clickup/team/${teamId}/task`, {
    params: {
      search: query,
    },
  });
  return response.data.tasks;
};
```

Використати в `react-select` з `async` prop.

---

## Estimated Time

- **Settings UI**: 1-2 години
- **WorkLog Form**: 2-3 години
- **Testing**: 1 година
- **Bug fixes**: 30 хв - 1 година

**Total**: 4.5 - 7 годин

---

## Пріоритети

1. **High**: Settings UI (без цього важко тестувати)
2. **High**: WorkLog Form (основна функціональність)
3. **Medium**: Team Names Display (UX improvement)
4. **Low**: Task Autocomplete (nice to have)

---

## Контакт

Якщо виникнуть питання:
- Дивись `06-testing-guide.md` для тестування
- Дивись `02-clickup-api.md` для API reference
- Дивись `FINAL-REPORT.md` для детального звіту

**Good luck! 🚀**
