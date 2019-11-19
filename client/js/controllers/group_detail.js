import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  toggleInvite() {
    this.toggleTarget("inviteForm");
  }

  async toggleUpdate(e) {
    const forms = this.targets.findAll("roleForms");

    forms.forEach(() => {
      forms.classList.add("hidden");
    });
    const id = e.target.dataset.for;
    const form = document.getElementById(id);

    console.log(form);

    form.classList.remove("hidden");
  }

  async updateRole(e) {
    let target = e.target;
    if (target.form) {
      target = target.form;
    }

    const user = target.dataset.user;

    if (user) {
      const id = this.data.get("id");
      const req = await this.api.Post(`/api/groups/${id}/members/${user}`, {
        role: target.role.value
      });

      if (req.ok) {
        this.formControl.success("User role updated", "management");
        this.page.reload();
      } else {
        const res = await req.json();
        this.formControl.error(res.message, "management");
        target.reset();
      }
    }
  }
}
