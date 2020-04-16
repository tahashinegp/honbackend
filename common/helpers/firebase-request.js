const config = require('../../server/config');
const request = require('request');
module.exports = {
  requesthandler: (url, method, body) => {
    request(
      {
        url: url,
        method: method,
        headers: {
          'Content-Type': ' application/json',
          Authorization: config.firebaseAuthToken
        },
        body: body
      },
      err => (err ? false : true)
    );
  }
};
