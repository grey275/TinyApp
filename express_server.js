const express = require("express");
const bodyParser = require('body-parser');

const generateRandomString = require('./random_string');

const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));

const config = {
  key_length: 6,
  domain_name: 'localhost:8080',
}


const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};


const getUrlPairs = () => (
  Object.keys(urlDatabase).map(getUrlPair)
);


const getUrlPair = key => {
  const longURL = urlDatabase[key];
  const shortURL = `${config.domain_name}/u/${key}`;
  return {longURL, shortURL};
};


app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars  = getUrlPair(req.params.shortURL);
  res.render("urls_show", templateVars);
});


app.get('/urls', (req, res) => {
  const urlPairs = getUrlPairs();
  const templateVars = {
    urlPairs,
    shortenUrlRoute: '/urls/new',
  };
  res.render('urls_index', templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  console.log(`longURL: ${longURL}`);
  res.redirect(longURL);
})

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.post("/urls", (req, res) => {
  const key = generateRandomString(config.key_length);
  urlDatabase[key] = req.body.longURL;
  res.redirect(`urls/${key}`);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});