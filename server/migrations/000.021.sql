CREATE TABLE validations (
	id uuid primary key default uuid_generate_v4(),
	email text,
	phone text,
	code text not null,
	user_id uuid references users(id) not null,
	created timestamp with time zone not null default now(),
	used timestamp with time zone
);
