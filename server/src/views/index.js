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
const Nunjucks = require("nunjucks");
const md = markdown({ html: true });
const mdSafe = markdown();
const { timezones, sanitize } = require("../utils");
const PhoneNumber = require("awesome-phonenumber");

const events = require("./events");

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
      engines: {
        ejs,
        njk: {
          compile: (src, options) => {
            const template = Nunjucks.compile(src, options.environment);

            return (context) => {
              return template.render(context);
            };
          },

          prepare: (options, next) => {
            const env = Nunjucks.configure(options.path, { watch: false });

            env.addGlobal("date", fns);
            env.addGlobal("NODE_ENV", process.env.NODE_ENV);

            options.compileOptions.environment = env;
            return next();
          }
        }
      },

      relativeTo: path.join(__dirname, "../../../", "templates"),
      path: path.join(__dirname, "../../../", "templates"),
      context: (req) => ({
        NODE_ENV: process.env.NODE_ENV,
        inboundEmailDomain: process.env.INBOUND_EMAIL_DOMAIN,
        date: fns,
        jsBundlePath: "/static/js/index.js",
        user: req.app.user,
        flags: server.app.featureFlags,
        __currentPath: () => {
          return req.url.pathname + req.url.search;
        },
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
      isCached: process.env.NODE_ENV !== "develop",
      defaultExtension: "njk"
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
            return h.view("404").code(404);
          } else {
            return h.view("500").code(500);
          }
        }
        return h.continue;
      },
      { sandbox: "plugin" }
    );

    events.init(server);

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
      options: {
        pre: [
          {
            method: (req, h) => {
              req.app.isStatic = true;
              return h.continue;
            }
          }
        ]
      },
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
        return h.response().code(204);
      }
    });

    server.route({
      method: "GET",
      path: "/",
      handler: homepage
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
      path: "/groups/{idOrCustom}/events",
      handler: groupEvents
    });

    server.route({
      method: "GET",
      path: "/groups/{idOrCustom}/edit",
      handler: editGroup
    });

    server.route({
      method: "GET",
      path: "/groups/{idOrCustom}/manage",
      handler: manageGroup
    });

    server.route({
      method: "GET",
      path: "/settings",
      handler: userSettings
    });

    server.route({
      method: "GET",
      path: "/settings/validate/{code}",
      handler: validateContact
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
        path: "/test-cookie",
        handler: (req, h) => {
          h.state("user", req.query.cookie);

          return h.response();
        }
      });
      server.route({
        method: "GET",
        path: "/500",
        handler: () => {
          return Boom.internal();
        }
      });
      server.route({
        method: "GET",
        path: "/valsuccess",
        handler: (req, h) => {
          return h.view("validation_success", { validation: { phone: "123" } });
        }
      });
      server.route({
        method: "GET",
        path: "/valerror",
        handler: (req, h) => {
          return h.view("validation_error", { validation: { phone: "123" } });
        }
      });
    }
  }
};

async function validateContact(req, h) {
  const validation = await server
    .getService("user")
    .validateContact(req.params.code);
  if (validation) {
    return h.view("validation_success", { validation });
  } else {
    return h.view("validation_error");
  }
}

async function userSettings(req, h) {
  const user = req.app.user;
  if (!user) {
    h.state("turbo_redirect", "/");
    return h.redirect("/");
  }

  return h.view("user_settings", {
    timezones,
    phone:
      req.app.user.phone &&
      new PhoneNumber(req.app.user.phone).getNumber("national")
  });
}

async function renderHelp(req, h) {
  try {
    const base = path.join(__dirname, "../../../", "templates", "help");
    let name = `${req.params.page}.md`;
    if (!req.params.page) {
      name = "index.md";
    }
    const page = await readFile(path.join(base, name));
    const html = md.render(page.toString());
    return h.view("help", { content: html });
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
  return h.view("create_group");
}

async function editGroup(req, h) {
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

  return h.view("create_group", { group });
}
async function commonGroupData(user, groupIdOrCustom) {
  const groupService = server.getService("groups");
  const eventService = server.getService("events");
  const userId = _.get(user, "id");

  const group = await groupService.getGroup(groupIdOrCustom);
  if (!group) {
    return [Boom.notFound()];
  }

  const canView = await groupService.canUserViewGroup(userId, group.id);

  if (!canView) {
    return [Boom.notFound()];
  }

  const events = await eventService.getGroupEventsForUser(group.id, userId);
  const members = await groupService.getGroupMembers(group.id);

  const canInvite = await groupService.canAddUserToGroup(
    group.id,
    userId,
    "member"
  );
  const membership = members.find((member) => {
    return member.id === userId;
  });
  return [
    null,
    {
      group,
      description: sanitize(group.description),
      role: _.get(membership, "role"),
      events,
      members,
      canInvite,
      canDelete: await groupService.canUserDeleteGroup(userId, group.id),
      path: `/groups/${group.custom_path || group.id}`,
      canEdit: await groupService.canUserEditGroup(userId, group.id),
      canCreate: await eventService.canCreateForGroup(userId, group.id),
      invitePath: `/api/groups/${group.id}/members`
    }
  ];
}
async function groupDetail(req, h) {
  const [err, data] = await commonGroupData(
    req.app.user,
    req.params.idOrCustom
  );

  if (err) {
    return err;
  }

  return h.view("group_detail.njk", data);
}

async function groupEvents(req, h) {
  const [err, data] = await commonGroupData(
    req.app.user,
    req.params.idOrCustom
  );

  if (err) {
    return err;
  }

  return h.view("group_events.njk", data);
}

async function manageGroup(req, h) {
  const [err, data] = await commonGroupData(
    req.app.user,
    req.params.idOrCustom
  );

  if (err) {
    return err;
  }

  return h.view("group_management", data);
}

async function userGroups(req, h) {
  if (!req.app.user) {
    return h.toLogin();
  }

  const groups = await server
    .getService("groups")
    .getGroupsForUser(req.app.user.id);
  return h.view("groups.njk", { groups });
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

  return h.view("login_otp", { codeSource });
}

async function homepage(req, h) {
  const options = { maxAge: "1 month", maxUntil: "5 months" };
  if (req.app.user) {
    options.user = req.app.user.id;
  }
  const events = await server.getService("events").findEvents(options);
  let view = "homepage.njk";
  if (!req.app.user) {
    view = "welcome";
  }
  const payload = {};

  payload.events = events.upcoming;
  payload.past = events.past;

  payload.events.forEach((e) => {
    e.description = sanitize(e.description);
  });

  return h.view(view, payload);
}

async function login(req, h) {
  if (!req.app.user) {
    if (req.query.redirect_to) {
      h.state("login_redirect", req.query.redirect_to);
    }
    return h.view("login.njk");
  } else {
    return h.redirect("/");
  }
}
