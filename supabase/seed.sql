-- ============================================================
-- Demo catalogue data for Kuching / Sarawak.
-- Every row is is_sample = true and is_published = true.
-- Safe to re-run: fixed UUIDs + ON CONFLICT DO NOTHING.
-- Apply from the Supabase SQL Editor, or: supabase db push then run this file.
-- ============================================================

-- ---------- categories ----------
insert into public.categories (slug, name, icon, sort_order) values
  ('nature',    'Nature',    'trees',     1),
  ('wildlife',  'Wildlife',  'bird',      2),
  ('culture',   'Culture',   'drama',     3),
  ('heritage',  'Heritage',  'landmark',  4),
  ('food',      'Food',      'utensils',  5),
  ('adventure', 'Adventure', 'mountain',  6),
  ('shopping',  'Shopping',  'shopping-bag', 7)
on conflict (slug) do nothing;

-- ---------- locations ----------
insert into public.locations (id, name, area, description, lat, lng) values
  ('11111111-0000-0000-0000-000000000001', 'Kuching City Centre', 'Kuching', 'Historic waterfront core: bazaar, museums, temples, riverfront.', 1.5586, 110.3453),
  ('11111111-0000-0000-0000-000000000002', 'Santubong & Damai',   'Kuching', 'Coastal peninsula ~35 km north: rainforest, beaches, cultural village.', 1.7419, 110.3159),
  ('11111111-0000-0000-0000-000000000003', 'Bako',                'Kuching', 'Oldest national park in Sarawak, reached by boat from Bako village.', 1.7213, 110.4707),
  ('11111111-0000-0000-0000-000000000004', 'Semenggoh',           'Kuching', 'Nature reserve ~24 km south, semi-wild orangutan rehabilitation.', 1.4022, 110.3153),
  ('11111111-0000-0000-0000-000000000005', 'Padawan & Annah Rais','Kuching', 'Hill country south of the city: Bidayuh longhouses, rivers, kayaking.', 1.1670, 110.2330)
on conflict (id) do nothing;

-- ---------- attractions ----------
insert into public.attractions
  (id, name, slug, summary, description, location_id, address, lat, lng, avg_visit_minutes, price_min, price_max, is_free, booking_required, opening_hours, is_published)
values
  ('22222222-0000-0000-0000-000000000001', 'Kuching Waterfront', 'kuching-waterfront',
   'Landscaped riverside promenade in the heart of the old town.',
   'A ~1 km walkway along the Sarawak River with food stalls, the Darul Hana musical fountain, and views across to the State Assembly and Fort Margherita. Best at sunset.',
   '11111111-0000-0000-0000-000000000001', 'Main Bazaar, 93000 Kuching', 1.5599, 110.3499,
   60, 0, 0, true, false, '{"daily":"open 24 hours"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000002', 'Borneo Cultures Museum', 'borneo-cultures-museum',
   'Five-storey museum — the largest in Malaysia — on Sarawak''s peoples and environment.',
   'Modern galleries covering Sarawak''s ethnic groups, crafts, biodiversity and history. Allow at least two hours.',
   '11111111-0000-0000-0000-000000000001', 'Jalan Tun Abang Haji Openg, 93000 Kuching', 1.5566, 110.3436,
   150, 30, 50, false, false, '{"tue_sun":"09:00-16:45","mon":"closed"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000003', 'Fort Margherita', 'fort-margherita',
   'White 1879 fort built by Charles Brooke, now the Brooke Gallery.',
   'Across the river from the Waterfront (reachable by penambang sampan). Exhibits on the Brooke era and Sarawak history, plus rooftop views.',
   '11111111-0000-0000-0000-000000000001', 'Jalan Sapi, Petra Jaya, 93050 Kuching', 1.5606, 110.3519,
   75, 20, 20, false, false, '{"tue_sun":"09:30-16:45","mon":"closed"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000004', 'Tua Pek Kong Temple', 'tua-pek-kong-temple',
   'Kuching''s oldest Chinese temple (rebuilt 1876) at the edge of Chinatown.',
   'A working Taoist temple opposite the Chinese History Museum; especially lively during Wang Kang and the Mid-Autumn festival.',
   '11111111-0000-0000-0000-000000000001', 'Jalan Tunku Abdul Rahman, 93100 Kuching', 1.5595, 110.3520,
   30, 0, 0, true, false, '{"daily":"07:00-21:00"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000005', 'Semenggoh Nature Reserve', 'semenggoh-nature-reserve',
   'Semi-wild orangutan feeding sessions in protected rainforest.',
   'Rehabilitated orangutans roam free and may appear at the morning or afternoon feeding platform (sightings not guaranteed). Arrive before the session starts.',
   '11111111-0000-0000-0000-000000000004', 'Semenggoh, 93250 Siburan', 1.4018, 110.3155,
   120, 10, 10, false, true, '{"feeding":"09:00-10:00 and 15:00-16:00"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000006', 'Bako National Park', 'bako-national-park',
   'Coastal rainforest park famous for proboscis monkeys and sea-stack cliffs.',
   'Seven vegetation types, well-marked trails, bearded pigs and proboscis monkeys. Access is a 20-minute boat ride from Bako village; the park often needs a permit booked ahead.',
   '11111111-0000-0000-0000-000000000003', 'Bako, 93050 Kuching', 1.7213, 110.4707,
   360, 20, 20, false, true, '{"daily":"08:00-17:00 (day visit)"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000007', 'Sarawak Cultural Village', 'sarawak-cultural-village',
   'Living museum of seven traditional dwellings at the foot of Mount Santubong.',
   'Iban and Bidayuh longhouses, a Melanau tall-house, Penan hut and more, with craft demos and twice-daily cultural shows. Home of the Rainforest World Music Festival.',
   '11111111-0000-0000-0000-000000000002', 'Pantai Damai, Santubong, 93050 Kuching', 1.7530, 110.3210,
   210, 60, 90, false, false, '{"daily":"09:00-16:45","shows":"11:30 and 16:00"}'::jsonb, true),

  ('22222222-0000-0000-0000-000000000008', 'Main Bazaar & Carpenter Street', 'main-bazaar-carpenter-street',
   'The old town''s heritage shopping row and Chinatown lanes.',
   'Shophouses selling Sarawak textiles, pua kumbu, pepper, beadwork and pottery, plus clan temples and coffee shops along Carpenter Street.',
   '11111111-0000-0000-0000-000000000001', 'Main Bazaar, 93000 Kuching', 1.5591, 110.3468,
   90, 0, 0, true, false, '{"most_shops":"10:00-18:00"}'::jsonb, true)
on conflict (id) do nothing;

insert into public.attraction_categories (attraction_id, category_id)
select a.id, c.id from public.attractions a, public.categories c
where (a.slug, c.slug) in (
  ('kuching-waterfront','heritage'), ('kuching-waterfront','food'),
  ('borneo-cultures-museum','culture'), ('borneo-cultures-museum','heritage'),
  ('fort-margherita','heritage'), ('fort-margherita','culture'),
  ('tua-pek-kong-temple','heritage'), ('tua-pek-kong-temple','culture'),
  ('semenggoh-nature-reserve','wildlife'), ('semenggoh-nature-reserve','nature'),
  ('bako-national-park','nature'), ('bako-national-park','wildlife'), ('bako-national-park','adventure'),
  ('sarawak-cultural-village','culture'), ('sarawak-cultural-village','heritage'),
  ('main-bazaar-carpenter-street','shopping'), ('main-bazaar-carpenter-street','heritage')
)
on conflict do nothing;

-- ---------- vendors ----------
insert into public.vendors
  (id, name, slug, description, location_id, contact, verification_status, verified_at, is_published)
values
  ('33333333-0000-0000-0000-000000000001', 'Kuching Food Walks', 'kuching-food-walks',
   'Small-group street-food and heritage walking tours led by local guides.',
   '11111111-0000-0000-0000-000000000001',
   '{"phone":"+60 82-000001","email":"hello@example-kuchingfoodwalks.test"}'::jsonb,
   'verified', now(), true),

  ('33333333-0000-0000-0000-000000000002', 'Borneo à la Carte', 'borneo-a-la-carte',
   'Hands-on Sarawakian cooking classes in a heritage kitchen.',
   '11111111-0000-0000-0000-000000000001',
   '{"phone":"+60 82-000002","email":"cook@example-borneoalacarte.test"}'::jsonb,
   'verified', now(), true),

  ('33333333-0000-0000-0000-000000000003', 'Santubong River Cruises', 'santubong-river-cruises',
   'Sunset wildlife river cruises around the Santubong and Salak estuaries.',
   '11111111-0000-0000-0000-000000000002',
   '{"phone":"+60 82-000003","email":"cruise@example-santubong.test"}'::jsonb,
   'verified', now(), true),

  ('33333333-0000-0000-0000-000000000004', 'Adventure Alternative Borneo', 'adventure-alternative-borneo',
   'Licensed guided trekking and community-based cultural trips across Sarawak.',
   '11111111-0000-0000-0000-000000000003',
   '{"phone":"+60 82-000004","email":"trek@example-aaborneo.test"}'::jsonb,
   'verified', now(), true),

  ('33333333-0000-0000-0000-000000000005', 'Semadang Kayak', 'semadang-kayak',
   'Family-run kayaking on the Sarawak Kiri river at Semadang, Padawan.',
   '11111111-0000-0000-0000-000000000005',
   '{"phone":"+60 82-000005","email":"paddle@example-semadangkayak.test"}'::jsonb,
   'verified', now(), true)
on conflict (id) do nothing;

-- ---------- experiences ----------
insert into public.experiences
  (id, vendor_id, title, slug, summary, description, location_id, duration_minutes,
   price_per_person, min_pax, max_pax, includes, meeting_point, cancellation_policy,
   availability, booking_leadtime_hours, is_published)
values
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001',
   'Kuching Heritage & Street Food Evening Walk', 'kuching-heritage-street-food-walk',
   'A 3-hour guided tasting walk through the old town: kolo mee, satay, kek lapis and more.',
   'Meet at the Waterfront and wander Carpenter Street and the bazaar with a local guide, stopping at 6-7 hawker favourites. Vegetarian option on request.',
   '11111111-0000-0000-0000-000000000001', 180, 150, 2, 10,
   '{"Local guide","6-7 food tastings","Bottled water"}',
   'Kuching Waterfront, near the Darul Hana fountain',
   'Free cancellation up to 24 hours before start.',
   '{"days":["tue","wed","thu","fri","sat"],"times":["17:30"],"capacity_per_slot":10}'::jsonb, 24, true),

  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002',
   'Sarawak Laksa & Kolo Mee Cooking Class', 'sarawak-laksa-kolo-mee-cooking-class',
   'Half-day hands-on class making Sarawak laksa paste and kolo mee from scratch.',
   'Includes a guided wet-market visit for ingredients, then cook and eat a full lunch. Recipes provided.',
   '11111111-0000-0000-0000-000000000001', 240, 220, 1, 8,
   '{"Market tour","All ingredients","Recipe booklet","Lunch"}',
   'Borneo à la Carte studio, Jalan Padungan',
   'Free cancellation up to 48 hours before start.',
   '{"days":["mon","wed","fri","sat"],"times":["09:00"],"capacity_per_slot":8}'::jsonb, 48, true),

  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003',
   'Santubong Sunset Wildlife River Cruise', 'santubong-sunset-wildlife-river-cruise',
   'A 3.5-hour boat cruise looking for Irrawaddy dolphins, proboscis monkeys and fireflies.',
   'Depart mid-afternoon, cruise the estuary for wildlife, watch sunset over Mount Santubong, then spot fireflies on the way back. Light snacks aboard.',
   '11111111-0000-0000-0000-000000000002', 210, 180, 2, 20,
   '{"Return boat","Life jackets","Guide","Snacks & water"}',
   'Santubong boat jetty (self-drive or arrange transfer)',
   'Free cancellation up to 24 hours before; weather cancellations fully refunded.',
   '{"days":["mon","tue","wed","thu","fri","sat","sun"],"times":["15:30"],"capacity_per_slot":20}'::jsonb, 24, true),

  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000004',
   'Bako National Park Full-Day Guided Trek', 'bako-national-park-full-day-trek',
   'Full-day small-group trek in Bako with a naturalist guide — proboscis monkeys and the Telok Pandan Kecil viewpoint.',
   'Boat transfer into the park, permit handling, two guided trails, and a packed lunch. Moderate fitness needed; ~8-9 hours door to door.',
   '11111111-0000-0000-0000-000000000003', 540, 320, 2, 12,
   '{"Park permit","Return boat","Naturalist guide","Packed lunch","Water"}',
   'Bako Terminal, Kampung Bako (transfer from Kuching available)',
   'Free cancellation up to 48 hours before start.',
   '{"days":["mon","tue","wed","thu","fri","sat","sun"],"times":["07:30"],"capacity_per_slot":12}'::jsonb, 48, true),

  ('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000005',
   'Sarawak Kiri River Kayaking at Semadang', 'sarawak-kiri-river-kayaking-semadang',
   'A relaxed half-day paddle through Padawan rainforest with a swim stop and light rapids.',
   'Beginner-friendly guided kayaking, roughly 10 km downstream. Includes gear, a village lunch and transfers from Kuching.',
   '11111111-0000-0000-0000-000000000005', 300, 190, 2, 16,
   '{"Kayak & paddle","Dry bag","Guide","Village lunch","Kuching transfer"}',
   'Kuching city hotel pickup (07:45) or Semadang jetty',
   'Free cancellation up to 24 hours before; weather cancellations fully refunded.',
   '{"days":["wed","thu","fri","sat","sun"],"times":["08:00"],"capacity_per_slot":16}'::jsonb, 24, true),

  ('44444444-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000004',
   'Annah Rais Longhouse & Bidayuh Culture Day', 'annah-rais-longhouse-bidayuh-culture-day',
   'A full day at a living Bidayuh longhouse: bamboo walkways, headhouse, jungle walk to a waterfall and a home-cooked lunch.',
   'Guided visit hosted by an Annah Rais family, with a short trek to a bathing pool and bamboo-cooking demonstration. Respectful, community-based tourism.',
   '11111111-0000-0000-0000-000000000005', 420, 280, 2, 12,
   '{"Kuching transfer","Longhouse entry","Local host & guide","Lunch","Waterfall walk"}',
   'Kuching city hotel pickup (08:30)',
   'Free cancellation up to 48 hours before start.',
   '{"days":["mon","tue","thu","sat","sun"],"times":["08:30"],"capacity_per_slot":12}'::jsonb, 48, true)
on conflict (id) do nothing;

insert into public.experience_categories (experience_id, category_id)
select e.id, c.id from public.experiences e, public.categories c
where (e.slug, c.slug) in (
  ('kuching-heritage-street-food-walk','food'), ('kuching-heritage-street-food-walk','heritage'), ('kuching-heritage-street-food-walk','culture'),
  ('sarawak-laksa-kolo-mee-cooking-class','food'), ('sarawak-laksa-kolo-mee-cooking-class','culture'),
  ('santubong-sunset-wildlife-river-cruise','nature'), ('santubong-sunset-wildlife-river-cruise','wildlife'),
  ('bako-national-park-full-day-trek','nature'), ('bako-national-park-full-day-trek','wildlife'), ('bako-national-park-full-day-trek','adventure'),
  ('sarawak-kiri-river-kayaking-semadang','adventure'), ('sarawak-kiri-river-kayaking-semadang','nature'),
  ('annah-rais-longhouse-bidayuh-culture-day','culture'), ('annah-rais-longhouse-bidayuh-culture-day','heritage')
)
on conflict do nothing;

-- ---------- images (demo photos; swapped for owned assets later) ----------
insert into public.images (owner_type, owner_id, url, alt, is_primary) values
  ('attraction', '22222222-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1591017403286-fd8493524e1e?w=1200&q=70', 'Kuching Waterfront at dusk', true),
  ('attraction', '22222222-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=70', 'Rainforest canopy in Borneo', true),
  ('attraction', '22222222-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1605552055839-6d5c2f7d0a2a?w=1200&q=70', 'Orangutan in the forest', true),
  ('experience', '44444444-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=1200&q=70', 'Street food night market', true),
  ('experience', '44444444-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=70', 'River cruise at sunset', true),
  ('experience', '44444444-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=1200&q=70', 'Kayaking on a jungle river', true)
on conflict do nothing;
