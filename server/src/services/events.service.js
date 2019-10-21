let server;
const slugify = require("slugify");
const crypto = require("crypto");
const sql = require("slonik").sql;
const PhoneNumber = require("awesome-phonenumber");
const { normalizePhone } = require("../utils");

async function canUserViewEvent(userId, eventId) {
  const event = await server.app.db.maybeOne(
    sql`select id, is_private, creator from events where id=${eventId}`
  );

  if (!event) {
    return false;
  }

  if (!event.is_private) {
    return true;
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
    sql`select * from events e inner join groups g on g.id = e.group_id inner join group_members gm on gm.group_id = g.id where gm.user_id=${userId}`
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
  const userService = server.getService("user");

  if (!data.rows.length) {
    return null;
  }
  const event = data.rows[0];
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
            sql`is_private = false`,
            sql`${constraints.user} in (select gm.user_id from group_members gm where gm.group_id = e.group_id)`
          ],
          sql` OR `
        )})`
      );
    } else {
      where.push(sql`is_private = false`);
    }

    if (constraints.future) {
      where.push(sql`date > now()`);
    }
  }
  const query = sql`SELECT * from events e where ${sql.join(
    where,
    sql` AND `
  )}  order by date`;

  const events = await server.app.db.query(query);

  return events.rows;
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
      sql`select * from events where group_id = ${groupId}`
    );
  } else {
    if (!group.is_private) {
      return server.app.db.any(
        sql`select * from events where group_id=${groupId} and is_private=FALSE`
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

async function inviteUsersToEvent(eventId, users) {
  const eventQuery = await server.app.db.query(
    sql`SELECT e.*, row_to_json((select d from (select * from users where id = e.creator) d)) as creator from events e where id = ${eventId}`
  );
  if (!eventQuery.rows) {
    return null;
  }

  const userQuery = sql`SELECT * from users where email = ANY (${sql.array(
    users
      .map((user) => {
        return user.email;
      })
      .filter((value) => !!value),
    "text"
  )}) or phone = ANY (${sql.array(
    users
      .map((user) => {
        if (user.phone) {
          return normalizePhone(user.phone);
        }
      })
      .filter((value) => !!value),
    "text"
  )})`;

  const existing = await server.app.db.query(userQuery);

  //If we don't have a user entry for someone we need to create it...
  const notFound = users.filter((user) => {
    const found = existing.rows.find((queryUser) => {
      const phone = normalizePhone(queryUser.phone);
      const userPhone = normalizePhone(user.phone);
      return phone === userPhone || queryUser.email === user.email;
    });

    return !found;
  });

  let newUsers = [];
  if (notFound.length) {
    const queried = notFound.map((user) => {
      let phone = null;
      if (user.phone) {
        async function getAllEventsForUser(user) {
          const data = await server.app.db.query(`
	SELECT * from events 
	`);

          return data.rows;
        }

        phone = normalizePhone(user.phone);
      }
      return [user.name || "", user.email, phone];
    });

    const otherUsers = await server.app.db.query(
      sql`INSERT INTO users (name, email, phone) select * from ${sql.unnest(
        queried,
        ["text", "text", "text"]
      )} returning *`
    );
    newUsers = otherUsers.rows;
  }

  const allUsers = [...existing.rows, ...newUsers];
  const allUsersFragment = allUsers.map((user) => {
    const key = crypto.randomBytes(16).toString("hex");
    const result = [user.id, eventId, key, "invited"];
    return result;
  });
  const inviteesQuery = sql`INSERT INTO invites (user_id, event_id, invite_key, status) select * from ${sql.unnest(
    allUsersFragment,
    ["uuid", "uuid", "text", "text"]
  )} ON CONFLICT DO NOTHING returning *`;

  const invitees = await server.app.db.query(inviteesQuery);

  allUsers.forEach((user) => {
    const invite = invitees.rows.find((invite) => {
      return invite.user_id === user.id;
    });
    if (!invite) {
      //They were likely invited before
      console.log("no invite");
      return;
    }
    server.createTask("invite-user-to-event", {
      event: eventQuery.rows[0],
      invite,
      link: `http://example.com/events/${eventQuery.rows[0].slug}?invite_key=${invite.invite_key}`,
      user
    });
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
    "date",
    "is_private",
    "allow_comments",
    "show_participants",
    "group_id"
  ];
  const fields = [sql.identifier(["slug"]), sql.identifier(["creator"])];
  const values = [slug, user_id];

  validFields.forEach((f) => {
    if (event.hasOwnProperty(f)) {
      fields.push(sql.identifier([f]));
      if (f !== "date") {
        values.push(event[f]);
      } else {
        console.log(event["date"] / 1000);
        values.push(sql`to_timestamp(${event["date"] / 1000})`);
      }
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

  return result.rows[0];
}

async function canCreateForGroup(user, group) {
  if (!group) {
    return true;
  }
  const data = await server.app.db.maybeOne(
    sql`SELECT * from group_members where group_id=${group} and user_id=${user} and role > 'moderator'`
  );

  if (!data) {
    return false;
  }

  return true;
}

async function canRSVPToEvent(eventId, userId) {
  const eventQuery = await server.app.db.query(
    sql`SELECT * from events where id = ${eventId}`
  );

  const event = eventQuery.rows;

  const invites = await server.app.db.any(
    sql`SELECt * from invites where event_id=${eventId}`
  );

  if (!event) {
    return false;
  }

  const isOwner = event.owner === userId;

  const isInvited = invites.find((invite) => {
    return invite.user_id === userId;
  });

  const isPublic = !event.is_private;

  return isOwner || isInvited || isPublic;
}

async function rsvpToEvent(eventId, userId, status, show_name) {
  const event = await server.app.db.maybeOne(
    sql`select * from events where id=${eventId}`
  );

  if (!event) {
    return;
  }
  const invite = await server.app.db.maybeOne(
    sql`select * from invites where user_id = ${userId} and event_id=${eventId}`
  );

  if (!invite && event.is_private && event.creator !== userId) {
    return;
  }

  if (invite) {
    await server.app.db.query(
      sql`UPDATE invites set status = ${status}, show_name = ${show_name} where id=${invite.id}`
    );
  }

  //Create an invite
  const key = crypto.randomBytes(16).toString("hex");
  await server.app.db.query(
    sql`INSERT INTO invites (user_id, event_id, invite_key, status, show_name) values (${userId}, ${eventId}, ${key}, ${status}, ${show_name})`
  );
}

function init(hapiServer) {
  server = hapiServer;
  //set up database
  //
}

module.exports = {
  inviteUsersToEvent,
  canInviteToEvent,
  canRSVPToEvent,
  rsvpToEvent,
  createEvent,
  getEventBySlug,
  findEvents,
  canUserViewEvent,
  canCreateForGroup,
  init,
  getGroupEventsForUser,
  name: "events"
};
