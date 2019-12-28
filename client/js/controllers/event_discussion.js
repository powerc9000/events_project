import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async createComment(e) {
    e.preventDefault();
    const form = this.targets.find("form");

    const body = form.body.value;
    const parent_comment = form.parent_comment.value;
    const event_id = form.event_id.value;

    const res = await this.api.Post(`/api/events/${event_id}/comments`, {
      body,
      parent: parent_comment || null
    });

    if (res.ok) {
      form.reset();
      this.page.reload();
    }
  }
  toggleForm() {
    this.toggleTarget("form");
    this.toggleTarget("commentFormToggle");
  }
  async deleteComment(e) {
    const button = e.currentTarget;
    const id = button.dataset.commentId;
    const event_id = this.data.get("eventId");

    if (id) {
      const req = await this.api.Delete(
        `/api/events/${event_id}/comments/${id}`
      );

      if (req.ok) {
        console.log("did it");
        this.page.reload();
      } else {
        const error = await req.json();
        console.log("error", error);
        //Errror
      }
    }
  }
  resetForm() {
    this.toggleTarget("form");
    this.toggleTarget("commentFormToggle");
  }
}
