-- WebFin: схема бази даних (Етап 1)
-- Суми зберігаються в копійках (bigint); відʼємне значення = витрата.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_premium boolean not null default false,
  premium_until timestamptz,
  data_source text not null default 'demo' check (data_source in ('demo', 'monobank')),
  created_at timestamptz not null default now()
);

create table public.monobank_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  encrypted_token text not null,
  created_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mono_account_id text,
  name text not null,
  currency text not null default 'UAH',
  balance bigint not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mono_account_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  mono_id text,
  occurred_at timestamptz not null,
  description text not null,
  amount bigint not null,
  mcc integer,
  category text not null default 'Інше',
  balance_after bigint,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mono_id)
);

create index transactions_user_time_idx
  on public.transactions (user_id, occurred_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_reference text not null unique,
  amount bigint not null,
  status text not null,
  created_at timestamptz not null default now()
);

-- Автоматичне створення профілю при реєстрації
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: кожен бачить лише своє
alter table public.profiles enable row level security;
alter table public.monobank_tokens enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.payments enable row level security;

create policy "profiles: читати своє" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: оновлювати своє" on public.profiles
  for update using (auth.uid() = id);

-- monobank_tokens: жодних політик — доступ лише серверу через service-ключ

create policy "accounts: читати своє" on public.accounts
  for select using (auth.uid() = user_id);

create policy "transactions: читати своє" on public.transactions
  for select using (auth.uid() = user_id);

create policy "payments: читати своє" on public.payments
  for select using (auth.uid() = user_id);
