const express = require("express");
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const methodOverride = require('method-override')
const bcrypt = require('bcrypt');

const morgan = require('morgan');

const generateRandomString = require('./random_string');

const app = express();

app.set('view engine', 'ejs');

app.use(cookieSession({
  name: 'session',
  keys: ['key'],
}));

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
  b6UTxQ: { longUrl: "https://www.tsn.ca", user_id: "userRandomID", id:"b6UTxQ" },
  i3BoGr: { longUrl: "https://www.google.ca", user_id: "aJ48lW", id:"i3BoGr" }
};

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
      hashedpassword: bcrypt.hashSync(user.password, 10),
    }
  }
  return hashed;
}

const usersHashed = genUsersWithHashedPasswords(usersUnhashed);


const getUrlPair = key => {
  const longUrl = urlDatabase[key].longUrl;
  const shortUrl = `${config.domain_name}/u/${key}`;
  console.log(`key: ${key}`)
  return {longUrl, shortUrl, id: key};
};


app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls/new", (req, res) => {
  const user = usersHashed[req.session.user_id]
  if (!user) {
    res.redirect('/login');
  }
  res.render("urls_new", { user });
});

app.get("/urls/:shortUrl", (req, res) => {
  const user = usersHashed[req.session.user_id]
  const shortUrl = req.params.shortUrl;
  if (!user) {
    res.redirect('/login');
  }
  if (urlDatabase[shortUrl].user_id !== user.id) {
    res.status(403).send();
  }

  const templateVars  = {
    ...urlDatabase[shortUrl],
    user,
    domain_name: config.domain_name,
  };
  res.render("urls_show", templateVars);
});


app.get('/urls', (req, res) => {
  const user = usersHashed[req.session.user_id];
  console.log('user_id: ', req.session.user_id);
  console.log('user: ', user);
  if (!user) {
    console.log('no cookie set: ', req.session.user_id)
    res.redirect('/login');
    return;
  }

  const usersUrls = urlsForUser(user.id, urlDatabase);
  console.log('usersUrls: ', usersUrls);
  const templateVars = {
    usersUrls,
    shortenUrlRoute: '/urls/new',
    user,
    domain_name: config.domain_name
  };

  res.render('urls_index', templateVars);
});

app.get("/u/:shortUrl", (req, res) => {
  console.log(`shortUrl: ${req.params.shortUrl}` );
  console.log('urlDatabase: on redirect: ', urlDatabase);

  const longUrl = urlDatabase[req.params.shortUrl].longUrl;
  console.log(longUrl);
  if (!longUrl) {
    res.status(404).send(config.not_found_msg);
    return;
  }
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
  res.render('login')
})

app.post("/urls", (req, res) => {
  const user_id = req.session.user_id;
  if (!user_id) {
    res.redirect('/login');
  }
  const id = generateRandomString(config.key_length);
  urlDatabase[id] = {
    longUrl: req.body.longUrl,
    user_id,
    id,
  }
  console.log(`added ${req.body.longUrl} to database as ${id}`)
  res.redirect(`urls/${id}`);
});

app.post('/urls/:shortUrl/delete', (req, res) => {
  const { shortUrl } = req.params;
  console.log(`deleting ${shortUrl}`);
  delete urlDatabase[shortUrl];
  res.redirect('/urls');
})

app.post('/urls/:shortUrl', (req, res) => {
  const id = req.params.shortUrl;
  console.log(`modifying ${id}`);
})

app.post('/login', (req, res) => {
  console.log(`cookies on login: `, req.session);

  const { email, password } = req.body;

  const user = login(email, password)
  console.log('user: ', user);
  if (!user) {
    res.status(403).send();
    return;
  }
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
  const filledOut = !(email && password)

  // checking for a collision
  const registeredAlready = Boolean(findUserWithEmail(email));

  // just return 400 for either
  if (filledOut || registeredAlready) {
    res.status(400).send();
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
  res.status(404).send('Something broke!')
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
    if (user.email === email) {
      return user;
    }
  }
  return false;
};


/* check if credentials are good,
and if they are return the user obj */
const login = (email, password) => {
  console.log('email: ', email, 'password: ', password);
  console.log('users in login', usersHashed);
  const user = findUserWithEmail(email, usersHashed);
  console.log('found user: ', user);
  console.log('found hashedPassword: ', user.hashedPassword);
  if (user && bcrypt.compareSync(password, user.hashedPassword)) {
    return user;
  }
  return false;
}

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}!`);
});