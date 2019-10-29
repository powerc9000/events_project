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

    this.formControl.hide("invite");
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
      this.formControl.success("Invite Sent!", "invite");
      setTimeout(() => {
        this.formControl.hide("invite");
      }, 4000);
      form.reset();
    }
  }

  async rsvp(e) {
    e.preventDefault();
    this.formControl.hide("rsvp");
    const form = this.targets.find("rsvpForm");

    const rsvp = form.rsvp.value;
    const hide_name = form.show_name.checked;
    const eventId = form.eventId.value;

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

    await this.api.Post(`/api/events/${eventId}/rsvp`, payload);
    this.formControl.success("RSVP saved!", "rsvp");
    if (hide_name) {
      this.showTarget("privateInfo");
    } else {
      this.hideTarget("privateInfo");
    }
  }

  disconnect() {
    this.hideTarget("inviteSent");
  }
}
