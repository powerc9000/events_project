import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    console.log("hello");
  }

  async createEvent(e) {
    e.preventDefault();
    const form = this.targets.find("form");

    const name = form.name;

    const description = form.description;

    const res = await this.api.Post("/api/create", {
      name,
      description
    });
  }
}
