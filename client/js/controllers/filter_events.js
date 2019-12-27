import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  updateFilters() {
    const form = this.targets.find("controls");

    const query = new URLSearchParams();

    if (form.creator_only.checked) {
      query.set("creator", 1);
    } else {
      query.delete("creator");
    }

    if (form.max_age.value) {
      query.set("maxage", form.max_age.value);
    } else {
      query.delete("maxage");
    }

    if (form.max_until.value) {
      query.set("maxuntil", form.max_until.value);
    } else {
      query.delete("maxuntil");
    }

    this.page.visit(`/events?${query.toString()}`);
  }
}
