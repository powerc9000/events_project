import { ApplicationController } from "../helpers/application_controller";
import { format } from "date-fns";

export default class extends ApplicationController {
  connect() {
    console.log("hello");
    const dateEl = this.targets.find("date");
    const value = this.data.get("epoch");
    dateEl.textContent = format(new Date(parseInt(value, 10)), "PPpp");
  }
}
