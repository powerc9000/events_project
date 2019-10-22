import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    document.addEventListener("form:success", this.success);
    document.addEventListener("form:error", this.error);
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
    console.log(data.id, this.data.get("formId"));
    if (data.id === this.data.get("formId")) {
      this.showTarget("error");
      this.targets.find("error").textContent = data.message;
    }
  };

  disconnect() {
    document.removeEventListener("form:success", this.success);
    document.removeEventListener("form:error", this.error);
  }
}
