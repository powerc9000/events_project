let server;
const _ = require("lodash");
const sql = require("slonik").sql;
const crypto = require("crypto");
const { normalizePhone } = require("../utils");

async function createUser({ provider = {}, email, name = "", phone }) {
  let field = sql.identifier(["email"]);
  let fieldValue = email;

  if (!email && phone) {
    field = sql.identifier(["phone"]);
    fieldValue = normalizePhone(phone);
  }

  console.log(field, fieldValue);

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

function mergeUsers(toUser, fromUser) {
  return new Promise((resolve, reject) => {
    server.app.db.transaction(async (con) => {
      try {
        //Merge events
        await con.query(
          sql`update events set creator=${toUser} where creator=${fromUser}`
        );
        //Merge invites
        //If the toUser was already invited ignore it
        //We will delete it later
        //
        console.log("merge invites");
        await con.query(
          sql`INSERT INTO invites (user_id, event_id, status, invite_key) 
					select ${toUser} as user_id, event_id, status, invite_key from invites where user_id=${fromUser}
					on conflict do nothing`
        );
        //Delete old invites
        await con.query(sql`delete from invites where user_id=${fromUser}`);

        //Merge groups
        //
        console.log("merge groups");
        await con.query(
          sql`INSERT INTO group_members (user_id, group_id, role)
					select ${toUser} as user_id, group_id, role from group_members where user_id=${fromUser}
					on conflict do nothing`
        );
        //Delete old groups memberships from conflicts
        await con.query(
          sql`delete from group_members where user_id=${fromUser}`
        );
        //Merge comments
        await con.query(
          sql`update comments set user_id=${toUser} where user_id=${fromUser}`
        );
        //Delete old login codes
        await con.query(sql`delete from login_codes where user_id=${fromUser}`);
        await con.query(sql`delete from logins where user_id=${fromUser}`);
        //Delete old validations
        await con.query(sql`delete from validations where user_id=${fromUser}`);
        //Finally delete the old user
        //
        await con.query(sql`delete from users where id=${fromUser}`);

        resolve();
        return Promise.resolve();
      } catch (e) {
        reject(e);
        return Promise.reject();
      }
    });
  });
}

async function validateContact(code) {
  const validation = await server.app.db.maybeOne(
    sql`select * from validations where id=${code} and used is null`
  );

  if (!validation) {
    return null;
  } else {
    let previousUser;
    let field;
    if (validation.phone) {
      field = "phone";
      previousUser = await findUserByPhone(validation.phone);
    } else if (validation.email) {
      field = "email";
      previousUser = await findUserByEmail(validation.email);
    } else {
      return null;
    }

    if (previousUser) {
      await mergeUsers(validation.user_id, previousUser.id);
    }
    await server.app.db.maybeOne(
      sql`update users set ${sql.identifier([field])} = ${
        validation[field]
      } where id =${validation.user_id}`
    );

    return await server.app.db.maybeOne(
      sql`update validations set used = now() where id=${validation.id} returning *`
    );
  }
}

async function updateUser(userId, payload) {
  const current = await findById(userId);
  if (!current) {
    return null;
  }
  const fields = [
    "name",
    {
      name: "timezone",
      func: (key, val) => {
        const path = `{"timezone"}`;
        return sql`settings = settings || jsonb_set(settings, ${path}, ${sql.json(
          val
        )})`;
      }
    }
  ];
  const sets = [];

  fields.forEach((field) => {
    const key = field.name || field;
    if (_.has(payload, key)) {
      const format =
        field.func || ((key, value) => sql`${sql.identifier([key])}=${value}`);
      sets.push(format(key, _.get(payload, key)));
    }
  });
  let user;
  if (sets.length) {
    const query = sql`update users set ${sql.join(
      sets,
      sql` , `
    )} where id=${userId} returning *`;
    console.log(query);
    user = await server.app.db.maybeOne(query);
  } else {
    user = current;
  }

  const validations = ["email", "phone"];
  let mustValidate = [];
  validations.forEach((v) => {
    if (payload[v]) {
      let value = payload[v];
      if (v === "phone") {
        value = normalizePhone(value);
      }
      //If they are the same don't worry
      if (user[v] !== value) {
        mustValidate.push(v);
        createValidation(userId, { [v]: value });
      }
    }
  });

  const result = {};

  if (mustValidate.length) {
    result.must_validate = mustValidate;
  }

  return result;
}

async function createValidation(user, options) {
  if (options.email) {
    field = "email";
  } else if (options.phone) {
    field = "phone";
  } else {
    return;
  }

  const value = options[field];

  //Delete old validation so we don't run into issues
  await server.app.db.query(
    sql`update validations set used=now() where user_id=${user} and ${sql.identifier(
      [field]
    )} is not null`
  );
  const validation = await server.app.db.maybeOne(
    sql`INSERT INTO validations (user_id, ${sql.identifier([
      field
    ])}, code) VALUES (${user}, ${value}, uuid_generate_v4()) returning *`
  );

  server.createTask("send-validation", {
    validation,
    link: `https://junipercity.com/settings/validate/${validation.id}`
  });
}

function init(hapiServer) {
  server = hapiServer;
}

module.exports = {
  name: "user",
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
  validateContact,
  updateUser
};
