CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
	id uuid not null default uuid_generate_v4() PRIMARY KEY,
	provider jsonb default '{}'::jsonb,
	name text not null
);

CREATE TABLE events (
	id uuid not null default uuid_generate_v4() PRIMARY KEY,
	name text not null,
	description text,
	creator uuid references users(id)
);

