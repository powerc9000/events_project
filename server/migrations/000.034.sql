CREATE TABLE user_roles (
	key text PRIMARY KEY not null,
	name text not null,
	description text not null
);

INSERT INTO user_roles (key, name, description) values ('user', 'User', 'Default role');
INSERT INTO user_roles (key, name, description) values ('admin', 'Admin', 'Admin role');

ALTER TABLE users ADD column role text references user_roles(key) default 'user';
