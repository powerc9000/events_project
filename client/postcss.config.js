const tailwindcss = require("tailwindcss");
const nested = require("postcss-nested");
const purgecss = require("@fullhuman/postcss-purgecss")({
  // Specify the paths to all of the template files in your project
  content: ["./templates/**/*.ejs", "./templates/**/*.md"],
  whitelist: ["justify-end", "expanded", "img"],
  whitelistPatternsChildren: [
    /^token/,
    /^pre/,
    /^code/,
    /^line-numbers/,
    /^language-json/
  ],

  // Include any special characters you're using in this regular expression
  defaultExtractor: (content) => content.match(/[A-Za-z0-9-_:/]+/g) || []
});
let purge = [];

console.log(process.env.NODE_ENV);

if (process.env.NODE_ENV === "production") {
  console.log("production using purgecss");
  purge = [purgecss];
}
module.exports = {
  plugins: [
    nested,
    tailwindcss("./tailwind.js"),
    require("autoprefixer"),
    ...purge
  ]
};
