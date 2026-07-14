# Клиент (Vue 3)

Клиент ERGO MS: маршруты, боковое меню, общие компоненты, стили. Сборка — Vite.

## Структура

| Каталог | Назначение |
|---------|------------|
| `src/components/` | общие компоненты ядра (`SelectBox`, `SearchInput`, `DropDown`, `UserAvatar`, …) |
| `src/components/menu/` | боковое меню (`MenuList`, `MenuGroup`, composables) |
| `src/core/cms/` | CMS, админка, авторизация, профиль, `menuService.js` |
| `src/js/` | клиент API, утилиты, toast, confirm, WebSocket (`ws/`), realtime |
| `scripts/` | сборка и сервер разработки |

Маршруты модулей подхватываются из `modules/*/client/js/routes.js`. Боковое меню приходит из API (данные в БД после миграций сервера) — см. [`.docs/architecture.md`](../../.docs/architecture.md#боковое-меню).

## Правила для разработчиков

| Тема | Правило |
|------|---------|
| Компоненты UI | [`.cursor/rules/components.mdc`](../../.cursor/rules/components.mdc) |
| Боковое меню | [`.cursor/rules/menu.mdc`](../../.cursor/rules/menu.mdc) |
| Realtime / WebSocket | [`.cursor/rules/realtime.mdc`](../../.cursor/rules/realtime.mdc) |
| Redis, nginx (prod) | [`.cursor/rules/deployment-infra.mdc`](../../.cursor/rules/deployment-infra.mdc) |
| Стиль Vue, toast, confirm | [`.cursor/rules/client_code.mdc`](../../.cursor/rules/client_code.mdc) |
| Темы и шрифты | [`.cursor/rules/themes.mdc`](../../.cursor/rules/themes.mdc) |
| Безопасность (public_id, токены) | [`.cursor/rules/security.mdc`](../../.cursor/rules/security.mdc) |
