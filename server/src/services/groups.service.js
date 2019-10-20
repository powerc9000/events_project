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

  if (options.custom_path) {
    //Check if custom_path unique
    //
    const path = await server.app.db.maybeOne(
      sql`SELECT * FROM groups where custom_path=${options.custom_path}`
    );

    if (path) {
      return ["Custom Path is not unique", null];
    }
  }

  const query = sql`INSERT INTO groups (${sql.join(
    fields,
    sql`, `
  )}) VALUES (${sql.join(values, sql`, `)}) returning *`;

  const group = await server.app.db.one(query);

  //Make the creator an admin
  await addUserToGroup(options.creator, group.id, "owner");

  return [null, group];
}

async function canAddUserToGroup(userId, groupId, role) {
  const user = server.app.db.maybeOne(
    sql`SELECT gm.user_id from group_members gm
		inner join groups g on g.id = gm.group_id
		where gm.user_id=${userId} and gm.group_id=${groupId} and role > ${role} and (g.can_invite or role >= 'admin')`
  );

  return !!user;
}

async function addUserToGroup(userId, groupId, role = "member") {
  await server.app.db.query(
    sql`INSERT INTO group_members (user_id, group_id, role) VALUES (${userId}, ${groupId}, ${role})`
  );
}

async function getGroupsForUser(userId) {
  const groups = await server.app.db.any(
    sql`SELECT groups.* from groups inner join group_members gm on gm.group_id = groups.id where gm.user_id=${userId}`
  );

  return groups;
}

async function getGroup(idOrCustom) {
  const group = await server.app.db.maybeOne(
    sql`SELECT * from groups where custom_path=${idOrCustom} or id::text=${idOrCustom}`
  );

  return group;
}

function init(hapiServer) {
  server = hapiServer;
}

module.exports = {
  createGroup,
  getGroup,
  getGroupsForUser,
  init,
  name: "groups"
};
