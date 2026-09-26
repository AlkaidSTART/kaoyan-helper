-- 登科 · 用户活动事件（管理端只读观测）
-- 依赖：20260926120000_baseline_backend_api.sql
-- 说明：服务端在既有写路径成功后旁路落一条活动事件（登录 / 答题 / 卡片复习），
--       供管理端"用户活动"页只读查询（契约 ADMIN-ACT-01）。
--       summary 只存最少必要字段；表不开放给 anon / authenticated 浏览器角色。

create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_activities_created_at_idx
  on public.user_activities (created_at desc);
create index if not exists user_activities_user_id_created_at_idx
  on public.user_activities (user_id, created_at desc);
create index if not exists user_activities_type_created_at_idx
  on public.user_activities (type, created_at desc);

alter table public.user_activities enable row level security;

revoke all on table public.user_activities from public, anon, authenticated;
