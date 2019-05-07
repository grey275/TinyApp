const RandExp = require('randexp');

function generateRandomString(length) {
  return new RandExp(`^[0-9,A-Z,a-z]{${length}}$`).gen();
}

module.exports = generateRandomString