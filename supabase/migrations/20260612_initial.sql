create extension if not exists pgcrypto;

-- Пользователи теперь управляются через Supabase Auth (схема auth.users)
-- Поэтому мы ссылаемся на user_id как на простой uuid, чтобы скрипт работал 
-- как в Supabase, так и в локальной базе (при отключенной проверке FK).

create table if not exists metadata_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- Ссылка на auth.users(id)
  name text not null,
  subtitle text not null default '',
  description text not null default '',
  platform text,
  tags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists metadata_profiles_user_id_idx on metadata_profiles(user_id);

create table if not exists processing_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, -- Ссылка на auth.users(id)
  profile_id uuid references metadata_profiles(id) on delete set null,
  file_count integer not null check (file_count between 1 and 10),
  status text not null default 'processing',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists processing_batches_expires_at_idx on processing_batches(expires_at);
