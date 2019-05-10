const RandExp = require('randexp');

function generateRandomString(length) {
  return new RandExp(`^[0-9A-Za-z]{${length}}$`).gen();
}

module.exports = generateRandomString