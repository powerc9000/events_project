let server;

function getAllEvents() {
  return [];
}

async function getAllEventsForUser(user) {
  const data = await server.app.db.query(`
	SELECT * from events
	`);

  console.log(data);
  return [];
}

function init(hapiServer) {
  server = hapiServer;
  //set up database
  //
}

module.exports = {
  getAllEventsForUser,
  getAllEvents,
  init,
  name: "events"
};
