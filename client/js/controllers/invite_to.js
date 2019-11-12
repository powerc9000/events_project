import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async inviteChange(e) {
    const form = this.targets.find("inviteForm");
    const email = form.email.value;
    const phone = form.phone.value;

    if (email || phone) {
      form.email.setCustomValidity("");
      form.phone.setCustomValidity("");
      form.reportValidity(true);
    }
  }
  toggleInviteForm() {
    this.toggleTarget("inviteForm");
    this.toggleTarget("canInviteButton");
  }
  async sendInvite(e) {
    e.preventDefault();

    this.formControl.hide("invite");
    const path = this.data.get("path");
    const multiple = this.data.get("multiple") === "true";
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

      this.formControl.error("Email or Phone is required", "invite", true);

      return;
    } else {
      form.email.setCustomValidity("");
      form.phone.setCustomValidity("");
      form.reportValidity(true);
    }

    let final = payload;

    if (multiple) {
      final = {
        invites: [payload]
      };
    }
    const res = await this.api.Post(path, final);

    if (res.ok) {
      this.formControl.success(this.data.get("successMessage"), "invite");
      form.name.value = "";
      form.email.value = "";
      form.phone.value = "";
    } else {
      try {
        const data = await res.json();
        if (data && data.message) {
          this.formControl.error(data.message, "invite");
        }
      } catch (e) {
        console.log(e);
        this.formControl.error("Something went wrong try again", "invite");
      }
    }
  }
}
