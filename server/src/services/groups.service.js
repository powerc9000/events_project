let server;
let redisClient;
const fs = require("fs");

const crypto = require("crypto");
const _ = require("lodash");
const sql = require("slonik").sql;
const fetch = require("node-fetch");
const gapis = require("googleapis");
const redis = require("redis");

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
  const user = server.app.db.maybeOne(
    sql`SELECT gm.user_id from group_members gm
		inner join groups g on g.id = gm.group_id
		where gm.user_id=${userId} and gm.group_id=${groupId} and role > ${role} and (g.allow_inviting or role >= 'admin')`
  );

  return !!user;
}

async function addUserToGroup(userId, groupId, role = "member") {
  try {
    const member_key = crypto.randomBytes(16).toString("hex");
    const member = await server.app.db.maybeOne(
      sql`INSERT INTO group_members (user_id, group_id, role, member_key) VALUES (${userId}, ${groupId}, ${role}, ${member_key}) returning *`
    );

    server.createTask("user-added-to-group", {
      user: await server.getService("user").findById(userId),
      group: await getGroup(groupId),
      member,
      role
    });

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
    sql`select users.*, gm.role from users 
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
  const member = await server.app.db.maybeOne(
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
  const changed = await server.app.db.maybeOne(
    sql`SELECT * from group_members where user_id=${changedUser} and group_id=${groupId}`
  );

  if (!changed) {
    return false;
  }

  const exists = await server.app.db.maybeOne(
    sql`SELECT * from group_members where group_id=${groupId} and role >= 'admin' and user_id = ${userId} and role >= ${changed.role}`
  );

  if (!exists) {
    return false;
  }

  return true;
}

async function updateUserRole(userId, groupId, role) {
  await server.app.db.query(
    sql`UPDATE group_members set role=${role} where user_id=${userId} and group_id=${groupId}`
  );
}

async function canUserRemoveMember(userId, groupId, memberId) {
  const membership = await server.app.db.maybeOne(
    sql`select * from group_members where user_id=${memberId} and group_id=${groupId}`
  );

  if (memberId === userId) {
    //Can't remove self
    return false;
  }

  if (!membership) {
    return false;
  }
  //must be higher rank
  //
  const userMembership = await server.app.db.maybeOne(
    sql`select * from group_members where user_id=${userId} and group_id=${groupId} and role >= 'admin' and role >= ${membership.role}`
  );

  if (!userMembership) {
    return false;
  }

  return true;
}

async function removeGroupMember(memberId, groupId) {
  await server.app.db.query(
    sql`delete from group_members where user_id=${memberId} and group_id=${groupId}`
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
async function canUserModerate(groupId, userId) {
  if (!groupId) {
    return false;
  }
  if (!userId) {
    return false;
  }

  const mod = await server.app.db.maybeOne(
    sql`select * from group_members where user_id=${userId} and group_id=${groupId} and role >= 'moderator'`
  );

  return !!mod;
}

async function canUserPostInGroup(userId, groupId) {
  if (!groupId) {
    return false;
  }
  if (!userId) {
    return false;
  }

  const inGroup = await isUserInGroup(userId, groupId);

  if (!inGroup) {
    return false;
  }
  //Todo posting restrictions etc.
  return inGroup;
}

async function getPostsForGroup(groupId) {
  const posts = await server.app.db.any(sql`
	select *, 
		row_to_json((select d from (select users.name, users.id from users where id = p.user_id) d)) as user,
		coalesce((select jsonb_agg(e) from (select * from comments where comments.parent_comment = p.id) e), '[]'::jsonb) as comments
	from comments p where entity_id=${groupId} and parent_comment is null order by created desc
	`);

  return posts;
}

async function getPost(groupId, postId) {
  const post = await server.app.db.maybeOne(
    sql`
	select *, 
		row_to_json((select d from (select users.name, users.id from users where id = p.user_id) d)) as user,
		coalesce((select jsonb_agg(e) from (select *, extract(epoch from comments.created) as created,
		row_to_json((select d from (select users.name, users.id from users where id = p.user_id) d)) as user
		from comments where comments.parent_comment = p.id) e), '[]'::jsonb) as comments
	from comments p where entity_id=${groupId} and parent_comment is null and id=${postId} order by created desc
	`
  );

  return post;
}

async function createPost(userId, groupId, body) {
  const create = await server.app.db.one(
    sql`insert into comments (user_id, entity_id, body) values(${userId}, ${groupId}, ${body}) returning *`
  );

  return create;
}

async function createComment(userId, groupId, postId, body) {
  const parent = await getPost(groupId, postId);

  if (!parent) {
    return null;
  }

  const create = await server.app.db.one(
    sql`insert into comments (user_id, entity_id, parent_comment, body) values(${userId}, ${groupId}, ${postId}, ${body}) returning *`
  );

  return create;
}
const sheet = "17SqJhHFH1MZsDPy1Yxfu4pT6lVdOpRmpynuocxCJHZw";
const key = "AIzaSyDsamH3X-E8HkD6sUxIq2koZJb329hfPhU";
const sheetsPath = "https://sheets.googleapis.com/v4/spreadsheets";

async function getRedisCacheJson(key) {
  return new Promise((resolve, reject) => {
    redisClient.get([key], (err, value) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(value));
      }
    });
  });
}
async function setRedisCacheJson(key, value, expires) {
  const args = [key, JSON.stringify(value)];
  if (expires) {
    args.push("EX", expires);
  }

  return new Promise((resolve, reject) => {
    redisClient.set(args, (err, value) => {
      if (err) {
        reject(err);
      } else {
        resolve(value);
      }
    });
  });
}
async function deleteRedisCache(key) {
  return new Promise((resolve, reject) => {
    redisClient.del(key, (err, value) => {
      console.log(err, value);
      if (err) {
        reject(err);
      } else {
        resolve(value);
      }
    });
  });
}
async function getMutualAidRequests() {
  try {
    await loadKeyMap();
    const cache = await getRedisCacheJson("mutual_aid_requests");
    if (cache) {
      return [cache, null];
    }
    const docReq = await fetch(
      `${sheetsPath}/${sheet}/values/A2:AE999?key=${key}`
    );

    const data = await docReq.json();
    const header = data.values[0];
    const headerIndexes = {};
    header.forEach((item, index) => {
      headerIndexes[keyMap[item]] = index;
    });

    const requests = data.values.slice(3);
    let statusFilters = [""];
    let active = "unclaimed";

    const mappedData = requests.map((request, index) => {
      const res = {};
      request.forEach((col, index) => {
        res[keyMap[header[index]]] = col;
      });

      res.index = index;

      return res;
    });

    const result = {
      dataRowStart: 5,
      headerIndexes,
      requests: mappedData
    };
    await setRedisCacheJson("mutual_aid_requests", result, 60);

    return [result, null];
  } catch (e) {
    console.log(e);
    return [{}, e];
  }
}
let gKeys = null;

async function getKeys() {
  return new Promise((resolve, reject) => {
    if (gKeys) {
      return resolve(gKeys);
    }
    fs.readFile("server/mutual-aid.json", (err, content) => {
      if (err) {
        reject(err);
      } else {
        gKeys = JSON.parse(content);
        resolve(gKeys);
      }
    });
  });
}
let auth = null;
async function getAuth() {
  if (auth) {
    return auth;
  }
  const scopes = ["https://www.googleapis.com/auth/spreadsheets"];
  const keys = await getKeys();
  const client = new gapis.google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    scopes,
    null
  );
  await client.authorize();
  auth = client;
  return client;
}
async function updateMutualAidCell(cell, value) {
  const path = `${sheetsPath}/${sheet}/values/${cell}?valueInputOption=USER_ENTERED&key=${key}`;
  const sheets = gapis.google.sheets("v4");
  const request = {
    spreadsheetId: sheet,
    range: cell,
    valueInputOption: "USER_ENTERED",
    auth: await getAuth(),
    resource: {
      range: cell,
      values: [[value]]
    }
  };
  await sheets.spreadsheets.values.update(request);
  await deleteRedisCache("mutual_aid_requests");
}
let keyMap = {};

async function loadKeyMap() {
  const req = await fetch(
    "https://a.dropconfig.com/74b9011f-1d9b-4d19-8db9-53cf992ed7ba.json"
  );

  keyMap = await req.json();
}
function getKey(item, map, key, backup) {
  const keys = Object.keys(map);
  const matchWith = (key) => {
    return keys.find((tryKey) => {
      return (
        tryKey.toLowerCase() === key.toLowerCase() ||
        tryKey.toLowerCase().indexOf(key.toLowerCase()) > -1
      );
    });
  };
  let match;
  if (keyMap[key]) {
    match = keyMap[key];
  } else {
    match = matchWith(key);
    if (match === null || match === undefined) {
      match = matchWith(backup);
    }
  }

  if (match !== null && match !== undefined) {
    return item[map[match]];
  } else {
    return "";
  }
}

function init(hapiServer) {
  redisClient = redis.createClient({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    prefix: "cache",
    connectTimeout: 30000,
    ...(process.env.NODE_ENV === "production"
      ? {
          tls: {},
          username: process.env.REDIS_USERNAME,
          password: process.env.REDIS_PASSWORD
        }
      : {})
  });
  server = hapiServer;
}

module.exports = {
  name: "groups",
  canUserEditGroup,
  canUserModerate,
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
  deleteGroup,
  canUserRemoveMember,
  removeGroupMember,
  getPostsForGroup,
  canUserPostInGroup,
  createPost,
  getPost,
  createComment,
  getMutualAidRequests,
  updateMutualAidCell,
  loadKeyMap,
  getKey
};
