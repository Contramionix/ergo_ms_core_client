# Клиент (Vue 3)

Клиент ERGO MS: маршруты, меню, общие компоненты, стили. Сборка — Vite.

## Структура

| Каталог | Назначение |
|---------|------------|
| `src/components/` | общие компоненты ядра (`SelectBox`, `SearchInput`, `UserAvatar`, …) |
| `src/core/cms/` | CMS, админка, авторизация, профиль |
| `src/js/` | клиент API, утилиты, toast, confirm |
| `scripts/` | сборка и сервер разработки |

Маршруты и меню модулей подхватываются из `modules/*/client/js/` — см. [`.docs/architecture.md`](../../.docs/architecture.md).

## Правила для разработчиков

| Тема | Правило |
|------|---------|
| Компоненты UI | [`.cursor/rules/components.mdc`](../../.cursor/rules/components.mdc) |
| Стиль Vue, toast, confirm | [`.cursor/rules/client_code.mdc`](../../.cursor/rules/client_code.mdc) |
| Темы и шрифты | [`.cursor/rules/themes.mdc`](../../.cursor/rules/themes.mdc) |
| Безопасность (public_id, токены) | [`.cursor/rules/security.mdc`](../../.cursor/rules/security.mdc) |
