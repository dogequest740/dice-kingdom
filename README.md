# Telegram Mini App: Город (frontend + backend)

Полноценная заготовка под Telegram Mini App:
- клиент для мобильного Telegram (`public/`);
- backend API (`server.js`);
- авторизация пользователя по `Telegram WebApp initData`;
- серверная экономика (ресурсы/стоимость/улучшения);
- сохранение прогресса пользователя в `data/game-db.json`.

## Что уже реализовано

- главный экран города с постройками;
- ресурсы: пшеница, дерево, камень;
- постройка и улучшение зданий за ресурсы;
- пассивная добыча ресурсов (офлайн прогресс тоже считается);
- лимит хранения ресурсов (через `Замок` и `Хранилище`);
- backend-эндпоинты:
  - `POST /api/session`
  - `POST /api/buildings/:buildingId/upgrade`
  - `POST /api/state/select-building`
  - `GET /api/health`

## 1) Запуск проекта локально

```powershell
npm install
Copy-Item .env.example .env
```

Отредактируйте `.env`:
- `TELEGRAM_BOT_TOKEN` - токен вашего бота из BotFather.
- `ALLOW_DEV_AUTH=true` - оставить включенным для локального теста без Telegram.

Запуск:

```powershell
npm run dev
```

Приложение будет на `http://localhost:3000`.

## 2) Локальный тест без Telegram

Откройте:

`http://localhost:3000/?devUserId=1&devUsername=test`

Это работает только при `ALLOW_DEV_AUTH=true`.

## 3) Запуск именно в Telegram (мобильный сценарий)

Telegram Mini App требует HTTPS URL.

1. Поднимите туннель на локальный сервер (например, Cloudflare Tunnel или ngrok) на `http://localhost:3000`.
2. Получите HTTPS URL вида `https://xxxxx.trycloudflare.com`.
3. В BotFather настройте Mini App URL для бота (Menu Button / Web App).
4. Откройте бота в мобильном Telegram и запускайте Mini App оттуда.

Важно:
- backend проверяет подпись `initData`, поэтому `TELEGRAM_BOT_TOKEN` должен быть корректным.
- если токен неверный, `POST /api/session` вернет ошибку авторизации.

## Структура

- `server.js` - Express backend + Telegram auth + API.
- `shared/game-config.js` - единые игровые расчеты (используются и клиентом, и сервером).
- `public/index.html` - разметка Mini App.
- `public/styles.css` - мобильные стили города.
- `public/app.js` - клиентская логика и вызовы API.
- `data/game-db.json` - локальная база прогресса игроков (создается автоматически).
