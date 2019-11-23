import { ApplicationController } from "../helpers/application_controller";
import { format, isSameDay } from "date-fns";

export default class extends ApplicationController {
  connect() {
    const dateEl = this.targets.find("date");
    const value = new Date(parseInt(this.data.get("epoch"), 10));
    let formatString = "PPpp";
    if (this.data.has("formatType")) {
      if (this.data.get("formatType") === "time-if-same-day") {
        const compare = new Date(parseInt(this.data.get("compare"), 10));
        if (isSameDay(value, compare)) {
          formatString = "p";
        }
      }
    }
    if (this.data.has("formatString")) {
      formatString = this.data.get("formatString");
    }
    dateEl.textContent = format(value, formatString);
  }
}
