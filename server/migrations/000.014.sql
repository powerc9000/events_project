CREATE TYPE group_role as ENUM ('member', 'moderator', 'admin', 'owner');

ALTER TABLE group_members ALTER COLUMN role set default 'member'::group_role;
ALTER TABLE group_members ALTER COLUMN role type group_role USING role::group_role;
