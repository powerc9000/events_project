const PhoneNumber = require("awesome-phonenumber");
const { createIcsFileBuilder } = require("./ics_builder");
const sanitizeHtml = require("sanitize-html");
const zones = require("./tz.json");
const _ = require("lodash");

const utils = (module.exports = {
  createIcsFileBuilder,
  normalizePhone: (number) => {
    try {
      const ph = new PhoneNumber(
        number,
        PhoneNumber.getRegionCodeForCountryCode(1)
      );

      if (ph.isValid()) {
        return ph.getNumber("e164");
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  },
  formatPhone(phone, format = "national") {
    try {
      return PhoneNumber(phone).getNumber("national");
    } catch (e) {
      return "";
    }
  },
  emailOrPhone(input) {
    const phoneCheck = utils.normalizePhone(input);

    if (!phoneCheck) {
      return { type: "email", value: input };
    } else {
      return { type: "phone", value: phoneCheck };
    }
  },
  eventsToICS(events, userId, name) {
    const statusToICS = {
      going: "ATTENDING",
      maybe: "TENNATIVE",
      declined: "DECLINED",
      invited: "NEEDS-ACTION"
    };
    const builder = createIcsFileBuilder();
    builder.calname = name || userId;
    events.forEach((event) => {
      const end = event.end_date
        ? new Date(event.end_date)
        : new Date(event.date + 1000 * 60 * 60);
      builder.events.push({
        start: new Date(event.date),
        end,
        summary: event.name,
        stamp: event.created,
        status: "CONFIRMED",
        description: event.description,
        organizer: {
          name: event.creator.name || event.creator.email,
          email: `invites+${event.creator.id}@${process.env.INBOUND_EMAIL_DOMAIN}`
        },
        additionalTags: {
          "X-USER-ID": userId
        },
        attendees: event.invites.map((invite) => {
          const showInfo =
            (event.canSeeInvites && invite.show_name) ||
            invite.user.id === userId;
          const defaultEmail = `protected+${invite.user.id}@${process.env.INBOUND_EMAIL_DOMAIN}`;
          const email = invite.user.email || defaultEmail;
          return {
            email: showInfo ? email : defaultEmail,
            name: showInfo
              ? invite.user.name || "Anonymous User"
              : "Anonymous User",
            status: statusToICS[invite.status]
          };
        }),
        uid: event.id,
        url: `https://junipercity.com/events/${event.slug}`
      });
    });

    return builder.toString();
  },

  sanitize: (text) => {
    return sanitizeHtml(text, {
      allowedTags: [
        ..._.filter(sanitizeHtml.defaults.allowedTags, (t) => t !== "iframe"),
        "h2",
        "del",
        "blockquote"
      ]
    });
  },
  timezones: zones
});
