import { ApplicationController } from "../helpers/application_controller";

export default class extends ApplicationController {
  connect() {
    window.onSignIn = this.onSignIn;
  }

  onSignIn = async (res) => {
    console.log(res.getAuthResponse().id_token);

    await this.api.Post("/api/login/google", {
      token: res.getAuthResponse().id_token
    });

    gapi.auth2.getAuthInstance().signOut();

    this.page.replace("/");
  };
}
