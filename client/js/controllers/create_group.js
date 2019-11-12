import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async submit(e) {
    e.preventDefault();
    const form = this.targets.find("form");
    const name = form.name.value;
    const description = form.description.value;
    const custom_path = form.custom_path.value;
    const is_private = form.is_private.checked;
    const allow_inviting = form.allow_inviting.checked;

    const payload = { name, is_private, allow_inviting };

    if (description) {
      payload.description = description;
    }

    if (custom_path) {
      payload.custom_path = custom_path;
    }
    let path = "/api/groups";

    if (form.group_id.value) {
      path += `/${form.group_id.value}`;
    }
    const req = await this.api.Post(path, payload);
    const res = await req.json();

    if (req.ok) {
      const part = res.custom_path || res.id;

      this.page.replace(`/groups/${part}`);
    } else {
      console.log(res);
    }
  }
  customChanged(e) {
    const customPath = this.targets.find("customPath");

    customPath.value = e.target.value.toLowerCase();
  }
}
