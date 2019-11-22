import { ApplicationController } from "../helpers/application_controller";
import { format, addHours, formatISO } from "date-fns";

function getGMTOffset() {
  const tz = new Date().getTimezoneOffset();

  const sign = tz < 0 ? "+" : "-";
  const offset = Math.abs(tz);
  // offset/60 | 0 turns it into an integer
  const hours = `${(offset / 60) | 0}`.padStart(2, "0");
  const minutes = `${offset % 60}`.padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

export default class extends ApplicationController {
  connect() {
    const form = this.targets.find("form");
    const eventTime = this.data.get("eventDate");
    const endTime = this.data.get("endDate");

    if (eventTime) {
      const { day, time } = this.splitDateAndTime(eventTime);
      form.date.value = day;
      form.time.value = time;
    }

    if (endTime) {
      const { day, time } = this.splitDateAndTime(endTime);
      form.end_date.value = day;
      form.end_time.value = time;
    }
  }
  splitDateAndTime(value) {
    const date = new Date(parseInt(value, 10));

    const day = formatISO(date, { representation: "date" });
    const time = formatISO(date, { representation: "time" });

    return { day, time };
  }
  async formInput() {
    const form = this.targets.find("form");

    [...form.elements].forEach((el) => {
      if (el.setCustomValidity) {
        el.setCustomValidity("");
      }
    });

    if (
      form.date.value &&
      form.time.value &&
      !form.end_date.value &&
      !form.end_time.value &&
      !this.editing
    ) {
      const updated = addHours(
        new Date(`${form.date.value}T${form.time.value}${getGMTOffset()}`),
        1
      );

      form.end_date.value = formatISO(updated, { representation: "date" });
      form.end_time.value = formatISO(updated, { representation: "time" });
    }
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

      const dateString = `${date}T${time}${getGMTOffset()}`;
      console.log(dateString, new Date(dateString));
      payload.date = new Date(dateString).getTime();
    }

    if (payload.date && (form.end_date.value || form.end_time.value)) {
      if (!form.end_date.value && form.end_time.value) {
        payload.end_date = setHours(
          startOfDay(new Date(payload.date)),
          form.end_time.value
        ).getTime();
      }

      if (form.end_date.value && form.end_time.value) {
        payload.end_date = new Date(
          `${form.end_date.value}T${form.end_time.value}${getGMTOffset()}`
        ).getTime();
      }
    } else if (payload.date && !this.editing) {
      payload.end_date = addHours(new Date(payload.date), 1).getTime();
    }

    if (form.group_id && form.group_id.value) {
      payload.group_id = form.group_id.value;
    }
    let extra = "";

    if (this.editing) {
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

  get editing() {
    console.log(this.data.get("editing"));
    return this.data.get("editing") === "true";
  }
}
