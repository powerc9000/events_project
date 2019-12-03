ALTER TABLE users add column ics_key uuid default uuid_generate_v4() not null;
