const express = require("express");
const bodyParser = require('body-parser');
const methodOverride = require('method-override')
const cookieParser = require('cookie-parser');

const morgan = require('morgan');

const generateRandomString = require('./random_string');

const app = express();

app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(morgan('tiny'));
app.use(methodOverride());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const config = {
  not_found_msg: 'sorry, that page doesn\'t exist!',
  key_length: 6,
  user_id_length: 6,
  port: 8080,
  domain_name: 'localhost:8080',
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}


const getUrlPairs = () => (
  Object.keys(urlDatabase).map(getUrlPair)
);


const getUrlPair = key => {
  const longURL = urlDatabase[key];
  const shortURL = `${config.domain_name}/u/${key}`;
  console.log(`key: ${key}`)
  return {longURL, shortURL, id: key};
};


app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const user = users[req.cookies.user_id]
  res.render("urls_new", { user });
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars  = {
    ...getUrlPair(req.params.shortURL),
    user: users[req.cookies.user_id],
  };
  res.render("urls_show", templateVars);
});


app.get('/urls', (req, res) => {
  const urlPairs = getUrlPairs();
  const templateVars = {
    urlPairs,
    shortenUrlRoute: '/urls/new',
    user: users[req.cookies.user_id],
  };

  res.render('urls_index', templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  console.log(`shortURL: ${req.params.shortURL}` );
  const longURL = urlDatabase[req.params.shortURL];
  if (!longURL) {
    res.status(404).send(config.not_found_msg);
    return;
  }
  res.redirect(longURL);
})


app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get('/register', (req, res) => {
  const user = users[req.cookies.user_id];
  res.render('register', { user });
});

app.post("/urls", (req, res) => {
  const key = generateRandomString(config.key_length);
  urlDatabase[key] = req.body.longURL;
  console.log(`added ${req.body.longURL} to database as ${key}`)
  res.redirect(`urls/${key}`);
});

app.post('/urls/:shortURL/delete', (req, res) => {
  const { shortURL } = req.params;
  console.log(`deleting ${shortURL}`);
  delete urlDatabase[shortURL];
  res.redirect('/urls');
})

app.post('/urls/:shortURL', (req, res) => {
  const id = req.params.shortURL;
  console.log(`modifying ${id}`);
})

app.post('/login', (req, res) => {
  console.log(`username: ${req.body.username}`);
  console.log(`cookies: `, req.cookies);
  res.cookie('username', req.body.username);
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  console.log(`username: ${req.body.username}`);
  console.log(`cookies: `, req.cookies);
  res.clearCookie('username');
  res.redirect('/urls/new');
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // validation
  const filledOut = !(email && password)

  // checking for a collision
  const registeredAlready = Object.values(users).filter(user => (
    user.email === email
  ));

  // just return 400 for either
  if (filledOut || registeredAlready) {
    res.status(400).send();
    return;
  }

  const id = generateRandomString(6);
  users[id] = { id, email, password };

  res.cookie('user_id', id);
  res.redirect('/urls');
});

app.use(function (req, res, next) {
  res.status(404).send('Something broke!')
})


app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}!`);
});