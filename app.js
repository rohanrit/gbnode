const express = require("express");
const path = require("path");
const fs = require("fs");
const hbs = require("hbs");
const CleanCSS = require("clean-css");
const Terser = require("terser");
const { engine } = require("express-handlebars");

const app = express();
app.engine("hbs", engine({ extname: ".hbs" }));

// Set the view engine to Handlebars (hbs)
app.set("view engine", "hbs");

// Set up views directory
app.set("views", path.join(__dirname, "views"));

// Set up partials directory (optional)
hbs.registerPartials(path.join(__dirname, "views/partials"));

// Serve static files (CSS, JS, images, etc.) from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Function to generate static HTML from Handlebars templates
function generateStaticHTML() {
  const data = { title: "My Express App", message: "Welcome to my Express app with Handlebars!" };

  // Render the 'index' template to HTML
  hbs.render(path.join(__dirname, "views", "index.hbs"), data, (err, html) => {
    if (err) {
      console.error("Error rendering Handlebars template:", err);
      return;
    }

    // Save the rendered HTML to a file in the public folder
    fs.writeFile(path.join(__dirname, "public", "index.html"), html, (err) => {
      if (err) {
        console.error("Error writing HTML file:", err);
      } else {
        console.log("Static HTML file has been generated and saved!");
      }
    });
  });
}

// Function to minify CSS
function minifyCSS() {
  const inputCSS = fs.readFileSync(path.join(__dirname, "public", "css", "style.css"), "utf-8");

  // Minify CSS using CleanCSS
  const outputCSS = new CleanCSS().minify(inputCSS).styles;

  // Save the minified CSS to a new file
  fs.writeFile(path.join(__dirname, "public", "css", "style.min.css"), outputCSS, (err) => {
    if (err) {
      console.error("Error writing minified CSS:", err);
    } else {
      console.log("CSS file has been minified and saved!");
    }
  });
}

// Function to minify JS
function minifyJS() {
  const inputJS = fs.readFileSync(path.join(__dirname, "public", "js", "script.js"), "utf-8");

  // Minify JS using Terser
  Terser.minify(inputJS).then((minified) => {
    if (minified.error) {
      console.error("Error minifying JS:", minified.error);
    } else {
      // Save the minified JS to a new file
      fs.writeFile(path.join(__dirname, "public", "js", "script.min.js"), minified.code, (err) => {
        if (err) {
          console.error("Error writing minified JS:", err);
        } else {
          console.log("JS file has been minified and saved!");
        }
      });
    }
  });
}

// Run these functions to generate the static files
function buildStaticAssets() {
  // Generate static HTML
  generateStaticHTML();

  // Minify CSS
  minifyCSS();

  // Minify JS
  minifyJS();
}

// Call the build function
buildStaticAssets();

// Route to render the index page (for local development)
app.get("/", (req, res) => {
  res.render("index", { title: "My Express App", message: "Welcome to my Express app with Handlebars!" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
