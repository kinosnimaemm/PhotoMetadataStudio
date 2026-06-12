-- Create a table for user credits
create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  credits integer not null default 50,
  last_daily_grant_date date default CURRENT_DATE,
  subscription_end_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS policies
alter table public.user_credits enable row level security;

create policy "Users can view own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- Trigger to auto-create credit record on signup
create or replace function public.handle_new_user_credits()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_credits (user_id, credits, last_daily_grant_date)
  values (new.id, 50, CURRENT_DATE)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Drop and recreate trigger
drop trigger if exists on_auth_user_created_credits on auth.users;
create trigger on_auth_user_created_credits
  after insert on auth.users
  for each row execute procedure public.handle_new_user_credits();

-- Backfill existing users (give them 50 credits and set date)
insert into public.user_credits (user_id, credits, last_daily_grant_date)
select id, 50, CURRENT_DATE from auth.users
where not exists (select 1 from public.user_credits where user_id = auth.users.id);
