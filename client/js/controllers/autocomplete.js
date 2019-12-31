import { ApplicationController } from "../helpers/application_controller";
import { fuzzy_match } from "../helpers/fuzzy_match";

export default class extends ApplicationController {
  connect() {
    try {
      this.people = JSON.parse(this.data.get("completions"));
      this.template = this.targets.find("liTemplate").cloneNode();
      if (!this.people) {
        this.inactive = true;
      }
    } catch (e) {
      this.inactive = true;
    }
  }
  focus() {
    const input = this.targets.find("input");

    if (input.value && !this.inactive) {
      this.showTarget("results");
    }
  }
  checkOffClick(e) {
    let target = e.target;
    const parent = this.targets.find("parent");

    while (target !== document) {
      if (target === parent) {
        this.noBlur = true;
        return;
      }
      target = target.parentNode;
    }

    this.noBlur = false;
  }
  offClick(e) {
    this.noBlur = false;
  }
  blur(e) {
    if (!this.noBlur) {
      this.hideTarget("results");
    }
  }
  selectUser(e) {
    const li = e.currentTarget;
    if (li && li.dataset.value) {
      const value = li.dataset.value;
      this.hideTarget("results");
      const hidden = this.targets.find("value");
      const input = this.targets.find("input");
      const selected = this.people.find((person) => {
        return person.id === value;
      });
      input.value = selected.name || selected.phone || selected.email;
      hidden.value = value;
      const event = new Event("change");

      hidden.dispatchEvent(event);
    }
  }
  fuzzyMatch(search) {
    const matches = this.people.filter((person) => {
      const name = fuzzy_match(search, person.name || "");
      const email = fuzzy_match(search, person.email || "");
      const phone = fuzzy_match(search, person.phone || "");

      return name[0] || email[0] || phone[0];
    });
    const ul = this.targets.find("results");
    ul.innerHTML = "";
    matches.forEach((match, index) => {
      const li = this.template.cloneNode();
      li.innerText = `${match.name} ${match.email || ""} ${match.phone || ""}`;
      li.dataset.value = match.id;
      ul.appendChild(li);
    });
  }
  input(e) {
    if (this.inactive) return;
    const value = e.target.value;
    if (value) {
      this.fuzzyMatch(value);
      this.showTarget("results");
    } else {
      this.hideTarget("results");
    }
  }
}
