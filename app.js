const express = require("express");
const path = require("path");
const fs = require("fs");
const { engine } = require("express-handlebars");
const Handlebars = require("handlebars");
const sass = require("sass");
const Terser = require("terser");
const crypto = require("crypto");
const { PurgeCSS } = require("purgecss");
const CleanCSS = require("clean-css");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handlebars engine (used for section partials)
app.engine("hbs", engine({
  extname: ".hbs",
  layoutsDir: path.join(__dirname, "views/layouts"),
  partialsDir: path.join(__dirname, "views/partials")
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

const distDir = path.join(__dirname, "dist");
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Serve generator UI and other static assets from public/
app.use(express.static(publicDir));

// Serve generated sites 
app.use("/dist", express.static(path.join(__dirname, "dist")));

// Generate unique site ID
function generateId() {
  return "site-" + crypto.randomBytes(4).toString("hex");
}

// Generate HTML
function generateStaticHTML(sections, siteDir) {
  const templateFile = fs.readFileSync(path.join(__dirname, "views/index.hbs"), "utf-8");
  const template = Handlebars.compile(templateFile);

  let content = "";
  sections.forEach(section => {
    const partialPath = path.join(__dirname, `views/partials/${section}.hbs`);
    if (fs.existsSync(partialPath)) {
      content += fs.readFileSync(partialPath, "utf-8");
    }
  });

  const html = template({ title: "Custom Site", body: content, year: new Date().getFullYear() });
  fs.writeFileSync(path.join(siteDir, "index.html"), html);
  console.log("✅ HTML generated");
}

// Compile Bootstrap with overrides
function buildBootstrapCSS(config, siteDir) {
  const scss = `
    @use "bootstrap" with (
      $primary: ${config.primaryColor || "#007bff"},
      $font-family-base: "${config.fontFamily || "Arial, sans-serif"}",
    );
  `;

  const result = sass.compileString(scss, {
    style: "compressed",
    loadPaths: [path.join(__dirname, "node_modules/bootstrap/scss")],
    quietDeps: true
  });

  const cssDir = path.join(siteDir, "css");
  if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir);
  const cssPath = path.join(cssDir, "style.min.css");
  fs.writeFileSync(cssPath, result.css);
  console.log("✅ Bootstrap CSS built with overrides");
  return cssPath;
}

// Optimize CSS (remove unused selectors + minify)
async function optimizeCSS(siteDir, cssPath) {
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const purgeCSSResult = await new PurgeCSS().purge({
    content: [path.join(siteDir, "index.html"), path.join(siteDir, "js/script.min.js")],
    css: [{ raw: cssContent }]
  });
  const optimizedCSS = new CleanCSS({ level: 2 }).minify(purgeCSSResult[0].css).styles;
  fs.writeFileSync(cssPath, optimizedCSS);
  console.log("✅ CSS optimized (unused selectors removed + minified)");
}

// Minify JS
async function minifyJS(siteDir) {
  const inputJS = fs.readFileSync(path.join(publicDir, "js/script.js"), "utf-8");
  const minified = await Terser.minify(inputJS);
  if (!minified.error) {
    const jsDir = path.join(siteDir, "js");
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir);
    const jsPath = path.join(jsDir, "script.min.js");
    fs.writeFileSync(jsPath, minified.code);
    console.log("✅ JS minified");
    return jsPath;
  }
}

// API endpoint to build site
app.post("/build", async (req, res) => {
  const { sections, bootstrapConfig } = req.body;
  try {
    const siteId = generateId();
    const siteDir = path.join(distDir, siteId);
    fs.mkdirSync(siteDir, { recursive: true });

    generateStaticHTML(sections, siteDir);
    const cssPath = buildBootstrapCSS(bootstrapConfig, siteDir);
    const jsPath = await minifyJS(siteDir);
    await optimizeCSS(siteDir, cssPath);

    res.json({ success: true, message: "Site built successfully!", output: `/dist/${siteId}/index.html` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Default route just serves generator.html from public/
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "generator.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
