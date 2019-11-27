import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    const form = this.targets.find("inviteForm");
    this.toggleMethodTarget(form.method.value);
  }
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
    this.toggleTarget("hideContainer");
    this.toggleTarget("canInviteButton");
  }
  toggleMethodTarget(value) {
    const form = this.targets.find("inviteForm");
    form.email.setCustomValidity("");
    form.phone.setCustomValidity("");
    if (value === "email") {
      this.hideTarget("phoneField");
      this.showTarget("emailField");
    } else {
      this.hideTarget("emailField");
      this.showTarget("phoneField");
    }
  }
  selectMethod(e) {
    if (e.target.checked) {
      const value = e.target.value;
      this.toggleMethodTarget(value);
    }
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
    const method = form.method.value;
    const payload = {};

    if (name) {
      payload.name = name;
    }

    if (method === "phone") {
      payload.phone = phone;
      if (!phone) {
        form.phone.setCustomValidity("Phone number is required");
        this.formControl.error("Phone number is required", "invite", true);
        return;
      }
    }

    if (method === "email") {
      payload.email = email;
      if (!email) {
        form.email.setCustomValidity("Email is required");
        this.formControl.error("Email is required", "invite", true);
        return;
      }
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
