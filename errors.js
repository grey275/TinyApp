const queryString = require('query-string');

const errors = {
  urlNotFound: shortUrl => ({
    msg: `Url with key '${shortUrl}' not found!`,
    code: 404,
  }),
  notFound: (url) => ({
    msg: `page '${url}' does not exist!`,
    code: 404,
  }),
  logInToEdit: () => ({
    msg: `You need to be logged in to edit urls!`,
    code: 403,
  }),
  logInToView: () => ({
    msg: `You need to be logged in to view your urls!`,
    code: 403,
  }),
  notFilledOut: () => ({
     msg: `please fill out the form!`,
     code: 400
    }),
  registeredAlready: (email) => ({
    msg: `${email} is  already registered!`,
    code: 400,
}),
  invalidCreds: () => ({
    msg: `invalid credentials!`,
    code: 403,
  })
}

const sendErrorMessage = (res, err) => {
  const qstring = queryString.stringify(err);
  res.redirect('/error?' + qstring);
}

module.exports = {
  errors,
  sendErrorMessage,
}