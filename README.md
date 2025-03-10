# gbnode

A simple web-development website

# Set Up Your Node.js/Express.js App

## Step 1: Initialize Your Project

Start by creating a new directory for your project and initialize it with npm:
/// mkdir my-express-app
/// cd my-express-app
/// npm init -y
This will generate a package.json file.

## Step 2: Install Necessary Dependencies

express: The web framework.
hbs: Handlebars templating engine for Express.
path: To manage file paths (already built-in in Node.js).
Install CleanCSS
Install Terser
Install express-handlebars

Run the following command to install the dependencies:
/// npm install express
/// npm install clean-css-cli --save-dev
/// npm install terser --save-dev
/// npm install express-handlebars --save

## Step 3: Create the Project Structure

Create the following folder structure:

gbnode/
├── views/  
│ └── index.hbs  
├── public/  
│ ├── css/  
│ │ └── style.css  
│ ├── js/  
│ │ └── script.js  
├── app.js  
└── package.json

## Step 4: Set Up the Express App with Handlebars.js

Create the app.js file that will initialize the Express server, configure Handlebars, and serve static files.

## Step 5: Create the Handlebars Template (index.hbs)

Create an index.hbs file inside the views/ directory:

## Step 6: Add CSS and JS Files

### CSS (style.css)

Create a style.css file inside public/css/ directory:

### JS (script.js)

Create a script.js file inside public/js/ directory:

## Step 7: Running the App Locally

Now you can run your app locally by executing:

## Step 8: Install Nodemon Locally (specific to your project):

/// npm install --save-dev nodemon
