-- 登科 · Admin Prisma 管理员密码认证
-- 依赖：20260926120000_baseline_backend_api.sql
-- 说明：新增服务端管理员凭据与会话表；两表不开放给 anon / authenticated 浏览器角色。

create table if not exists public.admin_credentials (
  user_id uuid primary key references public.users (id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_credentials_set_updated_at on public.admin_credentials;
create trigger admin_credentials_set_updated_at
  before update on public.admin_credentials
  for each row execute function public.set_updated_at();

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  device_name text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_sessions_user_id_expires_at_idx
  on public.admin_sessions (user_id, expires_at);
create index if not exists admin_sessions_expires_at_idx
  on public.admin_sessions (expires_at);

alter table public.admin_credentials enable row level security;
alter table public.admin_sessions enable row level security;

revoke all on table public.admin_credentials from public, anon, authenticated;
revoke all on table public.admin_sessions from public, anon, authenticated;
