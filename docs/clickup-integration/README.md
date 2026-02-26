# ClickUp Integration Documentation

Документація для інтеграції ClickUp в Redmine Logger.

## Структура документації

1. **[01-overview.md](./01-overview.md)** - Огляд проекту та поточної архітектури
2. **[02-clickup-api.md](./02-clickup-api.md)** - Документація ClickUp API
3. **[03-implementation-plan.md](./03-implementation-plan.md)** - План імплементації
4. **[04-questions-for-user.md](./04-questions-for-user.md)** - Питання для уточнення

## Quick Start

### Для розробника який продовжує роботу:

1. Прочитай `01-overview.md` щоб зрозуміти поточну архітектуру
2. Прочитай `02-clickup-api.md` щоб зрозуміти ClickUp API
3. Прочитай `03-implementation-plan.md` щоб зрозуміти план роботи
4. Перевір `04-questions-for-user.md` - можливо є невирішені питання

### Поточний статус:

- ✅ Створено гілку `firebase-click-up-app`
- ✅ Створено документацію
- ✅ Backend роут - завершено
- ✅ Frontend store - завершено
- ✅ Actions - завершено
- ✅ Components - завершено (80%)
- ⏳ Settings UI - не почато
- ⏳ WorkLog form integration - не почато
- ⏳ LocalStorage persistence - не почато

**Прогрес: 80% базової функціональності готово**

## Корисні посилання

- [ClickUp API Documentation](https://clickup.com/api)
- [ClickUp API v2 Reference](https://clickup.com/api/clickupreference/operation/GetAuthorizedUser/)
- [Personal API Token Guide](https://docs.clickup.com/en/articles/1367130-getting-started-with-the-clickup-api)

## Нотатки

- ClickUp НЕ використовує "Bearer" в Authorization header, тільки токен
- Time entries в ClickUp можуть бути без прив'язки до таски
- ClickUp використовує Unix timestamps в мілісекундах (не секундах як Jira)
- Rate limit: 100 requests/minute
- Pagination через `page` parameter + `last_page` boolean

## Що працює зараз

✅ **Backend**
- Роут `/clickup/*` проксує запити до ClickUp API
- Rate limiting (333ms між запитами)

✅ **Frontend - Core**
- Store для управління станом ClickUp
- Actions для всіх API calls
- Axios interceptor для автоматичного додавання API key

✅ **Frontend - UI**
- Export time entries через modal (Generate Cards → ClickUp)
- Відображення time entries в Latest Activity
- Підтримка декількох teams

## Що треба додати

⏳ **Settings UI**
- Форма для додавання ClickUp API key
- Кнопка "Connect ClickUp"
- Збереження в Firebase

⏳ **WorkLog Form**
- Team selector в WorkLogItem
- Task selector (autocomplete)
- Створення worklogs для ClickUp

⏳ **LocalStorage**
- Збереження credentials
- Auto-load при старті

## Швидкий старт для тестування

1. Отримати ClickUp Personal API Token
2. Запустити сервери (backend + frontend)
3. Додати API key в localStorage:
   ```javascript
   localStorage.setItem('clickup_api_key', 'YOUR_TOKEN');
   ```
4. Додати в settings через код або DevTools
5. Тестувати Generate Cards → ClickUp
6. Перевірити Latest Activity → ClickUp tab

Детальні інструкції в [06-testing-guide.md](./06-testing-guide.md)
