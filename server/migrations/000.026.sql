ALTER TABLE group_members ADD COLUMN member_key text;
ALTER TABLE group_members ADD UNIQUE(member_key);
UPDATE group_members set member_key = (select substr(md5(random()::text), 0, 32) where group_members.id = group_members.id);
