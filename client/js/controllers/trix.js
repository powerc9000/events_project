import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    this.element.addEventListener("trix-initialize", this.initTrix);
    document.addEventListener("trix-file-accept", this.trixAttach);
  }
  initTrix = () => {
    Trix.config.blockAttributes.heading1 = { tagName: "h2" };
  };
  trixAttach = (e) => {
    e.preventDefault();
  };

  disconnet() {
    this.element.removeEventListener("trix-initialize", this.initTrix);
    document.removeEventListener("trix-file-accept", this.trixAttach);
  }
}
