-- 1) ATHLETES
alter table public.athletes enable row level security;

drop policy if exists "Coaches can view their own athletes" on public.athletes;
drop policy if exists "Coaches can insert their own athletes" on public.athletes;
drop policy if exists "Coaches can update their own athletes" on public.athletes;
drop policy if exists "Coaches can delete their own athletes" on public.athletes;
drop policy if exists "athletes_select_own" on public.athletes;
drop policy if exists "athletes_insert_own" on public.athletes;
drop policy if exists "athletes_update_own" on public.athletes;
drop policy if exists "athletes_delete_own" on public.athletes;

create policy "athletes_select_own"
on public.athletes
for select
using (coach_id = auth.uid());

create policy "athletes_insert_own"
on public.athletes
for insert
with check (coach_id = auth.uid());

create policy "athletes_update_own"
on public.athletes
for update
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "athletes_delete_own"
on public.athletes
for delete
using (coach_id = auth.uid());

-- 2) TESTS
alter table public.tests enable row level security;

drop policy if exists "Coaches can view their own tests" on public.tests;
drop policy if exists "Coaches can insert their own tests" on public.tests;
drop policy if exists "Coaches can update their own tests" on public.tests;
drop policy if exists "Coaches can delete their own tests" on public.tests;
drop policy if exists "tests_select_own" on public.tests;
drop policy if exists "tests_insert_own" on public.tests;
drop policy if exists "tests_update_own" on public.tests;
drop policy if exists "tests_delete_own" on public.tests;

create policy "tests_select_own"
on public.tests
for select
using (coach_id = auth.uid());

create policy "tests_insert_own"
on public.tests
for insert
with check (coach_id = auth.uid());

create policy "tests_update_own"
on public.tests
for update
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "tests_delete_own"
on public.tests
for delete
using (coach_id = auth.uid());

-- 3) PLANS
alter table public.plans enable row level security;

drop policy if exists "Coaches can view their own plans" on public.plans;
drop policy if exists "Coaches can insert their own plans" on public.plans;
drop policy if exists "Coaches can update their own plans" on public.plans;
drop policy if exists "Coaches can delete their own plans" on public.plans;
drop policy if exists "plans_select_own" on public.plans;
drop policy if exists "plans_insert_own" on public.plans;
drop policy if exists "plans_update_own" on public.plans;
drop policy if exists "plans_delete_own" on public.plans;

create policy "plans_select_own"
on public.plans
for select
using (coach_id = auth.uid());

create policy "plans_insert_own"
on public.plans
for insert
with check (coach_id = auth.uid());

create policy "plans_update_own"
on public.plans
for update
using (coach_id = auth.uid())
with check (coach_id = auth.uid());

create policy "plans_delete_own"
on public.plans
for delete
using (coach_id = auth.uid());