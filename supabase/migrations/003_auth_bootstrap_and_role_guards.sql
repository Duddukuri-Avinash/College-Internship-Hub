alter table public.profiles
  add column if not exists login_identifier text unique;

create or replace function public.bootstrap_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
  new_profile_id uuid;
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if lower(coalesce(new.email, '')) not like '%@rvrjc.ac.in' then
    raise exception 'Use an authorized @rvrjc.ac.in college email address';
  end if;

  if metadata->>'role' = 'faculty' then
    requested_role := 'faculty';
  else
    requested_role := 'student';
  end if;

  if requested_role = 'student'
    and coalesce(metadata->>'roll_number', '') !~* '^[A-Z][0-9]{2}[A-Z]{2,4}[0-9]{3}$' then
    raise exception 'A valid college roll number is required';
  end if;
  if requested_role = 'student'
    and new.email <> (lower(trim(metadata->>'roll_number')) || '@rvrjc.ac.in') then
    raise exception 'Student email must be the lowercase roll number followed by @rvrjc.ac.in';
  end if;
  if requested_role = 'faculty'
    and coalesce(metadata->>'employee_id', '') !~* '^RVR[0-9]{4}$' then
    raise exception 'A valid faculty employee ID is required';
  end if;

  insert into public.profiles (auth_user_id, email, full_name, role, status)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(metadata->>'full_name'), ''), split_part(new.email, '@', 1)),
    requested_role,
    case when requested_role = 'faculty' then 'pending' else 'active' end
  )
  returning id into new_profile_id;

  if requested_role = 'student' then
    insert into public.students (
      profile_id, roll_number, branch, year, section, phone
    )
    values (
      new_profile_id,
      upper(trim(coalesce(metadata->>'roll_number', ''))),
      'Unassigned',
      1,
      'Unassigned',
      nullif(trim(metadata->>'phone'), '')
    );
  else
    insert into public.faculty (
      profile_id, employee_id, department_code, designation, status
    )
    values (
      new_profile_id,
      upper(trim(coalesce(metadata->>'employee_id', ''))),
      trim(coalesce(metadata->>'department_code', 'Unassigned')),
      trim(coalesce(metadata->>'designation', 'Unspecified')),
      'pending'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_internhub on auth.users;
create trigger on_auth_user_created_internhub
  after insert on auth.users
  for each row execute procedure public.bootstrap_auth_profile();

drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth_user_id = auth.uid() or public.is_active_admin());

create or replace function public.can_active_faculty_access_branch(target_branch text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.faculty f
    join public.profiles p on p.id = f.profile_id
    where p.auth_user_id = auth.uid()
      and p.role = 'faculty'
      and p.status = 'active'
      and f.status = 'active'
      and f.department_code = target_branch
  );
$$;

drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only" on public.profiles
  for update using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "faculty_insert_own_pending" on public.faculty;
drop policy if exists "faculty_update_own_or_admin" on public.faculty;
drop policy if exists "faculty_update_admin_only" on public.faculty;
create policy "faculty_update_admin_only" on public.faculty
  for update using (public.is_active_admin())
  with check (public.is_active_admin());

create or replace function public.prevent_self_role_or_approval_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
    and not public.is_active_admin()
    and coalesce(auth.role(), '') <> 'service_role'
    and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only an active administrator can change account role or status';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_status_guard on public.profiles;
create trigger profiles_role_status_guard
  before update of role, status on public.profiles
  for each row execute procedure public.prevent_self_role_or_approval_change();

create or replace function public.prevent_faculty_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status is distinct from old.status or new.approved_by is distinct from old.approved_by)
    and not public.is_active_admin()
    and coalesce(auth.role(), '') <> 'service_role'
    and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Only an active administrator can change faculty approval';
  end if;
  return new;
end;
$$;

drop trigger if exists faculty_approval_guard on public.faculty;
create trigger faculty_approval_guard
  before update of status, approved_by on public.faculty
  for each row execute procedure public.prevent_faculty_self_approval();

create or replace function public.sync_faculty_profile_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.profiles
    set status = case new.status
      when 'active' then 'active'
      when 'rejected' then 'rejected'
      when 'inactive' then 'inactive'
      else 'pending'
    end
    where id = new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists faculty_sync_profile_status on public.faculty;
create trigger faculty_sync_profile_status
  after update of status on public.faculty
  for each row execute procedure public.sync_faculty_profile_status();

drop policy if exists "students_select_own_or_admin_or_same_department_faculty" on public.students;
drop policy if exists "students_select_owner_admin_or_scoped_faculty" on public.students;
create policy "students_select_owner_admin_or_scoped_faculty" on public.students
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
    or public.is_active_admin()
    or public.can_active_faculty_access_branch(branch)
  );

drop policy if exists "applications_select_own_or_admin_or_same_department_faculty" on public.applications;
drop policy if exists "applications_select_owner_admin_or_scoped_faculty" on public.applications;
create policy "applications_select_owner_admin_or_scoped_faculty" on public.applications
  for select using (
    exists (
      select 1 from public.students s
      join public.profiles p on p.id = s.profile_id
      where s.profile_id = student_id and p.auth_user_id = auth.uid()
    )
    or public.is_active_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = student_id
        and public.can_active_faculty_access_branch(s.branch)
    )
  );

drop policy if exists "documents_select_own_or_admin_or_same_department_faculty" on public.documents;
drop policy if exists "documents_select_owner_admin_or_scoped_faculty" on public.documents;
create policy "documents_select_owner_admin_or_scoped_faculty" on public.documents
  for select using (
    exists (
      select 1 from public.students s
      join public.profiles p on p.id = s.profile_id
      where s.profile_id = student_id and p.auth_user_id = auth.uid()
    )
    or public.is_active_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = student_id
        and public.can_active_faculty_access_branch(s.branch)
    )
  );

drop policy if exists "documents_update_own_or_admin" on public.documents;
drop policy if exists "documents_update_admin_or_scoped_faculty" on public.documents;
create policy "documents_update_admin_or_scoped_faculty" on public.documents
  for update using (
    public.is_active_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = student_id
        and public.can_active_faculty_access_branch(s.branch)
    )
  )
  with check (
    public.is_active_admin()
    or exists (
      select 1 from public.students s
      where s.profile_id = student_id
        and public.can_active_faculty_access_branch(s.branch)
    )
  );

create or replace function public.enforce_document_review_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_profile_id uuid;
begin
  if auth.role() <> 'authenticated' then
    return new;
  end if;

  select id into actor_profile_id
  from public.profiles
  where auth_user_id = auth.uid();

  if tg_op = 'INSERT' then
    if actor_profile_id is null
      or not exists (
        select 1 from public.students s
        where s.profile_id = new.student_id
          and s.profile_id = actor_profile_id
      ) then
      raise exception 'Documents may only be submitted for your own student account';
    end if;
    if new.status <> 'pending' or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'New documents must be submitted as pending verification';
    end if;
    new.uploaded_by := actor_profile_id;
    return new;
  end if;

  if new.student_id is distinct from old.student_id
    or new.kind is distinct from old.kind
    or new.file_name is distinct from old.file_name
    or new.storage_path is distinct from old.storage_path
    or new.mime_type is distinct from old.mime_type
    or new.size_bytes is distinct from old.size_bytes
    or new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'Document ownership and file metadata cannot be changed during review';
  end if;

  if new.status not in ('verified', 'rejected', 'additional_proof_required') then
    raise exception 'A document review must record a verification decision';
  end if;
  if not public.is_active_admin() and not exists (
    select 1 from public.students s
    where s.profile_id = new.student_id
      and public.can_active_faculty_access_branch(s.branch)
  ) then
    raise exception 'Only an authorized faculty member can review this document';
  end if;
  new.reviewed_by := actor_profile_id;
  new.reviewed_at := now();
  return new;
end;
$$;

drop trigger if exists documents_workflow_guard on public.documents;
create trigger documents_workflow_guard
  before insert or update on public.documents
  for each row execute procedure public.enforce_document_review_workflow();

drop policy if exists "internships_write_admin_or_faculty" on public.internships;
drop policy if exists "internships_write_active_faculty_or_admin" on public.internships;
create policy "internships_write_active_faculty_or_admin" on public.internships
  for all using (
    public.is_active_admin()
    or exists (
      select 1 from public.profiles p
      join public.faculty f on f.profile_id = p.id
      where p.auth_user_id = auth.uid()
        and p.role = 'faculty'
        and p.status = 'active'
        and f.status = 'active'
        and internships.created_by = p.id
        and f.department_code = any(internships.branches)
    )
  )
  with check (
    public.is_active_admin()
    or exists (
      select 1 from public.profiles p
      join public.faculty f on f.profile_id = p.id
      where p.auth_user_id = auth.uid()
        and p.role = 'faculty'
        and p.status = 'active'
        and f.status = 'active'
        and internships.created_by = p.id
        and f.department_code = any(internships.branches)
    )
  );

drop policy if exists "announcements_write_admin_or_faculty" on public.announcements;
drop policy if exists "announcements_write_active_faculty_or_admin" on public.announcements;
create policy "announcements_write_active_faculty_or_admin" on public.announcements
  for all using (
    public.is_active_admin()
    or exists (
      select 1 from public.profiles p
      join public.faculty f on f.profile_id = p.id
      where p.auth_user_id = auth.uid()
        and p.role = 'faculty'
        and p.status = 'active'
        and f.status = 'active'
    )
  )
  with check (
    public.is_active_admin()
    or exists (
      select 1 from public.profiles p
      join public.faculty f on f.profile_id = p.id
      where p.auth_user_id = auth.uid()
        and p.role = 'faculty'
        and p.status = 'active'
        and f.status = 'active'
    )
  );

drop policy if exists "audit_logs_insert_admin_or_trigger" on public.audit_logs;
drop policy if exists "audit_logs_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs
  for select using (public.is_active_admin());

create or replace function public.log_verification_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function public.reject_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit log records are append-only';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update
  before update or delete on public.audit_logs
  for each row execute procedure public.reject_audit_log_mutation();

drop policy if exists "verifications_insert_faculty_or_admin" on public.verifications;
drop policy if exists "verifications_insert_active_faculty_or_admin" on public.verifications;
create policy "verifications_insert_active_faculty_or_admin" on public.verifications
  for insert with check (
    exists (
      select 1 from public.profiles reviewer
      where reviewer.id = reviewer_id
        and reviewer.auth_user_id = auth.uid()
        and reviewer.status = 'active'
        and (
          (
            reviewer.role = 'admin'
            and public.is_active_admin()
          )
          or (
            reviewer.role = 'faculty'
            and exists (
              select 1
              from public.documents d
              join public.students s on s.profile_id = d.student_id
              where d.id = document_id
                and public.can_active_faculty_access_branch(s.branch)
            )
          )
        )
    )
  );

drop policy if exists "storage_documents_owner_or_faculty_admin_select" on storage.objects;
drop policy if exists "storage_documents_owner_or_active_faculty_admin_select" on storage.objects;
create policy "storage_documents_owner_or_active_faculty_admin_select" on storage.objects
  for select using (
    bucket_id = 'internhub-documents'
    and (
      owner_id::text = auth.uid()::text
      or public.is_active_admin()
      or exists (
        select 1
        from public.documents d
        join public.students s on s.profile_id = d.student_id
        where d.storage_path = name
          and public.can_active_faculty_access_branch(s.branch)
      )
    )
  );

drop policy if exists "storage_documents_owner_insert" on storage.objects;
create policy "storage_documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'internhub-documents' and owner_id::text = auth.uid()::text
  );

drop policy if exists "storage_documents_owner_update" on storage.objects;
create policy "storage_documents_owner_update" on storage.objects
  for update using (
    bucket_id = 'internhub-documents' and owner_id::text = auth.uid()::text
  ) with check (
    bucket_id = 'internhub-documents' and owner_id::text = auth.uid()::text
  );

drop policy if exists "storage_documents_owner_delete" on storage.objects;
create policy "storage_documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'internhub-documents' and owner_id::text = auth.uid()::text
  );
