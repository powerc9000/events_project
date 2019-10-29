CREATE TABLE shortlinks (
	id uuid primary key default uuid_generate_v4() not null,
	key text unique not null,
	link text not null,
	created timestamp with time zone default now() not null
);
