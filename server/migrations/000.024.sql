ALTER TABLE events ADD COLUMN secret_key uuid default uuid_generate_v4();
ALTER TABLE events ADD UNIQUE(secret_key);
