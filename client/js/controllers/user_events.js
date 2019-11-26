import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    this.setTz();
  }

  async setTz() {
    if (this.userId) {
      await this.api.Post("/api/settings/tz", {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    }
  }

  get userId() {
    return this.data.get("userId");
  }
}
