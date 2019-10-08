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
    sql`SELECT * from invites where event_id = ${id}`
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
  console.log(query);

  const events = await server.app.db.query(query);

  return events.rows;
}

async function canInviteToEvent(event, user) {
  const event = await server.app.db.maybeOne(
    sql`SELECT * from events where id=$1`
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

async function inviteUsersToEvent(event, users) {
  const userQuery = sql`SELECT * from users where email = ANY (${(sql.array(
    users
      .map((user) => {
        return user.email;
      })
      .filter((value) => !!value)
  ),
  "text")}) or phone = ANY (${(sql.array(
    users
      .map((user) => {
        return user.phone;
      })
      .filter((value) => !!value)
  ),
  "text")})`;

  //If we don't have a user entry for someone we need to create it...

  const eventQuery = server.app.db.query(
    sql`SELECT * from events where id = ${event.id}`
  );
  if (!eventQuery.rows) {
    return null;
  }
  const data = await server.app.db.query(query);

  const foundUsers = [];
  foundUsers.forEach(() => {
    server.createTask("invite-user-to-event", {
      event,
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
  getAllEvents,
  createEvent,
  getEventBySlug,
  findEvents,
  canUserViewEvent,
  init,
  name: "events"
};
