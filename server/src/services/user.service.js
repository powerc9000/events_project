let server;
const sql = require("slonik").sql;

async function createUser({ provider, email, name }) {
  const query = await server.app.db.query(
    sql`INSERT INTO users (provider, email, name) values ($1, $2, $3) returning *`,
    [provider, email, name]
  );

  return query.rows[0];
}

async function generateLoginToken(userId) {
  const insert = await server.app.db.query(
    sql`insert into logins (user_id, expires) VALUES (${userId}, now() + interval '2w') returning id, expires`
  );
  const tokenData = insert.rows[0];
  const result = {
    token: {
      id: tokenData.id,
      expires: tokenData.expires
    }
  };

  return result;
}

async function findUserByEmail(email) {
  const query = await server.app.db.query(
    sql`SELECT * FROM users where email = ${email}`
  );

  return query.rows[0];
}

async function findById(id) {
  const query = await server.app.db.query(
    sql`SELECT * FROM users where id = ${id}`
  );

  return query.rows[0];
}

function init(hapiServer) {
  server = hapiServer;
}

module.exports = {
  findUserByEmail,
  findById,
  generateLoginToken,
  createUser,
  init,
  name: "user"
};
