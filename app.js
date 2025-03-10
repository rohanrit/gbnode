// app.js
const express = require("express");
const path = require("path");
const hbs = require("hbs");

const app = express();

// Set the view engine to Handlebars (hbs)
app.set("view engine", "hbs");

// Set up views directory
app.set("views", path.join(__dirname, "views"));

// Set up partials directory (optional)
hbs.registerPartials(path.join(__dirname, "views/partials"));

// Serve static files (CSS, JS, images, etc.) from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Route to render the index page
app.get("/", (req, res) => {
  res.render("index", { title: "My Express App", message: "Welcome to my Express app with Handlebars!" });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
