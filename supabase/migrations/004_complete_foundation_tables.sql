create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  starts_on date,
  ends_on date,
  current boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create unique index if not exists academic_years_single_current
  on public.academic_years (current)
  where current = true;

create table if not exists public.internship_skills (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships(id) on delete cascade,
  skill text not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  unique (internship_id, skill)
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.academic_years enable row level security;
alter table public.internship_skills enable row level security;
alter table public.platform_settings enable row level security;

create policy "academic_years_read_authenticated" on public.academic_years
  for select using (auth.role() = 'authenticated');
create policy "academic_years_admin_write" on public.academic_years
  for all using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "internship_skills_read_authenticated" on public.internship_skills
  for select using (auth.role() = 'authenticated');
create policy "internship_skills_write_active_faculty_admin" on public.internship_skills
  for all using (
    public.is_active_admin()
    or exists (
      select 1
      from public.internships i
      join public.profiles p on p.id = i.created_by
      join public.faculty f on f.profile_id = p.id
      where i.id = internship_skills.internship_id
        and p.auth_user_id = auth.uid()
        and p.role = 'faculty'
        and p.status = 'active'
        and f.status = 'active'
        and f.department_code = any(i.branches)
    )
  )
  with check (
    public.is_active_admin()
    or exists (
      select 1
      from public.internships i
      join public.profiles p on p.id = i.created_by
      join public.faculty f on f.profile_id = p.id
      where i.id = internship_skills.internship_id
        and p.auth_user_id = auth.uid()
        and p.role = 'faculty'
        and p.status = 'active'
        and f.status = 'active'
        and f.department_code = any(i.branches)
    )
  );

create policy "platform_settings_read_authenticated" on public.platform_settings
  for select using (auth.role() = 'authenticated');
create policy "platform_settings_admin_write" on public.platform_settings
  for all using (public.is_active_admin())
  with check (public.is_active_admin());

create trigger academic_years_updated_at before update on public.academic_years
  for each row execute procedure public.handle_updated_at();
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute procedure public.handle_updated_at();
