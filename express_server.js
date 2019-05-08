const express = require("express");
const bodyParser = require('body-parser');
const methodOverride = require('method-override')
const morgan = require('morgan');

const generateRandomString = require('./random_string');

const app = express();
const PORT = 8080; // default port 8080

app.set('view engine', 'ejs');

app.use(morgan('tiny'));
app.use(methodOverride());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const config = {
  not_found_msg: 'sorry, that page doesn\'t exist!',
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
  console.log(`shortURL: ${req.params.shortURL}` );
  const longURL = urlDatabase[req.params.shortURL];
  if (!longURL) {
    res.status(404).send(config.not_found_msg);
    return
  }
  res.status(longURL);
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
  console.log(`added ${req.body.longURL} to database as ${key}`)
  res.redirect(`urls/${key}`);
});

app.post('/urls/:shortURL/delete', (req, res) => {
  const id = req.params.shortURL;
  delete urlDatabase[id];
  res.redirect('/urls');
})

app.get('/lmao', (req, res) => {
  console.log(`it worked: `);
  res.status(404).send('hi');
});

app.use(function (req, res, next) {
  res.status(404).send('Something broke!')
})


app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});