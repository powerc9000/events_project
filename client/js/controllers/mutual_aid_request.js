import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  updateName(e) {
    const val = e.target.value;
    if (val && val != this.requestData["volunteer"]) {
      this.showTarget("saveName");
    } else {
      this.hideTarget("saveName");
    }
  }
  async save(e) {
    const val = this.name.value;

    this.disableButton("saveName");
    if (val) {
      const req = await this.api.Post("/api/mutual-aid/update-volunteer", {
        volunteer: val,
        id: this.requestData.id
      });
      this.enableButton("saveName");
      const result = await req.json();
      if (result.status === "active") {
        this.page.visit(
          `/mutual-aid?status=active#request-id-${this.requestData.id}`
        );
      }
    }
  }

  get name() {
    return this.targets.find("name");
  }

  get requestData() {
    return JSON.parse(this.data.get("data"));
  }
}
