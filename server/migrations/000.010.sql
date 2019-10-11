CREATE TABLE login_codes (
	id uuid default uuid_generate_v4(),
	code text not null,
	user_id uuid references users(id) not null,
	created timestamp with time zone default now(),
	used timestamp with time zone
);
