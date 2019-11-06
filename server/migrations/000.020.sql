alter table users alter column settings drop default;
ALTER table users alter column settings TYPE jsonb using (hstore_to_jsonb(settings))::jsonb;
alter table users alter column settings set default '{}';
