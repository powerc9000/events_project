import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  toggle(e) {
    const menu = this.targets.find("menu");

    menu.classList.toggle("sm:hidden");
  }
}
