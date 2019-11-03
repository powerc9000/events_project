import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async logout() {
    await this.api.Post("/logout");

    this.page.replace("/");
  }
}
