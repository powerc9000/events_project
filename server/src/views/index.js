const vision = require("@hapi/vision");
const _ = require("lodash");
const inert = require("@hapi/inert");
const ejs = require("ejs");
const path = require("path");
const fns = require("date-fns");

let server;

module.exports = {
  name: "views",
  register: async (hapiServer, options) => {
    server = hapiServer;

    await server.register(vision);
    await server.register(inert);

    server.views({
      engines: { ejs },
      relativeTo: path.join(__dirname, "../../../", "templates"),
      context: (req) => ({
        NODE_ENV: process.env.NODE_ENV,
        date: fns,
        user: req.app.user,
        _boolAttr: (name, value) => {
          if (value) {
            return name;
          } else {
            return "";
          }
        },
        _checked: (value) => {
          if (value) {
            return "checked";
          } else {
            return "";
          }
        },
        loggedIn: !!req.app.user
      }),
      isCached: process.env.NODE_ENV !== "develop"
    });

    server.decorate("toolkit", "layout", function(name, data) {
      const res = this.view("layout", { __body: name, ...data });
      if (this.request.state.turbo_redirect) {
        res.header("Turbolinks-Location", this.request.state.turbo_redirect);
        this.unstate("turbo_redirect");
      }

      return res;
    });

    //The source map url gets mapped wrong from parcel...
    //I still like source maps so here it is
    server.route({
      method: "GET",
      path: "/static/main.css.map",
      handler: {
        file: path.join(__dirname, "../../../", "client", "css", "main.css.map")
      }
    });
    server.route({
      method: "GET",
      path: "/static/{param*}",
      handler: {
        directory: {
          path: path.join(__dirname, "../../../", "client"),
          listing: true
        }
      }
    });

    server.route({
      method: "GET",
      path: "/",
      handler: homepage
    });

    server.route({
      method: "GET",
      path: "/create",
      handler: createEvent
    });

    server.route({
      method: "GET",
      path: "/login",
      handler: login
    });

    server.route({
      method: "GET",
      path: "/login/{type}",
      handler: loginWithOTP
    });

    server.route({
      method: "GET",
      path: "/events/{slug}",
      handler: eventDetail
    });

    server.route({
      method: "GET",
      path: "/events/{slug}/edit",
      handler: editEvent
    });

    server.route({
      method: "GET",
      path: "/groups",
      handler: userGroups
    });

    server.route({
      method: "GET",
      path: "/groups/create",
      handler: createGroup
    });

    server.route({
      method: "GET",
      path: "/groups/{idOrCustom}",
      handler: groupDetail
    });
  }
};

async function createGroup(req, h) {
  return h.layout("create_group");
}

async function groupDetail(req, h) {
  const groupService = server.getService("groups");
  const eventService = server.getService("events");

  const group = await groupService.getGroup(req.params.idOrCustom);
  if (!group) {
    return "Not found";
  }
  const events = await eventService.getGroupEventsForUser(
    group.id,
    req.app.user.id
  );
  const members = await groupService.getGroupMembers(group.id);

  const canInvite = await groupService.canAddUserToGroup(
    group.id,
    req.app.user.id,
    "member"
  );

  return h.layout("group_detail", { group, events, members, canInvite });
}

async function userGroups(req, h) {
  if (!req.app.user) {
    return h.toLogin();
  }

  const groups = await server
    .getService("groups")
    .getGroupsForUser(req.app.user.id);
  return h.layout("groups", { groups });
}

async function loginWithOTP(req, h) {
  const type = req.params.type;
  let codeSource = "Phone";
  if (type === "email") {
    codeSource = "Email";
  }
  return h.view("login_otp", { codeSource });
}

async function eventDetail(req, h) {
  const eventService = server.getService("events");
  const event = await eventService.getEventBySlug(req.params.slug);
  let userId = _.get(req, "app.user.id");

  if (!event) {
    return "NO EVENT";
  }

  if (!userId && req.query.invite_key) {
    const user = await server
      .getService("user")
      .findUser({ invite_key: req.query.invite_key });

    if (user) {
      h.loginUser(user);
      userId = user.id;
    }
  }
  const canViewEvent = await eventService.canUserViewEvent(userId, event.id);

  if (!canViewEvent) {
    return "NOT ALLOWED";
  }

  const statuses = { going: [], maybe: [], declined: [], invited: [] };

  event.invites.reduce((carry, invite) => {
    carry[invite.status].push(invite);

    return carry;
  }, statuses);

  const isPublic = !event.is_private;
  const isOwner = event.creator.id === userId;
  const canInvite = !event.is_private || isOwner || event.can_invite;

  const invite =
    event.invites.find((invite) => {
      return invite.user_id === userId;
    }) || {};

  return h.layout("event_detail", {
    event: { ...event, ...statuses },
    title: event.name,
    canEdit: await eventService.canUserEditEvent(userId, event.id),
    invite,
    canInvite
  });
}

async function editEvent(req, h) {
  const eventService = server.getService("events");
  const event = await eventService.getEventBySlug(req.params.slug);
  if (!event) {
    return "No Event";
  }

  if (!req.loggedIn()) {
    return "NOT ALLOWED";
  }
  const canEdit = await eventService.canUserEditEvent(
    req.app.user.id,
    event.id
  );

  if (!canEdit) {
    return "NOT Allowed";
  }
  const groups = await server
    .getService("groups")
    .getGroupsForUser(req.app.user.id);

  let forGroup = null;

  if (req.query.group) {
    forGroup = req.query.group;
  }
  return h.layout("create", {
    event,
    groups,
    forGroup
  });
}

async function homepage(req, h) {
  const options = { future: true };
  if (req.app.user) {
    options.user = req.app.user.id;
  }
  const events = await server.getService("events").findEvents(options);
  let view = "homepage";
  if (!req.app.user) {
    view = "welcome";
  }
  return h.layout(view, { events });
}

async function createEvent(req, h) {
  if (!req.loggedIn()) {
    return h.toLogin();
  }
  const groups = await server
    .getService("groups")
    .getGroupsForUser(req.app.user.id);

  let forGroup = null;

  if (req.query.group) {
    forGroup = req.query.group;
  }
  return h.layout("create", {
    event: {},
    forGroup,
    groups
  });
}

async function login(req, h) {
  if (!req.app.user) {
    if (req.query.redirect_to) {
      console.log(req.query);
      h.state("login_redirect", req.query.redirect_to);
    }
    return h.layout("login");
  } else {
    return h.redirect("/");
  }
}
