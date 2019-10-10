import { ApplicationController } from "../helpers/application_controller";
import flatpickr from "flatpickr";

export default class extends ApplicationController {
  connect() {
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
      description,
      can_invite: form.can_invite.checked,
      date: new Date(form.date.value).getTime(),
      show_participants: form.show_participants.checked,
      allow_comments: form.allow_comments.checked,
      is_private: form.is_private.checked,
      location: form.location.value
    });

    if (res.ok) {
      const data = await res.json();
      this.page.visit(`/events/${data.slug}`);
    }
  }
}
