let server;

async function createUser({ provider, email, name }) {
  const query = await server.app.db.query(
    `INSERT INTO users (provider, email, name) values ($1, $2, $3) returning *`,
    [provider, email, name]
  );

  return query.rows[0];
}

async function generateLoginToken(userId) {
  const insert = await server.app.db.query(
    "insert into logins (user_id, expires) VALUES ($1, now() + interval '2w') returning id, expires",
    [userId]
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
    `SELECT * FROM users where email = $1`,
    [email]
  );

  return query.rows[0];
}

async function findById(id) {
  const query = await server.app.db.query(`SELECT * FROM users where id = $1`, [
    id
  ]);

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
