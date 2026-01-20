const express = require("express");
const path = require("path");
const fs = require("fs");
const hbs = require("hbs");
const CleanCSS = require("clean-css");
const Terser = require("terser");
const { engine } = require("express-handlebars");
const Handlebars = require("handlebars");

const app = express();

// Register Handlebars engine
app.engine("hbs", engine({
  defaultLayout: false,
  layoutsDir: path.join(__dirname, "views/layouts"),
  partialsDir: path.join(__dirname, "views/partials"),
  extname: ".hbs"
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Register partials
hbs.registerPartials(path.join(__dirname, "views/partials"));

// Directories
const distDir = path.join(__dirname, "dist");
const publicDir = path.join(__dirname, "public");

// Serve static files (dist in production, public in dev)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(distDir));
} else {
  app.use(express.static(publicDir));
}

// Ensure dist folder exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Function to generate static HTML
function generateStaticHTML() {
  const data = { title: "My Express App", message: "Welcome to my Express app with Handlebars!" };
  const templateFile = fs.readFileSync(path.join(__dirname, "views", "index.hbs"), "utf-8");
  const template = Handlebars.compile(templateFile);
  const html = template(data);

  fs.writeFileSync(path.join(distDir, "index.html"), html);
  console.log("Static HTML file has been generated in dist!");
}

// Function to minify CSS
function minifyCSS() {
  const inputCSS = fs.readFileSync(path.join(publicDir, "css", "style.css"), "utf-8");
  const outputCSS = new CleanCSS().minify(inputCSS).styles;

  const cssDir = path.join(distDir, "css");
  if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir);

  fs.writeFileSync(path.join(cssDir, "style.min.css"), outputCSS);
  console.log("CSS file has been minified into dist/css!");
}

// Function to minify JS
function minifyJS() {
  const inputJS = fs.readFileSync(path.join(publicDir, "js", "script.js"), "utf-8");

  Terser.minify(inputJS).then((minified) => {
    if (minified.error) {
      console.error("Error minifying JS:", minified.error);
    } else {
      const jsDir = path.join(distDir, "js");
      if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);

      fs.writeFileSync(path.join(jsDir, "script.min.js"), minified.code);
      console.log("JS file has been minified into dist/js!");
    }
  });
}

// Build static assets
function buildStaticAssets() {
  try {
    generateStaticHTML();
    minifyCSS();
    minifyJS();
  } catch (err) {
    console.error("Build error:", err);
  }
}
buildStaticAssets();

// Route to render index page (dev mode)
app.get("/", (req, res, next) => {
  try {
    res.render("index", { title: "My Express App", message: "Welcome to my Express app with Handlebars!" });
  } catch (err) {
    next(err);
  }
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: "Error",
    message: "Something went wrong!",
    error: err.message
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
