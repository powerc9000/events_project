ALTER TABLE events RENAME COLUMN email_message_id TO email_hash_id;
UPDATE EVENTS set email_hash_id = null;
ALTER TABLE events ALTER COLUMN email_hash_id type uuid using(email_hash_id::uuid);
ALTER TABLE events ALTER COLUMN email_hash_id set default uuid_generate_v4();
UPDATE EVENTS set email_hash_id = default;
ALTER TABLE events ADD UNIQUE(email_hash_id);
