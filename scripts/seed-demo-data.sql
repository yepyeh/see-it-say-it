-- Demo seed for See It Say It
-- Safe to re-run: only removes rows with deterministic seed ids.
-- Useful sample sign-in emails after seeding:
--   maya@demo.seeitsayit.app
--   omar@demo.seeitsayit.app
--   priya@demo.seeitsayit.app
--   arden.warden@demo.seeitsayit.app
--   hannah.moderator@demo.seeitsayit.app
--   alex.admin@demo.seeitsayit.app

PRAGMA foreign_keys = ON;

DELETE FROM resolution_story_media
WHERE resolution_story_media_id LIKE 'seed-%';

DELETE FROM resolution_stories
WHERE resolution_story_id LIKE 'seed-%';

DELETE FROM moderation_actions
WHERE moderation_action_id LIKE 'seed-%';

DELETE FROM authority_dispatches
WHERE dispatch_id LIKE 'seed-%';

DELETE FROM report_events
WHERE report_event_id LIKE 'seed-%';

DELETE FROM report_media
WHERE report_media_id LIKE 'seed-%';

DELETE FROM report_confirmations
WHERE report_confirmation_id LIKE 'seed-%';

DELETE FROM routing_suggestions
WHERE routing_suggestion_id LIKE 'seed-%';

DELETE FROM support_contributions
WHERE support_contribution_id LIKE 'seed-%';

DELETE FROM reports
WHERE report_id LIKE 'seed-%';

DELETE FROM user_roles
WHERE user_role_id LIKE 'seed-%';

DELETE FROM auth_sessions
WHERE session_id LIKE 'seed-%';

DELETE FROM otp_challenges
WHERE challenge_id LIKE 'seed-%';

DELETE FROM users
WHERE user_id LIKE 'seed-%';

INSERT INTO users (user_id, email, display_name, preferred_locale, home_country_code, created_at, updated_at)
VALUES
  ('seed-user-maya', 'maya@demo.seeitsayit.app', 'Maya Thompson', 'en-GB', 'GB', '2026-03-18 09:00:00', '2026-04-02 18:00:00'),
  ('seed-user-omar', 'omar@demo.seeitsayit.app', 'Omar Khan', 'en-GB', 'GB', '2026-03-19 10:00:00', '2026-04-02 18:00:00'),
  ('seed-user-priya', 'priya@demo.seeitsayit.app', 'Priya Nair', 'en-GB', 'GB', '2026-03-20 08:45:00', '2026-04-02 18:00:00'),
  ('seed-user-arden', 'arden.warden@demo.seeitsayit.app', 'Arden Cross', 'en-GB', 'GB', '2026-03-21 08:30:00', '2026-04-02 18:00:00'),
  ('seed-user-hannah', 'hannah.moderator@demo.seeitsayit.app', 'Hannah Lewis', 'en-GB', 'GB', '2026-03-22 08:30:00', '2026-04-02 18:00:00'),
  ('seed-user-alex', 'alex.admin@demo.seeitsayit.app', 'Alex Mercer', 'en-GB', 'GB', '2026-03-23 08:30:00', '2026-04-02 18:00:00');

INSERT OR IGNORE INTO users (user_id, email, display_name, preferred_locale, home_country_code, created_at, updated_at)
VALUES ('seed-user-steven', 'steven@thamescollective.co.uk', 'Steven Ellis', 'en-GB', 'GB', '2026-03-24 08:30:00', '2026-04-02 18:00:00');

UPDATE users
SET display_name = COALESCE(display_name, 'Steven Ellis'),
    preferred_locale = 'en-GB',
    home_country_code = 'GB',
    updated_at = '2026-04-02 18:00:00'
WHERE email = 'steven@thamescollective.co.uk';

INSERT INTO user_roles (user_role_id, user_id, role, country_code, region_id, authority_id, assigned_at)
VALUES
  ('seed-role-maya-resident', 'seed-user-maya', 'resident', 'GB', NULL, NULL, '2026-03-18 09:00:00'),
  ('seed-role-omar-resident', 'seed-user-omar', 'resident', 'GB', NULL, NULL, '2026-03-19 10:00:00'),
  ('seed-role-priya-resident', 'seed-user-priya', 'resident', 'GB', NULL, NULL, '2026-03-20 08:45:00'),
  ('seed-role-arden-warden', 'seed-user-arden', 'warden', 'GB', 'region-bristol', 'auth-bristol-city', '2026-03-21 08:30:00'),
  ('seed-role-hannah-moderator', 'seed-user-hannah', 'moderator', 'GB', 'region-manchester', 'auth-manchester', '2026-03-22 08:30:00'),
  ('seed-role-alex-admin', 'seed-user-alex', 'admin', 'GB', NULL, NULL, '2026-03-23 08:30:00');

INSERT OR IGNORE INTO user_roles (user_role_id, user_id, role, country_code, region_id, authority_id, assigned_at)
SELECT 'seed-role-steven-admin', user_id, 'admin', 'GB', NULL, NULL, '2026-03-24 08:30:00'
FROM users
WHERE email = 'steven@thamescollective.co.uk';

INSERT OR IGNORE INTO user_roles (user_role_id, user_id, role, country_code, region_id, authority_id, assigned_at)
SELECT 'seed-role-steven-warden', user_id, 'warden', 'GB', 'region-bristol', 'auth-bristol-city', '2026-03-24 08:35:00'
FROM users
WHERE email = 'steven@thamescollective.co.uk';

INSERT INTO reports (
  report_id,
  user_id,
  locale,
  country_code,
  region_id,
  authority_id,
  category,
  description,
  notes_markdown,
  severity,
  status,
  latitude,
  longitude,
  location_label,
  created_at,
  updated_at,
  submitted_at,
  source_channel,
  duplicate_of_report_id
)
VALUES
  (
    'seed-report-pothole-bristol',
    'seed-user-maya',
    'en-GB',
    'GB',
    'region-bristol',
    'auth-bristol-city',
    'Pothole',
    'Deep pothole opening near the cycle lane and forcing riders into traffic.',
    '- worsening after rain\n- located on the approach to Bond Street\n- dangerous for cyclists and buses',
    4,
    'submitted',
    51.457900,
    -2.585300,
    'Bond Street, Bristol',
    '2026-04-01 08:12:00',
    '2026-04-01 08:14:00',
    '2026-04-01 08:14:00',
    'web',
    NULL
  ),
  (
    'seed-report-obstruction-bristol',
    'seed-user-omar',
    'en-GB',
    'GB',
    'region-bristol',
    'auth-bristol-city',
    'Obstructed pavement',
    'Collapsed temporary barriers are blocking the full pavement width outside the crossing.',
    '- wheelchair users forced into road\n- barrier has been down since yesterday',
    4,
    'in_progress',
    51.454800,
    -2.587200,
    'College Green, Bristol',
    '2026-03-31 17:20:00',
    '2026-04-01 10:05:00',
    '2026-03-31 17:22:00',
    'web',
    NULL
  ),
  (
    'seed-report-flytipping-westminster',
    'seed-user-priya',
    'en-GB',
    'GB',
    'region-london-westminster',
    'auth-westminster',
    'Fly-tipping',
    'Black bags and broken shelving dumped beside the bin store entrance.',
    '- attracting more waste\n- partially blocking access gate',
    3,
    'dispatched',
    51.498900,
    -0.137600,
    'Vincent Square, Westminster',
    '2026-03-30 07:55:00',
    '2026-03-30 08:45:00',
    '2026-03-30 08:00:00',
    'web',
    NULL
  ),
  (
    'seed-report-lighting-manchester',
    'seed-user-priya',
    'en-GB',
    'GB',
    'region-manchester',
    'auth-manchester',
    'Street light outage',
    'Three street lights have been out for several nights around the pedestrian route home from the tram stop.',
    '- route feels unsafe after dark\n- affects crossing visibility',
    4,
    'resolved',
    53.481000,
    -2.242100,
    'St Peter''s Square, Manchester',
    '2026-03-28 20:10:00',
    '2026-04-01 09:15:00',
    '2026-03-28 20:14:00',
    'web',
    NULL
  ),
  (
    'seed-report-duplicate-bristol',
    'seed-user-priya',
    'en-GB',
    'GB',
    'region-bristol',
    'auth-bristol-city',
    'Pothole',
    'Second report for the same pothole because the hole has widened further into the lane.',
    '- likely duplicate of earlier report\n- edge now breaking away',
    3,
    'submitted',
    51.457860,
    -2.585270,
    'Bond Street, Bristol',
    '2026-04-01 12:35:00',
    '2026-04-01 12:36:00',
    '2026-04-01 12:36:00',
    'web',
    'seed-report-pothole-bristol'
  ),
  (
    'seed-report-bins-bristol',
    'seed-user-maya',
    'en-GB',
    'GB',
    'region-bristol',
    'auth-bristol-city',
    'Overflowing litter bins',
    'Bins in the park are overflowing and rubbish is blowing into the play area.',
    '- worst near the benches\n- likely needs extra weekend pickup',
    2,
    'submitted',
    51.462300,
    -2.603100,
    'Castle Park, Bristol',
    '2026-04-02 07:25:00',
    '2026-04-02 07:27:00',
    '2026-04-02 07:27:00',
    'mobile-web',
    NULL
  ),
  (
    'seed-report-unknown-cambridge',
    'seed-user-omar',
    'en-GB',
    'GB',
    NULL,
    NULL,
    'Unsafe gate / private land boundary',
    'A damaged gate is opening into the public footpath, but it may belong to the retail estate rather than the council.',
    '- unclear whether council or private land owner\n- gate swings into walking route',
    3,
    'submitted',
    52.208600,
    0.137200,
    'Retail park service road, Cambridge',
    '2026-04-02 09:40:00',
    '2026-04-02 09:42:00',
    '2026-04-02 09:42:00',
    'web',
    NULL
  );

INSERT INTO report_media (report_media_id, report_id, storage_provider, storage_key, public_url, mime_type, created_at)
VALUES
  ('seed-media-pothole', 'seed-report-pothole-bristol', 'r2', 'seed/demo/pothole.png', '/brand/app-icon.png', 'image/png', '2026-04-01 08:14:30'),
  ('seed-media-lighting', 'seed-report-lighting-manchester', 'r2', 'seed/demo/lighting.png', '/brand/app-icon.png', 'image/png', '2026-03-28 20:15:00');

INSERT INTO reports (
  report_id,
  user_id,
  locale,
  country_code,
  region_id,
  authority_id,
  category,
  description,
  notes_markdown,
  severity,
  status,
  latitude,
  longitude,
  location_label,
  created_at,
  updated_at,
  submitted_at,
  source_channel,
  duplicate_of_report_id
)
SELECT
  'seed-report-steven-crossing',
  user_id,
  'en-GB',
  'GB',
  'region-bristol',
  'auth-bristol-city',
  'Faded crossing markings',
  'The zebra crossing markings are badly faded and drivers are not slowing reliably.',
  '- school run route\n- repainting would improve visibility quickly',
  3,
  'submitted',
  51.456100,
  -2.584400,
  'Rupert Street crossing, Bristol',
  '2026-04-02 11:05:00',
  '2026-04-02 11:08:00',
  '2026-04-02 11:08:00',
  'web',
  NULL
FROM users
WHERE email = 'steven@thamescollective.co.uk';

INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json, created_at)
VALUES
  ('seed-event-pothole-submitted', 'seed-report-pothole-bristol', 'seed-user-maya', 'report_submitted', '{"sourceChannel":"web","routingState":"verified","authorityId":"auth-bristol-city","groupId":"roads-transport","categoryId":"pothole","destinationEmail":"highways@bristol.gov.uk"}', '2026-04-01 08:14:00'),
  ('seed-event-pothole-route', 'seed-report-pothole-bristol', 'seed-user-maya', 'authority_route_resolved', '{"routingState":"verified","authorityName":"Bristol City Council","destinationEmail":"highways@bristol.gov.uk","departmentRoute":{"department":"Highways","queue":"street-assets"}}', '2026-04-01 08:14:10'),
  ('seed-event-obstruction-submitted', 'seed-report-obstruction-bristol', 'seed-user-omar', 'report_submitted', '{"sourceChannel":"web","routingState":"verified","authorityId":"auth-bristol-city","groupId":"roads-transport","categoryId":"obstruction"}', '2026-03-31 17:22:00'),
  ('seed-event-obstruction-route', 'seed-report-obstruction-bristol', 'seed-user-omar', 'authority_route_resolved', '{"routingState":"verified","authorityName":"Bristol City Council","destinationEmail":"highways@bristol.gov.uk","departmentRoute":{"department":"Street Assets","queue":"access-obstructions"}}', '2026-03-31 17:22:20'),
  ('seed-event-obstruction-status', 'seed-report-obstruction-bristol', 'seed-user-arden', 'report_status_updated', '{"fromStatus":"submitted","toStatus":"in_progress","note":"Site crew scheduled for this morning."}', '2026-04-01 10:05:00'),
  ('seed-event-flytipping-submitted', 'seed-report-flytipping-westminster', 'seed-user-priya', 'report_submitted', '{"sourceChannel":"web","routingState":"verified","authorityId":"auth-westminster","groupId":"environment-waste","categoryId":"fly-tipping"}', '2026-03-30 08:00:00'),
  ('seed-event-flytipping-route', 'seed-report-flytipping-westminster', 'seed-user-priya', 'authority_route_resolved', '{"routingState":"verified","authorityName":"Westminster City Council","destinationEmail":"streetcare@westminster.gov.uk","departmentRoute":{"department":"Waste Operations","queue":"street-cleansing"}}', '2026-03-30 08:00:10'),
  ('seed-event-flytipping-status', 'seed-report-flytipping-westminster', 'seed-user-alex', 'report_status_updated', '{"fromStatus":"submitted","toStatus":"dispatched","note":"Forwarded to waste operations and contractor queue."}', '2026-03-30 08:45:00'),
  ('seed-event-lighting-submitted', 'seed-report-lighting-manchester', 'seed-user-priya', 'report_submitted', '{"sourceChannel":"web","routingState":"verified","authorityId":"auth-manchester","groupId":"public-safety","categoryId":"lighting"}', '2026-03-28 20:14:00'),
  ('seed-event-lighting-route', 'seed-report-lighting-manchester', 'seed-user-priya', 'authority_route_resolved', '{"routingState":"verified","authorityName":"Manchester City Council","destinationEmail":"environment@manchester.gov.uk","departmentRoute":{"department":"Street Lighting","queue":"night-safety"}}', '2026-03-28 20:14:10'),
  ('seed-event-lighting-progress', 'seed-report-lighting-manchester', 'seed-user-hannah', 'report_status_updated', '{"fromStatus":"submitted","toStatus":"in_progress","note":"Electrical contractor assigned."}', '2026-03-29 09:20:00'),
  ('seed-event-lighting-resolved', 'seed-report-lighting-manchester', 'seed-user-hannah', 'report_status_updated', '{"fromStatus":"in_progress","toStatus":"resolved","note":"Lighting column reset and lamp replaced."}', '2026-04-01 09:15:00'),
  ('seed-event-lighting-story', 'seed-report-lighting-manchester', 'seed-user-hannah', 'resolution_story_published', '{"resolutionStoryId":"seed-resolution-lighting","summary":"Street lighting restored for the main walking route.","mediaCount":1}', '2026-04-01 09:20:00'),
  ('seed-event-duplicate-submitted', 'seed-report-duplicate-bristol', 'seed-user-priya', 'report_submitted', '{"sourceChannel":"web","routingState":"verified","authorityId":"auth-bristol-city","groupId":"roads-transport","categoryId":"pothole","duplicateCandidateId":"seed-report-pothole-bristol"}', '2026-04-01 12:36:00'),
  ('seed-event-bins-submitted', 'seed-report-bins-bristol', 'seed-user-maya', 'report_submitted', '{"sourceChannel":"mobile-web","routingState":"verified","authorityId":"auth-bristol-city","groupId":"environment-waste","categoryId":"overflowing-bin"}', '2026-04-02 07:27:00'),
  ('seed-event-unknown-submitted', 'seed-report-unknown-cambridge', 'seed-user-omar', 'report_submitted', '{"sourceChannel":"web","routingState":"unknown","authorityId":null,"groupId":"public-safety","categoryId":"private-boundary"}', '2026-04-02 09:42:00');

INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json, created_at)
SELECT
  'seed-event-steven-submitted',
  'seed-report-steven-crossing',
  user_id,
  'report_submitted',
  '{"sourceChannel":"web","routingState":"verified","authorityId":"auth-bristol-city","groupId":"roads-transport","categoryId":"crossing-markings","destinationEmail":"highways@bristol.gov.uk"}',
  '2026-04-02 11:08:00'
FROM users
WHERE email = 'steven@thamescollective.co.uk';

INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json, created_at)
SELECT
  'seed-event-steven-route',
  'seed-report-steven-crossing',
  user_id,
  'authority_route_resolved',
  '{"routingState":"verified","authorityName":"Bristol City Council","destinationEmail":"highways@bristol.gov.uk","departmentRoute":{"department":"Road Safety","queue":"crossings"}}',
  '2026-04-02 11:08:10'
FROM users
WHERE email = 'steven@thamescollective.co.uk';

INSERT INTO authority_dispatches (
  dispatch_id,
  report_id,
  authority_id,
  destination,
  channel,
  status,
  sent_at,
  created_at,
  updated_at
)
VALUES
  ('seed-dispatch-pothole', 'seed-report-pothole-bristol', 'auth-bristol-city', 'highways@bristol.gov.uk', 'email', 'queued', NULL, '2026-04-01 08:14:12', '2026-04-01 08:14:12'),
  ('seed-dispatch-obstruction', 'seed-report-obstruction-bristol', 'auth-bristol-city', 'highways@bristol.gov.uk', 'email', 'sent', '2026-03-31 17:23:00', '2026-03-31 17:22:30', '2026-03-31 17:23:00'),
  ('seed-dispatch-flytipping', 'seed-report-flytipping-westminster', 'auth-westminster', 'streetcare@westminster.gov.uk', 'email', 'sent', '2026-03-30 08:02:00', '2026-03-30 08:00:20', '2026-03-30 08:02:00'),
  ('seed-dispatch-lighting', 'seed-report-lighting-manchester', 'auth-manchester', 'environment@manchester.gov.uk', 'email', 'sent', '2026-03-28 20:15:00', '2026-03-28 20:14:20', '2026-03-28 20:15:00'),
  ('seed-dispatch-bins', 'seed-report-bins-bristol', 'auth-bristol-city', 'highways@bristol.gov.uk', 'email', 'queued', NULL, '2026-04-02 07:27:10', '2026-04-02 07:27:10');

INSERT INTO authority_dispatches (
  dispatch_id,
  report_id,
  authority_id,
  destination,
  channel,
  status,
  sent_at,
  created_at,
  updated_at
)
VALUES
  ('seed-dispatch-steven', 'seed-report-steven-crossing', 'auth-bristol-city', 'highways@bristol.gov.uk', 'email', 'queued', NULL, '2026-04-02 11:08:12', '2026-04-02 11:08:12');

INSERT INTO moderation_actions (moderation_action_id, report_id, actor_user_id, actor_role, action_type, notes, created_at)
VALUES
  ('seed-moderation-obstruction', 'seed-report-obstruction-bristol', 'seed-user-arden', 'warden', 'status_update', 'Crew notified and work order opened.', '2026-04-01 10:05:00'),
  ('seed-moderation-flytipping', 'seed-report-flytipping-westminster', 'seed-user-alex', 'admin', 'status_update', 'Waste operations queue confirmed.', '2026-03-30 08:45:00'),
  ('seed-moderation-lighting-progress', 'seed-report-lighting-manchester', 'seed-user-hannah', 'moderator', 'status_update', 'Electrical contractor assigned.', '2026-03-29 09:20:00'),
  ('seed-moderation-lighting-resolved', 'seed-report-lighting-manchester', 'seed-user-hannah', 'moderator', 'status_update', 'Lighting restored and route checked.', '2026-04-01 09:15:00');

INSERT INTO report_confirmations (report_confirmation_id, report_id, user_id, confirmer_name, created_at)
VALUES
  ('seed-confirm-pothole-1', 'seed-report-pothole-bristol', 'seed-user-omar', 'Omar Khan', '2026-04-01 09:20:00'),
  ('seed-confirm-pothole-2', 'seed-report-pothole-bristol', 'seed-user-priya', 'Priya Nair', '2026-04-01 10:10:00'),
  ('seed-confirm-flytipping-1', 'seed-report-flytipping-westminster', 'seed-user-maya', 'Maya Thompson', '2026-03-30 09:00:00'),
  ('seed-confirm-bins-1', 'seed-report-bins-bristol', 'seed-user-priya', 'Priya Nair', '2026-04-02 08:20:00');

INSERT INTO support_contributions (
  support_contribution_id,
  user_id,
  provider,
  provider_reference,
  amount_minor,
  currency,
  contribution_type,
  status,
  created_at,
  updated_at
)
VALUES
  ('seed-support-priya-active', 'seed-user-priya', 'stripe', 'seed-demo-routing-tier', 500, 'GBP', 'recurring', 'active', '2026-03-26 12:00:00', '2026-04-01 12:00:00'),
  ('seed-support-maya-patron', 'seed-user-maya', 'stripe', 'seed-demo-patron-tier', 2000, 'GBP', 'one_time', 'succeeded', '2026-03-29 14:30:00', '2026-03-29 14:30:00');

INSERT INTO resolution_stories (
  resolution_story_id,
  report_id,
  actor_user_id,
  summary,
  notes,
  status,
  created_at,
  updated_at
)
VALUES
  (
    'seed-resolution-lighting',
    'seed-report-lighting-manchester',
    'seed-user-hannah',
    'Street lighting restored for the main walking route.',
    'The contractor replaced the failed lamp and reset the cabinet. Visibility around the crossing and tram approach is back to normal.',
    'published',
    '2026-04-01 09:20:00',
    '2026-04-01 09:20:00'
  );

INSERT INTO resolution_story_media (
  resolution_story_media_id,
  resolution_story_id,
  storage_key,
  public_url,
  mime_type,
  created_at
)
VALUES
  ('seed-resolution-media-lighting', 'seed-resolution-lighting', 'seed/demo/resolution-lighting.png', '/brand/app-icon.png', 'image/png', '2026-04-01 09:20:10');

INSERT INTO routing_suggestions (
  routing_suggestion_id,
  report_id,
  authority_id,
  latitude,
  longitude,
  routing_state,
  group_id,
  category_id,
  suggested_department,
  suggested_contact_email,
  notes,
  submitter_email,
  created_at
)
VALUES
  (
    'seed-routing-cambridge',
    'seed-report-unknown-cambridge',
    NULL,
    52.208600,
    0.137200,
    'unknown',
    'public-safety',
    'private-boundary',
    'Retail estate management',
    'facilities@retail-estate.example',
    'Likely private land issue rather than council ownership.',
    'omar@demo.seeitsayit.app',
    '2026-04-02 10:05:00'
  );
