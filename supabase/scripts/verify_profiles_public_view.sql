select count(*) as view_exists
  from information_schema.views where table_name = 'profiles_public';
