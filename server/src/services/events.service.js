let server;
const slugify = require("slugify");
const crypto = require("crypto");
const sql = require("slonik").sql;

function getAllEvents() {
  return [];
}

async function canUserViewEvent(user) {
  return true;
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
  const where = [sql`where is_private = false`];

  if (constraints) {
    if (constraints.user) {
      where.push(
        sql.join(
          [
            sql`creator = ${constraints.user}`,
            sql`id in (select event_id from invites where user = ${constraints.user})`
          ],
          sql` OR `
        )
      );
    }
  }
  const query = sql`SELECT * from events e ${sql.join(where, sql` OR `)}`;

  const events = await server.app.db.query(query);

  return events.rows;
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
    sql`SELECT * from events where id = ${eventId}`
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
        return user.phone;
      })
      .filter((value) => !!value),
    "text"
  )})`;

  const existing = await server.app.db.query(userQuery);

  //If we don't have a user entry for someone we need to create it...
  //
  const notFound = users.filter((user) => {
    const found = existing.rows.find((queryUser) => {
      return queryUser.phone === user.phone || queryUser.email === user.email;
    });

    return !found;
  });

  let newUsers = [];
  if (notFound.length) {
    const queried = notFound.map((user) => {
      return [user.name, user.email, user.phone];
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
    server.createTask("invite-user-to-event", {
      event: eventQuery.rows[0],
      invite: invitees.rows.find((invite) => {
        return invite.user_id === user.id;
      }),
      user
    });
  });
}

async function getAllEventsForUser(user) {
  const data = await server.app.db.query(`
	SELECT * from events
	`);

  return data.rows;
}

async function createEvent(user, event) {
  const user_id = user.id;
  const id = crypto.randomBytes(4).toString("hex");
  const slug = `${slugify(event.name, { lower: true })}-${id}`;
  const result = await server.app.db.query(
    sql`
	INSERT into events (name, description, creator, slug) VALUES (${event.name}, ${event.description}, ${user_id}, ${slug}) returning *
	`
  );

  return result.rows[0];
}

function init(hapiServer) {
  server = hapiServer;
  //set up database
  //
}

module.exports = {
  getAllEventsForUser,
  inviteUsersToEvent,
  canInviteToEvent,
  getAllEvents,
  createEvent,
  getEventBySlug,
  findEvents,
  canUserViewEvent,
  init,
  name: "events"
};
