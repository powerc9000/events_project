import { ApplicationController } from "../helpers/application_controller";
import flatpickr from "flatpickr";

export default class extends ApplicationController {
  connect() {
    flatpickr(this.targets.find("datepicker"), {
      enableTime: true,
      dateFormat: "m/d/Y h:i K"
    });
  }
  async createEvent(e) {
    e.preventDefault();
    const form = this.targets.find("form");

    const name = form.name.value;

    const description = form.description.value;

    const payload = {
      name,
      description,
      can_invite: form.can_invite.checked,
      show_participants: form.show_participants.checked,
      allow_comments: form.allow_comments.checked,
      is_private: form.is_private.checked,
      location: form.location.value
    };

    if (form.date.value) {
      payload.date = new Date(form.date.value).getTime();
    }

    if (form.group_id && form.group_id.value) {
      payload.group_id = form.group_id.value;
    }
    let extra = "";
    if (form.edited_event && form.edited_event.value) {
      extra = `/${form.edited_event.value}`;
    }

    console.log(form.edited_event, extra);

    const base = "/api/events";

    const res = await this.api.Post(`${base}${extra}`, payload);

    if (res.ok) {
      const data = await res.json();
      this.page.visit(`/events/${data.slug}`);
    }
  }
}
