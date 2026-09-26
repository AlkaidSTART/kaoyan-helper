-- 登科 · Next.js BFF 基线 Schema
-- 目标：为 /api/v1 提供用户、题库、错题、院校、闪卡、打卡、AI 配额与审计数据模型。
-- 依据：docs/p1-design/next-backend-api-rbac/data-model.md
-- 说明：远端 public schema 审计为空，本文件为可重复执行的基线迁移，不自动应用。
-- 注意：基线迁移一经应用不得再修改，后续变更必须追加新迁移。

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 通用工具
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.current_role_of(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = p_user_id;
$$;

-- 有效管理员：admin 角色且未封禁，或封禁期已过。
create or replace function public.count_active_admins()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.users
  where role = 'admin'
    and (is_banned = false or (banned_until is not null and banned_until < now()));
$$;

-- ---------------------------------------------------------------------------
-- 用户资料
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nickname text,
  avatar_url text,
  exam_year integer,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  banned_reason text,
  banned_at timestamptz,
  banned_until timestamptz,
  banned_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_role_idx on public.users (role) where role = 'admin';
create index users_is_banned_idx on public.users (is_banned);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, nickname)
  values (new.id, coalesce(new.email, ''), split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 目标院校
-- ---------------------------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  province text,
  region text,
  is_985 boolean not null default false,
  is_211 boolean not null default false,
  is_double_first_class boolean not null default false,
  is_self_marking boolean not null default false,
  is_published boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger schools_set_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

create table public.school_programs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  major_code text not null,
  major_name text not null,
  year integer not null,
  study_mode text,
  plan_enrollment integer,
  min_score numeric(6, 2),
  avg_score numeric(6, 2),
  is_published boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, major_code, year)
);

create index school_programs_lookup_idx
  on public.school_programs (school_id, major_code, year desc);

create trigger school_programs_set_updated_at
  before update on public.school_programs
  for each row execute function public.set_updated_at();

create table public.user_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  type text not null check (type in ('primary', 'backup')),
  major_code text,
  major_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, school_id, type, major_code)
);

create index user_targets_user_idx on public.user_targets (user_id);
create unique index user_targets_single_primary_idx
  on public.user_targets (user_id)
  where type = 'primary';

create trigger user_targets_set_updated_at
  before update on public.user_targets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 题库与判题
-- ---------------------------------------------------------------------------

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  chapter text,
  year integer,
  type text not null check (type in ('single_choice', 'multiple_choice', 'judge', 'fill_blank')),
  stem text not null,
  options jsonb not null default '[]'::jsonb,
  answer text not null,
  explanation text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  source text not null default 'ugc' check (source in ('official', 'ugc')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  is_approved boolean not null default false,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  creator_id uuid references public.users (id) on delete set null,
  is_deleted boolean not null default false,
  deleted_reason text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_official_needs_creator check (source <> 'official' or review_status = 'approved')
);

create index questions_public_idx
  on public.questions (subject, chapter, year)
  where is_deleted = false and review_status = 'approved';
create index questions_creator_idx on public.questions (creator_id) where creator_id is not null;
create index questions_review_idx on public.questions (review_status) where is_deleted = false;

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, attempt_id)
);

create table public.mistake_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'mastered')),
  error_count integer not null default 1,
  consecutive_correct integer not null default 0,
  last_wrong_at timestamptz not null default now(),
  mastered_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index mistake_records_user_status_idx on public.mistake_records (user_id, status);

create trigger mistake_records_set_updated_at
  before update on public.mistake_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 闪卡、复习与打卡
-- ---------------------------------------------------------------------------

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'ugc' check (source in ('system', 'ugc')),
  creator_id uuid references public.users (id) on delete cascade,
  category text not null,
  front text not null,
  back text not null,
  tags text[] not null default '{}',
  is_deleted boolean not null default false,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flashcards_system_has_no_creator check (source <> 'system' or creator_id is null)
);

create index flashcards_creator_idx on public.flashcards (creator_id) where creator_id is not null;

create trigger flashcards_set_updated_at
  before update on public.flashcards
  for each row execute function public.set_updated_at();

create table public.card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  card_id uuid not null references public.flashcards (id) on delete cascade,
  repetitions integer not null default 0,
  interval_days integer not null default 0,
  ease_factor numeric(4, 2) not null default 2.50,
  due_at timestamptz not null default now(),
  last_rating text check (last_rating in ('forgot', 'fuzzy', 'remembered')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index card_progress_due_idx on public.card_progress (user_id, due_at);

create trigger card_progress_set_updated_at
  before update on public.card_progress
  for each row execute function public.set_updated_at();

create table public.card_review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  card_id uuid not null references public.flashcards (id) on delete cascade,
  idempotency_key text not null,
  rating text not null check (rating in ('forgot', 'fuzzy', 'remembered')),
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table public.check_in_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  check_in_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, check_in_date)
);

create index check_in_records_user_date_idx on public.check_in_records (user_id, check_in_date desc);

-- ---------------------------------------------------------------------------
-- AI 配额
-- ---------------------------------------------------------------------------

create table public.ai_usage_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  usage_date date not null,
  call_count integer not null default 0,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  cost_estimate numeric(12, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create trigger ai_usage_daily_set_updated_at
  before update on public.ai_usage_daily
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 管理、审计与幂等
-- ---------------------------------------------------------------------------

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users (id) on delete cascade,
  action text not null,
  resource_type text not null,
  resource_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_logs_actor_idx on public.admin_audit_logs (actor_id, created_at desc);
create index admin_audit_logs_resource_idx on public.admin_audit_logs (resource_type, resource_id);

create table public.idempotency_records (
  user_id uuid not null references public.users (id) on delete cascade,
  scope text not null,
  key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, scope, key)
);

create table public.school_import_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users (id) on delete cascade,
  format text not null check (format in ('csv', 'json')),
  mode text not null check (mode in ('validate', 'commit')),
  status text not null default 'validated' check (status in ('validated', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger school_import_jobs_set_updated_at
  before update on public.school_import_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 服务端函数：判题 + 错题状态机
-- ---------------------------------------------------------------------------

create or replace function public.submit_question_answer(
  p_question_id uuid,
  p_answer text,
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_question public.questions;
  v_existing public.question_attempts;
  v_norm text;
  v_correct text;
  v_is_correct boolean;
  v_mistake public.mistake_records;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_existing
  from public.question_attempts
  where user_id = v_uid and attempt_id = p_attempt_id;

  if found then
    if v_existing.question_id <> p_question_id or v_existing.answer <> p_answer then
      raise exception 'ATTEMPT_CONFLICT' using errcode = 'P0001';
    end if;
    return v_existing.result;
  end if;

  select * into v_question
  from public.questions q
  where q.id = p_question_id
    and q.is_deleted = false
    and (
      q.creator_id = v_uid
      or (q.review_status = 'approved' and q.visibility = 'public')
    );

  if not found then
    raise exception 'QUESTION_NOT_ACCESSIBLE' using errcode = 'P0001';
  end if;

  v_norm := upper(regexp_replace(coalesce(p_answer, ''), '\s', '', 'g'));
  v_correct := upper(regexp_replace(v_question.answer, '\s', '', 'g'));

  if v_question.type = 'multiple_choice' then
    v_is_correct :=
      (select coalesce(array_agg(x order by x), '{}') from unnest(string_to_array(v_norm, ',')) as x)
      = (select coalesce(array_agg(x order by x), '{}') from unnest(string_to_array(v_correct, ',')) as x);
  else
    v_is_correct := v_norm = v_correct;
  end if;

  if not v_is_correct then
    insert into public.mistake_records (user_id, question_id, status, error_count, consecutive_correct, last_wrong_at)
    values (v_uid, p_question_id, 'active', 1, 0, now())
    on conflict (user_id, question_id) do update
      set error_count = public.mistake_records.error_count + 1,
          consecutive_correct = 0,
          status = 'active',
          mastered_at = null,
          last_wrong_at = now(),
          version = public.mistake_records.version + 1
    returning * into v_mistake;
  else
    update public.mistake_records
       set consecutive_correct = consecutive_correct + 1,
           status = case when consecutive_correct + 1 >= 2 then 'mastered' else status end,
           mastered_at = case when consecutive_correct + 1 >= 2 then now() else mastered_at end,
           version = version + 1
     where user_id = v_uid and question_id = p_question_id
     returning * into v_mistake;
  end if;

  v_result := jsonb_build_object(
    'isCorrect', v_is_correct,
    'correctAnswer', v_question.answer,
    'explanation', v_question.explanation,
    'answeredAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'mistake', case
      when v_mistake.id is null then null
      else jsonb_build_object(
        'id', v_mistake.id,
        'status', v_mistake.status,
        'errorCount', v_mistake.error_count,
        'consecutiveCorrect', v_mistake.consecutive_correct,
        'version', v_mistake.version
      )
    end
  );

  insert into public.question_attempts (attempt_id, user_id, question_id, answer, is_correct, result)
  values (p_attempt_id, v_uid, p_question_id, p_answer, v_is_correct, v_result);

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 服务端函数：SM-2 复习 + 每日打卡
-- ---------------------------------------------------------------------------

create or replace function public.review_flashcard(
  p_card_id uuid,
  p_rating text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_card public.flashcards;
  v_progress public.card_progress;
  v_event public.card_review_events;
  v_interval integer;
  v_repetitions integer;
  v_ease numeric(4, 2);
  v_due timestamptz;
  v_remaining integer;
  v_check_in public.check_in_records;
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_rating not in ('forgot', 'fuzzy', 'remembered') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  select * into v_event
  from public.card_review_events
  where user_id = v_uid and idempotency_key = p_idempotency_key;

  if found then
    return v_event.result;
  end if;

  select * into v_card
  from public.flashcards f
  where f.id = p_card_id
    and f.is_deleted = false
    and (f.source = 'system' or f.creator_id = v_uid);

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.card_progress (user_id, card_id)
  values (v_uid, p_card_id)
  on conflict (user_id, card_id) do nothing;

  select * into v_progress
  from public.card_progress
  where user_id = v_uid and card_id = p_card_id
  for update;

  if p_rating = 'forgot' then
    v_interval := 0;
    v_repetitions := 0;
    v_ease := greatest(1.30, v_progress.ease_factor - 0.20);
  elsif p_rating = 'fuzzy' then
    v_interval := 1;
    v_repetitions := 0;
    v_ease := greatest(1.30, v_progress.ease_factor - 0.10);
  else
    if v_progress.repetitions = 0 then
      v_interval := 1;
    elsif v_progress.repetitions = 1 then
      v_interval := 3;
    else
      v_interval := greatest(1, round(v_progress.interval_days * v_progress.ease_factor)::integer);
    end if;
    v_repetitions := v_progress.repetitions + 1;
    v_ease := least(5.00, v_progress.ease_factor + 0.10);
  end if;

  v_due := now() + make_interval(days => greatest(v_interval, 0));

  update public.card_progress
     set repetitions = v_repetitions,
         interval_days = v_interval,
         ease_factor = v_ease,
         due_at = v_due,
         last_rating = p_rating,
         version = version + 1
   where id = v_progress.id
   returning * into v_progress;

  select count(*)::integer into v_remaining
  from public.card_progress p
  join public.flashcards f on f.id = p.card_id
  where p.user_id = v_uid
    and f.is_deleted = false
    and (f.source = 'system' or f.creator_id = v_uid)
    and p.due_at <= now();

  if v_remaining = 0 then
    insert into public.check_in_records (user_id, check_in_date)
    values (v_uid, v_today)
    on conflict (user_id, check_in_date) do nothing
    returning * into v_check_in;

    if v_check_in.id is null then
      select * into v_check_in
      from public.check_in_records
      where user_id = v_uid and check_in_date = v_today;
    end if;
  end if;

  v_result := jsonb_build_object(
    'progress', jsonb_build_object(
      'cardId', p_card_id,
      'repetitions', v_progress.repetitions,
      'intervalDays', v_progress.interval_days,
      'easeFactor', v_progress.ease_factor,
      'dueAt', to_char(v_progress.due_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    'dueRemaining', v_remaining,
    'checkIn', case
      when v_check_in.id is null then null
      else jsonb_build_object('date', v_check_in.check_in_date, 'id', v_check_in.id)
    end
  );

  insert into public.card_review_events (user_id, card_id, idempotency_key, rating, result)
  values (v_uid, p_card_id, p_idempotency_key, p_rating, v_result);

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 服务端函数：管理操作（封禁 / 解封 / UGC 审核）
-- ---------------------------------------------------------------------------

create or replace function public.admin_ban_user(
  p_user_id uuid,
  p_reason text,
  p_expires_at timestamptz,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.users;
begin
  if v_actor is null or public.current_role_of(v_actor) <> 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  if v_actor = p_user_id then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  select * into v_target from public.users where id = p_user_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_target.role = 'admin' and not v_target.is_banned and public.count_active_admins() <= 1 then
    raise exception 'LAST_ADMIN_PROTECTED' using errcode = 'P0001';
  end if;

  update public.users
     set is_banned = true,
         banned_reason = p_reason,
         banned_at = now(),
         banned_until = p_expires_at,
         banned_by = v_actor
   where id = p_user_id
   returning * into v_target;

  insert into public.admin_audit_logs (actor_id, action, resource_type, resource_id, request_id, metadata)
  values (
    v_actor,
    'user.ban',
    'user',
    p_user_id::text,
    p_request_id,
    jsonb_build_object('reason', p_reason, 'expiresAt', p_expires_at)
  );

  return jsonb_build_object(
    'id', v_target.id,
    'isBanned', v_target.is_banned,
    'bannedReason', v_target.banned_reason,
    'bannedUntil', v_target.banned_until
  );
end;
$$;

create or replace function public.admin_unban_user(
  p_user_id uuid,
  p_reason text,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_target public.users;
begin
  if v_actor is null or public.current_role_of(v_actor) <> 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  update public.users
     set is_banned = false,
         banned_reason = null,
         banned_at = null,
         banned_until = null,
         banned_by = null
   where id = p_user_id
   returning * into v_target;

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.admin_audit_logs (actor_id, action, resource_type, resource_id, request_id, metadata)
  values (v_actor, 'user.unban', 'user', p_user_id::text, p_request_id, jsonb_build_object('reason', p_reason));

  return jsonb_build_object('id', v_target.id, 'isBanned', v_target.is_banned);
end;
$$;

create or replace function public.admin_review_ugc(
  p_question_id uuid,
  p_action text,
  p_note text,
  p_version integer,
  p_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_question public.questions;
begin
  if v_actor is null or public.current_role_of(v_actor) <> 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = 'P0001';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'VALIDATION_FAILED' using errcode = 'P0001';
  end if;

  select * into v_question from public.questions where id = p_question_id for update;

  if not found or v_question.is_deleted then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_question.version <> p_version then
    raise exception 'CONFLICT' using errcode = 'P0001';
  end if;

  if v_question.review_status <> 'pending' then
    raise exception 'UGC_ALREADY_REVIEWED' using errcode = 'P0001';
  end if;

  update public.questions
     set review_status = case when p_action = 'approve' then 'approved' else 'rejected' end,
         is_approved = p_action = 'approve',
         reviewed_by = v_actor,
         reviewed_at = now(),
         review_note = p_note,
         version = version + 1
   where id = p_question_id
   returning * into v_question;

  insert into public.admin_audit_logs (actor_id, action, resource_type, resource_id, request_id, metadata)
  values (
    v_actor,
    case when p_action = 'approve' then 'ugc.approve' else 'ugc.reject' end,
    'question',
    p_question_id::text,
    p_request_id,
    jsonb_build_object('note', p_note)
  );

  return jsonb_build_object('id', v_question.id, 'reviewStatus', v_question.review_status, 'version', v_question.version);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.user_targets enable row level security;
alter table public.questions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.mistake_records enable row level security;
alter table public.schools enable row level security;
alter table public.school_programs enable row level security;
alter table public.flashcards enable row level security;
alter table public.card_progress enable row level security;
alter table public.card_review_events enable row level security;
alter table public.check_in_records enable row level security;
alter table public.ai_usage_daily enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.idempotency_records enable row level security;
alter table public.school_import_jobs enable row level security;

create policy users_select_self on public.users
  for select to authenticated using (id = (select auth.uid()));

create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = (select role from public.users u where u.id = (select auth.uid())));

create policy user_targets_owner on public.user_targets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy questions_read_visible on public.questions
  for select to authenticated
  using (
    is_deleted = false
    and (
      creator_id = (select auth.uid())
      or (review_status = 'approved' and visibility = 'public')
    )
  );

create policy questions_write_own on public.questions
  for all to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

create policy question_attempts_owner on public.question_attempts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy mistake_records_owner on public.mistake_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy schools_read_published on public.schools
  for select to authenticated, anon using (is_published = true);

create policy school_programs_read_published on public.school_programs
  for select to authenticated, anon using (is_published = true);

create policy flashcards_read_visible on public.flashcards
  for select to authenticated
  using (is_deleted = false and (source = 'system' or creator_id = (select auth.uid())));

create policy flashcards_write_own on public.flashcards
  for all to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

create policy card_progress_owner on public.card_progress
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy card_review_events_owner on public.card_review_events
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy check_in_records_owner on public.check_in_records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy ai_usage_daily_owner on public.ai_usage_daily
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- admin_audit_logs / idempotency_records / school_import_jobs 不创建任何策略：
-- 仅 service role 与 SECURITY DEFINER 函数可访问。

-- ---------------------------------------------------------------------------
-- 授权
-- ---------------------------------------------------------------------------

-- 服务端函数只授予已登录用户执行权限，内部仍会二次校验角色。
revoke all on function public.submit_question_answer(uuid, text, uuid) from public, anon;
grant execute on function public.submit_question_answer(uuid, text, uuid) to authenticated;

revoke all on function public.review_flashcard(uuid, text, text) from public, anon;
grant execute on function public.review_flashcard(uuid, text, text) to authenticated;

revoke all on function public.admin_ban_user(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.admin_ban_user(uuid, text, timestamptz, text) to authenticated;

revoke all on function public.admin_unban_user(uuid, text, text) from public, anon;
grant execute on function public.admin_unban_user(uuid, text, text) to authenticated;

revoke all on function public.admin_review_ugc(uuid, text, text, integer, text) from public, anon;
grant execute on function public.admin_review_ugc(uuid, text, text, integer, text) to authenticated;

grant usage on schema public to authenticated, anon;
