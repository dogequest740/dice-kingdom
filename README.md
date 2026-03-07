# Telegram Mini App: Город (Vercel + Supabase)

Проект переделан под serverless-архитектуру:
- фронт на статических файлах (`index.html`, `app.js`, `styles.css`) из TypeScript-исходников;
- backend на Vercel Functions (`api/*`) из TypeScript-исходников;
- хранение прогресса в Supabase (`players.state` JSONB);
- авторизация через Telegram WebApp `initData`.

## Реализовано

- экран города с постройками;
- ресурсы: пшеница, дерево, камень;
- постройка и улучшение зданий;
- пассивная добыча ресурсов;
- серверная валидация экономики (стоимость/ресурсы/уровни);
- API:
  - `GET /api/health`
  - `POST /api/session`
  - `POST /api/state/select-building`
  - `POST /api/buildings/:buildingId/upgrade`
  - `POST /api/dev/reset` (только при `ALLOW_DEV_AUTH=true`)

## Supabase: подготовка таблицы

В SQL Editor выполни:

```sql
create table if not exists public.players (
  user_id bigint primary key,
  username text,
  first_name text,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_players_updated_at on public.players;
create trigger trg_players_updated_at
before update on public.players
for each row execute procedure public.set_updated_at();
```

Готовый файл со схемой: `supabase/schema.sql`.

## Локальный запуск

```powershell
npm install
npx vercel login
Copy-Item .env.example .env
npm run dev
```

Открой `http://localhost:3000`.

Для теста без Telegram:
`http://localhost:3000/?devUserId=1&devUsername=test`

Проверка типов:

```powershell
npm run typecheck
```

Ручная сборка TypeScript в `.js`:

```powershell
npm run build:ts
```

## .env параметры

- `TELEGRAM_BOT_TOKEN` - токен бота из BotFather.
- `SUPABASE_URL` - URL проекта Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` - service_role ключ (только на backend).
- `SUPABASE_PLAYERS_TABLE` - имя таблицы, по умолчанию `players`.
- `ALLOW_DEV_AUTH` - включить dev-запуск без Telegram.
- `TG_AUTH_MAX_AGE_SEC` - TTL `initData` в секундах.

## Деплой на Vercel (бесплатно)

1. Импортируй GitHub-репозиторий в Vercel.
2. В `Project Settings -> Environment Variables` добавь переменные из `.env`.
3. Нажми Deploy.
4. Проверь `https://<project>.vercel.app/api/health`.
5. В BotFather (`/setmenubutton`) укажи `https://<project>.vercel.app`.

## Структура

- `api/*` - Vercel Functions.
- `lib/*` - auth/API/Supabase хелперы.
- `*.ts` - исходники TypeScript.
- `*.js` - собранные runtime-файлы для Vercel/браузера.
- `shared/game-config.ts` - единая игровая логика для клиента и backend.
- `index.html`, `app.ts`, `styles.css` - UI Mini App (выходной файл: `app.js`).
