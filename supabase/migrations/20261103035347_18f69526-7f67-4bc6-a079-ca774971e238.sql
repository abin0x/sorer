-- Security: platform payment default is read server-side only
DROP POLICY IF EXISTS "Signed-in users read platform payment default" ON public.platform_payment_settings;

-- Tournament storage
CREATE TABLE IF NOT EXISTS public.tournaments (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, created_date timestamptz DEFAULT now(), updated_date timestamptz DEFAULT now(),
  created_by text, created_by_id text, is_sample boolean DEFAULT false, club_id text NOT NULL,
  name text, description text, sport text DEFAULT 'soccer', format text, age_group text, gender text, start_date text, end_date text,
  entry_fee numeric, max_teams integer, registered_count integer DEFAULT 0, status text DEFAULT 'draft', is_public boolean DEFAULT false,
  contact_email text, rules text);
CREATE TABLE IF NOT EXISTS public.games (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, created_date timestamptz DEFAULT now(), updated_date timestamptz DEFAULT now(),
  created_by text, created_by_id text, is_sample boolean DEFAULT false, club_id text NOT NULL, tournament_id text,
  game_number integer, round text, division text, group_name text, home_team_name text, away_team_name text, home_score integer, away_score integer,
  is_played boolean DEFAULT false, status text DEFAULT 'scheduled', scheduled_date text, start_time text, field_id text, field_name text, referee_name text);
CREATE TABLE IF NOT EXISTS public.standings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, created_date timestamptz DEFAULT now(), updated_date timestamptz DEFAULT now(),
  created_by text, created_by_id text, is_sample boolean DEFAULT false, club_id text NOT NULL, tournament_id text,
  group_name text, team_name text, position integer, played integer DEFAULT 0, won integer DEFAULT 0, drawn integer DEFAULT 0, lost integer DEFAULT 0,
  goals_for integer DEFAULT 0, goals_against integer DEFAULT 0, goal_difference integer DEFAULT 0, points integer DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, created_date timestamptz DEFAULT now(), updated_date timestamptz DEFAULT now(),
  created_by text, created_by_id text, is_sample boolean DEFAULT false, club_id text NOT NULL, tournament_id text,
  team_name text, team_city text, team_state text, division text, coach_name text, team_contact_name text, team_contact_email text,
  status text DEFAULT 'pending', payment_status text DEFAULT 'unpaid');
CREATE TABLE IF NOT EXISTS public.referees (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text, created_date timestamptz DEFAULT now(), updated_date timestamptz DEFAULT now(),
  created_by text, created_by_id text, is_sample boolean DEFAULT false, club_id text NOT NULL,
  first_name text, last_name text, email text, phone text, certification_level text, status text DEFAULT 'active');

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tournaments','games','standings','tournament_registrations','referees'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (is_club_member(club_id))', t||'_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (is_club_manager(club_id))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (is_club_manager(club_id)) WITH CHECK (is_club_manager(club_id))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (is_club_admin(club_id))', t||'_delete', t);
    EXECUTE format('CREATE POLICY tenant_module_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_has_console_module(club_id, ''tournaments'')) WITH CHECK (tenant_has_console_module(club_id, ''tournaments''))', t);
  END LOOP; END $$;

-- Eclipse Select demo: tournament
INSERT INTO public.tournaments (id,club_id,is_sample,name,description,format,age_group,gender,start_date,end_date,entry_fee,max_teams,registered_count,status,is_public,contact_email,rules) VALUES
('es-tour-1','eclipse-select',true,'Eclipse Thanksgiving Cup','Annual U14 girls showcase across Nike Sports Complex.','group_knockout','U14','Girls','2026-11-27','2026-11-29',650,8,8,'in_progress',true,'tournaments@eclipseselect.example','4x 2-team groups, top 2 advance. 2x35 min halves.'),
('es-tour-2','eclipse-select',true,'Winter Indoor Classic','Small-sided indoor event at Sawmill Sports Hub.','round_robin','U11','Boys','2027-01-16','2027-01-17',400,10,4,'registration_open',true,'tournaments@eclipseselect.example','7v7, 2x20 min halves.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tournament_registrations (id,club_id,is_sample,tournament_id,team_name,team_city,team_state,division,coach_name,team_contact_name,team_contact_email,status,payment_status) VALUES
('es-tr-1','eclipse-select',true,'es-tour-1','Eclipse Select 2012G','Oak Brook','IL','U14 Girls','Laura Kim','Laura Kim','lkim@example.com','approved','paid'),
('es-tr-2','eclipse-select',true,'es-tour-1','Chicago Inter','Chicago','IL','U14 Girls','Maria Lopez','Maria Lopez','mlopez@example.com','approved','paid'),
('es-tr-3','eclipse-select',true,'es-tour-1','Sockers FC','Palatine','IL','U14 Girls','Dan Brooks','Dan Brooks','dbrooks@example.com','approved','paid'),
('es-tr-4','eclipse-select',true,'es-tour-1','Michigan Jaguars','Novi','MI','U14 Girls','Ana Petrov','Ana Petrov','apetrov@example.com','approved','paid'),
('es-tr-5','eclipse-select',true,'es-tour-1','FC Wisconsin','Milwaukee','WI','U14 Girls','Kate Moss','Kate Moss','kmoss@example.com','approved','paid'),
('es-tr-6','eclipse-select',true,'es-tour-1','Indy Premier','Indianapolis','IN','U14 Girls','Sam Hart','Sam Hart','shart@example.com','approved','paid'),
('es-tr-7','eclipse-select',true,'es-tour-1','Galaxy SC','Naperville','IL','U14 Girls','Rita Chen','Rita Chen','rchen@example.com','approved','unpaid'),
('es-tr-8','eclipse-select',true,'es-tour-1','Ohio Elite','Columbus','OH','U14 Girls','Joe Vance','Joe Vance','jvance@example.com','approved','paid'),
('es-tr-9','eclipse-select',true,'es-tour-2','Eclipse Select 2015B','Oak Brook','IL','U11 Boys','Mark Diaz','Mark Diaz','mdiaz@example.com','approved','paid'),
('es-tr-10','eclipse-select',true,'es-tour-2','Team Chicago','Chicago','IL','U11 Boys','Tom Reyes','Tom Reyes','treyes@example.com','pending','unpaid'),
('es-tr-11','eclipse-select',true,'es-tour-2','Libertyville FC','Libertyville','IL','U11 Boys','Pat Green','Pat Green','pgreen@example.com','approved','paid'),
('es-tr-12','eclipse-select',true,'es-tour-2','Elgin Strikers','Elgin','IL','U11 Boys','Lee Park','Lee Park','lpark@example.com','pending','unpaid')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.games (id,club_id,is_sample,tournament_id,game_number,round,division,group_name,home_team_name,away_team_name,home_score,away_score,is_played,status,scheduled_date,start_time,field_id,field_name,referee_name) VALUES
('es-g1','eclipse-select',true,'es-tour-1',1,'Group','U14 Girls','A','Eclipse Select 2012G','Chicago Inter',3,1,true,'final','2026-11-27','09:00','es-fac-nike-f1','Nike Field 1','Chris Walsh'),
('es-g2','eclipse-select',true,'es-tour-1',2,'Group','U14 Girls','A','Sockers FC','Michigan Jaguars',2,2,true,'final','2026-11-27','09:00','es-fac-nike-f2','Nike Field 2','Nina Patel'),
('es-g3','eclipse-select',true,'es-tour-1',3,'Group','U14 Girls','B','FC Wisconsin','Indy Premier',0,1,true,'final','2026-11-27','10:30','es-fac-nike-f3','Nike Field 3','Omar Haddad'),
('es-g4','eclipse-select',true,'es-tour-1',4,'Group','U14 Girls','B','Galaxy SC','Ohio Elite',1,3,true,'final','2026-11-27','10:30','es-fac-nike-f4','Nike Field 4','Chris Walsh'),
('es-g5','eclipse-select',true,'es-tour-1',5,'Group','U14 Girls','A','Eclipse Select 2012G','Sockers FC',2,0,true,'final','2026-11-28','09:00','es-fac-nike-f1','Nike Field 1','Nina Patel'),
('es-g6','eclipse-select',true,'es-tour-1',6,'Group','U14 Girls','A','Chicago Inter','Michigan Jaguars',1,1,true,'final','2026-11-28','09:00','es-fac-nike-f2','Nike Field 2','Omar Haddad'),
('es-g7','eclipse-select',true,'es-tour-1',7,'Group','U14 Girls','B','FC Wisconsin','Galaxy SC',2,1,true,'final','2026-11-28','10:30','es-fac-nike-f3','Nike Field 3','Chris Walsh'),
('es-g8','eclipse-select',true,'es-tour-1',8,'Group','U14 Girls','B','Indy Premier','Ohio Elite',null,null,false,'in_progress','2026-11-28','10:30','es-fac-nike-f4','Nike Field 4','Nina Patel'),
('es-g9','eclipse-select',true,'es-tour-1',9,'Semifinal','U14 Girls',null,'Eclipse Select 2012G','Ohio Elite',null,null,false,'scheduled','2026-11-29','09:00','es-fac-nike-f1','Nike Field 1','Omar Haddad'),
('es-g10','eclipse-select',true,'es-tour-1',10,'Semifinal','U14 Girls',null,'Indy Premier','Michigan Jaguars',null,null,false,'scheduled','2026-11-29','09:00','es-fac-nike-f2','Nike Field 2','Chris Walsh'),
('es-g11','eclipse-select',true,'es-tour-1',11,'Final','U14 Girls',null,'Winner SF1','Winner SF2',null,null,false,'scheduled','2026-11-29','13:00','es-fac-nike-f1','Nike Field 1','Nina Patel')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.standings (id,club_id,is_sample,tournament_id,group_name,team_name,position,played,won,drawn,lost,goals_for,goals_against,goal_difference,points) VALUES
('es-s1','eclipse-select',true,'es-tour-1','A','Eclipse Select 2012G',1,2,2,0,0,5,1,4,6),
('es-s2','eclipse-select',true,'es-tour-1','A','Michigan Jaguars',2,2,0,2,0,3,3,0,2),
('es-s3','eclipse-select',true,'es-tour-1','A','Chicago Inter',3,2,0,1,1,2,4,-2,1),
('es-s4','eclipse-select',true,'es-tour-1','A','Sockers FC',4,2,0,1,1,2,4,-2,1),
('es-s5','eclipse-select',true,'es-tour-1','B','Ohio Elite',1,1,1,0,0,3,1,2,3),
('es-s6','eclipse-select',true,'es-tour-1','B','Indy Premier',2,1,1,0,0,1,0,1,3),
('es-s7','eclipse-select',true,'es-tour-1','B','FC Wisconsin',3,2,1,0,1,2,2,0,3),
('es-s8','eclipse-select',true,'es-tour-1','B','Galaxy SC',4,2,0,0,2,2,5,-3,0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.referees (id,club_id,is_sample,first_name,last_name,email,phone,certification_level,status) VALUES
('es-ref1','eclipse-select',true,'Chris','Walsh','cwalsh@example.com','630-555-0141','Grade 7','active'),
('es-ref2','eclipse-select',true,'Nina','Patel','npatel@example.com','630-555-0142','Grade 8','active'),
('es-ref3','eclipse-select',true,'Omar','Haddad','ohaddad@example.com','630-555-0143','Regional','active')
ON CONFLICT (id) DO NOTHING;

-- Facility management: link existing schedule to fields
UPDATE public.calendar_events e SET field_id = f.id, facility_id = f.facility_id, field_name = f.facility_name || ' - ' || f.name
FROM (SELECT id, facility_id, facility_name, name, row_number() OVER (ORDER BY id) - 1 AS n FROM public.fields WHERE club_id='eclipse-select') f,
     (SELECT id, row_number() OVER (ORDER BY start_datetime, id) - 1 AS n FROM public.calendar_events WHERE club_id='eclipse-select' AND field_id IS NULL) x
WHERE e.id = x.id AND f.n = x.n % 14;

INSERT INTO public.calendar_events (id,club_id,is_sample,title,event_type,status,start_datetime,end_datetime,team_ids,team_names,field_id,facility_id,field_name,location_text,visibility)
SELECT 'es-train-'||t.id||'-'||d, 'eclipse-select', true, t.name||' Training', 'practice', 'scheduled',
  date_trunc('day', now()) + (d||' days')::interval + interval '22 hours' + ((t.rn % 2) * interval '90 minutes'),
  date_trunc('day', now()) + (d||' days')::interval + interval '23 hours 30 minutes' + ((t.rn % 2) * interval '90 minutes'),
  jsonb_build_array(t.id), jsonb_build_array(t.name), f.id, f.facility_id, f.facility_name||' - '||f.name, f.facility_name, 'team'
FROM (SELECT id, name, row_number() OVER (ORDER BY id) AS rn FROM public.teams WHERE club_id='eclipse-select') t
CROSS JOIN generate_series(1,13,2) d
JOIN (SELECT id, facility_id, facility_name, name, row_number() OVER (ORDER BY id) AS rn FROM public.fields WHERE club_id='eclipse-select') f ON f.rn = ((t.rn + d) % 14) + 1
ON CONFLICT (id) DO NOTHING;

-- Center of Excellence: test scores, physical assessments, evaluations
INSERT INTO public.skill_test_scores (id,club_id,is_sample,player_id,player_name,test_id,test_title,score,test_date,level,logged_by)
SELECT 'es-sts-'||p.id||'-'||s.id||'-'||r, 'eclipse-select', true, p.id, p.first_name||' '||p.last_name, s.id, s.title,
  round((CASE s.id WHEN 'es-sk1' THEN 4.9 - (abs(hashtext(p.id||s.id)) % 90)/100.0 + r*-0.05
                   WHEN 'es-sk2' THEN 14 + (abs(hashtext(p.id||s.id)) % 50)/10.0 + r*0.4
                   ELSE 20 + abs(hashtext(p.id||s.id)) % 180 + r*12 END)::numeric, 2),
  to_char(now() - ((3-r)*30||' days')::interval, 'YYYY-MM-DD'), NULL, 'Coach Staff'
FROM public.players p CROSS JOIN public.skill_tests s CROSS JOIN generate_series(1,3) r
WHERE p.club_id='eclipse-select' AND s.club_id='eclipse-select'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.physical_assessments (id,club_id,is_sample,player_id,player_name,assessment_date,sprint_20m_seconds,agility_5_10_5_seconds,vertical_jump_inches,yoyo_level,speed,agility,power,endurance,recovery,lean,overall,assessed_by)
SELECT 'es-pa-'||p.id, 'eclipse-select', true, p.id, p.first_name||' '||p.last_name, to_char(now() - interval '10 days','YYYY-MM-DD'),
  3.0 + (h % 60)/100.0, 4.4 + (h % 70)/100.0, 14 + h % 12, 14 + (h % 50)/10.0,
  55 + h % 40, 50 + (h/7) % 45, 52 + (h/11) % 43, 58 + (h/13) % 38, 60 + (h/17) % 35, 55 + (h/19) % 40,
  60 + (h/23) % 35, 'Performance Staff'
FROM (SELECT *, abs(hashtext(id)) AS h FROM public.players WHERE club_id='eclipse-select') p
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.player_evaluations (id,club_id,is_sample,player_id,player_name,evaluation_date,primary_position,preferred_foot,technical_scores,tactical_scores,mental_scores,physical_score,overall_score,strengths,areas_of_growth,training_focus,status,evaluator_email)
SELECT 'es-pe-'||p.id, 'eclipse-select', true, p.id, p.first_name||' '||p.last_name, to_char(now() - interval '14 days','YYYY-MM-DD'),
  coalesce(p.position,'Midfielder'), CASE WHEN h % 4 = 0 THEN 'Left' ELSE 'Right' END,
  jsonb_build_object('first_touch',2+h%4,'passing',2+(h/3)%4,'dribbling',2+(h/5)%4,'shooting',1+(h/7)%5),
  jsonb_build_object('positioning',2+(h/11)%4,'decision_making',2+(h/13)%4,'transition',2+(h/17)%4),
  jsonb_build_object('coachability',3+(h/19)%3,'composure',2+(h/23)%4,'leadership',1+(h/29)%5),
  2+(h/31)%4, round((2.5 + (h % 25)/10.0)::numeric,1),
  (ARRAY['Strong first touch under pressure','Excellent work rate','Reads the game early','Confident 1v1 attacker'])[1+h%4],
  (ARRAY['Weak-foot passing','Scanning before receiving','Aerial duels','Defensive shape in transition'])[1+(h/3)%4],
  (ARRAY['Rondo speed of play','Finishing reps','Weak-foot technical block','Pressing triggers'])[1+(h/5)%4],
  'completed', 'coaching@eclipseselect.example'
FROM (SELECT *, abs(hashtext(id)) AS h FROM public.players WHERE club_id='eclipse-select') p
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';