import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async close(e) {
    e.preventDefault();
    this.api.Post("/api/settings/view_message", {
      id: this.id
    });
    this.element.parentNode.removeChild(this.element);
  }
  get id() {
    return this.data.get("id");
  }
}
