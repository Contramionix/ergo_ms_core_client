# AI Assistant Frontend

Клиентская часть AI помощника для анализа данных через Ollama.

## Структура

```
ai-assistant/
├── AssistantWidget.vue      # Главный компонент
├── AssistantChat.vue        # Чат для BI анализа
├── AssistantButton.vue      # Кнопка вызова
├── FileSelector.vue         # Выбор файлов для анализа
├── AssistantMessage.vue     # Компонент сообщения
├── AssistantTyping.vue      # Индикатор набора
└── js/
    ├── bi-client.js         # API клиент для BI с Ollama
    ├── endpoints.js         # API endpoints
    ├── router-actions.js    # Действия роутера
    └── component-analyzer.js # Анализ компонентов
```

## Возможности

### BI Анализ данных (через Ollama)
- Выбор файлов из модуля BI
- Запросы на естественном языке
- Автоматическая генерация SQL
- Отображение результатов в таблицах
- AI комментарии и анализ

## Использование

```javascript
import { biClient } from '@/core/ai-assistant/js/bi-client.js'

// Проверка доступности Ollama
const status = await biClient.checkOllamaStatus()

// Список файлов пользователя
const files = await biClient.getUserFiles()

// Запрос к данным через Ollama
const result = await biClient.askQuestion(fileId, question, true)
```

## API Client

`bi-client.js` предоставляет:
- `checkOllamaStatus()` - проверка доступности Ollama через Django API
- `getUserFiles()` - список загруженных файлов пользователя
- `askQuestion(fileId, question, wantCommentary)` - анализ данных через Ollama

## Компоненты

### FileSelector
Выбор файлов из BI модуля с информацией о типе и дате загрузки.

### AssistantChat
Чат для взаимодействия с Ollama для анализа данных.

### AssistantWidget
Главный контейнер, управляющий состоянием чата и обработкой BI запросов.

## Интеграция

Компонент автоматически доступен в `LayoutMenu.vue`:
```vue
<AssistantWidget />
```

Использует существующие endpoints через `apiClient`:
```javascript
import { apiClient } from '@/js/api/manager'
```



