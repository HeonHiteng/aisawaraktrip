-- ============================================================
-- 0010 trip persistence
--
-- A trip is a tree: trip -> itinerary (versioned) -> days -> items. The app saves
-- a whole itinerary at once, so it goes through ONE function call = ONE
-- transaction: no half-saved trips, no torn versions.
--
--  * SECURITY INVOKER: runs as the signed-in user, so the RLS policies from 0005
--    (owner-only) enforce ownership. There is no elevated access to get wrong.
--  * The trip row is locked (FOR UPDATE) first: concurrent saves of one trip
--    (a double-clicked "Refine") are serialised, and the version number is
--    assigned here, never trusted from the client.
--  * At most one current itinerary per trip is now a database invariant.
-- ============================================================

create unique index itineraries_one_current_idx
  on public.itineraries (trip_id) where is_current;

create or replace function public.save_itinerary(p_trip_id uuid, p_itinerary jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_itin    uuid;
  v_version int;
  v_day     jsonb;
  v_item    jsonb;
  v_day_id  uuid;
  v_n       int;
begin
  -- RLS makes a foreign trip invisible, so "not found" also covers "not yours".
  perform 1 from public.trips where id = p_trip_id for update;
  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.itineraries where trip_id = p_trip_id;

  update public.itineraries set is_current = false
  where trip_id = p_trip_id and is_current;

  insert into public.itineraries
    (trip_id, version, generated_by, model, request_summary, is_current)
  values (
    p_trip_id, v_version,
    coalesce(nullif(p_itinerary ->> 'generatedBy', ''), 'ai')::public.itinerary_source,
    nullif(p_itinerary ->> 'model', ''),
    nullif(p_itinerary ->> 'requestSummary', ''),
    true
  )
  returning id into v_itin;

  for v_day in
    select value from jsonb_array_elements(coalesce(p_itinerary -> 'days', '[]'::jsonb))
  loop
    insert into public.itinerary_days (itinerary_id, day_number, date, summary)
    values (
      v_itin,
      (v_day ->> 'dayNumber')::int,
      nullif(v_day ->> 'date', '')::date,
      nullif(v_day ->> 'summary', '')
    )
    returning id into v_day_id;

    v_n := 0;
    for v_item in
      select value from jsonb_array_elements(coalesce(v_day -> 'items', '[]'::jsonb))
    loop
      insert into public.itinerary_items (
        itinerary_day_id, sort_order, start_time, end_time, duration_minutes,
        item_type, attraction_id, experience_id, title, description,
        why_recommended, estimated_cost, location_label, is_bookable
      ) values (
        v_day_id, v_n,
        nullif(v_item ->> 'startTime', '')::time,
        nullif(v_item ->> 'endTime', '')::time,
        nullif(v_item ->> 'durationMinutes', '')::int,
        (v_item ->> 'type')::public.itinerary_item_type,
        nullif(v_item ->> 'attractionId', '')::uuid,
        nullif(v_item ->> 'experienceId', '')::uuid,
        v_item ->> 'title',
        nullif(v_item ->> 'description', ''),
        nullif(v_item ->> 'whyRecommended', ''),
        coalesce(nullif(v_item ->> 'estimatedCost', '')::numeric, 0),
        nullif(v_item ->> 'locationLabel', ''),
        coalesce((v_item ->> 'bookable')::boolean, false)
      );
      v_n := v_n + 1;
    end loop;
  end loop;

  return v_itin;
end;
$$;

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
    num_adults, num_children, interests, pace, notes, status
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
    'planned'
  )
  returning id into v_id;

  perform public.save_itinerary(v_id, p_itinerary);
  return v_id;
end;
$$;

-- Signed-in users only (guests are signed-in anonymous users). New functions get
-- EXECUTE for everyone by default; take it back from anon/public.
revoke execute on function public.save_itinerary(uuid, jsonb) from public, anon;
revoke execute on function public.create_trip(jsonb, jsonb)   from public, anon;
grant  execute on function public.save_itinerary(uuid, jsonb) to authenticated;
grant  execute on function public.create_trip(jsonb, jsonb)   to authenticated;
