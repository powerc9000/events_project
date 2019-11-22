import { ApplicationController } from "../helpers/application_controller";
import { format } from "date-fns";

export default class extends ApplicationController {
  connect() {
    const form = this.targets.find("form");
    const eventTime = this.data.get("eventDate");

    if (eventTime) {
      const date = new Date(parseInt(eventTime, 10));

      const day = format(date, "yyyy-LL-dd");
      const time = format(date, "HH:mm");

      form.date.value = day;
      form.time.value = time;
    }
  }
  async formInput() {
    const form = this.targets.find("form");

    [...form.elements].forEach((el) => {
      if (el.setCustomValidity) {
        el.setCustomValidity("");
      }
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

    if (form.date.value || form.time.value) {
      if (!form.time.value) {
        this.formControl.error("Time is required when a date is set", "create");
        form.time.setCustomValidity("Please input a time");
        return;
      } else if (!form.date.value) {
        this.formControl.error("Date is required when a time is set", "create");
        form.date.setCustomValidity("Please input a date");
        return;
      }
      const date = form.date.value;
      const time = form.time.value;

      const dateString = `${date}T${time}`;

      payload.date = new Date(dateString).getTime();
    }

    if (form.group_id && form.group_id.value) {
      payload.group_id = form.group_id.value;
    }
    let extra = "";
    if (form.edited_event && form.edited_event.value) {
      extra = `/${form.edited_event.value}`;
    }

    const base = "/api/events";

    const res = await this.api.Post(`${base}${extra}`, payload);

    if (res.ok) {
      const data = await res.json();
      this.page.visit(`/events/${data.slug}`);
    } else {
      try {
        const data = await res.json();
        this.formControl.error(data.message, "create");
      } catch (e) {
        this.formControl.error(
          "Something went wrong please try again",
          "create"
        );
      }
    }
  }
}
