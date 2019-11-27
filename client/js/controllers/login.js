import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async login(e) {
    e.preventDefault();
    const form = this.targets.find("form");
    const payload = {};
    const email = form.email.value;
    const phone = form.phone.value;

    if (email || phone) {
      const url = this.data.get("action");
      let type;
      if (email) {
        type = "email";
        payload.email = email;
      } else {
        type = "phone";
        payload.phone = phone;
      }
      const req = await this.api.Post(`${url}/${type}`, payload);

      if (req.ok) {
        const data = await req.json();
        this.page.visit(`/login/${data.type}`);
      } else {
        const err = await req.json();
        this.formControl.error(err.message, "login");
      }
    }
  }
}
