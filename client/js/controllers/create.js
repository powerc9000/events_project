import { ApplicationController } from "../helpers/application_controller";
import flatpickr from "flatpickr";

export default class extends ApplicationController {
  connect() {
    console.log(flatpickr);
    flatpickr(this.targets.find("datepicker"), {
      enableTime: true,
      dateFormat: "Y-m-d H:i"
    });
  }
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
