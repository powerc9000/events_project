const shortid = require("shortid");
const sql = require("slonik").sql;
let server;

module.exports = {
  name: "shortlinks",
  init: (hapiServer) => {
    server = hapiServer;
  },
  findByKey: (key) => {
    return server.app.db.maybeOne(
      sql`select * from shortlinks where key=${key}`
    );
  },
  create: (link) => {
    const id = shortid.generate();

    return server.app.db.maybeOne(
      sql`insert into shortlinks (link, key) values (${link}, ${id}) returning *`
    );
  }
};
