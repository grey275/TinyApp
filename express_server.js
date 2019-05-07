const express = require("express");
const bodyParser = require('body-parser');

const generateRandomString = require('./random_string');

const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

console.log(bodyParser);
app.use(bodyParser.urlencoded({extended: true}));

const config = {
  key_length: 6,
  domain_name: 'localhost:8080',
}


const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};


app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL
  const longURL = urlDatabase[shortURL]
  const templateVars = { shortURL, longURL, };
  res.render("urls_show", templateVars);
});


app.get('/urls', (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    shortenUrlRoute: '/urls/new',
    domain_name: config.domain_name,
  };
  res.render('urls_index', templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
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