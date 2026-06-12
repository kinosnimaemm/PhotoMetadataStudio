-- Create a table for user credits
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 100,
  subscription_end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Turn on Row Level Security
alter table public.user_credits enable row level security;

-- Allow users to view their own credits
create policy "Users can view own credits" on public.user_credits
  for select using (auth.uid() = user_id);

-- Trigger to create a record in user_credits when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_credits (user_id, credits)
  values (new.id, 100);
  return new;
end;
$$;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- For existing users, backfill the credits table
insert into public.user_credits (user_id, credits)
select id, 100 from auth.users
where not exists (select 1 from public.user_credits where user_id = auth.users.id);


