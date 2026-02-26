# Questions for User

## Answered ✅

### 1. Тип інтеграції
**Q**: Personal API Token чи OAuth 2.0?  
**A**: Personal API Token (кожен користувач прив'язує свій токен)

### 2. Функціонал
**Q**: Які дії потрібні з ClickUp?  
**A**: Все як у Jira - витягувати таски, витягувати time entries (worklogs), логувати час. Без створення/редагування тасків.

### 3. Структура проекту
**Q**: Один додаток для всіх сервісів чи окремі?  
**A**: Створити нову гілку `firebase-click-up-app` від `firebase-app`

---

## To Be Answered ❓

### 4. Multiple Teams Support ✅
**Q**: Підтримувати можливість працювати з декількома teams одночасно (як з декількома Jira instances)?  
**A**: **Так**, підтримувати декілька teams. Користувач може бути залучений до кількох каналів/teams одночасно.

### 5. UI Layout ✅
**Q**: Де розмістити ClickUp в інтерфейсі?  
**A**: **Інтегрувати в існуючий інтерфейс** (спільний "Latest Activity", спільна форма worklogs).

### 6. Team Selection UX
**Q**: Коли і як користувач обирає team?  
**Decision**: Одразу після логіна показати список teams, користувач може додати декілька. При створенні worklog - селектор team (як у Jira instance selector).

### 7. Time Entry Format ✅
**Q**: Як вводити час для ClickUp?  
**A**: **Години** (як зараз) - конвертувати в мілісекунди (`hours * 3600 * 1000`).

### 8. Task Assignment ✅
**Q**: Як прив'язувати worklogs до тасків?  
**A**: **Обов'язково вказувати task ID**. Автокомпліт з списку assigned tasks (як у Jira).

### 9. Custom Task ID Display ✅
**Q**: Що показувати користувачу - `task.id` чи `task.custom_id`?  
**A**: Показувати `custom_id` якщо є, інакше `id`.

### 10. Error Handling ✅
**Q**: Що робити при помилках API?  
**A**: **Так**, залишити той самий підхід - Toast notification з помилкою.

---

## Technical Questions

### 11. Rate Limiting
**Q**: ClickUp має ліміт 100 req/min. Використовувати той самий Bottleneck limiter як для Jira (333ms)?  
**Recommendation**: Так, 333ms = ~180 req/min, безпечно.

### 12. Pagination Strategy
**Q**: ClickUp використовує `page` parameter. Як завантажувати всі дані?  
**Options**:
- A) Рекурсивно завантажувати всі сторінки (як Jira з nextPageToken)
- B) Завантажувати тільки першу сторінку
- C) Lazy loading (завантажувати по потребі)

**Recommendation**: Варіант A - завантажувати всі сторінки до `last_page: true`.

### 13. Date Range for Fetching
**Q**: За який період завантажувати time entries?  
**Current behavior**: 
- Jira: поточний місяць
- Redmine: поточний місяць

**Keep same?**: Так, поточний місяць.

---

## Next Steps

1. Отримати відповіді на питання 4-9
2. Почати імплементацію Phase 1 (Backend)
3. Створити базову структуру файлів
4. Імплементувати login flow
5. Тестувати з реальним API токеном
