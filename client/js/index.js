const turbolinks = require("turbolinks");
import { Application } from "stimulus";
import { definitionsFromContext } from "stimulus/webpack-helpers";

const context = require("./controllers/*.js");

const app = Application.start();

Object.keys(context).forEach((key) => {
  const item = context[key];
  const snake = key.split("_").join("-");
  if (item.default) {
    app.register(snake, item.default);
  }
});

turbolinks.start();
