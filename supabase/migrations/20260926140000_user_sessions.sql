-- 登科 · Flutter 用户会话（Bearer Token）
-- 依赖：20260926120000_baseline_backend_api.sql、20260926130000_admin_prisma_auth.sql
-- 说明：承载 /api/v1 面向 Flutter 的不透明 Bearer 会话（access/refresh 同表轮换）。
--       令牌仅存 SHA-256 摘要；两表不开放给 anon / authenticated 浏览器角色。

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  client_type text not null default 'flutter',
  device_name text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_user_id_expires_at_idx
  on public.user_sessions (user_id, expires_at);
create index if not exists user_sessions_expires_at_idx
  on public.user_sessions (expires_at);

alter table public.user_sessions enable row level security;

revoke all on table public.user_sessions from public, anon, authenticated;
