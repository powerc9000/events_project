import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    const form = this.targets.find("rsvpForm");
    if (form) {
      const show_name = form.show_name.checked;
      const hasRSVPd = form.rsvp.value;
      if (show_name && hasRSVPd) {
        this.showTarget("privateInfo");
      } else {
        this.hideTarget("privateInfo");
      }
    }
  }
  async changeRSVP(e) {
    e.preventDefault(e);
    this.toggleRSVP();
  }

  toggleRSVP() {
    this.toggleTarget("hasRSVP");
    this.toggleTarget("rsvpForm");
  }
  async deleteEvent(e) {
    const yes = confirm(
      "Are you sure you want to delete this event? It cannot be undone"
    );

    if (yes) {
      const eventId = this.data.get("eventId");
      await this.api.Delete(`/api/events/${eventId}`);
      this.page.replace("/");
    }
  }

  async rsvp(e) {
    e.preventDefault();
    this.formControl.hide("rsvp");
    const form = this.targets.find("rsvpForm");
    const params = new URL(document.location).searchParams;

    const emailOrPhoneEl = form.email_or_phone;
    const rsvp = form.rsvp.value;
    const hide_name = form.show_name.checked;
    const eventId = form.eventId.value;
    const response_message = form.response.value;

    if (!rsvp) {
      return;
    }

    const payload = {
      status: rsvp,
      show_name: !hide_name
    };

    if (form.name.value) {
      payload.name = form.name.value;
    }

    if (params.get("event_key")) {
      payload.event_key = params.get("event_key");
    }

    if (emailOrPhoneEl) {
      if (!emailOrPhoneEl.value) {
        this.formControl.error("You must provide a phone or an email", "rsvp");
        return;
      } else {
        payload.email_or_phone = emailOrPhoneEl.value;
      }
    }

    if (response_message) {
      payload.response = response_message;
    }

    await this.api.Post(`/api/events/${eventId}/rsvp`, payload);
    this.formControl.success("RSVP saved!", "rsvp");
    this.page.reload();
    this.hideTarget("rsvpForm");
    if (hide_name) {
      this.showTarget("privateInfo");
    } else {
      this.hideTarget("privateInfo");
    }
  }

  async resend(e) {
    const target = e.target;
    this.formControl.hide("resend");

    const invite = target.dataset.id;

    const res = await this.api.Post(`/api/invites/${invite}/resend`);

    if (res.ok) {
      this.formControl.success("Invite Resent!", "resend");
    }
  }

  disconnect() {
    this.hideTarget("inviteSent");
  }
}
