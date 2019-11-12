import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  toggleInvite() {
    this.toggleTarget("inviteForm");
  }

  async sendInvite(e) {
    e.preventDefault();
    const form = this.targets.find("inviteForm");
    const path = this.data.get("path");
    const name = form.name.value;
    const email = form.email.value;
    const phone = form.phone.value;
    const groupId = form.groupId.value;

    if (email || phone) {
      const payload = {};

      if (email) {
        payload.email = email;
      }
      if (phone) {
        payload.phone = phone;
      }
      if (name) {
        payload.name = name;
      }

      const res = await this.api.Post(path, payload);

      if (res.ok) {
        this.formControl.success("User Added to Group", "group-invite");
        form.reset();
      } else {
        const data = await res.json();
        this.formControl.error(data.message, "group-invite");
      }
    } else {
      console.log("bad data");
    }
  }
}
