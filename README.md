# CineChat — анонимные обсуждения фильмов/сериалов

Современный веб‑сервис: Next.js фронтенд + Node.js (Express + Socket.IO) бэкенд, SQLite (better-sqlite3) без внешних зависимостей.

Поддерживает:
- Поиск и выбор фильма (TMDB API)
- Страница фильма с живым анонимным чатом (Socket.IO), тредами и эмодзи
- Оценки (звёзды 1–10), средний рейтинг (реалтайм)
- Голосование за сообщения (апвоут/даунвоут), сортировка «по новизне»/«по рейтингу»
- Без регистрации: сессия создаётся автоматически, ник генерируется случайно

Продакшен: https://cinechat.ru

## Быстрый старт

1) Установите Node.js 20 LTS и pnpm.
2) Заполните ключ TMDB в `server/.env` (создайте из `.env.example`). Получить ключ: https://www.themoviedb.org/settings/api
3) Установка зависимостей:
```bash
cd cinechat
pnpm install
```
4) Запуск в dev‑режиме (2 процесса одновременно):
```bash
pnpm dev
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
TMDB_LANG=ru-RU
PORT=4000
CORS_ORIGIN=http://localhost:3000
```
`web/.env.local`:
```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```
(в продакшене используйте `web/.env.production` с `NEXT_PUBLIC_SERVER_URL=https://ваш_домен`)

## Архитектура
- **server**: Express REST + Socket.IO, SQLite (better-sqlite3), кэш TMDB в памяти (60с), подготовленные выражения; cookie‑сессии (анонимные ники).
- **web**: Next.js 14 (App Router), Tailwind UI, компоненты: `Chat`, `Rating`.

### Особенности UX
- Мобайл: фиксированная шапка; компактный постер слева, описание/рейтинг справа; карточки и чат без горизонтального скролла; inline‑реплай в треде; эмодзи‑пикер.
- Десктоп: уменьшенный постер; описание и рейтинг справа; чат ниже; плавные hover/тени карточек.
- Чат: треды свёрнуты по умолчанию; переключатель сортировки «По новизне/По рейтингу»; ап/даун‑воты с суммарным счётом; вставка эмодзи.

## Деплой (VPS + Nginx + systemd)
1) Клонировать в `/opt/cinechat`, заполнить `server/.env`, `web/.env.production` (`NEXT_PUBLIC_SERVER_URL=https://YOUR_DOMAIN`).
2) `pnpm install && pnpm approve-builds better-sqlite3 && pnpm --filter cinechat-web build`
3) Сервисы: `cinechat-server` (порт 4000) и `cinechat-web` (порт 3000).
4) Nginx проксирует `/api/*` и `/socket.io/*` на 4000, остальное на 3000. HTTPS обязателен (cookie secure).

### CI/CD (GitHub Actions)
- Workflow: `.github/workflows/deploy.yml` — деплой по push в `main` через SSH (root).
- Secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `APP_DIR` (`/opt/cinechat`), опционально `SSH_PORT`.

## Cursor — Project Rules
- Файл `.cursorrules` в корне — правила для агента.
- Держать компоненты мелкими, бизнес‑логику — в `web/src/lib`.
- Новые фичи сопровождать тестами (Jest/RTL для web, Jest для server), e2e — по мере готовности.

## Планы на MVP v1
- [x] Поиск по TMDB и тренды
- [x] Страница фильма + чат + рейтинг
- [x] Анонимные сессии (cookie) и ник‑неймы
- [x] Ответы на сообщения (дерево/цитирование), сортировка, голоса, эмодзи
- [ ] Ветка «Сериал / Сезон / Эпизод»
- [ ] SSR кэширование популярного (edge) и бесшовный деплой

