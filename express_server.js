const express = require("express");
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const moment = require('moment');

const morgan = require('morgan');

const generateRandomString = require('./random_string');
const {sendErrorMessage, errors} = require('./errors');

const app = express();

app.set('view engine', 'ejs');

app.use(cookieSession({
  name: 'session',
  keys: ['key'],
}));

app.use(morgan('tiny'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());


const config = {
  moment_format: 'hh:mm:ss a',
  not_found_msg: 'sorry, that page doesn\'t exist!',
  key_length: 6,
  user_id_length: 6,
  port: Number(process.argv[2]) || 8080,
  domain_name: 'localhost:8080',
}

const urlDatabase = {
  b6UTxQ: {
    longUrl: "https://www.tsn.ca",
    user_id: "userRandomID",
    id: "b6UTxQ",
    time: moment(),
    hits: 0,
  },
  i3BoGr: {
    longUrl: "https://www.google.ca",
    user_id: "aJ48lW",
    id: "i3BoGr",
    time: moment(),
    hits: 0,
  }
};

const addUrlHit = (id) => {
  urlDatabase[id].hits++;
}

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    hashedPassword: bcrypt.hashSync("purple-monkey-dinosaur", 10),
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    hashedPassword: bcrypt.hashSync("dishwasher-funk", 10),
  }
}

app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
    return;
  }
  res.redirect('/login');

});

app.get("/urls/new", (req, res) => {
  const user = users[req.session.user_id];
  if (!user) {
    res.redirect('/login');
    return;
  }
  res.render("urls_new", { user });
});

app.get('/error', (req, res) => {
  const { msg, code } = req.query;
  const templateVars = {
    user: users[req.session.user_id],
    msg,
  }
  res.status(code);
  res.render('error', templateVars);
});

app.get("/urls/:shortUrl", (req, res) => {
  const user = users[req.session.user_id]
  const shortUrl = req.params.shortUrl;
  if (!user) {
    sendErrorMessage(res, errors.logInToEdit());
    return;
  }
  if (!urlDatabase[shortUrl] || (urlDatabase[shortUrl].user_id !== user.id)) {
    sendErrorMessage(errors.urlNotFound(shortUrl))
    return;
  }

  const templateVars  = {
    ...urlDatabase[shortUrl],
    user,
    domain_name: config.domain_name,
  };
  res.render("urls_show", templateVars);
});

app.get('/urls', (req, res) => {
  const user = users[req.session.user_id];
  if (!user) {
    sendErrorMessage(res, errors.logInToView());
    return;
  }
  const usersUrls = urlsForUser(user.id, urlDatabase);
  const templateVars = {
    displayHomeButton: false,
    usersUrls,
    shortenUrlRoute: '/urls/new',
    user,
    domain_name: config.domain_name
  };
  res.render('urls_index', templateVars);
});

app.get("/u/:shortUrl", (req, res) => {
  const shortUrl = req.params.shortUrl
  const urlObj = urlDatabase[shortUrl];
  if (!urlObj) {
    sendErrorMessage(res, errors.urlNotFound(shortUrl));
    return;
  }

  addUrlHit(shortUrl);
  const longUrl = urlObj.longUrl;
  res.redirect(longUrl);
})


app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get('/register', (req, res) => {
  const user = users[req.session.user_id];
  res.render('register', { user });
});

app.get('/login', (req, res) => {
  const user = users[req.session.user_id];
  res.render('login', { user });
});

app.post("/urls", (req, res) => {
  const user_id = req.session.user_id;
  if (!user_id) {
    res.redirect('/login');
    return;
  }
  const id = generateRandomString(config.key_length);
  urlDatabase[id] = {
    longUrl: req.body.longUrl,
    user_id,
    id,
    time: moment(),
  }
  res.redirect(`urls/${id}`);
});

app.post('/urls/:shortUrl/delete', (req, res) => {
  // TODO add check for authorization
  const { shortUrl } = req.params;
  const user_id = req.session.user_id
  if (user_id !== urlDatabase[shortUrl].user_id) {
    sendErrorMessage(res, errors.invalidCreds());
    return;
  }
  delete urlDatabase[shortUrl];
  res.redirect('/urls');
});

app.post('/urls/:shortUrl', (req, res) => {
  // TODO add check for authorization
  const { shortUrl } = req.params;
  const user_id = req.session.user_id
  if (user_id !== urlDatabase[shortUrl].user_id) {
    sendErrorMessage(res, errors.invalidCreds());
    return;
  }
  urlDatabase[shortUrl].longUrl = req.body.longUrl;
  res.redirect(`/urls/${shortUrl}`)
})

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!(email && password)) {
    sendErrorMessage(res, errors.notFilledOut())
    return;
  }
  const user = login(email, password)
  if (!user) {
    sendErrorMessage(res, errors.invalidCreds());
    return;
  }
  req.session.user_id = user.id
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  req.session.user_id = undefined;
  res.redirect('/urls/new');
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const notFilledOut = !(email && password)

  // checking for a collision
  const registeredAlready = Boolean(findUserWithEmail(email, users));

  // just return 400 for either
  if (notFilledOut) {
    sendErrorMessage(res, errors.notFilledOut());
    return;
  }

  if (registeredAlready) {
    sendErrorMessage(res, errors.registeredAlready(email))
    return;
  }

  const id = generateRandomString(6);
  const hashedPassword = bcrypt.hashSync(password, 10);

  users[id] = { id, email, hashedPassword };

  req.session.user_id = id;
  res.redirect('/urls');
});

app.use(function (req, res, next) {
  sendErrorMessage(res, errors.notFound(req.url));
})

const urlsForUser = (user_id, database) => {
  const filtered = {};
  for (let key in database) {
    const url_user_id = database[key].user_id;
    if (user_id === url_user_id) {
      filtered[key] = database[key];
    }
  }
  return filtered;
}

const findUserWithEmail = (email, u) => {
  for (let id in u) {
    const user = u[id];
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

/* check if credentials are good,
and if they are return the user obj */
const login = (email, password) => {
  const user = findUserWithEmail(email, users);
  if (user && bcrypt.compareSync(password, user.hashedPassword)) {
    return user;
  }
  return null;
}

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}!`);
});