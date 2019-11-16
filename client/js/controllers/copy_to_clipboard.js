import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  static targets = ["input"];

  copy() {
    console.log(this.hasInputTarget);
    this.inputTarget.select();
    document.execCommand("copy");
    this.formControl.info("Copied to clipboard", "copy");
  }
}
