import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    const form = this.targets.find("rsvpForm");
    const show_name = form.show_name.checked;
    const hasRSVPd = form.rsvp.value;
    if (show_name && hasRSVPd) {
      this.showTarget("privateInfo");
    } else {
      this.hideTarget("privateInfo");
    }
  }
  toggleInviteForm() {
    this.toggleTarget("inviteForm");
  }
  async sendInvite(e) {
    e.preventDefault();
    const form = this.targets.find("inviteForm");
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

    if (!email && !phone) {
      form.email.setCustomValidity("Email or Phone is required");
      form.phone.setCustomValidity("Email or Phone is required");

      return;
    }

    const eventId = form.eventId.value;

    const res = await this.api.Post(`/api/events/${eventId}/invite`, {
      invites: [payload]
    });

    if (res.ok) {
      this.showTarget("inviteSent");
      setTimeout(() => {
        this.hideTarget("inviteSent");
      }, 5000);
      form.reset();
    }
  }

  async rsvp() {
    const form = this.targets.find("rsvpForm");

    const rsvp = form.rsvp.value;
    const show_name = form.show_name.checked;
    const eventId = form.eventId.value;

    await this.api.Post(`/api/events/${eventId}/rsvp`, {
      status: rsvp,
      show_name: !show_name
    });

    if (show_name) {
      this.showTarget("privateInfo");
    } else {
      this.hideTarget("privateInfo");
    }
  }

  disconnect() {
    this.hideTarget("inviteSent");
  }
}
