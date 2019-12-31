ALTER TABLE invites ADD COLUMN invited_by uuid;

update invites set invited_by = events.creator from events 
where events.id = invites.event_id;
