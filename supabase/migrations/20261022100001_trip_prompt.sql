-- ============================================================
-- 0021 trips.prompt: the traveller's one-line request
--
-- trips.prompt  the sentence the traveller typed on the plan page, kept verbatim
--               (<= 300 chars; null = none). The planner parses it and uses it to
--               veto candidates, so it is stored as typed, not summarised.
--
-- create_trip() is re-declared unchanged except that it now writes `prompt`
-- (an empty string is stored as null, like `notes`).
-- ============================================================

alter table public.trips add column prompt text;
alter table public.trips
  add constraint trips_prompt_len check (prompt is null or char_length(prompt) <= 300);

create or replace function public.create_trip(p_trip jsonb, p_itinerary jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  insert into public.trips (
    user_id, title, start_date, end_date, budget_total, group_type,
    num_adults, num_children, interests, pace, notes, prompt, status
  ) values (
    auth.uid(),
    p_trip ->> 'title',
    (p_trip ->> 'startDate')::date,
    (p_trip ->> 'endDate')::date,
    nullif(p_trip ->> 'budgetTotal', '')::numeric,
    (p_trip ->> 'groupType')::public.group_type,
    (p_trip ->> 'numAdults')::int,
    coalesce(nullif(p_trip ->> 'numChildren', '')::int, 0),
    coalesce(array(select jsonb_array_elements_text(p_trip -> 'interests')), '{}'),
    (p_trip ->> 'pace')::public.trip_pace,
    nullif(p_trip ->> 'notes', ''),
    nullif(p_trip ->> 'prompt', ''),
    'planned'
  )
  returning id into v_id;

  perform public.save_itinerary(v_id, p_itinerary);
  return v_id;
end;
$$;

-- `create or replace` keeps the ACL from 0010; restated so the grants live next to the body.
revoke execute on function public.create_trip(jsonb, jsonb) from public, anon;
grant  execute on function public.create_trip(jsonb, jsonb) to authenticated;
