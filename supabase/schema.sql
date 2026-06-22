create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null,
  phone text,
  wechat text,
  whatsapp text,
  email text,
  region text,
  industry text,
  tiktok text,
  ad_account_id text,
  business_center_id text,
  rebate_rate text,
  source text not null default 'TikTok',
  intent text not null default '中' check (intent in ('高', '中', '低')),
  status text not null default '新客户' check (
    status in (
      '新客户',
      '已联系',
      '需求确认',
      '已报价',
      '合同中',
      '已成交',
      '服务中',
      '暂停',
      '流失'
    )
  ),
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text,
  next_follow_up date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  content text not null,
  next_action text,
  next_follow_up date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'staff'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.follow_ups enable row level security;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'manager')
  );
$$;

drop policy if exists "profiles_select_own_or_manager" on public.profiles;
create policy "profiles_select_own_or_manager"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin_or_manager());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "customers_select_team" on public.customers;
create policy "customers_select_team"
on public.customers for select
to authenticated
using (
  owner_id = auth.uid()
  or created_by = auth.uid()
  or public.is_admin_or_manager()
);

drop policy if exists "customers_insert_authenticated" on public.customers;
create policy "customers_insert_authenticated"
on public.customers for insert
to authenticated
with check (
  created_by = auth.uid()
  and (owner_id is null or owner_id = auth.uid() or public.is_admin_or_manager())
);

drop policy if exists "customers_update_owner_or_manager" on public.customers;
create policy "customers_update_owner_or_manager"
on public.customers for update
to authenticated
using (
  owner_id = auth.uid()
  or created_by = auth.uid()
  or public.is_admin_or_manager()
)
with check (
  owner_id = auth.uid()
  or created_by = auth.uid()
  or public.is_admin_or_manager()
);

drop policy if exists "follow_ups_select_related_customer" on public.follow_ups;
create policy "follow_ups_select_related_customer"
on public.follow_ups for select
to authenticated
using (
  exists (
    select 1
    from public.customers
    where customers.id = follow_ups.customer_id
      and (
        customers.owner_id = auth.uid()
        or customers.created_by = auth.uid()
        or public.is_admin_or_manager()
      )
  )
);

drop policy if exists "follow_ups_insert_related_customer" on public.follow_ups;
create policy "follow_ups_insert_related_customer"
on public.follow_ups for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.customers
    where customers.id = follow_ups.customer_id
      and (
        customers.owner_id = auth.uid()
        or customers.created_by = auth.uid()
        or public.is_admin_or_manager()
      )
  )
);
