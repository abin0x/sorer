UPDATE core.users SET club_id='eclipse-select', role='user', custom_role='coach', full_name='Riley Reviewer (Coach)', onboarding_completed=true, location_id='es-loc-oakbrook', location_name='Oak Brook Site' WHERE id='c0a8aeb0-195c-4083-ac9a-5341b88262bf';
UPDATE core.users SET club_id='eclipse-select', role='user', custom_role='parent', full_name='Jordan Reviewer (Parent)', onboarding_completed=true, guardian_id='es-g-review' WHERE id='15ee4f69-722b-441f-b0a4-9736a7894e4c';
INSERT INTO public.club_members (club_id, user_id, role) VALUES
  ('eclipse-select','c0a8aeb0-195c-4083-ac9a-5341b88262bf','member'),
  ('eclipse-select','15ee4f69-722b-441f-b0a4-9736a7894e4c','member')
ON CONFLICT DO NOTHING;
INSERT INTO public.coaches (id, club_id, first_name, last_name, email, role, team_id, team_name, location_id, location_name, status, is_sample)
VALUES ('es-c-review','eclipse-select','Riley','Reviewer','appstore.coach@clubrudder.com','assistant_coach','es-t1','2010 Girls ECNL','es-loc-oakbrook','Oak Brook Site','active',true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.guardians (id, club_id, first_name, last_name, email, relationship, player_ids, user_id, is_sample)
VALUES ('es-g-review','eclipse-select','Jordan','Reviewer','appstore.parent@clubrudder.com','guardian','["es-t1-p1"]'::jsonb,'15ee4f69-722b-441f-b0a4-9736a7894e4c',true)
ON CONFLICT (id) DO NOTHING;