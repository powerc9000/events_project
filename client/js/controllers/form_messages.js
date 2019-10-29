import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    document.addEventListener("form:success", this.success);
    document.addEventListener("form:error", this.error);
    document.addEventListener("form:hide", this.hide);
  }

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

  disconnect() {
    document.removeEventListener("form:hide", this.hide);
    document.removeEventListener("form:success", this.success);
    document.removeEventListener("form:error", this.error);
  }
}
