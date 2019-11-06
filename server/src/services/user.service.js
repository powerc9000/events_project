let server;
const sql = require("slonik").sql;
const crypto = require("crypto");
const { normalizePhone } = require("../utils");

async function createUser({ provider = {}, email, name, phone }) {
  let field = sql.identifier(["email"]);
  let fieldValue = email;

  if (!email && phone) {
    field = sql.identifier(["phone"]);
    fieldValue = normalizePhone(phone);
  }

  const query = await server.app.db.query(
    sql`INSERT INTO users (provider, ${field}, name) values (${sql.json(
      provider
    )}, ${fieldValue}::text, ${name}) returning *`
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

async function generateInboundEmail(userId) {
  const emailId = crypto.randomBytes(10).toString("hex");
  const email = `${emailId}@inbound.junipercity.com`;
  const path = `{inbound_email}`;
  return await server.app.db.maybeOne(
    sql`update users set settings = jsonb_set(settings, ${path}, ${sql.json(
      email
    )}) where id=${userId} returning *`
  );
}

async function findUserByProvider(providerName, providerId) {
  const query = sql`select * from users where provider->>${providerName}=${providerId}`;
  const data = await server.app.db.query(query);

  return data.rows[0];
}

async function findUserByEmail(email) {
  const query = await server.app.db.query(
    sql`SELECT * FROM users where email = ${email}`
  );

  return query.rows[0];
}

async function findUser(options) {
  let where;

  console.log(options);

  if (options.email) {
    return findUserByEmail(options.email);
  }

  if (options.phone) {
    return findUserByPhone(normalizePhone(options.phone));
  }

  if (options.invite_key) {
    return findUserByInviteKey(options.invite_key);
  }
}

async function findUserByInviteKey(key) {
  const query = sql`select users.* from users inner join invites on users.id = invites.user_id where invites.invite_key=${key}`;

  return server.app.db.maybeOne(query);
}

async function findUserByPhone(phone) {
  const query = await server.app.db.query(
    sql`SELECT * FROM users where phone = ${phone}`
  );

  return query.rows[0];
}

async function findById(id) {
  const query = await server.app.db.query(
    sql`SELECT * FROM users where id = ${id}`
  );

  return query.rows[0];
}

async function generateOTP(user) {
  const codeArr = [];

  for (let i = 0; i < 6; i++) {
    codeArr.push(Math.floor(Math.random() * 10));
  }

  const code = codeArr.join("");
  const loginCode = await server.app.db.one(sql`
	INSERT into login_codes (code, user_id) VALUES (${code}, ${user.id}) returning *
	`);

  return { session_key: loginCode.id, code };
}

async function setName(userId, name) {
  return server.app.db.maybeOne(
    sql`update users set name=${name} where id=${userId} returning *`
  );
}

function init(hapiServer) {
  server = hapiServer;
}

module.exports = {
  findUser,
  findUserByEmail,
  findUserByPhone,
  findUserByProvider,
  generateOTP,
  setName,
  findById,
  generateLoginToken,
  createUser,
  init,
  generateInboundEmail,
  name: "user"
};
