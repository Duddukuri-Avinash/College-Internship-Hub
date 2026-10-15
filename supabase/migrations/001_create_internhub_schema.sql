create extension if not exists pgcrypto;

create type public.app_role as enum ('student','faculty','admin');
create type public.verification_status as enum ('pending','verified','rejected','additional_proof_required');
create type public.application_status as enum ('saved','applied','interview','selected','rejected','withdrawn');
create type public.document_kind as enum ('resume','offer_letter','certificate','self_found','experience','other');
create type public.audit_category as enum ('verification','opportunity','settings','moderation','user_management','announcement','system');
create type public.report_status as enum ('open','resolved','dismissed');

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.app_role not null,
  status text not null default 'active' check (status in ('active','pending','inactive','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  roll_number text not null unique,
  branch text not null,
  year int not null,
  section text not null,
  cgpa numeric(3,1) not null default 0,
  semester int not null default 1,
  phone text,
  dob date,
  gender text,
  address text,
  about text,
  mentor_name text,
  linked_in text,
  github text,
  resume_url text,
  resume_updated_at date,
  profile_completion int not null default 0,
  readiness_score int not null default 0,
  skills jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  achievements jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faculty (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  employee_id text not null unique,
  department_code text not null,
  designation text not null,
  status text not null default 'active' check (status in ('active','pending','inactive','rejected')),
  verified_at timestamptz,
  approved_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  students_count int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  department_code text not null,
  year int not null,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_code, year, name)
);

create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  skills text[] not null default '{}',
  duration text not null,
  mode text not null check (mode in ('Remote','On-site','Hybrid')),
  location text not null,
  stipend int not null default 0,
  deadline date not null,
  source text not null check (source in ('College Opportunity','Self-Found','Senior Referral')),
  branches text[] not null default '{}',
  years int[] not null default '{}',
  min_cgpa numeric(3,1) not null default 0,
  match_score int not null default 0,
  description text not null,
  match_reasons text[] not null default '{}',
  missing_skills text[] not null default '{}',
  external_link text,
  created_by uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active','draft','archived')),
  duplicate_of uuid references public.internships(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(profile_id) on delete cascade,
  internship_id uuid not null references public.internships(id) on delete cascade,
  status public.application_status not null default 'saved',
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, internship_id)
);

create table if not exists public.saved_internships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(profile_id) on delete cascade,
  internship_id uuid not null references public.internships(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, internship_id)
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(profile_id) on delete cascade,
  kind public.document_kind not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  status public.verification_status not null default 'pending',
  uploaded_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  decision public.verification_status not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(profile_id) on delete cascade,
  company text not null,
  role text not null,
  duration text not null,
  skill_tags text[] not null default '{}',
  obtained_from text not null,
  project_summary text not null,
  what_i_learned text not null,
  interview_experience text not null,
  challenges text not null,
  recommendation text not null,
  rating numeric(2,1) not null default 0,
  reviewed boolean not null default false,
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info' check (type in ('info','warning','success')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  link text,
  audience text not null,
  recipients_count int not null default 0,
  status text not null default 'sent' check (status in ('sent','scheduled','draft')),
  scheduled_at timestamptz,
  created_by uuid references public.profiles(id),
  delivered_count int default 0,
  opened_count int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id),
  target_type text not null,
  target_id uuid,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null,
  category public.audit_category not null,
  target text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value text not null,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.log_verification_action()
returns trigger as $$
begin
  insert into public.audit_logs (actor_id, actor_name, action, category, target, details)
  values (
    new.reviewer_id,
    (select full_name from public.profiles where id = new.reviewer_id),
    'verification_decision',
    'verification',
    concat('document-', new.document_id),
    jsonb_build_object('decision', new.decision, 'notes', coalesce(new.notes, ''))
  );
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.handle_updated_at();
create trigger students_updated_at before update on public.students for each row execute procedure public.handle_updated_at();
create trigger faculty_updated_at before update on public.faculty for each row execute procedure public.handle_updated_at();
create trigger departments_updated_at before update on public.departments for each row execute procedure public.handle_updated_at();
create trigger sections_updated_at before update on public.sections for each row execute procedure public.handle_updated_at();
create trigger internships_updated_at before update on public.internships for each row execute procedure public.handle_updated_at();
create trigger applications_updated_at before update on public.applications for each row execute procedure public.handle_updated_at();
create trigger documents_updated_at before update on public.documents for each row execute procedure public.handle_updated_at();
create trigger experiences_updated_at before update on public.experiences for each row execute procedure public.handle_updated_at();
create trigger announcements_updated_at before update on public.announcements for each row execute procedure public.handle_updated_at();
create trigger reports_updated_at before update on public.reports for each row execute procedure public.handle_updated_at();
create trigger settings_updated_at before update on public.settings for each row execute procedure public.handle_updated_at();
create trigger verification_audit after insert on public.verifications for each row execute procedure public.log_verification_action();

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.faculty enable row level security;
alter table public.departments enable row level security;
alter table public.sections enable row level security;
alter table public.internships enable row level security;
alter table public.applications enable row level security;
alter table public.saved_internships enable row level security;
alter table public.documents enable row level security;
alter table public.verifications enable row level security;
alter table public.experiences enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles for select using (
  auth_user_id = auth.uid() or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "profiles_insert_own" on public.profiles for insert with check (auth_user_id = auth.uid());
create policy "profiles_update_own_or_admin" on public.profiles for update using (
  auth_user_id = auth.uid() or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
) with check (
  auth_user_id = auth.uid() or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "students_select_own_or_admin_or_same_department_faculty" on public.students for select using (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
  or exists (
    select 1 from public.faculty f
    join public.profiles fp on fp.id = f.profile_id
    where fp.auth_user_id = auth.uid() and f.department_code = students.branch
  )
);

create policy "students_insert_own" on public.students for insert with check (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
);

create policy "students_update_own_or_admin" on public.students for update using (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
) with check (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "faculty_select_own_or_admin" on public.faculty for select using (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "faculty_insert_own_pending" on public.faculty for insert with check (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
);

create policy "faculty_update_own_or_admin" on public.faculty for update using (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
) with check (
  exists (select 1 from public.profiles p where p.id = profile_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "departments_read_all_authenticated" on public.departments for select using (auth.role() = 'authenticated');
create policy "departments_admin_write" on public.departments for all using (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
) with check (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "sections_read_all_authenticated" on public.sections for select using (auth.role() = 'authenticated');
create policy "sections_admin_write" on public.sections for all using (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
) with check (
  exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "internships_read_all_authenticated" on public.internships for select using (auth.role() = 'authenticated');
create policy "internships_write_admin_or_faculty" on public.internships for all using (
  exists (
    select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty','admin')
  )
) with check (
  exists (
    select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty','admin')
  )
);

create policy "applications_select_own_or_admin_or_same_department_faculty" on public.applications for select using (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
  or exists (
    select 1
    from public.applications a
    join public.students s on s.profile_id = a.student_id
    join public.profiles sp on sp.id = s.profile_id
    join public.faculty f on f.department_code = s.branch
    join public.profiles fp on fp.id = f.profile_id
    where a.id = applications.id and fp.auth_user_id = auth.uid()
  )
);

create policy "applications_insert_own" on public.applications for insert with check (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
);

create policy "applications_update_own_or_admin" on public.applications for update using (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
) with check (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (
    select 1 from public.profiles admin_profile
    where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "saved_internships_select_own_or_admin" on public.saved_internships for select using (
  exists (
    select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
);

create policy "saved_internships_insert_own" on public.saved_internships for insert with check (
  exists (
    select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid()
  )
);

create policy "saved_internships_delete_own_or_admin" on public.saved_internships for delete using (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);

create policy "documents_select_own_or_admin_or_same_department_faculty" on public.documents for select using (
  exists (
    select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin'
  )
  or exists (
    select 1
    from public.students s
    join public.profiles sp on sp.id = s.profile_id
    join public.faculty f on f.department_code = s.branch
    join public.profiles fp on fp.id = f.profile_id
    where s.profile_id = documents.student_id and fp.auth_user_id = auth.uid()
  )
);

create policy "documents_insert_own" on public.documents for insert with check (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
);

create policy "documents_update_own_or_admin" on public.documents for update using (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
  or exists (
    select 1
    from public.students s
    join public.profiles sp on sp.id = s.profile_id
    join public.faculty f on f.department_code = s.branch
    join public.profiles fp on fp.id = f.profile_id
    where s.profile_id = documents.student_id and fp.auth_user_id = auth.uid()
  )
) with check (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
  or exists (
    select 1
    from public.students s
    join public.profiles sp on sp.id = s.profile_id
    join public.faculty f on f.department_code = s.branch
    join public.profiles fp on fp.id = f.profile_id
    where s.profile_id = documents.student_id and fp.auth_user_id = auth.uid()
  )
);

create policy "verifications_select_own_or_admin_or_faculty" on public.verifications for select using (
  exists (select 1 from public.documents d join public.students s on s.profile_id = d.student_id join public.profiles p on p.id = s.profile_id where d.id = verifications.document_id and p.auth_user_id = auth.uid())
  or reviewer_id in (select id from public.profiles where auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);

create policy "verifications_insert_faculty_or_admin" on public.verifications for insert with check (
  reviewer_id in (select id from public.profiles where auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);

create policy "experiences_select_all_authenticated" on public.experiences for select using (auth.role() = 'authenticated');
create policy "experiences_insert_own" on public.experiences for insert with check (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
);
create policy "experiences_update_admin_or_owner" on public.experiences for update using (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
) with check (
  exists (select 1 from public.students s join public.profiles p on p.id = s.profile_id where s.profile_id = student_id and p.auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);

create policy "notifications_select_own_or_admin" on public.notifications for select using (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);
create policy "notifications_insert_own_or_admin" on public.notifications for insert with check (
  user_id in (select id from public.profiles where auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);

create policy "announcements_read_all_authenticated" on public.announcements for select using (auth.role() = 'authenticated');
create policy "announcements_write_admin_or_faculty" on public.announcements for all using (
  exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty','admin'))
) with check (
  exists (select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty','admin'))
);

create policy "reports_select_own_or_admin" on public.reports for select using (
  reporter_id in (select id from public.profiles where auth_user_id = auth.uid())
  or exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);
create policy "reports_insert_auth" on public.reports for insert with check (
  auth.role() = 'authenticated' and (
    reporter_id in (select id from public.profiles where auth_user_id = auth.uid())
    or reporter_id is null
  )
);

create policy "audit_logs_admin_only" on public.audit_logs for select using (
  exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);
create policy "audit_logs_insert_admin_or_trigger" on public.audit_logs for insert with check (
  exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
  or auth.role() = 'authenticated'
);

create policy "settings_read_authenticated" on public.settings for select using (auth.role() = 'authenticated');
create policy "settings_write_admin" on public.settings for all using (
  exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
) with check (
  exists (select 1 from public.profiles admin_profile where admin_profile.auth_user_id = auth.uid() and admin_profile.role = 'admin')
);

create policy "storage_documents_owner_or_faculty_admin_select" on storage.objects for select using (
  bucket_id = 'internhub-documents' and (
    auth.uid() = owner or exists (
      select 1 from public.profiles p where p.auth_user_id = auth.uid() and p.role in ('faculty','admin')
    )
  )
);

create policy "storage_documents_owner_insert" on storage.objects for insert with check (
  bucket_id = 'internhub-documents' and auth.uid() = owner
);

create policy "storage_documents_owner_update" on storage.objects for update using (
  bucket_id = 'internhub-documents' and auth.uid() = owner
) with check (
  bucket_id = 'internhub-documents' and auth.uid() = owner
);

create policy "storage_documents_owner_delete" on storage.objects for delete using (
  bucket_id = 'internhub-documents' and auth.uid() = owner
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'internhub-documents',
  'internhub-documents',
  false,
  5242880,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;
