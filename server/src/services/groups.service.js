let server;

const _ = require("lodash");
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
      sql`SELECT * FROM groups where custom_path=${options.custom_path} or id::text = ${options.custom_path}`
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
  console.log(userId, groupId, role);
  const user = server.app.db.maybeOne(
    sql`SELECT gm.user_id from group_members gm
		inner join groups g on g.id = gm.group_id
		where gm.user_id=${userId} and gm.group_id=${groupId} and role > ${role} and (g.allow_inviting or role >= 'admin')`
  );

  return !!user;
}

async function addUserToGroup(userId, groupId, role = "member") {
  try {
    const member = await server.app.db.maybeOne(
      sql`INSERT INTO group_members (user_id, group_id, role) VALUES (${userId}, ${groupId}, ${role})`
    );

    return [null, "success"];
  } catch (e) {
    return ["User already in group", null];
  }
}

async function getGroupsForUser(userId) {
  const groups = await server.app.db.any(
    sql`SELECT groups.* from groups inner join group_members gm on gm.group_id = groups.id where gm.user_id=${userId}`
  );

  return groups;
  conso;
}

async function getGroup(idOrCustom) {
  const group = await server.app.db.maybeOne(
    sql`SELECT * from groups where custom_path=${idOrCustom} or id::text=${idOrCustom}`
  );

  return group;
}

async function getGroupMembers(groupId) {
  const members = await server.app.db.any(
    sql`select users.*, role from users 
		inner join group_members gm on gm.group_id = ${groupId}
		where users.id = gm.user_id
		`
  );

  return members;
}

async function canUserViewGroup(userId, groupId) {
  const group = await server.app.db.maybeOne(
    sql`SELECT * from groups where id=${groupId}`
  );

  if (!group) {
    return false;
  }

  if (group.is_private) {
    if (!userId) {
      return false;
    }

    const member = await server.app.db.maybeOne(
      sql`SELECT user_id from group_members where user_id=${userId} and group_id=${groupId}`
    );

    if (!member) {
      return false;
    } else {
      return true;
    }
  } else {
    return true;
  }
}

async function canUserEditGroup(userId, groupId) {
  const member = await server.app.db.query(
    sql`select * from group_members where group_id=${groupId} and user_id=${userId} and role > 'member'`
  );

  return !!member;
}

async function updateGroup(groupId, payload) {
  const fields = [
    "name",
    "description",
    "custom_path",
    "is_private",
    "allow_inviting"
  ];

  if (payload.custom_path) {
    const used = await server.app.db.maybeOne(
      sql`Select * from groups where (custom_path = ${payload.custom_path} or id::text = ${payload.custom_path}) and id != ${groupId}`
    );

    if (used) {
      return ["Custom Path already in use"];
    }
  }

  const data = [];

  fields.forEach((f) => {
    if (_.has(payload, f)) {
      data.push(sql`${sql.identifier([f])}=${payload[f]}`);
    }
  });

  if (data.length) {
    const update = await server.app.db.maybeOne(
      sql`update groups set ${sql.join(
        data,
        sql` , `
      )} where id=${groupId} returning *`
    );

    return [null, update];
  } else {
    return ["Nothing to update"];
  }
}

async function canUserUpdateRole(userId, groupId, changedUser, role) {
  if (!userId) {
    return false;
  }
  if (changedUser === userId) {
    return false;
  }
  console.log(changedUser, groupId, userId, role);
  const changed = await server.app.db.maybeOne(
    sql`SELECT * from group_members where user_id=${changedUser} and group_id=${groupId}`
  );

  if (!changed) {
    return false;
  }

  const exists = await server.app.db.maybeOne(
    sql`SELECT * from group_members where group_id=${groupId} and role >= 'admin' and user_id = ${userId} and role >= ${role}`
  );

  if (!exists) {
    return false;
  }

  if (changed.role > exists.role) {
    return false;
  }

  return true;
}

async function updateUserRole(userId, groupId, role) {
  await server.app.db.query(
    sql`UPDATE group_members set role=${role} where user_id=${userId} and group_id=${groupId}`
  );
}

async function canUserDeleteGroup(userId, groupId) {
  if (!userId) {
    return false;
  }

  if (!groupId) {
    return false;
  }

  const data = await server.app.db.maybeOne(
    sql`SELECT * from group_members where group_id = ${groupId} and user_id=${userId} and role = 'owner'`
  );

  return !!data;
}

async function deleteGroup(groupId) {
  //Delete the event invites
  await server.app.db.query(
    sql`delete from invites where event_id in (select id from events where group_id=${groupId})`
  );
  //Delete event comments
  await server.app.db.query(
    sql`delete from comments where entity_id in (select id from events where group_id=${groupId})`
  );
  //Delete events
  //
  await server.app.db.query(sql`delete from events where group_id=${groupId}`);

  //Delete members
  await server.app.db.query(
    sql`delete from group_members where group_id=${groupId}`
  );

  //Delete the group
  //
  await server.app.db.query(sql`delete from groups where id=${groupId}`);
}

async function isUserInGroup(userId, groupId) {
  if (!groupId || !userId) {
    return false;
  }

  const lookup = await server.app.db.maybeOne(
    sql`select * from group_members where user_id=${userId} and group_id=${groupId}`
  );

  return !!lookup;
}

function init(hapiServer) {
  server = hapiServer;
}

module.exports = {
  name: "groups",
  canUserEditGroup,
  isUserInGroup,
  updateUserRole,
  updateGroup,
  createGroup,
  getGroupMembers,
  getGroup,
  getGroupsForUser,
  init,
  canAddUserToGroup,
  canUserViewGroup,
  addUserToGroup,
  canUserUpdateRole,
  canUserDeleteGroup,
  deleteGroup
};
