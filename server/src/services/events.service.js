let server;

function getAllEvents() {
  return [];
}

async function getAllEventsForUser(user) {
  const data = await server.app.db.query(`
	SELECT * from events
	`);

  return data.rows;
}

async function createEvent(user, event) {
  const result = await server.app.db.query(
    `
	INSERT into events (name, description) VALUES ($1, $2) returning *
	`,
    [event.name, event.description]
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
  getAllEvents,
  createEvent,
  init,
  name: "events"
};
