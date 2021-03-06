let server;
let db;
const _ = require("lodash");
const slugify = require("slugify");
const crypto = require("crypto");
const sql = require("slonik").sql;
const PhoneNumber = require("awesome-phonenumber");
const { normalizePhone } = require("../utils");

async function canUserViewEvent(userId, eventId, event_key) {
  const event = await server.app.db.maybeOne(
    sql`select id, is_private, creator, group_id from events where id=${eventId}`
  );

  if (!event) {
    return false;
  }

  if (!event.is_private) {
    return true;
  }

  if (event_key) {
    return server.app.db.maybeOne(
      sql`select * from events where secret_key=${event_key}`
    );
  }

  if (!userId) {
    return false;
  }

  if (event.creator === userId) {
    return true;
  }

  const invited = await server.app.db.maybeOne(
    sql`select * from invites where user_id=${userId} and event_id=${eventId}`
  );
  if (invited) {
    return true;
  }
  const inGroup = await server.app.db.maybeOne(
    sql`select * from events e 
		inner join group_members gm on gm.group_id = e.group_id
		where gm.user_id=${userId} and gm.group_id=${event.group_id} and e.id=${event.id}`
  );

  if (inGroup) {
    return true;
  }

  return false;
}
async function getEventBySlug(slug) {
  const data = await server.app.db.query(
    sql`SELECT * from events where slug = ${slug}`
  );

  return formatEvent(data.rows[0]);
}

async function getEventById(id) {
  const event = await server.app.db.maybeOne(
    sql`select * from events where id=${id}`
  );
  return formatEvent(event);
}

async function formatEvent(event) {
  if (!event) {
    return null;
  }
  const userService = server.getService("user");
  event.creator = await userService.findById(event.creator);
  event.invites = await getEventInvites(event.id);
  return event;
}

async function getEventInvites(id) {
  const attendees = await server.app.db.query(
    sql`SELECT *, row_to_json((select d from (select * from users where id = i.user_id) d)) as user from invites i where event_id = ${id}`
  );

  return attendees.rows;
}
const cache = {};
async function findEvents(constraints) {
  const where = [sql`is_private = false`];
  if (constraints) {
    if (constraints.user) {
      where.pop();
      where.push(
        sql`(${sql.join(
          [
            sql`creator = ${constraints.user}`,
            sql`id in (select event_id from invites where user_id = ${constraints.user})`,
            sql`${constraints.user} in (select gm.user_id from group_members gm where gm.group_id = e.group_id)`
          ],
          sql` OR `
        )})`
      );
    }
    if (constraints.group) {
      where.push(
        sql`(e.group_id = ${
          constraints.group
        } AND (EXISTS (select * from groups where is_private = FALSE and id=${
          constraints.group
        } OR ${constraints.user ||
          ""} IN (select user_id from group_members where group_id = ${
          constraints.group
        }))))`
      );
    }
    if (constraints.creator && constraints.user) {
      where.push(sql`e.creator = ${constraints.user}`);
    }
    if (constraints.maxAge) {
      where.push(sql`date > now() - ${constraints.maxAge}::interval`);
    }
    if (constraints.maxUntil) {
      where.push(
        sql`(date < now() + ${constraints.maxUntil}::interval or (end_date is not null and end_date < now() + ${constraints.maxUntil}::interval))`
      );
    }

    if (constraints.future) {
      where.push(sql`date > now()`);
    }
  }

  console.log(where);
  const query = sql`SELECT *,
		coalesce((
			select jsonb_agg(r) from (
				select *, (
					select row_to_json(u) from (
						select * from users where id = user_id
					) u
				) "user" from invites where event_id = e.id
			) r
		), '[]'::jsonb ) invites,
		(
			select row_to_json(og) from (
				select * from users where id=e.creator
			) og
		) creator
		from events e where ${sql.join(where, sql` AND `)}  order by date`;

  const events = await server.app.db.query(query);

  const upcoming = [];
  const past = [];

  events.rows.forEach((event) => {
    const date = new Date(event.date);
    const end_date = new Date(event.end_date);
    if (date >= Date.now() || (event.end_date && end_date >= Date.now())) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  });

  return { upcoming, past, events: events.rows };
}

async function getGroupEventsForUser(groupId, userId) {
  const group = await server.app.db.maybeOne(
    sql`Select * from groups where id=${groupId}`
  );

  if (!group) {
    return [];
  }

  const inGroup = await server.app.db.maybeOne(
    sql`select * from group_members where group_id=${groupId} and user_id=${userId}`
  );
  if (inGroup) {
    return server.app.db.any(
      sql`select * from events where group_id = ${groupId} and date >= now() or (end_date >= now() and date <= now())`
    );
  } else {
    if (!group.is_private) {
      return server.app.db.any(
        sql`select * from events where group_id=${groupId} and is_private=FALSE and date > now()`
      );
    } else {
      return [];
    }
  }
}

async function canInviteToEvent(eventId, user) {
  const event = await server.app.db.maybeOne(
    sql`SELECT * from events where id=${eventId}`
  );
  if (!event) {
    return false;
  }

  if (event.creator === user) {
    return true;
  } else if (event.can_invite) {
    return true;
  } else {
    return false;
  }
}

async function inviteUsersToEvent(eventId, users, invited_by) {
  try {
    const eventQuery = await server.app.db.query(
      sql`SELECT e.*, row_to_json((select d from (select * from users where id = e.creator) d)) as creator from events e where id = ${eventId}`
    );
    if (!eventQuery.rows) {
      return null;
    }
    for (const inviteData of users) {
      const phone = inviteData.phone ? normalizePhone(inviteData.phone) : null;
      const email = inviteData.email || null;
      const user_id = inviteData.user_id || null;
      let user = await server.app.db.maybeOne(
        sql`select * from users where email=${email} or phone=${phone} or id = ${user_id}`
      );

      if (!user) {
        user = await server.app.db.maybeOne(
          sql`insert into users (name, email, phone) VALUES (${inviteData.name ||
            ""}, ${email}, ${phone}) returning *`
        );
      }
      const key = crypto.randomBytes(16).toString("hex");

      const invite = await server.app.db.maybeOne(
        sql`INSERT INTO invites (user_id, event_id, invite_key, status, message, invited_by) VALUES (${
          user.id
        }, ${eventId}, ${key}, 'invited', ${inviteData.message ||
          ""}, ${invited_by}) ON CONFLICT DO NOTHING returning *`
      );
      if (!invite) {
        //likely invited before
        continue;
      }
      server.createTask("invite-user-to-event", {
        event: eventQuery.rows[0],
        invite,
        link: `https://junipercity.com/events/${eventQuery.rows[0].slug}?invite_key=${invite.invite_key}`,
        user
      });
    }
  } catch (e) {
    console.log(e);
  }
}

async function resendInvite(inviteId) {
  const invite = await server.app.db.maybeOne(
    sql`select * from invites where id=${inviteId}`
  );
  if (!invite) {
    return;
  }

  const event = await server.app.db.maybeOne(
    sql`select * from events where id=${invite.event_id}`
  );

  const user = await server.app.db.maybeOne(
    sql`select * from users where id = ${invite.user_id}`
  );
  server.createTask("invite-user-to-event", {
    event,
    invite,
    link: `https://junipercity.com/events/${event.slug}?invite_key=${invite.invite_key}`,
    user
  });
}

async function createEvent(user, event) {
  const user_id = user.id;
  const id = crypto.randomBytes(4).toString("hex");
  const slug = `${slugify(event.name, { lower: true })}-${id}`;

  const validFields = [
    "name",
    "description",
    "location",
    {
      name: "date",
      format: (date) => {
        return sql`to_timestamp(${new Date(date).getTime() / 1000})`;
      }
    },
    {
      name: "end_date",
      format: (date) => {
        console.log(new Date(date).getTime());
        return sql`to_timestamp(${new Date(date).getTime() / 1000})`;
      }
    },
    "tz",
    "is_private",
    "allow_comments",
    "show_participants",
    "group_id",
    "source",
    "email_message_id"
  ];
  const fields = [sql.identifier(["slug"]), sql.identifier(["creator"])];
  const values = [slug, user_id];
  validFields.forEach((field) => {
    const key = field.name || field;
    if (_.has(event, key)) {
      const format = field.format || ((val) => val);
      fields.push(sql.identifier([key]));
      values.push(format(event[key]));
    }
  });

  const result = await server.app.db.query(
    sql`
	INSERT into events (${sql.join(fields, sql`, `)}) VALUES (${sql.join(
      values,
      `, `
    )}) returning *
	`
  );
  server.createTask("event-created", {
    event: result.rows[0]
  });

  return result.rows[0];
}

async function canCreateForGroup(user, group) {
  if (!group) {
    return true;
  }
  if (!user) {
    return false;
  }
  const data = await server.app.db.maybeOne(
    sql`SELECT * from group_members where group_id=${group} and user_id=${user} and role >= 'moderator'`
  );

  if (!data) {
    return false;
  }

  return true;
}

async function canRSVPToEvent(eventId, userId, event_key) {
  const event = await server.app.db.maybeOne(
    sql`SELECT * from events where id = ${eventId}`
  );

  const invites = await server.app.db.any(
    sql`SELECT * from invites where event_id=${eventId}`
  );
  if (event_key && event.secret_key === event_key) {
    return true;
  }

  if (!event) {
    return false;
  }

  const inGroup = await server
    .getService("groups")
    .isUserInGroup(userId, event.group_id);

  const isOwner = event.creator === userId;

  const isInvited = invites.find((invite) => {
    return invite.user_id === userId;
  });

  const isPublic = !event.is_private;

  return (isOwner || isInvited || isPublic || inGroup) && userId;
}

async function updateInviteRSVP(inviteId, status) {
  const invite = await server.app.db.maybeOne(
    sql`update invites set status=${status} where id=${inviteId} returning *`
  );

  if (!invite) {
    return;
  }

  (async () => {
    const event = await getEventById(invite.event_id);
    console.log(invite, event);
    server.createTask("user-did-rsvp", {
      event,
      creator: event.creator,
      user: await server.getService("user").findById(invite.user_id),
      invite
    });
  })();
}

async function rsvpToEvent({
  eventId,
  userId,
  status,
  response,
  show_name,
  event_key = null,
  source = "web",
  quiet = false
}) {
  const event = await server.app.db.maybeOne(
    sql`select * from events where id=${eventId}`
  );

  if (!event) {
    return;
  }
  const invite = await server.app.db.maybeOne(
    sql`select * from invites where user_id = ${userId} and event_id=${eventId}`
  );
  const notCreator = event.creator !== userId;
  const wrongKey = event_key !== event.secret_key;
  const notInGroup = !(await server
    .getService("groups")
    .isUserInGroup(userId, event.group_id));

  if (!invite && event.is_private && notCreator && wrongKey && notInGroup) {
    return;
  }
  //Create or update an invite
  let res;
  if (!invite) {
    const doShowName = !!show_name;
    const key = crypto.randomBytes(16).toString("hex");
    const query = sql`INSERT INTO invites (user_id, event_id, invite_key, status, show_name, response_source, response) values (${userId}, ${eventId}, ${key}, ${status}, ${doShowName}, ${source}, ${response ||
      ""}) returning *`;
    res = await server.app.db.maybeOne(query);
  } else {
    const validFields = {
      status: status,
      show_name: show_name,
      response_source: source,
      response: response
    };
    const sets = [];
    Object.entries(validFields).forEach(([field, value]) => {
      if (!_.isUndefined(value)) {
        sets.push(sql`${sql.identifier([field])}=${value}`);
      }
    });
    res = await server.app.db.maybeOne(
      sql`UPDATE invites set ${sql.join(sets, sql`, `)} where id=${
        invite.id
      } returning *`
    );
  }
  if (!quiet) {
    server.createTask("user-did-rsvp", {
      event,
      creator: await server.getService("user").findById(event.creator),
      user: await server.getService("user").findById(userId),
      invite: res
    });
  }
}

async function canUserEditEvent(user, event) {
  //Right now only the creator
  if (!user) {
    return false;
  }
  const between = await server.app.db.maybeOne(
    sql`select * from events where (date >= to_timestamp(${~~(
      Date.now() / 1000
    )}) or end_date >= to_timestamp(${~~(Date.now() / 1000)})) and id=${event}`
  );

  if (!between) {
    return false;
  }
  const creator = await server.app.db.maybeOne(
    sql`select * from events where creator = ${user} and id=${event}`
  );

  if (creator) {
    return true;
  }

  const adminUp = await server.app.db.maybeOne(
    sql`select * from events e
		inner join group_members gm on gm.group_id = e.group_id
		where gm.user_id=${user} and e.id=${event} and gm.role > 'moderator'`
  );

  return adminUp;
}

async function editEvent(eventId, payload) {
  const sets = [];
  const allowedFields = [
    "name",
    "can_invite",
    "is_private",
    "description",
    "tz",
    {
      name: "date",
      format: (date) => {
        return sql`to_timestamp(${new Date(date).getTime() / 1000})`;
      }
    },
    {
      name: "end_date",
      format: (date) => {
        return sql`to_timestamp(${new Date(date).getTime() / 1000})`;
      }
    },
    "location",
    "group_id",
    "allow_comments",
    "show_participants"
  ];

  allowedFields.forEach((field) => {
    const key = field.name || field;
    if (_.has(payload, key)) {
      const format = field.format || ((val) => val);
      sets.push(sql`${sql.identifier([key])}=${format(payload[key])}`);
    }
  });
  const old = await server.app.db.maybeOne(
    sql`select * from events where id=${eventId}`
  );
  if (!old) {
    return null;
  }
  const changes = await server.app.db.maybeOne(
    sql`Update events set ${sql.join(
      sets,
      sql` , `
    )} where id=${eventId} returning *`
  );

  if (_.has(payload, "location") && payload.location !== old.location) {
    server.createTask("event-location-changed", {
      event: changes
    });
  }
  if (
    _.has(payload, "date") &&
    new Date(payload.date).getTime() !== new Date(old.date).getTime()
  ) {
    server.createTask("event-date-changed", {
      event: changes
    });
  }

  return changes;
}

async function getInvite(inviteId) {
  return server.app.db.maybeOne(
    sql`Select * from invites where id=${inviteId}`
  );
}

async function getComments(eventId) {
  return server.app.db.any(
    sql`SELECT *, 
		row_to_json((select d from (select * from users where id = c.user_id) d)) as user 
		from comments c 
		where entity_id=${eventId} order by created desc`
  );
}

async function createComment(userId, eventId, parentId, body) {
  const parent = parentId || null;
  return server.app.db.maybeOne(
    sql`INSERT INTO comments 
		(user_id, entity_id, parent_comment, body) 
		VALUES (${userId}, ${eventId}, ${parent}, ${body}) 
		returning *`
  );
}

async function canUserDeleteEvent(userId, eventId) {
  if (!userId) {
    return false;
  }
  const creator = await server.app.db.maybeOne(
    sql`select * from events where creator = ${userId} and id=${eventId}`
  );

  if (!creator) {
    const group = await server.app.db.maybeOne(
      sql`select * from events 
			inner join group_members g on g.group_id = events.group_id
			where events.id=${eventId} and g.user_id= ${userId} and g.role > 'moderator'`
    );

    if (group) {
      return true;
    } else {
      return false;
    }
  } else {
    return true;
  }
}

async function deleteEvent(eventId) {
  //Delete invites
  await server.app.db.query(sql`delete from invites where event_id=${eventId}`);
  //Delete the comments
  await server.app.db.query(
    sql`delete from comments where entity_id=${eventId}`
  );
  //Delete the event
  await server.app.db.query(sql`delete from events where id=${eventId}`);
}

async function getEventsCommentDigest() {
  return server.app.db.any(
    sql`
		with updated_comments as (
		update comments set notified = TRUE where notified is FALSE returning *
		)
		select u.*, (
			select json_agg(e) from (
				select events.*, (
					select json_agg(c) from (
						select comments.*, (
							select row_to_json(commentor) from (
								select * from users where users.id = comments.user_id
							) commentor
						) creator
						from comments where entity_id = events.id and notified = FALSE
					) c
				) as comments
				from events
				inner join updated_comments on updated_comments.entity_id = events.id
				inner join invites ii on ii.event_id = events.id
				where ii.user_id = u.id or events.creator = u.id
				group by events.id
			) e
		) as events
		from users u where exists (
			select * from updated_comments uc
			inner join events on events.id = uc.entity_id
			inner join invites r on uc.entity_id = r.event_id
			where 
			(events.creator = u.id or r.user_id = u.id) and uc.user_id != u.id
		)
		`
  );
}

function getEventByEmailHash(hash) {
  return server.app.db.maybeOne(
    sql`select * from events where email_hash_id = ${hash}`
  );
}

async function getUpcomingEventsDigest() {
  const users = await server.app.db.any(sql`
	with ready_digests as (
	update digests set last_sent = now() where coalesce(last_sent, to_timestamp(0)) < now() - interval '1 day' and digest_type = 'upcoming_events' returning *
	),
	no_digests as (
		insert into digests (last_sent, user_id, send_time, digest_type) select now(), id, now(),	'upcoming_events' from users where not exists (select * from digests where digests.user_id = users.id) returning *
	)
	select * from (
	select u.*, (
		select json_agg(e) from (
			select distinct on(ev.id) ev.*, row_to_json(i) as invite from events ev 
			left join invites i on i.event_id = ev.id
			where (i.user_id = u.id or ev.creator = u.id or u.id in (select user_id from group_members gm where gm.group_id = ev.group_id)) and ev.date >= now() and ev.date - now() <= interval '1 day'
		) e
	) as events
	from users u where u.id in (select ready_digests.user_id from ready_digests) or u.id in (select no_digests.user_id from no_digests)) f  where f.events is not null
	`);

  return users;
}

async function canUserDeleteComment(eventId, commentId, userId) {
  const comment = await server.app.db.maybeOne(
    sql`SELECT * FROM comments where id=${commentId}`
  );

  if (!comment) {
    return false;
  }

  const event = await server.app.db.maybeOne(
    sql`select * from events where id=${eventId}`
  );

  if (comment.user_id === userId) {
    return true;
  }

  if (comment.entity_id === eventId && event.creator === userId) {
    return true;
  }

  const isMod = await server.app.db.maybeOne(
    sql`select * from group_members where role >= 'moderator' and group_id=${event.group_id} and user_id=${userId}`
  );

  if (isMod) {
    return true;
  }
}

async function deleteComment(eventId, commentId) {
  await server.app.db.query(
    sql`delete from comments where entity_id=${eventId} and id=${commentId}`
  );
}

function init(hapiServer) {
  server = hapiServer;
  //set up database
  //
}

module.exports = {
  name: "events",
  canUserDeleteComment,
  deleteComment,
  inviteUsersToEvent,
  updateInviteRSVP,
  canInviteToEvent,
  canRSVPToEvent,
  rsvpToEvent,
  canUserEditEvent,
  editEvent,
  createEvent,
  getEventBySlug,
  findEvents,
  canUserViewEvent,
  canCreateForGroup,
  init,
  getEventById,
  getInvite,
  getGroupEventsForUser,
  resendInvite,
  getComments,
  createComment,
  getEventsCommentDigest,
  canUserDeleteEvent,
  deleteEvent,
  getEventByEmailHash,
  getUpcomingEventsDigest
};
