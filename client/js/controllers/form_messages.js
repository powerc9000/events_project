import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  success = (event) => {
    const data = event.detail;
    if (data.id === this.data.get("formId")) {
      this.showTarget("success");
      this.targets.find("success").textContent = data.message;
    }
  };

  error = (event) => {
    const data = event.detail;
    if (data.id === this.data.get("formId")) {
      this.showTarget("error");
      this.targets.find("error").textContent = data.message;
    }
  };
  matchesId(event) {
    return event.detail.id === this.data.get("formId");
  }
  hide = (event) => {
    if (this.matchesId(event)) {
      this.hideTarget("error");
      this.hideTarget("success");
    }
  };
}
