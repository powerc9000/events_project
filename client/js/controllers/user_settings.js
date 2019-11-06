import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  saveSettings(e) {
    e.preventDefault();

    const form = this.targets.find("form");

    const name = form.name.value;
    const email = form.email.value;
    const phone = form.phone.value;

    const payload = {};

    if (name) {
      payload.name = name;
    }
    if (email) {
      payload.email = email;
    }
    if (phone) {
      payload.phone = phone;
    }
  }
}
