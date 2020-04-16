'use strict';

const {
  ObjectId
} = require('mongodb');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const fileUpload = require('express-fileupload');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');
const config = require('../../server/config');
var AWS = require('aws-sdk');

module.exports = function (pwd) {

  // Reset password
  pwd.setPassword = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const oldPassword = reqBody.oldPassword,
        password = reqBody.password,
        userId = req.reqestedUserId;
      if (!oldPassword || !password || !userId)
        return cb(null, {}, false, constantData.IncorrectRequest);
      const passObject = helper.passPolicy(password);
      if (Object.keys(passObject).length > 0)
        return cb(null, {}, false, passObject.issues[0].message);
      dbAccessor
        .getRecordByAggregation(
          helper.getActivePasswordObj(userId),
          desiredModel
        )
        .toArray((err, passwordObject) => {
          if (passwordObject.length == 0)
            return cb(null, {}, false, constantData.NoDataFound);
          if (
            !helper.bcryptCompare(
              oldPassword,
              passwordObject[0].credentials[0].password
            )
          )
            return cb(null, {}, false, constantData.PasswordMismatch);
          dbAccessor
            .updateRecordBasedOnConditions({
                _id: ObjectId(userId),
                'credentials.isDeleted': false
              }, {
                $set: {
                  'credentials.$[].isDeleted': true
                }
              },
              desiredModel
            )
            .then(result => {
              const newCredential = {
                password: helper.bcryptSync(password),
                createdAt: Date.now(),
                isDeleted: false
              };
              return dbAccessor.updateRecord(
                userId, {
                  $push: {
                    credentials: newCredential
                  }
                },
                desiredModel
              );
            })
            .then(result =>
              result.count > 0 ?
              cb(
                null, {
                  isPasswordChanged: true
                },
                true,
                constantData.UpdatedSuccessfully
              ) :
              cb(
                null, {
                  isPasswordChanged: false
                },
                true,
                constantData.NoRecordFound
              )
            )
            .catch(err => cb(null, err, false, err.message));
        });
    } catch (err) {
      cb(null, {}, false, err.message);
    }
  };

  //Password policy
  pwd.passwordPolicy = (password, cb) => {
    try {
      const passObject = helper.passPolicy(password);
      return Object.keys(passObject).length === 0 ?
        cb(
          null, {
            isValid: true
          },
          true,
          constantData.ValidityCheckerTrue
        ) :
        cb(
          null, {
            isValid: false,
            message: passObject.issues[0].message
          },
          true,
          constantData.ValidityCheckerFalse
        );
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  //forget Password email send
  pwd.resetPassword = (req, userMail, cb) => {
    try {
      const desiredModel = app.models.Users;
      dbAccessor
        .getRecordWithParam({
            where: {
              userMail: userMail
            }
          },
          desiredModel
        )
        .then(result => {
          if (result == null)
            return cb(null, {}, false, constantData.NoRecordFound);
          const code = helper.encryptionForgetMethod(
            result.id,
            result.userMail
          );
          const subject = 'forget password';
          AWS.config.update(config.awsSecuritySES);
          const baseUrl = !req || !req.headers || !req.headers.referer ?
                          constantData.BaseUrl :
                          req.headers.referer.split('/')[2];
          const baseUrlProtocol = !req || !req.headers || !req.headers.referer ?
                          constantData.BaseUrlProtocol :
                          req.headers.referer.split('/')[0];
          const htmlContent = helper.emailTemplate(result.userName? result.userName: userMail, baseUrlProtocol, baseUrl, code);
          const emailObj = helper.emailServiceObj(userMail, htmlContent, subject);          
          const sesConfig = config.awsSESConfig;
          new AWS.SES(sesConfig).sendEmail(emailObj, (err, data) => err ?
            cb(null, err, false, err.message) 
             :
            cb(null, data, true, constantData.SentEmail));
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      
      //console.log(err.message);
      
      cb(null, err, false, err.message);
    }
  };

  //forgetPassword code verification
  pwd.validateResetPasswordHexCode = (hexCode, cb) => {
    try {
      const hexArray = helper.decryptionMethod(hexCode);
      return hexArray.length <= 0 ?
        cb(
          null, {
            isValid: false
          },
          true,
          constantData.EmptyString
        ) :
        cb(
          null, {
            isValid: true
          },
          true,
          constantData.ValidityCheckerTrue
        );
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  //Change Password by 'Forget Password' menu
  pwd.changePassword = (hexCode, password, cb) => {
    try {
      const desiredModel = app.models.Users;
      const decryptedHexCode = helper.decryptionMethod(hexCode);
      const hexArray = decryptedHexCode.split('/');
      const passObject = helper.passPolicy(password);
      if (Object.keys(passObject).length > 0)
        return cb(null, {}, false, passObject.issues[0].message);
      if (hexArray.length <= 0)
        return cb(
          null, {},
          false,
          constantData.hexCodeMismatch
        );
      dbAccessor
        .updateRecordBasedOnConditions({
            id: hexArray[0],
            'credentials.isDeleted': false
          }, {
            $set: {
              'credentials.$[].isDeleted': true
            }
          },
          desiredModel
        )
        .then(result => {
            return dbAccessor.updateRecord(
              hexArray[0], {
                $push: {
                  credentials: {
                    password: helper.bcryptSync(password),
                    createdAt: Date.now(),
                    isDeleted: false
                  }
                }
              },
              desiredModel
            )
          }

        )
        .then(result =>
          result.count > 0 ?
          cb(null, {}, true, constantData.UpdatedSuccessfully) :
          cb(null, {}, true, constantData.NoRecordFound)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(pwd);
}
