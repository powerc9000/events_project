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
  async comment(e) {
    e.preventDefault();
    const groupId = this.data.get("groupId");
    const postId = this.data.get("postId");
    const body = this.form.body.value;

    if (!body || this.trix.editor.getDocument().getLength() < 3) {
      this.formControl.error(
        "Your comment is not long enough. It needs to be at least 3 characters long",
        "comment"
      );
      this.trix.editorElement.classList.add("error");

      return;
    }

    if (!groupId || !postId) {
      return;
    }

    this.disableButton("btn");
    this.disableButton("cancel");

    await this.api.Post("/api/groups/createComment", {
      groupId,
      postId,
      body
    });
    this.reset();
    this.page.reload();
  }

  reset = (e) => {
    if (this.style == "open-on-click") {
      this.showTarget("placeholder");
      this.hideTarget("form");
      this.formControl.hide("comment");
    }
    this.form.reset();
  };

  placeholderClick = (e) => {
    e.preventDefault();
    if (this.style == "open-on-click") {
      this.hideTarget("placeholder");
      this.showTarget("form");
      this.trix.editorElement.focus();
    }
  };

  get style() {
    return this.data.get("style") || "";
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
