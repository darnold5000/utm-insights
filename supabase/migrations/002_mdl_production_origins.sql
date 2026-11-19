-- MeetDayLive production hosts (meetscores.app)
update public.sw_projects
set allowed_origins = array[
  'https://meetdaylive.com',
  'https://www.meetdaylive.com',
  'https://meetscores.app',
  'https://www.meetscores.app',
  'http://localhost:3000'
],
    website_domain = 'meetscores.app'
where public_key = 'pk_mdl_dev_seed_001';