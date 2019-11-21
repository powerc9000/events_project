const PhoneNumber = require("awesome-phonenumber");
const { createIcsFileBuilder } = require("./ics_builder");
const sanitizeHtml = require("sanitize-html");
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
  timezones: [
    {
      value: "International Date Line West",
      description: "(GMT-12:00) International Date Line West"
    },
    { value: "American Samoa", description: "(GMT-11:00) American Samoa" },
    { value: "Midway Island", description: "(GMT-11:00) Midway Island" },
    { value: "Hawaii", description: "(GMT-10:00) Hawaii" },
    { value: "Alaska", description: "(GMT-09:00) Alaska" },
    {
      value: "Pacific Time (US & Canada)",
      description: "(GMT-08:00) Pacific Time (US & Canada)"
    },
    { value: "Tijuana", description: "(GMT-08:00) Tijuana" },
    { value: "Arizona", description: "(GMT-07:00) Arizona" },
    { value: "Chihuahua", description: "(GMT-07:00) Chihuahua" },
    { value: "Mazatlan", description: "(GMT-07:00) Mazatlan" },
    {
      value: "Mountain Time (US & Canada)",
      description: "(GMT-07:00) Mountain Time (US & Canada)"
    },
    { value: "Central America", description: "(GMT-06:00) Central America" },
    {
      value: "Central Time (US & Canada)",
      description: "(GMT-06:00) Central Time (US & Canada)"
    },
    { value: "Guadalajara", description: "(GMT-06:00) Guadalajara" },
    { value: "Mexico City", description: "(GMT-06:00) Mexico City" },
    { value: "Monterrey", description: "(GMT-06:00) Monterrey" },
    { value: "Saskatchewan", description: "(GMT-06:00) Saskatchewan" },
    { value: "Bogota", description: "(GMT-05:00) Bogota" },
    {
      value: "Eastern Time (US & Canada)",
      description: "(GMT-05:00) Eastern Time (US & Canada)"
    },
    { value: "Indiana (East)", description: "(GMT-05:00) Indiana (East)" },
    { value: "Lima", description: "(GMT-05:00) Lima" },
    { value: "Quito", description: "(GMT-05:00) Quito" },
    {
      value: "Atlantic Time (Canada)",
      description: "(GMT-04:00) Atlantic Time (Canada)"
    },
    { value: "Caracas", description: "(GMT-04:00) Caracas" },
    { value: "Georgetown", description: "(GMT-04:00) Georgetown" },
    { value: "La Paz", description: "(GMT-04:00) La Paz" },
    { value: "Puerto Rico", description: "(GMT-04:00) Puerto Rico" },
    { value: "Santiago", description: "(GMT-04:00) Santiago" },
    { value: "Newfoundland", description: "(GMT-03:30) Newfoundland" },
    { value: "Brasilia", description: "(GMT-03:00) Brasilia" },
    { value: "Buenos Aires", description: "(GMT-03:00) Buenos Aires" },
    { value: "Greenland", description: "(GMT-03:00) Greenland" },
    { value: "Montevideo", description: "(GMT-03:00) Montevideo" },
    { value: "Mid-Atlantic", description: "(GMT-02:00) Mid-Atlantic" },
    { value: "Azores", description: "(GMT-01:00) Azores" },
    { value: "Cape Verde Is.", description: "(GMT-01:00) Cape Verde Is." },
    { value: "Edinburgh", description: "(GMT+00:00) Edinburgh" },
    { value: "Lisbon", description: "(GMT+00:00) Lisbon" },
    { value: "London", description: "(GMT+00:00) London" },
    { value: "Monrovia", description: "(GMT+00:00) Monrovia" },
    { value: "UTC", description: "(GMT+00:00) UTC" },
    { value: "Amsterdam", description: "(GMT+01:00) Amsterdam" },
    { value: "Belgrade", description: "(GMT+01:00) Belgrade" },
    { value: "Berlin", description: "(GMT+01:00) Berlin" },
    { value: "Bern", description: "(GMT+01:00) Bern" },
    { value: "Bratislava", description: "(GMT+01:00) Bratislava" },
    { value: "Brussels", description: "(GMT+01:00) Brussels" },
    { value: "Budapest", description: "(GMT+01:00) Budapest" },
    { value: "Casablanca", description: "(GMT+01:00) Casablanca" },
    { value: "Copenhagen", description: "(GMT+01:00) Copenhagen" },
    { value: "Dublin", description: "(GMT+01:00) Dublin" },
    { value: "Ljubljana", description: "(GMT+01:00) Ljubljana" },
    { value: "Madrid", description: "(GMT+01:00) Madrid" },
    { value: "Paris", description: "(GMT+01:00) Paris" },
    { value: "Prague", description: "(GMT+01:00) Prague" },
    { value: "Rome", description: "(GMT+01:00) Rome" },
    { value: "Sarajevo", description: "(GMT+01:00) Sarajevo" },
    { value: "Skopje", description: "(GMT+01:00) Skopje" },
    { value: "Stockholm", description: "(GMT+01:00) Stockholm" },
    { value: "Vienna", description: "(GMT+01:00) Vienna" },
    { value: "Warsaw", description: "(GMT+01:00) Warsaw" },
    {
      value: "West Central Africa",
      description: "(GMT+01:00) West Central Africa"
    },
    { value: "Zagreb", description: "(GMT+01:00) Zagreb" },
    { value: "Zurich", description: "(GMT+01:00) Zurich" },
    { value: "Athens", description: "(GMT+02:00) Athens" },
    { value: "Bucharest", description: "(GMT+02:00) Bucharest" },
    { value: "Cairo", description: "(GMT+02:00) Cairo" },
    { value: "Harare", description: "(GMT+02:00) Harare" },
    { value: "Helsinki", description: "(GMT+02:00) Helsinki" },
    { value: "Jerusalem", description: "(GMT+02:00) Jerusalem" },
    { value: "Kaliningrad", description: "(GMT+02:00) Kaliningrad" },
    { value: "Kyiv", description: "(GMT+02:00) Kyiv" },
    { value: "Pretoria", description: "(GMT+02:00) Pretoria" },
    { value: "Riga", description: "(GMT+02:00) Riga" },
    { value: "Sofia", description: "(GMT+02:00) Sofia" },
    { value: "Tallinn", description: "(GMT+02:00) Tallinn" },
    { value: "Vilnius", description: "(GMT+02:00) Vilnius" },
    { value: "Baghdad", description: "(GMT+03:00) Baghdad" },
    { value: "Istanbul", description: "(GMT+03:00) Istanbul" },
    { value: "Kuwait", description: "(GMT+03:00) Kuwait" },
    { value: "Minsk", description: "(GMT+03:00) Minsk" },
    { value: "Moscow", description: "(GMT+03:00) Moscow" },
    { value: "Nairobi", description: "(GMT+03:00) Nairobi" },
    { value: "Riyadh", description: "(GMT+03:00) Riyadh" },
    { value: "St. Petersburg", description: "(GMT+03:00) St. Petersburg" },
    { value: "Tehran", description: "(GMT+03:30) Tehran" },
    { value: "Abu Dhabi", description: "(GMT+04:00) Abu Dhabi" },
    { value: "Baku", description: "(GMT+04:00) Baku" },
    { value: "Muscat", description: "(GMT+04:00) Muscat" },
    { value: "Samara", description: "(GMT+04:00) Samara" },
    { value: "Tbilisi", description: "(GMT+04:00) Tbilisi" },
    { value: "Volgograd", description: "(GMT+04:00) Volgograd" },
    { value: "Yerevan", description: "(GMT+04:00) Yerevan" },
    { value: "Kabul", description: "(GMT+04:30) Kabul" },
    { value: "Ekaterinburg", description: "(GMT+05:00) Ekaterinburg" },
    { value: "Islamabad", description: "(GMT+05:00) Islamabad" },
    { value: "Karachi", description: "(GMT+05:00) Karachi" },
    { value: "Tashkent", description: "(GMT+05:00) Tashkent" },
    { value: "Chennai", description: "(GMT+05:30) Chennai" },
    { value: "Kolkata", description: "(GMT+05:30) Kolkata" },
    { value: "Mumbai", description: "(GMT+05:30) Mumbai" },
    { value: "New Delhi", description: "(GMT+05:30) New Delhi" },
    {
      value: "Sri Jayawardenepura",
      description: "(GMT+05:30) Sri Jayawardenepura"
    },
    { value: "Kathmandu", description: "(GMT+05:45) Kathmandu" },
    { value: "Almaty", description: "(GMT+06:00) Almaty" },
    { value: "Astana", description: "(GMT+06:00) Astana" },
    { value: "Dhaka", description: "(GMT+06:00) Dhaka" },
    { value: "Urumqi", description: "(GMT+06:00) Urumqi" },
    { value: "Rangoon", description: "(GMT+06:30) Rangoon" },
    { value: "Bangkok", description: "(GMT+07:00) Bangkok" },
    { value: "Hanoi", description: "(GMT+07:00) Hanoi" },
    { value: "Jakarta", description: "(GMT+07:00) Jakarta" },
    { value: "Krasnoyarsk", description: "(GMT+07:00) Krasnoyarsk" },
    { value: "Novosibirsk", description: "(GMT+07:00) Novosibirsk" },
    { value: "Beijing", description: "(GMT+08:00) Beijing" },
    { value: "Chongqing", description: "(GMT+08:00) Chongqing" },
    { value: "Hong Kong", description: "(GMT+08:00) Hong Kong" },
    { value: "Irkutsk", description: "(GMT+08:00) Irkutsk" },
    { value: "Kuala Lumpur", description: "(GMT+08:00) Kuala Lumpur" },
    { value: "Perth", description: "(GMT+08:00) Perth" },
    { value: "Singapore", description: "(GMT+08:00) Singapore" },
    { value: "Taipei", description: "(GMT+08:00) Taipei" },
    { value: "Ulaanbaatar", description: "(GMT+08:00) Ulaanbaatar" },
    { value: "Osaka", description: "(GMT+09:00) Osaka" },
    { value: "Sapporo", description: "(GMT+09:00) Sapporo" },
    { value: "Seoul", description: "(GMT+09:00) Seoul" },
    { value: "Tokyo", description: "(GMT+09:00) Tokyo" },
    { value: "Yakutsk", description: "(GMT+09:00) Yakutsk" },
    { value: "Adelaide", description: "(GMT+09:30) Adelaide" },
    { value: "Darwin", description: "(GMT+09:30) Darwin" },
    { value: "Brisbane", description: "(GMT+10:00) Brisbane" },
    { value: "Canberra", description: "(GMT+10:00) Canberra" },
    { value: "Guam", description: "(GMT+10:00) Guam" },
    { value: "Hobart", description: "(GMT+10:00) Hobart" },
    { value: "Melbourne", description: "(GMT+10:00) Melbourne" },
    { value: "Port Moresby", description: "(GMT+10:00) Port Moresby" },
    { value: "Sydney", description: "(GMT+10:00) Sydney" },
    { value: "Vladivostok", description: "(GMT+10:00) Vladivostok" },
    { value: "Magadan", description: "(GMT+11:00) Magadan" },
    { value: "New Caledonia", description: "(GMT+11:00) New Caledonia" },
    { value: "Solomon Is.", description: "(GMT+11:00) Solomon Is." },
    { value: "Srednekolymsk", description: "(GMT+11:00) Srednekolymsk" },
    { value: "Auckland", description: "(GMT+12:00) Auckland" },
    { value: "Fiji", description: "(GMT+12:00) Fiji" },
    { value: "Kamchatka", description: "(GMT+12:00) Kamchatka" },
    { value: "Marshall Is.", description: "(GMT+12:00) Marshall Is." },
    { value: "Wellington", description: "(GMT+12:00) Wellington" },
    { value: "Chatham Is.", description: "(GMT+12:45) Chatham Is." },
    { value: "Nuku'alofa", description: "(GMT+13:00) Nuku'alofa" },
    { value: "Samoa", description: "(GMT+13:00) Samoa" },
    { value: "Tokelau Is.", description: "(GMT+13:00) Tokelau Is." }
  ]
});
