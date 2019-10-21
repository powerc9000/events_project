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
let errorCount = 0;
const start = async () => {
  const bundler = new Bundler(entryFiles, options);

  bundler.on("buildEnd", () => {
    errorCount = 0;
    const postBuildFile = Path.join(process.cwd(), "./scripts/copy-static.sh");
    console.log(`running: ${postBuildFile}`);
    const stdout = execSync(`${postBuildFile}`);
    // Do things with stdout
  });

  bundler.on("buildError", async (err) => {
    errorCount++;
    if (errorCount < 10) {
      await bundler.stop();
      console.log("error detected restarting");
      setTimeout(start, 1000);
    } else {
      console.log("Persistant error stopping");
    }
  });

  const bundle = await bundler.bundle();
};

start();
