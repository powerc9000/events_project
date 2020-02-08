let server;
const _ = require("lodash");
const joi = require("@hapi/joi");
const Boom = require("@hapi/boom");
const {
  timezones,
  sanitize,
  createIcsFileBuilder,
  eventsToICS
} = require("../utils");

function init(hapiServer) {
  server = hapiServer;
  server.route({
    method: "GET",
    path: "/create",
    handler: createEvent
  });
  server.route({
    method: "GET",
    path: "/events/{slug}",
    handler: eventDetail
  });

  server.route({
    method: "GET",
    path: "/events/{slug}/settings",
    handler: manageEvent
  });
  server.route({
    method: "GET",
    path: "/events/{slug}.{ext}",
    handler: eventDetail,
    options: {
      validate: {
        params: joi.object({
          slug: joi.string().required(),
          ext: joi.string().valid("ics")
        })
      }
    }
  });

  server.route({
    method: "GET",
    path: "/events",
    handler: filterEvents
  });

  server.route({
    method: "GET",
    path: "/events/{slug}/edit",
    handler: editEvent
  });

  server.route({
    method: "GET",
    path: "/events/{slug}/discussion",
    handler: eventDisussion
  });

  server.route({
    method: "GET",
    path: "/events/{slug}/responses",
    handler: viewEventResponses
  });
  server.route({
    method: "GET",
    path: "/events/{slug}/share",
    handler: shareEvent
  });
}

async function shareEvent(req, h) {
  const [err, data] = await commonEventData(
    req.userId(),
    req.params.slug,
    req.query.event_key
  );

  if (err) {
    return err;
  }
  const previousInvites = await server
    .getService("user")
    .getPreviousInvites(req.userId());

  return h.view("share_event.njk", {
    ...data,
    previousInvites: previousInvites.map((user) => {
      return {
        name: user.name,
        email: user.email,
        phone: user.phone,
        id: user.id
      };
    }),

    activeTab: "share"
  });
}

async function filterEvents(req, h) {
  const filters = req.query;
  try {
    const payload = {
      user: req.userId(),
      maxAge: filters.maxage || "2 months",
      maxUntil: filters.maxuntil || "2 months",
      group: filters.group,
      creator: filters.creator
    };
    const events = await server.getService("events").findEvents(payload);
    return h.view("events", { events: events.events, query: payload });
  } catch (e) {
    console.log(e);
  }
}

async function createEvent(req, h) {
  if (!req.loggedIn()) {
    return h.toLogin();
  }
  const user = req.app.user;
  const groups = await server
    .getService("groups")
    .getGroupsForUser(req.app.user.id);

  let forGroup = null;

  if (req.query.group) {
    forGroup = req.query.group;
  }
  return h.view("create_event.njk", {
    event: {},
    timezones,
    tz: user.settings.timezone || "",
    forGroup,
    groups
  });
}

async function commonEventData(userId, slug, event_key) {
  try {
    const eventService = server.getService("events");
    const event = await eventService.getEventBySlug(slug);

    if (!event) {
      return [Boom.notFound()];
    }
    const viewData = {};

    const canViewEvent = await eventService.canUserViewEvent(
      userId,
      event.id,
      event_key
    );

    if (!canViewEvent) {
      return [Boom.notFound()];
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
    const isMod = await server
      .getService("groups")
      .canUserModerate(event.group_id, userId);

    const invite =
      event.invites.find((invite) => {
        return invite.user_id === userId;
      }) || false;

    const data = {
      ...viewData,
      event: { ...event, ...statuses },
      path: `/events/${event.slug}`,
      title: event.name,
      canEdit: await eventService.canUserEditEvent(userId, event.id),
      isMod,
      invite,
      canRSVP: await eventService.canRSVPToEvent(event.id, userId, event_key),
      canInvite,
      canSeeInvites,
      canDelete: await eventService.canUserDeleteEvent(userId, event.id),
      invitePath: `/api/events/${event.id}/invite`,
      comments: await eventService.getComments(event.id),
      isCreator: event.creator.id === userId,
      mdDescription: sanitize(event.description)
    };

    return [null, data];
  } catch (e) {
    console.log(e);
    return [Boom.badImplementation(e), null];
  }
}

async function eventDetail(req, h) {
  try {
    if (req.query.invite_key) {
      return h.consumeInviteKey(req.query.invite_key);
    }
    const [err, data] = await commonEventData(
      req.userId(),
      req.params.slug,
      req.query.event_key
    );
    if (err) {
      console.log(err);
      return err;
    }
    if (req.params.ext && req.params.ext === "ics") {
      return h
        .response(
          eventsToICS(
            [{ ...data.event, canSeeInvites: data.canSeeInvites }],
            req.userId()
          )
        )
        .header("Content-Type", "text/calendar");
    }

    const previousInvites = await server
      .getService("user")
      .getPreviousInvites(req.userId());
    return h.view("event_detail.njk", {
      ...data,
      activeTab: "base",
      previousInvites: previousInvites.map((user) => {
        return {
          name: user.name,
          email: user.email,
          phone: user.phone,
          id: user.id
        };
      })
    });
  } catch (e) {
    server.log(["error"], e);

    return Boom.badImplementation();
  }
}

async function editEvent(req, h) {
  const eventService = server.getService("events");
  const user = req.app.user;
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
  return h.view("create_event.njk", {
    event,
    timezones,
    tz: event.tz || user.settings.timezone,
    groups,
    forGroup
  });
}

async function eventDisussion(req, h) {
  if (req.query.invite_key) {
    return h.consumeInviteKey(req.query.invite_key);
  }
  const userId = req.userId();
  const eventService = server.getService("events");

  const [err, data] = await commonEventData(userId, req.params.slug);

  if (err) {
    return err;
  }

  const allComments = await eventService.getComments(data.event.id);

  if (!data.event.allow_comments || !userId) {
    return h.turboRedirect(`/events/${event.slug}`);
  }

  const map = new Map();

  allComments.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  const comments = [];

  for (let comment of allComments) {
    comment.body = sanitize(comment.body);
    if (comment.parent_comment) {
      const parent = map.get(comment.parent_comment);
      parent.children.push(comment);
    } else {
      comments.push(comment);
    }
  }
  return h.view("event_discussion.njk", {
    ...data,
    activeTab: "discussion",
    title: `${data.event.name} Discussion`,
    comments
  });
}

async function manageEvent(req, h) {
  const [err, data] = await commonEventData(
    req.userId(),
    req.params.slug,
    req.query.event_key
  );

  if (err) {
    return err;
  }

  return h.view("manage_event", { ...data, activeTab: "manage" });
}

async function viewEventResponses(req, h) {
  const [err, data] = await commonEventData(
    req.userId(),
    req.params.slug,
    null
  );

  if (err) {
    return err;
  }
  //Only creator can view responses
  if (!data.isCreator) {
    return Boom.notFound();
  }

  return h.view("event_responses", { ...data, activeTab: "responses" });
}

module.exports = {
  init
};
