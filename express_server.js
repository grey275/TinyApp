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
  port: 8080,
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

const addHit = (id) => {
  urlDatabase[id].hits++;
}

const usersUnhashed = {
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

const genUsersWithHashedPasswords = (users) => {
  const hashed = {};
  for (let id in users) {
    const user = users[id];
    hashed[id] = {
      ...user,
      hashedPassword: bcrypt.hashSync(user.password, 10),
    }
  }
  return hashed;
}

const usersHashed = genUsersWithHashedPasswords(usersUnhashed);


app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
    return;
  }
  res.redirect('/login');

});

app.get("/urls/new", (req, res) => {
  const user = usersHashed[req.session.user_id];
  if (!user) {
    res.redirect('/login');
    return;
  }
  res.render("urls_new", { user });
});

app.get('/error', (req, res) => {
  console.log(`error route!`)

  const { msg, code } = req.query;
  const templateVars = {
    user: usersHashed[req.session.user_id],
    msg,
  }
  res.status(code);
  res.render('error', templateVars);
});

app.get("/urls/:shortUrl", (req, res) => {
  console.log('top of route')
  const user = usersHashed[req.session.user_id]
  const shortUrl = req.params.shortUrl;
  console.log('shortUrl: ', shortUrl)
  console.log('urlDatabase: ', urlDatabase);
  console.log('urlDatabase[shortUrl]: ', urlDatabase[shortUrl])

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
  console.log('bottom of route')
  res.render("urls_show", templateVars);
});

app.get('/urls', (req, res) => {
  const user = usersHashed[req.session.user_id];
  console.log('user_id: ', req.session.user_id);
  console.log('user: ', user);
  if (!user) {
    console.log('no cookie set: ', req.session.user_id)
    sendErrorMessage(res, errors.logInToView());
    return;
  }

  const usersUrls = urlsForUser(user.id, urlDatabase);
  console.log('usersUrls: ', usersUrls);
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
  console.log('test: ', req.params)
  const shortUrl = req.params.shortUrl
  const urlObj = urlDatabase[shortUrl];
  if (!urlObj) {
    console.log(`no key for ${urlObj} found`);
    console.log('shorurl: ', shortUrl)
    sendErrorMessage(res, errors.urlNotFound(shortUrl));
    return;
  }

  addHit(shortUrl);
  const longUrl = urlObj.longUrl;
  console.log('redirecting to ', longUrl);
  res.redirect(longUrl);
})


app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get('/register', (req, res) => {
  const user = usersHashed[req.session.user_id];
  res.render('register', { user });
});

app.get('/login', (req, res) => {
  const user = usersHashed[req.session.user_id];
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
  console.log(`added ${req.body.longUrl} to database as ${id}`)
  res.redirect(`urls/${id}`);
});

app.post('/urls/:shortUrl/delete', (req, res) => {
  // TODO add check for authorization
  console.log('del req obj: ', req);
  const { shortUrl } = req.params;
  console.log(`deleting ${shortUrl}`);
  delete urlDatabase[shortUrl];
  res.redirect('/urls');
})

app.post('/urls/:shortUrl', (req, res) => {
  // TODO add check for authorization
  console.log('database in /urls/:shorturl:', urlDatabase);
  urlDatabase[req.params.shortUrl].longUrl = req.body.longUrl;
  res.redirect(`/urls/${req.params.shortUrl}`)
})

app.post('/login', (req, res) => {
  console.log(`cookies on login: `, req.session);

  const { email, password } = req.body;

  if (!(email && password)) {
    sendErrorMessage(res, errors.notFilledOut())
    return;
  }
  const user = login(email, password)
  console.log('user: ', user);
  if (!user) {
    sendErrorMessage(res, errors.invalidCreds());
    return;
  }
  req.session.user_id = user.id
  res.redirect('/urls');
});

app.post('/logout', (req, res) => {
  console.log(`cookies: `, req.session);
  req.session.user_id = undefined;
  res.redirect('/urls/new');
});

app.post('/register', (req, res) => {
  const { email, password } = req.body;

  // validation
  const notFilledOut = !(email && password)

  // checking for a collision
  const registeredAlready = Boolean(findUserWithEmail(email, usersHashed));

  // just return 400 for either
  if (notFilledOut ) {
    sendErrorMessage(res, errors.notFilledOut());
    return;
  }

  console.log('registeredAlready: ', registeredAlready);
  if (registeredAlready) {
    sendErrorMessage(res, errors.registeredAlready(email))
    return;
  }

  const id = generateRandomString(6);
  const hashedPassword = bcrypt.hashSync(password, 10);

  usersHashed[id] = { id, email, hashedPassword };

  req.session.user_id = id;
  console.log('hitting here');
  res.redirect('/urls');
});

app.use(function (req, res, next) {
  sendErrorMessage(res, errors.notFound(req.url));
})

const urlsForUser = (user_id, database) => {
  console.log('input database: ', database);
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
    console.log(email, 'and', user.email)
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

/* check if credentials are good,
and if they are return the user obj */
const login = (email, password) => {
  const user = findUserWithEmail(email, usersHashed);
  if (user && bcrypt.compareSync(password, user.hashedPassword)) {
    return user;
  }
  return null;
}

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}!`);
});