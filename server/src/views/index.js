const vision = require("@hapi/vision");
const Boom = require("@hapi/boom");
const _ = require("lodash");
const inert = require("@hapi/inert");
const ejs = require("ejs");
const path = require("path");
const fns = require("date-fns");
const util = require("util");
const fs = require("fs");
const anchor = require("markdown-it-anchor");
const footnote = require("markdown-it-footnote");
const markdown = require("markdown-it");
const md = markdown({ html: true });
const mdSafe = markdown();

const readFile = util.promisify(fs.readFile);

let server;

md.use(anchor);
md.use(footnote);

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
        _className: (name, condition) => {
          if (condition) {
            return name;
          } else {
            return "";
          }
        },
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

    server.ext(
      "onPreResponse",
      (req, h) => {
        if (req.response.isBoom) {
          const err = req.response;
          if (err.output.payload.statusCode === 404) {
            return h.layout("404").code(404);
          } else {
            return h.layout("500").code(500);
          }
        }
        return h.continue;
      },
      { sandbox: "plugin" }
    );

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
      method: "post",
      path: "/logout",
      handler: (req, h) => {
        h.unstate("user");
        return h.response.code(204);
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

    server.route({
      method: "GET",
      path: "/events/{slug}/discussion",
      handler: eventDisussion
    });

    server.route({
      method: "GET",
      path: "/s/{id}",
      handler: shortLink
    });

    server.route({
      method: "GET",
      path: "/help/{page?}",
      handler: renderHelp
    });

    server.route({
      method: "GET",
      path: "/{param}",
      handler: () => {
        return Boom.notFound();
      }
    });

    if (process.env.NODE_ENV !== "production") {
      server.route({
        method: "GET",
        path: "/500",
        handler: () => {
          return Boom.internal();
        }
      });
    }
  }
};

async function renderHelp(req, h) {
  try {
    const base = path.join(__dirname, "../../../", "templates", "help");
    let name = `${req.params.page}.md`;
    if (!req.params.page) {
      name = "index.md";
    }
    const page = await readFile(path.join(base, name));
    const html = md.render(page.toString());
    return h.view("layout", { __content: html });
  } catch (e) {
    return Boom.notFound();
  }
}

async function shortLink(req, h) {
  const key = req.params.id;

  const link = await server.getService("shortlinks").findByKey(key);

  if (!link) {
    return Boom.notFound();
  } else {
    return h.redirect(link.link);
  }
}

async function createGroup(req, h) {
  return h.layout("create_group");
}

async function groupDetail(req, h) {
  const groupService = server.getService("groups");
  const eventService = server.getService("events");
  const userId = _.get(req, "app.user.id");

  const group = await groupService.getGroup(req.params.idOrCustom);
  if (!group) {
    return Boom.notFound();
  }

  const canView = await groupService.canUserViewGroup(userId, group.id);

  if (!canView) {
    return Boom.notFound();
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
  if (req.loggedIn()) {
    return h.redirect("/");
  }
  let codeSource = "Phone";
  if (type === "email") {
    codeSource = "Email";
  }
  return h.layout("login_otp", { codeSource });
}

async function eventDetail(req, h) {
  const eventService = server.getService("events");
  const event = await eventService.getEventBySlug(req.params.slug);
  let userId = _.get(req, "app.user.id");

  if (!event) {
    return Boom.notFound();
  }
  const viewData = {};

  if (!userId && req.query.invite_key) {
    const user = await server
      .getService("user")
      .findUser({ invite_key: req.query.invite_key });

    if (user) {
      h.loginUser(user);
      userId = user.id;
      viewData.user = user;
    }
  }
  const canViewEvent = await eventService.canUserViewEvent(userId, event.id);

  if (!canViewEvent) {
    return Boom.notFound();
  }

  const statuses = { going: [], maybe: [], declined: [], invited: [] };

  event.invites.reduce((carry, invite) => {
    carry[invite.status].push(invite);

    return carry;
  }, statuses);

  const isPublic = !event.is_private;
  const isOwner = event.creator.id === userId;
  const canInvite = await eventService.canInviteToEvent(event.id, userId);
  const canSeeInvites = canInvite || event.show_participants;

  const invite =
    event.invites.find((invite) => {
      return invite.user_id === userId;
    }) || false;

  return h.layout("event_detail", {
    ...viewData,
    event: { ...event, ...statuses },
    path: `/events/${event.slug}`,
    title: event.name,
    canEdit: await eventService.canUserEditEvent(userId, event.id),
    invite,
    canRSVP: await eventService.canRSVPToEvent(event.id, userId),
    canInvite,
    canSeeInvites,
    isCreator: event.creator.id === userId,
    mdDescription: mdSafe.render(event.description || "")
  });
}

async function eventDisussion(req, h) {
  const userId = _.get(req, "app.user.id");
  const eventService = server.getService("events");
  const event = await eventService.getEventBySlug(req.params.slug);
  const canView = await eventService.canUserViewEvent(userId, event.id);
  const allComments = await eventService.getComments(event.id);

  if (!canView) {
    return Boom.notFound();
  }

  if (!event.allow_comments) {
    return h.turboRedirect(`/events/${event.slug}`);
  }

  const map = new Map();

  console.log(allComments);

  allComments.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  const comments = [];
  allComments.forEach((c) => {
    if (c.parent_comment) {
      const parent = map.get(c.parent_comment);
      parent.children.push(c);
    } else {
      console.log("no parent");
      comments.push(c);
    }
  });

  return h.layout("event_discussion", {
    title: `${event.name} Discussion`,
    event,
    comments,
    path: `/events/${event.slug}`
  });
}

async function editEvent(req, h) {
  const eventService = server.getService("events");
  const event = await eventService.getEventBySlug(req.params.slug);
  if (!event) {
    return Boom.notFound();
  }

  if (!req.loggedIn()) {
    return Boom.notFound();
  }
  const canEdit = await eventService.canUserEditEvent(
    req.app.user.id,
    event.id
  );

  if (!canEdit) {
    return Boom.notFound();
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
