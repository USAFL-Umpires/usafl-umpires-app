-- Replace "for all" staff policies with separate insert/update/delete policies
-- (avoids two permissive SELECT policies per table).
do $$
declare r record;
begin
  for r in select * from (values
    ('announcements','Announcements: staff write'),
    ('appointments','Appointments: staff write'),
    ('compliance_requirements','Compliance reqs: staff write'),
    ('events','Events: staff write'),
    ('learning_modules','Modules: staff write'),
    ('onboarding_steps','Onboarding steps: staff write')
  ) as t(tbl, pol)
  loop
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_staff()))', r.tbl || ': staff insert', r.tbl);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', r.tbl || ': staff update', r.tbl);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.is_staff()))', r.tbl || ': staff delete', r.tbl);
  end loop;
end $$;
