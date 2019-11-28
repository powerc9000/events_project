CREATE TABLE digest_types (
	key text primary key not null,
	name text not null,
	description text
);

CREATE TABLE digests (
	id uuid primary key default uuid_generate_v4() not null,
	user_id uuid references users(id) on delete cascade,
	last_sent timestamp with time zone,
	send_time time with time zone not null,
	digest_type text references digest_types(key) not null,
	unique(user_id, digest_type)
);


INSERT into digest_types (key, name, description) values ('upcoming_events', 'Upcoming events digest', 'Digest for upcoming events');
