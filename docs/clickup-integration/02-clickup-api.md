# ClickUp API Documentation

## Base URL
```
https://api.clickup.com/api/v2
```

## Authentication
**Header**: `Authorization: <personal_token>`

**Важливо**: ClickUp НЕ використовує "Bearer" prefix, просто токен.

## Як отримати Personal API Token

1. Зайти в ClickUp
2. Settings → My Settings → Apps
3. Generate → Personal API Token
4. Скопіювати токен

## Key Endpoints

### 1. Get User Info
```
GET /user
```
**Response**:
```json
{
  "user": {
    "id": 123,
    "username": "john",
    "email": "john@company.com",
    "color": "#7b68ee",
    "profilePicture": "https://...",
    "initials": "JD",
    "week_start_day": 1,
    "global_font_support": true,
    "timezone": "Europe/Kiev"
  }
}
```

### 2. Get Teams (Workspaces)
```
GET /team
```
**Response**:
```json
{
  "teams": [
    {
      "id": "512",
      "name": "My Team",
      "color": "#536dfe",
      "avatar": "https://...",
      "members": [...]
    }
  ]
}
```

### 3. Get Time Entries
```
GET /team/{team_id}/time_entries
```
**Query Parameters**:
- `start_date` (Unix timestamp in milliseconds)
- `end_date` (Unix timestamp in milliseconds)
- `assignee` (user ID) - optional

**Response**:
```json
{
  "data": [
    {
      "id": "1234567890",
      "task": {
        "id": "abc123",
        "name": "Task name",
        "status": {
          "status": "in progress",
          "color": "#d3d3d3"
        }
      },
      "wid": "512",
      "user": {
        "id": 123,
        "username": "john",
        "email": "john@company.com"
      },
      "billable": false,
      "start": "1614869940000",
      "end": "1614873540000",
      "duration": "3600000",
      "description": "Working on feature",
      "tags": [],
      "source": "web",
      "at": "1614873540000"
    }
  ]
}
```

### 4. Create Time Entry
```
POST /team/{team_id}/time_entries
```
**Body**:
```json
{
  "description": "Working on feature",
  "start": 1614869940000,
  "duration": 3600000,
  "assignee": 123,
  "tid": "abc123"
}
```
**Parameters**:
- `description` (string) - опис роботи
- `start` (number) - Unix timestamp в мілісекундах
- `duration` (number) - тривалість в мілісекундах
- `assignee` (number) - user ID
- `tid` (string) - task ID (optional, якщо не прив'язано до таски)

**Response**:
```json
{
  "data": {
    "id": "1234567890",
    "task": {...},
    "wid": "512",
    "user": {...},
    "billable": false,
    "start": "1614869940000",
    "duration": "3600000",
    "description": "Working on feature",
    "tags": [],
    "at": "1614873540000"
  }
}
```

### 5. Get Tasks
```
GET /team/{team_id}/task
```
**Query Parameters**:
- `page` (number)
- `order_by` (string) - "created", "updated", "due_date"
- `reverse` (boolean)
- `subtasks` (boolean)
- `statuses[]` (array) - filter by status
- `include_closed` (boolean)
- `assignees[]` (array) - filter by assignee
- `due_date_gt` (number) - Unix timestamp
- `due_date_lt` (number) - Unix timestamp
- `date_created_gt` (number) - Unix timestamp
- `date_created_lt` (number) - Unix timestamp
- `date_updated_gt` (number) - Unix timestamp
- `date_updated_lt` (number) - Unix timestamp

**Response**:
```json
{
  "tasks": [
    {
      "id": "abc123",
      "custom_id": "TASK-123",
      "name": "Task name",
      "text_content": "Task description",
      "description": "Task description",
      "status": {
        "status": "in progress",
        "color": "#d3d3d3",
        "orderindex": 1,
        "type": "custom"
      },
      "orderindex": "1.00000000000000000000000000000000",
      "date_created": "1614869940000",
      "date_updated": "1614873540000",
      "date_closed": null,
      "creator": {...},
      "assignees": [...],
      "watchers": [...],
      "checklists": [],
      "tags": [],
      "parent": null,
      "priority": null,
      "due_date": null,
      "start_date": null,
      "points": null,
      "time_estimate": null,
      "custom_fields": [],
      "dependencies": [],
      "linked_tasks": [],
      "team_id": "512",
      "url": "https://app.clickup.com/t/abc123",
      "permission_level": "create",
      "list": {...},
      "project": {...},
      "folder": {...},
      "space": {...}
    }
  ],
  "last_page": true
}
```

## Rate Limits
- **Free plan**: 100 requests per minute
- **Unlimited plan**: 100 requests per minute
- **Business plan**: 100 requests per minute
- **Enterprise plan**: Custom

**Recommendation**: Використовувати той самий Bottleneck limiter як для Jira (333ms між запитами = ~180 req/min, безпечно).

## Error Responses
```json
{
  "err": "Token invalid",
  "ECODE": "OAUTH_027"
}
```

Common error codes:
- `OAUTH_027` - Invalid token
- `OAUTH_014` - Token expired
- `RATE_LIMITED` - Too many requests

## Відмінності від Jira/Redmine

1. **Time tracking**:
   - Jira: worklogs прив'язані до issue, час в секундах
   - ClickUp: time entries можуть бути без таски, час в мілісекундах

2. **Pagination**:
   - Jira: `nextPageToken`
   - ClickUp: `page` parameter + `last_page` boolean

3. **Task hierarchy**:
   - Jira: issue → parent issue
   - ClickUp: task → list → folder → space → team

4. **Date format**:
   - Jira: ISO 8601 string ("2021-03-04T12:00:00.000+0000")
   - ClickUp: Unix timestamp в мілісекундах (1614869940000)
