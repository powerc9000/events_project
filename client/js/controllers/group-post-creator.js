import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {}
  async post(e) {
    e.preventDefault();
    const body = this.form.body.value;
    if (!body || this.trix.editor.getDocument().getLength() < 3) {
      this.formControl.error(
        "Your post must be at least 3 characters long",
        "create"
      );
      this.trix.editorElement.classList.add("error");
      return;
    }
    this.formControl.hide("create");
    this.disableButton("btn");
    const groupId = this.data.get("groupId");
    await this.api.Post("/api/groups/createPost", {
      groupId,
      body
    });

    this.enableButton("btn");

    this.page.reload();
  }

  get form() {
    return this.targets.find("form");
  }
  get trix() {
    const el = this.targets.find("trix");
    if (!el) {
      return null;
    }

    return el.editorController;
  }
}
