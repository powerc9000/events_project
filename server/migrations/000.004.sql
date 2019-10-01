ALTER TABLE events ADD column is_private boolean default true;
ALTER TABLE events ADD column show_participants boolean default false;
ALTER TABLE events ADD COLUMN allow_comments boolean default true;
ALTER TABLE events ADD COLUMN date timestamp with time zone;
ALTER TABLE events ADD COLUMN location text;



CREATE TABLE invites (
	id uuid not null default uuid_generate_v4() PRIMARY KEY,
	user_id uuid references users(id) not null,
	event_id uuid references events(id) not null,
	invite_key text not null,
	status text not null,
	show_name boolean default false,
	created timestamp with time zone default now(),
	updated timestamp with time zone default now()

);
