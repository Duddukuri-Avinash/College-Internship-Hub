insert into public.departments (code, name)
values
  ('CSE', 'CSE'),
  ('IT', 'IT'),
  ('ECE', 'ECE'),
  ('EEE', 'EEE'),
  ('Mech', 'Mech'),
  ('Civil', 'Civil'),
  ('AI&ML', 'AI&ML')
on conflict (code) do nothing;

do $$
declare
  initial_admin_email text := lower('replace-with-admin-college-email@rvrjc.ac.in');
  initial_admin_profile_id uuid;
begin
  select id into initial_admin_profile_id
  from public.profiles
  where email = initial_admin_email;

  if initial_admin_profile_id is null then
    raise exception 'Create and verify the initial admin auth user first, then replace the placeholder email in seed.sql';
  end if;

  if exists (
    select 1 from public.faculty where profile_id = initial_admin_profile_id
  ) then
    raise exception 'The initial admin account must be created through the student signup flow, not faculty registration';
  end if;

  delete from public.students where profile_id = initial_admin_profile_id;
  update public.profiles
  set role = 'admin',
      status = 'active',
      login_identifier = 'ADM001'
  where id = initial_admin_profile_id;
end;
$$;
