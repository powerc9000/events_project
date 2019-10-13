const PhoneNumber = require("awesome-phonenumber");

module.exports = {
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
      console.log(e);
    }
  }
};
