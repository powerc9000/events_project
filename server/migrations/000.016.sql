CREATE TABLE comments (
	id uuid primary key default uuid_generate_v4(),
	user_id uuid references users(id) not null,
	entity_id uuid not null,
	parent_comment uuid references comments(id),
	body text not null,
	created timestamp with time zone default now(),
	flagged boolean default false
);
