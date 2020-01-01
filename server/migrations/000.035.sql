CREATE TABLE event_flags (
	id uuid PRIMARY KEY default uuid_generate_v4() not null,
	event_id uuid  not null references events(id) ON DELETE CASCADE,
	resolved boolean default false,
	flag_message text,
	created timestamp with time zone default now()
);
