import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async createEvent(e) {
    e.preventDefault();
    const form = this.targets.find("form");

    const name = form.name.value;

    const description = form.description.value;

    const res = await this.api.Post("/api/events", {
      name,
      description
    });

    if (res.ok) {
      const data = await res.json();
      this.page.visit(`/events/${data.slug}`);
    }
  }
}
