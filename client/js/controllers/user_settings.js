import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  async saveSettings(e) {
    e.preventDefault();

    const form = this.targets.find("form");

    const name = form.name;
    const email = form.email;
    const phone = form.phone;
    const timezone = form.timezone;

    const payload = {};

    if (name.value && name.value !== name.defaultValue) {
      payload.name = name.value;
    }
    if (email.value && email.value !== email.defaultValue) {
      payload.email = email.value;
    }
    if (phone.value && phone.value !== email.defaultValue) {
      payload.phone = phone.value;
    }
    if (timezone.value && timezone.value !== timezone.defaultValue) {
      payload.timezone = timezone.value;
    }

    if (Object.keys(payload).length) {
      const res = await this.api.Post(`/api/settings`, payload);

      if (res.ok) {
        const data = await res.json();
        this.formControl.success("Settings saved!", "user-settings");
        console.log(data);
        if (data.must_validate && data.must_validate.length) {
          this.formControl.info(
            `We've sent you links to validate your ${data.must_validate.join(
              " and"
            )}. Please follow the links to complete set up.`,
            "user-settings"
          );
        }
      }
    }
  }
}
