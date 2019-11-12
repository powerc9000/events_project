import { ApplicationController } from "../helpers/application_controller";

let loaded = false;
export default class extends ApplicationController {
  connect() {
    if (!loaded) {
      this.loadTrix();
    }
    this.element.addEventListener("trix-initialize", this.initTrix);
    document.addEventListener("trix-file-accept", this.trixAttach);
  }
  loadTrix() {
    loaded = true;
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/trix/1.2.0/trix-core.js";

    document.body.appendChild(script);
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
