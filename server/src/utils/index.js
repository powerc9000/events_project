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
  emailOrPhone(input) {
    const phoneCheck = utils.normalizePhone(input);

    if (!phoneCheck) {
      return { type: "email", value: input };
    } else {
      return { type: "phone", value: phoneCheck };
    }
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
