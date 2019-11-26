import { ApplicationController } from "../helpers/application_controller";
import { getDayOfYear, format } from "date-fns";

export default class extends ApplicationController {
  connect() {
    let lastDay = 0;
    let nth = 0;
    const timezone = this.data.get("userTz");
    if (timezone) {
      return;
    }
    const colors = this.data.get("colors").split(",");

    const titleTemplate = this.targets.find("titleTemplate");

    this.targets.findAll("event").forEach((event) => {
      const date = new Date(parseInt(event.dataset.date, 10));
      const day = getDayOfYear(date);

      if (day !== lastDay) {
        const dayTitle = titleTemplate.cloneNode();
        dayTitle.dataset.target = dayTitle.dataset.newTarget;
        dayTitle.classList.remove("hidden");
        dayTitle.classList.add(colors[nth % colors.length].trim());
        dayTitle.textContent = format(date, "PP");

        event.parentNode.insertBefore(dayTitle, event);
        lastDay = day;
        nth++;
      }
    });
  }
}
