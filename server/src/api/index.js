const joi = require("@hapi/joi");
const { OAuth2Client } = require("google-auth-library");
const CLIENT_ID =
  "634779035671-htqj3sdamedg2bldv6fa85dr9qv3hh0f.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);
const LoginWithTwitter = require("login-with-twitter");
const Boom = require("@hapi/boom");
let server;
module.exports = {
  name: "Api",
  register: async function(hapiServer, options) {
    server = hapiServer;
    server.route({
      method: "POST",
      path: "/events",
      handler: createEvent,
      options: {
        validate: {
          payload: joi.object({
            name: joi.string().required(),
            description: joi.string(),
            private: joi.boolean()
          })
        }
      }
    });

    server.route({
      method: "POST",
      path: "/events/{id}/invite",
      handler: inviteToEvent,
      options: {
        validate: {
          payload: joi.object({
            invites: joi.array().items(
              joi
                .object({
                  name: joi.string(),
                  email: joi.string(),
                  phone: joi.string()
                })
                .or("email", "phone")
            )
          })
        }
      }
    });

    server.route({
      method: "GET",
      path: "/login/twitter",
      handler: loginWithTwitter
    });

    server.route({
      method: "POST",
      path: "/login/google",
      handler: loginWithGoogle
    });

    server.route({
      method: "GET",
      path: "/login/twitter/callback",
      handler: twitterCallback
    });
  }
};

async function createEvent(req, h) {
  const events = server.getService("events");

  const result = await events.createEvent(req.app.user, req.payload);

  return result;
}

async function loginWithGoogle(req, h) {
  const token = req.payload.token;

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENT_ID
  });

  const payload = ticket.getPayload();

  let user = await server.getService("user").findUserByEmail(payload.email);

  if (!user) {
    //create the user;
    user = await server.getService("user").createUser({
      provider: {
        google: payload.sub
      },
      email: payload.email,
      name: payload.name
    });
  }

  return h.loginUser(user);
}

const tw = new LoginWithTwitter({
  consumerKey: "zsGP1PcSGDT1DL4HD8snUvqJG",
  consumerSecret: "lHNvtemSECLj891PJXvKZAfPfEDl26Pj5n7hqr8QbY7q1XnZ3c",
  callbackUrl: "http://localhost:8000/api/login/twitter/callback"
});

async function twitterCallback(req, h) {
  return new Promise((resolve, reject) => {
    tw.callback(
      {
        oauth_token: req.query.oauth_token,
        oauth_verifier: req.query.oauth_verifier
      },
      req.state.user.twitterToken,
      (err, user) => {
        console.log(user, req.query);
        resolve(h.redirect("/"));
      }
    );
  });
}

async function loginWithTwitter(req, h) {
  return new Promise((resolve, reject) => {
    tw.login((err, tokenSecret, url) => {
      const state = req.state.user || {};

      state.twitterToken = tokenSecret;
      h.state("user", state);
      resolve(h.redirect(url));
    });
  });
}

async function inviteToEvent(req, h) {
  const events = server.getService("events");
  if (!req.loggedIn()) {
    return Boom.unauthorized();
  }
  const canInvite = await events.canInviteToEvent(
    req.params.id,
    req.app.user.id
  );
  if (!canInvite) {
    return Boom.unauthorized();
  }

  events.inviteUsersToEvent(req.params.id, req.payload.invites);

  return h.response().code(204);
}
