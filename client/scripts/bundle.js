const Bundler = require("parcel-bundler");
const Path = require("path");
const { execSync } = require("child_process");

const entryFiles = [
  Path.join(process.cwd(), "./css/main.css"),
  Path.join(process.cwd(), "./js/index.js")
];

const options = {
  outDir: "./build",
  publicUrl: "/static/",
  watch: true,
  minify: false
};

(async () => {
  console.log(entryFiles);
  const bundler = new Bundler(entryFiles, options);

  bundler.on("buildEnd", () => {
    const postBuildFile = Path.join(process.cwd(), "./scripts/copy-static.sh");
    console.log(`running: ${postBuildFile}`);
    const stdout = execSync(`${postBuildFile}`);
    // Do things with stdout
  });

  const bundle = await bundler.bundle();
})();
