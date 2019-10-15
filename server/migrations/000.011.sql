CREATE TABLE groups (
	id uuid primary key default uuid_generate_v4() not null,
	name text not null,
	custom_path text,
	description text,
	allow_inviting boolean default false,
	is_private boolean default true,
	created timestamp with time zone default now() not null,
	creator uuid references users(id) not null
);

CREATE TABLE group_members(
	id uuid primary key default uuid_generate_v4() not null,
	user_id uuid references users(id),
	group_id uuid references groups(id),
	role text default 'member'
);

ALTER TABLE events add column group_id uuid references groups(id);
