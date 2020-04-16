'use strict';
//test
var Jimp = require('jimp');
const fs = require('fs-extra');
const uuidv4 = require('uuid/v4');
const { ObjectId } = require('mongodb');
const imageHelper = require('../helpers/image-helper');
const paymentHelper = require('../helpers/payment-helper');
const walletHelper = require('../helpers/wallet-helper');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const passRules = require('password-rules');
const cardValidator = require('card-validator');
const fileUpload = require('express-fileupload');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');
const firebaseRequest = require('../helpers/firebase-request');
const jwt = require('jsonwebtoken');
const config = require('../../server/config');
var AWS = require('aws-sdk');

module.exports = function (authentication) {
  // Authentication Method for honeygram
  authentication.authentication = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userName = reqBody.userName;
      const password = reqBody.password;
      if (!userName || !password)
        return cb(
          null,
          {
            IsAuthenticated: false,
            UserInformation: {}
          },
          false,
          constantData.IncorrectRequest
        );

      dbAccessor
        .getRecordByAggregation(helper.authObj(userName), desiredModel)
        .toArray((err, result) => {
          if (err)
            return cb(
              null,
              {
                IsAuthenticated: false,
                UserInformation: {}
              },
              false,
              err.message
            );
          else if (
            result &&
            result.length > 0 &&
            result[0].credentials.length > 0
          ) {
            result = result[0];
            if (!helper.bcryptCompare(password, result.credentials[0]))
              return cb(
                null,
                {
                  IsAuthenticated: false,
                  UserInformation: {}
                },
                true,
                constantData.PasswordMismatch
              );
            const plan = result.subscriptions
              ? result.subscriptions.filter(obj => !obj.isDeleted)
              : [];
            result.subscribedPlan = plan.length > 0 ? plan[0].plan : null;
            delete result.subscriptions;
            delete result.credentials;
            delete result._id;
            result.profileComplete = helper.checkprofileCompleteness(result);
            result.mandatoryFieldsIsFill = helper.checkMandatoryFieldsIsFilled(
              result
            );
            result.token = helper.createToken(
              result.id,
              result.userName,
              result.userMail
            );
            result.refreshToken = helper.createRefreshToken(result.id);
            dbAccessor
              .updateRecordWithPush(
                {
                  _id: ObjectId(result.id)
                },
                {
                  refreshToken: {token: result.refreshToken, requestFrom: req.headers.referer}
                },
                desiredModel
              )
              .then(() => {
                return cb(
                  null,
                  {
                    IsAuthenticated: true,
                    UserInformation: result
                  },
                  true,
                  constantData.EmptyString
                );
              })
              .catch(err => {
                return cb(
                  null,
                  {
                    err
                  },
                  false,
                  err.message
                );
              });
          } else
            return cb(
              null,
              {
                IsAuthenticated: false,
                UserInformation: {}
              },
              true,
              constantData.NoRecordFound
            );
        });
    } catch (err) {
      cb(
        null,
        {
          IsAuthenticated: false,
          UserInformation: {}
        },
        false,
        err.message
      );
    }
  };

  //refreshtoken
  authentication.refreshToken = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      let accessToken;
      let newRefreshToken;
      let refreshToken = reqBody.refreshToken;
      if (!refreshToken) {
        return cb(null, {}, false, 'missing refreshToken');
      }

      jwt.verify(refreshToken, config.secret, function (err, decoded) {
        if (err) {
          return cb(null, {}, false, 'invalid refreshToken');
        }
        dbAccessor
          .getRecordByAggregation(
            [
              {
                $match: {
                  _id: ObjectId(decoded.subject),

                }
              },
              {
                $unwind: '$refreshToken'
              }
              ,
              {
                $match:{
                  'refreshToken.token': refreshToken
                }
              },
              {
                $project: {
                  _id: 0,
                  id: '$_id',
                  userName: '$userName',
                  userMail: '$userMail'
                }
              }
            ],
            desiredModel
          )
          .toArray()
          .then(res => {
            if (!res || !res[0])
              return { isDeclined: true, message: constantData.NoDataFound };
            accessToken = helper.createToken(
              decoded.subject,
              res[0].userName,
              res[0].userMail
            );
            newRefreshToken = helper.createRefreshToken(decoded.subject);
            return dbAccessor.updateRecordWithPull(
              {
                _id: ObjectId(decoded.subject)
              },
            { 'refreshToken': { $or:[ {'token':refreshToken},{'requestFrom': req.headers.referer}] } },
              desiredModel
            )
          })
          .then(res => {
            return res && res.isDeclined
              ? res
              : res && res.result.nModified > 0
                ?
                dbAccessor.updateRecordWithPush(
                  {
                    _id: ObjectId(decoded.subject)
                  },
                  {
                    refreshToken: {token: newRefreshToken,requestFrom: req.headers.referer}
                  },
                  desiredModel
                )
                : {
                  isDeclined: true,
                  message: constantData.RecordNotUpdated
                };
          })
          .then(res => {
            res.isDeclined
              ? cb(null, {}, false, res.message)
              : res.count && res.result.nModified == 0
                ? cb(null, {}, false, constantData.RecordNotUpdated)
                : cb(
                  null,
                  {
                    accessToken: accessToken,
                    refreshToken: newRefreshToken
                  },
                  true,
                  constantData.EmptyString
                );
          })
          .catch(err =>
            cb(
              null,
              {
                err
              },
              false,
              err.message
            )
          );
      });
    } catch (err) {
      return cb(
        null,
        {
          err
        },
        false,
        err.message
      );
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(authentication);
}
