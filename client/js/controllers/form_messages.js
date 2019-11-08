import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  success = (event) => {
    const data = event.detail;
    if (data.id === this.data.get("formId")) {
      this.showTarget("success");
      this.targets.find("success").textContent = data.message;
      this.autoHide();
    }
  };

  error = (event) => {
    const data = event.detail;
    if (data.id === this.data.get("formId")) {
      this.showTarget("error");
      this.targets.find("error").textContent = data.message;
      this.autoHide(data.ignoreHide);
    }
  };
  info = (event) => {
    this.showField(event, "info");
  };
  showField(event, target) {
    if (this.matchesId(event)) {
      const data = event.detail;
      this.showTarget(target);
      this.targets.find(target).textContent = event.detail.message;
      this.autoHide(data.ignoreHide);
    }
  }
  autoHide(ignore) {
    if (this.data.get("autoHide") && !ignore) {
      const duration = parseInt(this.data.get("autoHide"), 10);

      setTimeout(() => {
        this._hide();
      }, duration);
    }
  }
  matchesId(event) {
    return event.detail.id === this.data.get("formId");
  }
  _hide() {
    this.hideTarget("error");
    this.hideTarget("success");
  }
  hide = (event) => {
    if (this.matchesId(event)) {
      this._hide();
    }
  };
}
