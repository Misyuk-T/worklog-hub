# ClickUp Integration - Overview

## Мета
Додати можливість логувати час в ClickUp аналогічно до існуючої функціональності для Jira та Redmine.

## Дата створення
26 лютого 2026

## Поточна архітектура проекту

### Backend (Node.js/Express)
- **Server**: `server/routes/routes.js`
- **Існуючі роути**:
  - `/redmine/*` - проксі для Redmine API
  - `/jira/*` - проксі для Jira API
  - `/submit-form` - парсинг файлів (xlsx для Jira, txt для custom)

### Frontend (React + Zustand)

#### Stores (Zustand):
- `react-app/src/store/jiraStore.js` - стан для Jira
- `react-app/src/store/redmineStore.js` - стан для Redmine

#### Actions:
- `react-app/src/actions/jira.jsx` - API calls для Jira
- `react-app/src/actions/redmine.jsx` - API calls для Redmine

#### Helpers:
- `react-app/src/helpers/parseDataFromJira.js`
- `react-app/src/helpers/filterWorklogsForJira.js`
- `react-app/src/helpers/transformToRedmineData.js`

## Патерн авторизації

### Jira
- **Метод**: Basic Auth
- **Параметри**: `jiraEmail` + `jiraApiKey`
- **Заголовок**: `Authorization: Basic ${base64(email:apiKey)}`

### Redmine
- **Метод**: API Key в query params
- **Параметри**: `redmineApiKey` + `redmineUrl`
- **Query**: `?key=<redmineApiKey>`

### ClickUp (планується)
- **Метод**: Personal API Token
- **Параметри**: `clickupApiKey`
- **Заголовок**: `Authorization: <clickupApiKey>` (без "Bearer")

## Особливості існуючої реалізації

1. **Multiple instances**: Підтримка декількох Jira instances через `additionalAssignedIssues`
2. **Rate limiting**: Використання Bottleneck для throttling Jira requests (333ms між запитами)
3. **Pagination**: Рекурсивне завантаження через `nextPageToken` для Jira
4. **Toast notifications**: Chakra UI + react-toastify для повідомлень
5. **Local storage**: Зберігання credentials в localStorage

## Структура компонентів

### Jira Components:
- `GenerateCards/Jira/JiraModal.jsx`
- `LatestActivity/JiraActiveTable/JiraActiveTable.jsx`
- `Tabs/WorklogItem/JiraInstanceSelect.jsx`

### Redmine Components:
- `LatestActivity/RedmineActiveTable/RedmineActiveTable.jsx`
- `LatestActivity/RedmineActiveTable/RedamineCardItem.jsx`
- `Tabs/TotalInformationTab/RedmineForm.jsx`

## Git Strategy
- **Base branch**: `firebase-app`
- **New branch**: `firebase-click-up-app`
- Інші гілки: `master`, `firebase-electron-app`
