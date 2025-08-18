# CineChat — анонимные обсуждения фильмов/сериалов

Современный веб‑сервис: Next.js фронтенд + Node.js (Express + Socket.IO) бэкенд, SQLite (better-sqlite3) без внешних зависимостей.
Поддерживает:
- Поиск и выбор фильма (TMDB API)
- Страница фильма с живым анонимным чатом (Socket.IO)
- Оценки (звёзды 1–10) и средний рейтинг
- Без регистрации: сессия создаётся автоматически, ник генерируется случайно

## Быстрый старт

1) Установите Node.js 18+ и pnpm или npm.
2) Заполните ключ TMDB в `server/.env` (создайте из `.env.example`). Получить ключ: https://www.themoviedb.org/settings/api
3) Установка зависимостей:
```bash
cd cinechat
pnpm install  # или npm install
```
4) Запуск в dev‑режиме (2 процесса одновременно):
```bash
pnpm dev      # или npm run dev
```
Бэкенд: http://localhost:4000  
Фронтенд: http://localhost:3000

> В первый запуск БД `server/data.db` создастся автоматически.

## Скрипты
- `pnpm dev` — параллельный запуск server и web
- `pnpm -w build` — сборка web
- `pnpm -w start` — запуск production (сначала `pnpm -w build`)

## Переменные окружения
`server/.env`:
```
TMDB_API_KEY=YOUR_TMDB_KEY
PORT=4000
CORS_ORIGIN=http://localhost:3000
```
`web/.env.local`:
```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

## Архитектура
- **server**: Express REST + Socket.IO, SQLite для сообщений/оценок/псевдопользователей.
- **web**: Next.js 14 (App Router), Tailwind UI, простая Chat/Rating.

## Cursor — Project Rules
- Файл `.cursorrules` в корне — правила для агента (ниже в репо).
- Советы:
  - Используйте @Rules в чате агента.
  - Держите структуру компонентов мелкой, бизнес‑логику — в `web/src/lib`.
  - Для изменений просите агента: *"сначала план → потом патч‑диффами"*.

## Планы на MVP v1
- [x] Поиск по TMDB и тренды
- [x] Страница фильма + чат + рейтинг
- [x] Анонимные сессии (cookie) и ник‑неймы
- [x] Ответы на сообщения (дерево/цитирование)
- [ ] Ветка «Сериал / Сезон / Эпизод»
- [ ] SSR кэширование популярного (edge) и бесшовный деплой

