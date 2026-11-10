
INSERT INTO public.clubs(id,name,slug,status,is_active,is_demo,primary_color,secondary_color,address,director_name,primary_contact_name,primary_contact_email,plan_tier,max_branches,max_teams,max_players,preferred_payment_provider,terminology)
VALUES ('eclipse-select','Eclipse Select SC','eclipse-select','active',true,true,'#0033A0','#001A33','500 Park Blvd., Suite 178C, Itasca, IL 60143','Club Director (demo)','Front Office (demo)','info@eclipseselect.demo','enterprise',10,100,2000,'stripe',
 '{"branch":"Site","platforms":["ECNL","ECNL-RL","Pre-ECNL","Rising Stars"]}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.locations(id,club_id,name,city,state,zip_code,address,is_active,branch_type,is_sample) VALUES
('es-loc-oakbrook','eclipse-select','Oak Brook Site','Oak Brook','IL','60523','1310 Forest Gate Rd., Oak Brook, IL',true,'branch',true),
('es-loc-naperville','eclipse-select','Naperville Site','Naperville','IL','60563','288 W. Diehl Rd., Naperville, IL',true,'branch',true),
('es-loc-lakeforest','eclipse-select','Lake Forest Site','Lake Forest','IL','60045','95 Deerpath, Lake Forest, IL',true,'branch',true),
('es-loc-itasca','eclipse-select','Itasca Site','Itasca','IL','60143','500 Park Blvd., Itasca, IL',true,'branch',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seasons(id,club_id,name,start_date,end_date,is_current,status,is_sample)
VALUES ('es-season-2627','eclipse-select','2026-27','2026-08-01','2027-07-31',true,'active',true) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.facilities(id,club_id,name,address,location_id,location_name,field_count,surface_type,is_active,is_sample) VALUES
('es-fac-ocp','eclipse-select','Oak Brook Central Park - South','1310 Forest Gate Rd., Oak Brook, IL 60523','es-loc-oakbrook','Oak Brook Site',3,'Turf & Grass',true,true),
('es-fac-nike','eclipse-select','Nike Sports Complex','288 W. Diehl Rd., Naperville, IL 60563','es-loc-naperville','Naperville Site',4,'Turf & Grass',true,true),
('es-fac-comm','eclipse-select','Commissioners Park','3704 W 111th St., Naperville, IL 60564','es-loc-naperville','Naperville Site',2,'Turf',true,true),
('es-fac-deer','eclipse-select','Deerpath Community Park','95 Deerpath, Lake Forest, IL 60045','es-loc-lakeforest','Lake Forest Site',2,'Grass',true,true),
('es-fac-saw','eclipse-select','Sawmill Sports Hub (Indoor)','17W411 S Frontage Rd, Willowbrook, IL 60527','es-loc-oakbrook','Oak Brook Site',1,'Indoor Turf',true,true),
('es-fac-ham','eclipse-select','Hamilton Lakes','500 Park Blvd, Itasca, IL 60143','es-loc-itasca','Itasca Site',2,'Grass',true,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fields(id,club_id,facility_id,facility_name,name,surface,indoor_outdoor,lighted,status,max_sections,is_sample)
SELECT f.id||'-f'||n, 'eclipse-select', f.id, f.name, 'Field '||n,
  CASE WHEN f.surface_type ILIKE '%turf%' THEN 'turf' ELSE 'grass' END,
  CASE WHEN f.id='es-fac-saw' THEN 'indoor' ELSE 'outdoor' END, n=1, 'active', 4, true
FROM public.facilities f, generate_series(1,4) n
WHERE f.club_id='eclipse-select' AND n <= f.field_count
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.coaches(id,club_id,first_name,last_name,email,role,team_id,team_name,location_id,location_name,status,is_sample) VALUES
('es-c1','eclipse-select','Maria','Kovacs','m.kovacs@eclipseselect.demo','head_coach','es-t1','2010 Girls ECNL','es-loc-oakbrook','Oak Brook Site','active',true),
('es-c2','eclipse-select','James','Okafor','j.okafor@eclipseselect.demo','head_coach','es-t2','2011 Boys ECNL','es-loc-naperville','Naperville Site','active',true),
('es-c3','eclipse-select','Lauren','Whitfield','l.whitfield@eclipseselect.demo','head_coach','es-t3','2012 Girls ECNL-RL','es-loc-oakbrook','Oak Brook Site','active',true),
('es-c4','eclipse-select','Diego','Ramirez','d.ramirez@eclipseselect.demo','head_coach','es-t4','2013 Boys ECNL-RL','es-loc-lakeforest','Lake Forest Site','active',true),
('es-c5','eclipse-select','Sarah','Lindqvist','s.lindqvist@eclipseselect.demo','head_coach','es-t5','2014 Girls Pre-ECNL','es-loc-itasca','Itasca Site','active',true),
('es-c6','eclipse-select','Tom','Brennan','t.brennan@eclipseselect.demo','head_coach','es-t6','2019 Rising Stars','es-loc-naperville','Naperville Site','active',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.teams(id,club_id,name,age_group,gender,league,platform_name,season,location_id,location_name,coach_id,coach_name,max_roster_size,playing_format,cost,is_sample) VALUES
('es-t1','eclipse-select','2010 Girls ECNL','U17','Girls','ECNL Midwest','ECNL','2026-27','es-loc-oakbrook','Oak Brook Site','es-c1','Maria Kovacs',20,'11v11',3400,true),
('es-t2','eclipse-select','2011 Boys ECNL','U16','Boys','ECNL Boys Midwest','ECNL','2026-27','es-loc-naperville','Naperville Site','es-c2','James Okafor',20,'11v11',3400,true),
('es-t3','eclipse-select','2012 Girls ECNL-RL','U15','Girls','ECNL-RL Illinois','ECNL-RL','2026-27','es-loc-oakbrook','Oak Brook Site','es-c3','Lauren Whitfield',20,'11v11',2800,true),
('es-t4','eclipse-select','2013 Boys ECNL-RL','U14','Boys','ECNL-RL Illinois','ECNL-RL','2026-27','es-loc-lakeforest','Lake Forest Site','es-c4','Diego Ramirez',20,'11v11',2800,true),
('es-t5','eclipse-select','2014 Girls Pre-ECNL','U13','Girls','Pre-ECNL Midwest','Pre-ECNL','2026-27','es-loc-itasca','Itasca Site','es-c5','Sarah Lindqvist',18,'9v9',2400,true),
('es-t6','eclipse-select','2019 Rising Stars','U8','Coed','In-house','Rising Stars','2026-27','es-loc-naperville','Naperville Site','es-c6','Tom Brennan',14,'4v4',650,true)
ON CONFLICT (id) DO NOTHING;

WITH fn(a) AS (SELECT ARRAY['Avery','Brooke','Chloe','Delaney','Emma','Fiona','Grace','Harper','Isla','Jade','Kayla','Lily','Mia','Nora','Olivia','Paige']),
     mn(a) AS (SELECT ARRAY['Aiden','Ben','Caleb','Dylan','Ethan','Finn','Gavin','Henry','Isaac','Jack','Kai','Liam','Mason','Noah','Owen','Parker']),
     ln(a) AS (SELECT ARRAY['Anderson','Bauer','Chen','Dominguez','Ellis','Fischer','Garcia','Hughes','Ivanov','Jensen','Kowalski','Lopez','Murphy','Novak','OBrien','Patel']),
     pos(a) AS (SELECT ARRAY['GK','CB','CB','LB','RB','CDM','CM','CM','CAM','LW','RW','ST','ST','CB','CM','GK'])
INSERT INTO public.players(id,club_id,first_name,last_name,gender,team_id,team_name,location_id,location_name,coach_id,coach_name,age_group,league,season,position,jersey_number,status,date_of_birth,guardian_name,is_sample)
SELECT t.id||'-p'||n,'eclipse-select',
  CASE WHEN t.gender='Boys' OR (t.gender='Coed' AND n%2=0) THEN (SELECT a[n] FROM mn) ELSE (SELECT a[n] FROM fn) END,
  (SELECT a[((n + length(t.id)*3) % 16)+1] FROM ln), t.gender, t.id, t.name, t.location_id, t.location_name, t.coach_id, t.coach_name,
  t.age_group, t.league, '2026-27', (SELECT a[n] FROM pos), (n+1)::text, 'active',
  (2000+substring(t.name,1,4)::int-2000)::text||'-0'||((n%9)+1)||'-1'||(n%9), 'Parent of #'||(n+1), true
FROM public.teams t, generate_series(1,16) n WHERE t.club_id='eclipse-select'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.calendar_events(id,club_id,title,event_type,start_datetime,end_datetime,team_ids,team_names,facility_id,field_name,location_text,opponent_name,home_team_name,is_away,arrive_minutes_before,kit,status,rsvp_required,season,team_score,opponent_score,period,volunteer_slots,is_sample)
SELECT 'es-ev-'||t.id||'-'||d, 'eclipse-select',
  CASE WHEN d%3=0 THEN t.name||' vs '||(ARRAY['Michigan Hawks','Chicago Inter','Sockers FC','FC Wisconsin','Indiana Fire'])[(d%5)+1] ELSE t.name||' Training' END,
  CASE WHEN d%3=0 THEN 'game' ELSE 'practice' END,
  date_trunc('day',now()) + (d||' days')::interval + interval '22 hours',
  date_trunc('day',now()) + (d||' days')::interval + interval '23 hours 30 minutes',
  jsonb_build_array(t.id), jsonb_build_array(t.name),
  CASE WHEN t.location_id='es-loc-naperville' THEN 'es-fac-nike' WHEN t.location_id='es-loc-lakeforest' THEN 'es-fac-deer' WHEN t.location_id='es-loc-itasca' THEN 'es-fac-ham' ELSE 'es-fac-ocp' END,
  'Field 1', t.location_name,
  CASE WHEN d%3=0 THEN (ARRAY['Michigan Hawks','Chicago Inter','Sockers FC','FC Wisconsin','Indiana Fire'])[(d%5)+1] END,
  t.name, d%6=0, CASE WHEN d%3=0 THEN 45 ELSE 15 END, CASE WHEN d%6=0 THEN 'White' ELSE 'Royal Blue' END,
  'scheduled', true, '2026-27',
  CASE WHEN d=0 THEN 2 ELSE 0 END, CASE WHEN d=0 THEN 1 ELSE 0 END, CASE WHEN d=0 THEN '2nd half' ELSE 'pre' END,
  CASE WHEN d%3=0 THEN '[{"id":"snacks","label":"Halftime snacks"},{"id":"tent","label":"Team tent / canopy"},{"id":"veo","label":"Camera / Veo","volunteer_name":"Parent of #7"},{"id":"line","label":"Assistant line judge"}]'::jsonb ELSE '[]'::jsonb END,
  true
FROM public.teams t, generate_series(-6,14) d WHERE t.club_id='eclipse-select' AND d%2=0
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tryout_events(id,club_id,type,date,start_time,end_time,location,stage,expected_attendance,registration_count,checked_in_count,evaluated_count,accepted_count,notes,is_sample) VALUES
('es-try1','eclipse-select','tryout','2026-11-01','17:30','18:45','Oak Brook Park District Turf, 1310 Forest Gate Rd','completed',60,58,54,54,22,'ECNL Boys U15-U16',true),
('es-try2','eclipse-select','tryout','2026-10-25','18:00','19:30','Deerpath Community Park','completed',45,41,39,39,15,'ECNL Boys U15-U18',true),
('es-try3','eclipse-select','supplemental','2026-11-15','10:00','12:00','Nike Sports Complex, Naperville','upcoming',40,18,0,0,0,'Supplemental girls tryout',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.channels(id,club_id,name,type,scope,team_id,team_name,description,is_default,sort_order,allow_replies) VALUES
('es-ch-all','eclipse-select','Club Announcements','announcement','club',NULL,NULL,'Official news from Eclipse Select',true,0,false),
('es-ch-coaches','eclipse-select','Coaches Room','staff','club',NULL,NULL,'Staff-only coordination',false,1,true),
('es-ch-t1','eclipse-select','2010 Girls ECNL','team','team','es-t1','2010 Girls ECNL','Team updates and game day',false,2,true),
('es-ch-t2','eclipse-select','2011 Boys ECNL','team','team','es-t2','2011 Boys ECNL','Team updates and game day',false,3,true),
('es-ch-t6','eclipse-select','2019 Rising Stars','team','team','es-t6','2019 Rising Stars','Rising Stars families',false,4,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.channel_messages(id,club_id,channel_id,team_id,author_name,author_role,kind,content,urgency,is_priority,ack_required,created_date) VALUES
('es-m1','eclipse-select','es-ch-all',NULL,'Eclipse Front Office','club_admin','text','2026-27 tryouts are complete — offers go out Friday. Thank you to all 600+ families who came out!','info',false,false,now()-interval '2 days'),
('es-m2','eclipse-select','es-ch-all',NULL,'Eclipse Front Office','club_admin','text','Lightning in Naperville: ALL Nike Sports Complex sessions tonight are cancelled.','urgent',true,true,now()-interval '5 hours'),
('es-m3','eclipse-select','es-ch-t1','es-t1','Maria Kovacs','coach','text','Showcase weekend roster posted. Arrive 60 min early Saturday, white kit.','important',true,true,now()-interval '1 day'),
('es-m4','eclipse-select','es-ch-t1','es-t1','Maria Kovacs','coach','text','Congrats to our two newest Division I commits! 🎉','info',false,false,now()-interval '3 hours'),
('es-m5','eclipse-select','es-ch-t2','es-t2','James Okafor','coach','text','Film session Thursday 6pm at Sawmill Sports Hub.','info',false,false,now()-interval '20 hours'),
('es-m6','eclipse-select','es-ch-coaches',NULL,'Director of Coaching','club_admin','text','Pathway curriculum for The Gap (U11-U12) uploaded to the library.','important',false,false,now()-interval '4 days'),
('es-m7','eclipse-select','es-ch-t6','es-t6','Tom Brennan','coach','text','Rising Stars: bring a water bottle and shin guards Saturday!','info',false,false,now()-interval '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.curriculum_documents(id,club_id,title,category,description,content_text,is_active,is_sample) VALUES
('es-cur1','eclipse-select','Foundation Phase (U5-U10)','Pathway','Technical fundamentals and game awareness','Ball mastery, 1v1, striking, small-sided games. Starts with Rising Stars ages 4-7.',true,true),
('es-cur2','eclipse-select','The Gap (U11-U12)','Pathway','Blend of technical and tactical','Positional play, team shape, transitions, decision making.',true,true),
('es-cur3','eclipse-select','Elite Pathway (U13-U19)','Pathway','ECNL / ECNL-RL performance and college preparation','Game model, periodization, college recruiting support.',true,true),
('es-cur4','eclipse-select','Eclipse Style of Play','Methodology','Club-wide principles and language','Possession-based 1-4-3-3, high press triggers, build from the back.',true,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.training_sessions(id,club_id,title,topic,level,objective,description,duration_minutes,player_count,is_sample) VALUES
('es-ts1','eclipse-select','Rondo 5v2 to Positional Game','Possession','Elite','Play through pressure','Warm-up rondo, 7v7+3 positional game, 11v11 conditioned scrimmage.',90,18,true),
('es-ts2','eclipse-select','Pressing Triggers','Defending','Elite','Win the ball high','Shadow press, 6v6 trigger game, regain and finish.',90,18,true),
('es-ts3','eclipse-select','Building from the Back','Build-up','Gap','Play out under pressure','GK + back 4 patterns vs 3 pressers.',75,16,true),
('es-ts4','eclipse-select','1v1 Ball Mastery','Technical','Foundation','Confidence on the ball','Ball mastery circuit, 1v1 gates, 3v3 to small goals.',60,12,true),
('es-ts5','eclipse-select','Finishing Under Fatigue','Attacking','Elite','Clinical finishing','Combination finishing, crossing waves, 4v4 to big goals.',75,18,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.skill_tests(id,club_id,title,category,description,is_sample) VALUES
('es-sk1','eclipse-select','30m Sprint','physical','Timed 30 meter sprint',true),('es-sk2','eclipse-select','Yo-Yo IR1','physical','Intermittent recovery test',true),('es-sk3','eclipse-select','Juggling (max)','technical','Max consecutive touches',true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.payments(id,club_id,player_id,player_name,guardian_name,amount,currency,status,payment_method,payment_date,source_type,source_label,processor_name,is_sample)
SELECT 'es-pay-'||p.id||'-'||k,'eclipse-select',p.id,p.first_name||' '||p.last_name,p.guardian_name,
  round((t.cost/4)::numeric,2),'usd',
  CASE WHEN k<=2 THEN 'paid' WHEN k=3 AND (right(p.id,1)::int%3)=0 THEN 'overdue' ELSE 'pending' END,
  'card', (date '2026-08-01' + ((k-1)*60))::text, 'registration', '2026-27 Dues installment '||k,'Stripe',true
FROM public.players p JOIN public.teams t ON t.id=p.team_id, generate_series(1,4) k
WHERE p.club_id='eclipse-select'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_modules(club_id,module_key,status,admin_enabled,complimentary_reason,is_sample)
SELECT 'eclipse-select', m, 'active', true, 'Prospect demo', true
FROM unnest(ARRAY['club_nexus','payments','kanban','development','facilities','tournaments','branding']) m
WHERE NOT EXISTS (SELECT 1 FROM public.tenant_modules x WHERE x.club_id='eclipse-select' AND x.module_key=m);
