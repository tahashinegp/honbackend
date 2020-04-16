const config = require('../../server/config');
const jwt = require('jsonwebtoken');
const app = require('../../server/server');
const excluded = [
  '/authentication',
  'containers',
  '/password/policy',
  '/password/reset',
  '/users/identity/exist',
  '/password/validate/reset-code',
  '/password/reset-password',
  '/authentication/token/refresh'
];

module.exports = function () {
  
  return async function customHandler(req, res, next) {
    try {
      let receivedToken,
        authenticatonPage = false;
      if (
        excluded.indexOf(req.url) > -1 ||
        excluded.indexOf(req.url.split('/')[1]) > -1 ||
        (req.method == 'POST' && req.url == '/users')
      )
        authenticatonPage = true;
      if (
        req.headers.authorization &&
        req.headers.authorization.split(' ')[0] === 'Bearer'
      )
        receivedToken = req.headers.authorization.split(' ')[1];
      if (req.query && req.query.access_token)
        receivedToken = req.query.access_token;
      if (authenticatonPage) next();
      else if (receivedToken == undefined)
        next({
          status: 401,
          message: 'Missing or invalid token'
        });
      else
        jwt.verify(receivedToken, config.secret, function (err, decoded) {
          if (err) {
            if (err.message === 'jwt expired')
              next({
                status: 463,
                message: 'Token Expired'
              });
            else next({
              status: 500,
              message: 'Failed to authenticate token.'
            });
          }
          else app.models.users.findOne({
              where: {
                id: decoded.subject
              }
              
            },
            {
              userName: 1
            },
            (errFind, resFind) => {
              if (errFind || !resFind)
                next({
                  status: 500,
                  message: 'Failed to authenticate token.'
                });
              
                var decoded = jwt.decode(receivedToken, {
                  complete: true
                });
                req.receivedToken = receivedToken;
                req.reqestedUserId = decoded.payload.subject;
                req.requestedUserMail = decoded.payload.userMail;
                req.requestedUserName = decoded.payload.userName;
                next();
              
            }
          );
        });
    } catch (err) {
      next({
        status: 500,
        message: err.message
      });
    }
  };
};
