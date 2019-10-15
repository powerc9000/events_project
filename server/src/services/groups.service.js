let server;

const sql = require("slonik").sql;

async function createGroup(options) {
  const values = [options.name, options.creator];
  const fields = [sql.identifier(["name"]), sql.identifier(["creator"])];

  const otherValues = [
    "description",
    "allow_inviting",
    "is_private",
    "custom_path"
  ];

  otherValues.forEach((val) => {
    if (options.hasOwnProperty(val)) {
      fields.push(sql.identifier([val]));
      values.push(options[val]);
    }
  });

  const query = sql`INSERT INTO groups (${sql.join(
    fields,
    sql`, `
  )}) VALUES (${sql.join(values, sql`, `)}) returning *`;

  const group = await server.app.db.one(query);

  //Make the creator an admin
  await server.app.db.query(
    sql`INSERT INTO group_members (user_id, group_id, role) VALUES (${options.creator}, ${group.id}, 'owner')`
  );

  return group;
}

function init(hapiServer) {
  server = hapiServer;
}

module.exports = {
  createGroup,
  init,
  name: "groups"
};
