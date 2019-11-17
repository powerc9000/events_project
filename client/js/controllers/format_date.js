import { ApplicationController } from "../helpers/application_controller";
import { format } from "date-fns";

export default class extends ApplicationController {
  connect() {
    const dateEl = this.targets.find("date");
    const value = this.data.get("epoch");
    console.log(value);
    dateEl.textContent = format(new Date(parseInt(value, 10)), "PPpp");
  }
}
