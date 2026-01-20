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
function generateStaticHTML(sections, siteDir, siteId) {
  // Load base template
  const templateFile = fs.readFileSync(
    path.join(__dirname, "views/index.hbs"),
    "utf-8"
  );
  const template = Handlebars.compile(templateFile);

  // Load section registry
  const sectionsFile = path.join(__dirname, "sections.json");
  const allSections = fs.existsSync(sectionsFile)
    ? JSON.parse(fs.readFileSync(sectionsFile, "utf-8"))
    : [];

  // Build page content
  let content = "";
  const metaSections = [];

  sections.forEach(sectionName => {
    const sectionDef = allSections.find(s => s.name === sectionName);
    if (sectionDef) {
      const partialPath = path.join(__dirname, "views/partials", sectionDef.file);
      if (fs.existsSync(partialPath)) {
        const snippet = fs.readFileSync(partialPath, "utf-8");
        content += snippet;
        metaSections.push({
          name: sectionDef.name,
          label: sectionDef.label,
          category: sectionDef.category,
          file: sectionDef.file,
          content: snippet
        });
      }
    }
  });

  // Compile final HTML
  const html = template({
    title: "Custom Site",
    body: content,
    year: new Date().getFullYear()
  });
  fs.writeFileSync(path.join(siteDir, "index.html"), html);

  console.log("✅ HTML generated");
  return metaSections; // return metadata to /build
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

    // Generate HTML and get section metadata
    const metaSections = generateStaticHTML(sections, siteDir, siteId);

    // Build CSS/JS
    const cssPath = buildBootstrapCSS(bootstrapConfig, siteDir);
    const jsPath = await minifyJS(siteDir);
    await optimizeCSS(siteDir, cssPath);

    // Write meta.json here (with bootstrapConfig)
    const meta = {
      id: siteId,
      title: "Custom Site",
      header: { navItems: ["Home", "About", "Contact"] },
      sections: metaSections,
      footer: { text: `© ${new Date().getFullYear()} My Static Site Generator` },
      bootstrapConfig
    };
    fs.writeFileSync(
      path.join(siteDir, "meta.json"),
      JSON.stringify(meta, null, 2)
    );

    // Update global sites.json log
    const logFile = path.join(__dirname, "sites.json");
    let sites = [];
    if (fs.existsSync(logFile)) {
      sites = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    }
    sites.push({
      id: siteId,
      path: `/dist/${siteId}/index.html`,
      timestamp: new Date().toISOString(),
      sections,
      bootstrapConfig
    });
    fs.writeFileSync(logFile, JSON.stringify(sites, null, 2));

    res.json({
      success: true,
      message: "Site built successfully!",
      output: `/dist/${siteId}/index.html`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});



// Default route just serves generator.html from public/
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "generator.html"));
});

app.get("/sections", (req, res) => {
  const sectionsFile = path.join(__dirname, "sections.json");
  if (fs.existsSync(sectionsFile)) {
    const sections = JSON.parse(fs.readFileSync(sectionsFile, "utf-8"));
    res.json(sections);
  } else {
    res.json([]);
  }
});

// Route to serve sites.json
app.get("/sites.json", (req, res) => {
  const logFile = path.join(__dirname, "sites.json");
  if (fs.existsSync(logFile)) {
    const sites = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    res.json(sites);
  } else {
    res.json([]);
  }
});

app.get("/bootstrap-variables", (req, res) => {
  const varsFile = path.join(__dirname, "bootstrap-variables.json");
  if (fs.existsSync(varsFile)) {
    const vars = JSON.parse(fs.readFileSync(varsFile, "utf-8"));
    res.json(vars);
  } else {
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
