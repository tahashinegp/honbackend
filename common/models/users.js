'use strict';

const { ObjectId } = require('mongodb');
const imageHelper = require('../helpers/image-helper');
const walletHelper = require('../helpers/wallet-helper');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');
const firebaseRequest = require('../helpers/firebase-request');
const config = require('../../server/config');
var AWS = require('aws-sdk');

module.exports = Users => {
  const desiredModel = Users;
  desiredModel.validatesUniquenessOf(constantData.Validations.mail);

  // User Name Exist Or Not
  desiredModel.isUserExist = (identity, cb) => {
    try {
      if (!identity) return cb(null, {}, false, constantData.IncorrectRequest);

      dbAccessor
        .userExist(identity, desiredModel)
        .then(result => {
          if (result == null)
            return cb(
              null,
              {
                Exist: false
              },
              true,
              constantData.EmptyString
            );
          return cb(
            null,
            {
              Exist: true
            },
            true,
            constantData.EmptyString
          );
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, {}, false, err.message);
    }
  };
  

  // To Create a User
  desiredModel.createUser = (req, reqBody, cb) => {
    try {
      const password = reqBody.password;
      if (!password)
        return cb(
          null,
          {
            IsAuthenticated: false,
            UserInformation: {}
          },
          false,
          constantData.IncorrectRequest
        );
      const passObject = helper.passPolicy(password);
      if (Object.keys(passObject).length > 0)
        return cb(null, {}, false, passObject.issues[0].message);
      const object = helper.objectMapper(constantData.CustomModel, reqBody);
      let properCaseObj = helper.caseConversion(
        object,
        constantData.LowerCaseFieldsForUsers
      );
      let obj = helper.ObjectValidator(properCaseObj, [
        {
          userMail: helper.emailverification
        },
        {
          userType: helper.typeverification
        }
      ]);
      obj.createdAt = Date.now();
      obj.avatar = imageHelper.getDbPath(
        req.headers.host,
        constantData.ContainersName[0],
        constantData.DefaultPictureName,
        undefined
      );
      obj.photos = [{
        id: 'default-picture',
        urlLink: obj.avatar,
        privateUrlLink: obj.avatar,
        isDeleted: false,
        isPrivate: false
      }]

      obj.credentials = [
        {
          password: helper.bcryptSync(password),
          createdAt: Date.now(),
          isDeleted: false
        }
      ];
      if (!obj.userMail)
        return cb(
          null,
          {
            IsAuthenticated: false,
            UserInformation: {}
          },
          false,
          constantData.IncorrectRequest
        );

      walletHelper
        .getWalletAddress()
        .then(result => {
          if (!result || !result.data || !result.data.account)
            return {
              isDeclined: true
            };
          obj.wallet = {
            walletAddress: result.data.account.address,
            privateKey: result.data.account.privateKey,
            amount: 0 //for promotional purpose 
          };
           //walletAddress = result.data.account.address;

                  
          
          return dbAccessor.createUser(obj, desiredModel);
        })
        .then(result => {
          if (result.isDeclined)
            cb(
              null,
              {
                IsAuthenticated: false,
                UserInformation: {}
              },
              false,
              constantData.WalletNotCreated
            );
          result = JSON.parse(JSON.stringify(result));
          delete result.credentials;
          delete result.wallet;
          delete result.appPreference;
          result.token = helper.createToken(
            result.id,
            result.userName,
            result.userMail
          );
          result.profileComplete = helper.checkprofileCompleteness(result);
          result.refreshToken = helper.createRefreshToken(result.id);
          dbAccessor
            .updateRecordWithPush(
              {
                _id: ObjectId(result.id)
              },
              {
                refreshToken: result.refreshToken,
                subscriptions: {
                  plan: 'Gold',
                 isDeleted: false
                }
              },
              desiredModel
            )
            .then(res => {
              result.savedInDatabase = res;
            })
            .catch(err => {
              result.savedInDatabase = err;
            });
            // walletHelper.getWalletAddress().
            // then(result=>{
            //   console.log("ase");
              
            //   if (!result || !result.data || !result.data.account){
            //   console.log(result.data.account);
            //   console.log(result.data);
            //   console.log(result.data.account);
            //   return {
            //     isDeclined: true
            //   };}
            //   console.log(result.data.account.address);
            //   walletHelper.topUpWalletBalance(result.data.account.address,200);
            //   console.log('yyyy');

            // }
              
          result.mandatoryFieldsIsFill = helper.checkMandatoryFieldsIsFilled(
            result
          );
          return cb(
            null,
            {
              IsAuthenticated: true,
              UserInformation: result
            },
            true,
            constantData.CreatedSuccessfully
          );
        })
        .catch(err =>
          cb(
            null,
            {
              IsAuthenticated: false,
              UserInformation: {}
            },
            false,
            err.message
          )
        );
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

  // To Update User
  desiredModel.updateRecord = (req, reqBody, cb) => {
    try {
      const id = req.reqestedUserId;
      dbAccessor
        .getRecordByAggregation(
          [
            {
              $match: {
                $or: [
                  {
                    _id: ObjectId(id)
                  },
                  {
                    userMail: req.body.userName
                  },
                  {
                    userName: req.body.userName
                  },
                  {
                    userPhone: req.body.userName
                  }
                ]
              }
            },
            {
              $project: {
                userName: '$userName'
              }
            }
          ],
          desiredModel
        )
        .toArray((err, res) => {
          if (err) cb(null, {}, false, err.message);
          const model =
            res && res[0] && res[0].userName
              ? constantData.CustomModelWithoutUserName
              : constantData.CustomModel;
          const object = helper.objectMapper(model, reqBody);
          let properCaseObj = helper.caseConversion(
            object,
            constantData.LowerCaseFieldsForUsers
          );
          let obj = helper.ObjectValidator(properCaseObj, [
            {
              userMail: helper.emailverification
            },
            {
              userType: helper.typeverification
            }
          ]);
          if (Object.keys(obj).length === 0) {
            return Object.keys(reqBody).length === 0
              ? cb(null, {}, false, constantData.NoUpdateFound)
              : res.length > 0
              ? cb(null, {}, false, 'Username exist!')
              : cb(null, {}, false, constantData.IncorrectRequest);
          }

          obj.updatedAt = Date.now();
          dbAccessor
            .getRecord(id, desiredModel)
            .then(result => {
              return result == null ? false : true;
            })
            .then(result => {
              if (result == false)
                return {
                  status: true,
                  data: constantData.NoDataFound
                };
              return dbAccessor.updateRecord(id, obj, desiredModel);
            })
            .then(result =>
              result.status
                ? cb(null, {}, false, result.data)
                : result.count > 0
                ? cb(null, obj, true, constantData.UpdatedSuccessfully)
                : cb(null, {}, false, constantData.RecordNotUpdated)
            )
            .catch(err => cb(null, err, false, err.message));
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  // To Get Users
  desiredModel.getUsers = cb => {
    try {
      dbAccessor
        .getUsers(desiredModel)
        .then(result => {
          return cb(null, result, true, constantData.EmptyString);
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  // To Get User by Id
  desiredModel.getUserById = (req, id, cb) => {
    try {
      const fnMapper = {
        getUserInfo: dbAccessor.getUserById,
        getOwnInfo: dbAccessor.getOwnInfo
      };
      const fnName =
        req.reqestedUserId == id || req.requestedUserName == id
          ? 'getOwnInfo'
          : 'getUserInfo';
      const condition =
        req.reqestedUserId == id || req.requestedUserName == id
          ? helper.getOwnInfoObj(id)
          : helper.getOtherInfoObj(req.reqestedUserId, id);
      fnMapper[fnName](condition, desiredModel).toArray((err, result) => {
        if (err) return cb(null, err, false, err.message);
        return result && result[0]
          ? cb(null, result[0], true, constantData.EmptyString)
          : cb(null, {}, false, constantData.NoRecordFound);
      });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  // Filtering users
  desiredModel.getLimitedUsers = (req, page, limit, reqBody, cb) => {
    try {    
      const userId = req.reqestedUserId;
      const range = parseInt(limit) > 0 ? parseInt(limit) : 20;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;
      if (!userId) return cb(null, {}, false, constantData.IncorrectRequest);
      const max = reqBody.ageRange ? reqBody.ageRange.max : undefined,
        min = reqBody.ageRange ? reqBody.ageRange.min : undefined,
        relationshipStatus = reqBody.relationshipStatus,
        relationshipType = reqBody.relationshipType,
        relationshipLifestyle = reqBody.relationshipLifestyle,
        location = reqBody.location,
        sortBy =
          reqBody.sortBy && constantData.SortBy.indexOf(reqBody.sortBy) > -1
            ? reqBody.sortBy
            : undefined;
      dbAccessor
        .isUserExist(
          userId,
          {
            interestedIn: true,
            id: true
          },
          desiredModel
        )
        .then(result => {
          if (!result.interestedIn)
            return cb(null, {}, false, constantData.ComoleteProfile);
          dbAccessor
            .getRecordByAggregation(
              helper.filteredUsersObj(
                userId,
                result.interestedIn,
                offset,
                range,
                location,
                max,
                min,
                relationshipStatus,
                relationshipType,
                relationshipLifestyle,
                sortBy
              ),
              desiredModel
            )
            .toArray((err, result) => {
              //const retObj = helper.userResultImageProcessing(result);
              if (err) {                
                return cb(null, err, false, err.message);}
              else 
              return cb(null, result, true, constantData.EmptyString);
            });
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  // Search users
  desiredModel.getSearchedUsers = (req, value, page, limit, cb) => {
    try {
      const regexp = new RegExp(`^${value}.*`, 'i');
      const userId = req.reqestedUserId;
      const range = parseInt(limit) > 0 ? parseInt(limit) : 20;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;
      if (!userId) return cb(null, {}, false, constantData.IncorrectRequest);
      dbAccessor
        .isUserExist(
          userId,
          {
            userType: true,
            id: true,
            userName: true,
            userMail: true,
            name: true
          },
          desiredModel
        )
        .then(result => {
          if (!result.userType)
            return cb(null, {}, false, constantData.ComoleteProfile);
          return dbAccessor
            .getRecordByAggregation(
              helper.getSearchedUsersObj(
                userId,
                result.userType,
                result.userName,
                result.userMail,
                regexp,
                offset,
                range
              ),
              desiredModel
            )
            .toArray();
        })
        .then(result => cb(null, result, true, constantData.EmptyString))
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //Get RequestForDate by Id
  desiredModel.getRequestById = (req, reqBody, cb) => {
    try {
      dbAccessor
        .getRecordByAggregation(
          helper.getNotificationByIdObj(
            req.reqestedUserId,
            reqBody.notificationId
          ),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (
            !(result[0] && result[0].notification && result[0].notification[0])
          )
            return cb(null, {}, false, constantData.NoDataFound);
          const notification = result[0].notification[0];

          const objRequestType =
            constantData[notification.navigation.notificationType];
          if (
            !notification.navigation.requestId &&
            !notification.navigation.notificationType &&
            !objRequestType
          )
            return cb(null, {}, false, constantData.NoDataFound);

          const userId =
            notification.navigation.notificationType ==
            constantData.PhotoResponse.notificationType
              ? // || notification.navigation.notificationType == constantData.PhotoRequest.notificationType
                notification.userId
              : req.reqestedUserId;
          dbAccessor
            .getRecordByAggregation(
              //
              notification.navigation.notificationType ==
                constantData.PhotoResponse.notificationType ||
                notification.navigation.notificationType ==
                  constantData.PhotoRequest.notificationType
                ? helper.getIndividualRequestObjForPicture(
                    userId,
                    notification.navigation.requestId
                  )
                : notification.navigation.notificationType ==
                    constantData.BenefitArrangements.notificationType ||
                  notification.navigation.notificationType ==
                    constantData.BenefitArrangementResponse.notificationType
                ? helper.getBenefitArrangementObj(
                    userId,
                    notification.navigation.requestId
                  )
                : notification.navigation.notificationType ==
                  constantData.GiftTokens.notificationType
                ? helper.getGiftTokenObj(
                    userId,
                    notification.navigation.requestId
                  )
                : helper.getIndividualRequestObj(
                    userId,
                    notification.navigation.requestId
                  ),
              desiredModel
            )
            .toArray((err, result) => {
              return err
                ? cb(null, err, false, err.message)
                : result[0] &&
                  result[0][objRequestType.propertyName] &&
                  result[0][objRequestType.propertyName][0]
                ? cb(
                    null,
                    result[0][objRequestType.propertyName][0],
                    true,
                    constantData.EmptyString
                  )
                : cb(null, {}, false, constantData.NoDataFound);
            });
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //Email verification for mobile
  desiredModel.verifyEmail = (req, cb) => {
    try {
      const userId = req.reqestedUserId;
      let userName, userMail, verificationCode;
      dbAccessor
        .getRecordWithParam(
          {
            where: {
              id: userId
            },
            fields: {
              userName: true,
              userMail: true,
              id: true
            }
          },
          desiredModel
        )
        .then(result => {
          if (result == null)
            return {
              status: true
            };
          userMail = result.userMail;
          userName = result.userName;
          verificationCode = helper.getRandomNumber(4); //Verification code active for 20 minutes
          const obj = {
            verificationType: 'mail',
            code: verificationCode,
            date: Date.now(),
            isActive: true
          };
          return dbAccessor.updateRecord(
            userId,
            {
              $push: {
                verification: obj
              }
            },
            desiredModel
          );
        })
        .then(result => {
          if (result.status)
            return cb(
              null,
              {
                isExist: true
              },
              true,
              constantData.NoRecordFound
            );
          AWS.config.update(config.awsSecuritySES);
          const subject = 'email verification';
          const htmlContent = `<p>Verification Code: ${verificationCode}</p>
                                <p>This code will be active for 5 minutes</p>`;
          const emailObj = helper.emailServiceObj(
            userMail,
            htmlContent,
            subject
          );
          const sesConfig = config.awsSESConfig;
          new AWS.SES(sesConfig).sendEmail(emailObj, (err, data) =>
            err
              ? cb(null, err, false, err.message)
              : cb(null, data, true, constantData.SentEmail)
          );
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  //Email verification checker
  desiredModel.emailVerificationCodeVerify = (req, code, cb) => {
    try {
      const userId = req.reqestedUserId;
      //
      dbAccessor
        .getRecordByAggregation(
          helper.getUserCodeObj(userId, 'mail', code),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          let status =
            result && result[0] && result[0].verification
              ? new Date(result[0].verification[0].date + 60 * 20 * 1000) >
                new Date()
                ? true
                : false
              : false;
          dbAccessor
            .updateRecordBasedOnConditions(
              {
                id: userId,
                'verification.isActive': true
              },
              {
                $set: {
                  'verification.$[].isActive': false,
                  isMailVerified: status
                }
              },
              desiredModel
            )
            .then(result =>
              result.count > 0
                ? cb(
                    null,
                    {
                      isValid: status
                    },
                    true,
                    constantData.ValidityCheckerTrue
                  )
                : cb(
                    null,
                    {
                      isValid: false
                    },
                    false,
                    constantData.ValidityCheckerFalse
                  )
            )
            .catch(err => cb(null, err, false, err.message));
        });
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  //delete a user
  desiredModel.deleteRecord = (req, cb) => {
    try {
      const userId = req.reqestedUserId;
      dbAccessor
        .updateRecord(
          userId,
          {
            isDeleted: true
          },
          desiredModel
        )
        .then(result =>
          result.count > 0
            ? cb(
                null,
                {
                  isDeactivated: true
                },
                true,
                constantData.RecordDeleted
              )
            : cb(null, {}, false, constantData.NoRecordFound)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };
  //get suscription
  desiredModel.getSubcriptionObj = cb => {
    try {
      return cb(
        null,
        constantData.subscriptionPlan,
        true,
        constantData.EmptyString
      );
    } catch (ex) {
      return cb(null, {}, false, constantData.EmptyString);
    }
  };

  //subsctiption to a plan
  desiredModel.userSubscription = (req, reqBody, cb) => {
    try {
      const plan = reqBody.subscribedPlan;
      const requestedUserId = req.reqestedUserId;
      if (!plan || !requestedUserId || !constantData.subscriptionPlan[plan])
        return cb(null, {}, false, constantData.IncorrectRequest);
      let walletAddress, privateKey, txHash;
      dbAccessor
        .getRecordByAggregation(
          [
            {
              $match: {
                _id: ObjectId(requestedUserId)
              }
            },
            {
              $project: {
                walletAddress: '$wallet.walletAddress',
                privateKey: '$wallet.privateKey'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result => {
          if (
            result &&
            result[0] &&
            result[0].walletAddress &&
            result[0].privateKey
          ) {
            walletAddress = result[0].walletAddress;
            privateKey = result[0].privateKey;
            return walletHelper.getWalletBalance(walletAddress);
          }
          return { isDeclined: true, message: constantData.NoRecordFound };
        })
        .then(result =>
          result.isDeclined
            ? result
            : result &&
              result.data &&
              result.data.balance > constantData.subscriptionPlan[plan]
            ? walletHelper.transferTokens(
                walletAddress,
                privateKey,
                constantData.EthereumAdminWalletAddress,
                constantData.subscriptionPlan[plan]
              )
            : { isDeclined: true, message: constantData.insufficientFund }
        )
        .then(result => {
          txHash =
            result.data && result.data.status ? result.data.status : undefined;
          return result.isDeclined
            ? result
            : result.data && result.data.status
            ? dbAccessor.updateRecordBasedOnConditions(
                {
                  id: requestedUserId,
                  'subscriptions.isDeleted': false
                },
                {
                  $set: {
                    'subscriptions.$[].isDeleted': true
                  }
                },
                desiredModel
              )
            : {
                isDeclined: true,
                message: constantData.BlockchainParamsMismatch
              };
        })
        .then(result =>
          result.isDeclined
            ? result
            : dbAccessor.updateRecord(
                requestedUserId,
                {
                  $push: {
                    subscriptions: {
                      plan,
                      isDeleted: false
                    },
                    'wallet.transactionLog': {
                      voucharType: 'Subscription',
                      transactionType: 'Withdraw',
                      walletAddress: constantData.EthereumAdminWalletAddress,
                      amount: constantData.subscriptionPlan[plan],
                      narration: `Subscription with ${
                        constantData.subscriptionPlan[plan]
                      } tokens`,
                      createdAt: Date.now(),
                      txHash: txHash
                    }
                  }
                },
                desiredModel
              )
        )
        .then(result =>
          result.isDeclined
            ? cb(null, {}, true, result.message)
            : result.count > 0
            ? cb(
                null,
                {
                  subscribedPlan: plan.toLowerCase()
                },
                true,
                `Subscription to ${plan.toUpperCase()} is successful`
              )
            : cb(null, {}, true, constantData.NoRecordFound)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  //private photo view by specific user
  desiredModel.deleteSubscription = (req, cb) => {
    try {
      const requestedUserId = req.reqestedUserId;
      if (!requestedUserId)
        return cb(null, {}, false, constantData.IncorrectRequest);
      dbAccessor
        .updateRecordBasedOnConditions(
          {
            id: requestedUserId,
            'subscriptions.isDeleted': false
          },
          {
            $set: {
              'subscriptions.$[].isDeleted': true
            }
          },
          desiredModel
        )
        .then(result =>
          result.count > 0
            ? cb(null, {}, true, `Successfully unsubscribed from your plan.`)
            : cb(null, {}, true, constantData.NoRecordFound)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  //Filtering notification
  desiredModel.getLimitedNotifications = (req, page, limit, cb) => {
    try {
      const range = parseInt(limit) > 0 ? parseInt(limit) : 20;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;
      const userId = req.reqestedUserId;
      const notificatinObj = helper.getLimitedNotificationObj(
        userId,
        offset,
        range
      );
      dbAccessor
        .getRecordByAggregation(notificatinObj, desiredModel)
        .toArray((err, result) =>
          err
            ? cb(null, err, false, err.message)
            : result[0] && result[0].notifications
            ? cb(null, result[0].notifications, true, constantData.EmptyString)
            : cb(null, [], false, constantData.EmptyString)
        );
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };
  desiredModel.getPasscode = (req, cb) =>{
    try{
      const userId = req.reqestedUserId;
      dbAccessor.getRecordByAggregation(
        [
          {
            $match: {
              _id: ObjectId(userId)
            }
          },
          {
            $project: {
              _id: 0,
              passcode: "$passcode"
            }
          }
        ],desiredModel
      ).toArray((err, res) =>
        {
          return err
            ? cb(null, err, false, err.message)
            : res[0] ? cb(null, res[0], true, constantData.EmptyString)
            : cb(null, {}, false, constantData.EmptyString);
        }
        );
    }
    catch(err){
      return cb(null,err,false,err.message);

    }
  }


  desiredModel.promoToken = (req, cb) =>{
    try{
      const userId = req.reqestedUserId;
      dbAccessor
      .getRecordByAggregation(
        [
          {
            $match: {
              _id: ObjectId(userId)
            }
          },
          {
            $project: {
              walletAddress: '$wallet.walletAddress',
            }
          }
        ],
        desiredModel
      )
      .toArray().then(result=>
      
        
        result[0] && result[0].walletAddress ?
          walletHelper.topUpWalletBalance(result[0].walletAddress, 1000) :
          {
            isDeclined: true,
            message: constantData.NoRecordFound
          }
        ).then( result =>{
          //console.log("aise", result.isDeclined, result.data);
          
          return result.isDeclined ?
          result :
          result && result.data && result.data.mintHash ?
          // {message: "hoiche"}:
          dbAccessor.updateRecordWithPush({
              _id: ObjectId(userId)
            }, {
              'wallet.transactionLog': {
                voucharType: 'Top-Up',
                transactionType: 'Promotional Deposite',
                tokens: 1000,
                amount: 0,
                narration: `Deposited 1000 tokens as promo gift`,
                createdAt: Date.now(),
                txHash: result.data.mintHash
              }
            },
            desiredModel
          ) :
          {
            isDeclined: true,
            message: constantData.BlockchainParamsMismatch
          }}
        ).then(result => {
          //console.log("1", result);
          if (result.isDeclined)
            return cb(null, {}, true, result.message);
          return cb( null, {}, true, constantData.EmptyString )
        }
      )
        
    }
    catch(err){
      return cb(null,err,false,err.message);

    }
  }

  desiredModel.TopUpToken = (req, cb) =>{
    try{
      console.log(req.body);
      
      const userId = req.reqestedUserId;
      dbAccessor
      .getRecordByAggregation(
        [
          {
            $match: {
              _id: ObjectId(userId)
            }
          },
          {
            $project: {
              walletAddress: '$wallet.walletAddress',
            }
          }
        ],
        desiredModel
      )
      .toArray().then(result=>
        result[0] && result[0].walletAddress ?
          walletHelper.topUpWalletBalance(result[0].walletAddress, req.body.token) :
          {
            isDeclined: true,
            message: constantData.NoRecordFound
          }
        ).then( result =>{
          console.log("aise", result.isDeclined, result.data);
          
          return result.isDeclined ?
          result :
          result && result.data && result.data.mintHash ?
          // {message: "hoiche"}:
          dbAccessor.updateRecordWithPush({
              _id: ObjectId(userId)
            }, {
              'wallet.transactionLog': {
                voucharType: 'Top-Up',
                transactionType: 'Deposite',
                tokens: req.body.token,
                amount: req.body.price,
                narration: 'Deposited '+req.body.token + ' tokens',
                createdAt: Date.now(),
                txHash: result.data.mintHash
              }
            },
            desiredModel
          ) :
          {
            isDeclined: true,
            message: constantData.BlockchainParamsMismatch
          }}
        ).then(result => {
          console.log("1", result.isDeclined);
          if (result.isDeclined)
            return cb(null, {}, true, result.message);
          return cb( null, {}, true, constantData.EmptyString )
        }
      )
        
    }
    catch(err){
      return cb(null,err,false,err.message);

    }
  }


  //passcode validation
  desiredModel.passcodeValidation = (req, reqBody, cb) => {
    try {
      const userId = req.reqestedUserId;
      const passcode = reqBody.passcode;
      if (!passcode) return cb(null, {}, false, constantData.IncorrectRequest);
      dbAccessor
        .getRecordWithParam(
          {
            where: {
              id: userId
            },
            fields: {
              passcode: true
            }
          },
          desiredModel
        )
        .then(result =>
          result && result.passcode && result.passcode === passcode
            ? cb(
                null,
                {
                  isValid: true
                },
                true,
                constantData.EmptyString
              )
            : cb(
                null,
                {
                  isValid: false
                },
                true,
                constantData.EmptyString
              )
        )
        .catch(err => {
          return cb(null, err, false, err.message);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //Change Passcode by 'Forget passcode' menu
  desiredModel.changePasscode = (req, cb) => {
    try {
      const passcode = helper.getRandomNumber(4);
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName
        ? req.requestedUserName
        : req.requestedUserMail;
      const htmlContent = `<body><div class="container"><div class="jumbotron">
      <h1>Hello ${userName}</h1>
      <h1>Your new passcode is: ${passcode}</h1>
      </div><p>Thanks for being with Honeygram.
      Please follow the link below to get our promotions.</p>
      <p>HoneyGram</p></div></body>`;
      const subject = 'forget passcode';
      const emailObj = helper.emailServiceObj(
        req.requestedUserMail,
        htmlContent,
        subject
      );
      AWS.config.update(config.awsSecuritySES);


      dbAccessor
        .updateRecordBasedOnConditions(
          {
            id: userId
          },
          {
            $set: {
              passcode: passcode
            }
          },
          desiredModel
        )
        .then(result => {
          if (result.count > 0) {
            const sesConfig = config.awsSESConfig;
            new AWS.SES(sesConfig).sendEmail(emailObj, (err, data) =>
              err
                ? cb(null, err, false, err.message)
                : cb(
                    null,
                    { passcode: passcode },
                    true,
                    constantData.UpdatedSuccessfully
                  )
            );
          } else {
            return cb(null, {}, true, constantData.NoRecordFound);
          }
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  // gift Tokens
  desiredModel.sendGiftTokens = (req, reqBody, cb) => {
    try {
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName;
      const amount = parseInt(reqBody.tokens) ? parseInt(reqBody.tokens) : 0;
      const receiverId = reqBody.receiverId;
      const id = `${Date.now()}${userId}${receiverId}`;
      if (!amount || !receiverId)
        return cb(null, {}, false, constantData.IncorrectRequest);
      let notificationBody, walletInfo, txhash, notificationCount;

      dbAccessor
        .getRecordByAggregation(
          [
            {
              $match: {
                $or: [
                  {
                    _id: ObjectId(userId)
                  },
                  {
                    _id: ObjectId(receiverId)
                  }
                ]
              }
            },
            {
              $project: {
                _id: 0,
                id: '$_id',
                userName: '$userName',
                userType: '$userType',
                walletAddress: '$wallet.walletAddress',
                privateKey: '$wallet.privateKey',
                notificationCount: '$notificationCount'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result => {
          walletInfo = result;
          notificationCount = result.filter(obj => obj.id == receiverId)[0]
            .notificationCount;
          return walletHelper.getWalletBalance(
            result.filter(obj => obj.id == userId)[0].walletAddress
          );
        })
        .then(result =>
          result && result.data && result.data.balance > amount
            ? {}
            : {
                isDeclined: true,
                message: constantData.insufficientFund
              }
        )
        .then(result =>
          result && result.isDeclined
            ? result
            : (walletInfo.filter(obj => obj.id == userId)[0].userType ==
                'keeper' &&
                walletInfo.filter(obj => obj.id == receiverId)[0].userType ==
                  'honey') ||
              (walletInfo.filter(obj => obj.id == userId)[0].userType ==
                'honey' &&
                walletInfo.filter(obj => obj.id == receiverId)[0].userType ==
                  'keeper')
            ? walletHelper.transferTokens(
                walletInfo.filter(obj => obj.id == userId)[0].walletAddress,
                walletInfo.filter(obj => obj.id == userId)[0].privateKey,
                walletInfo.filter(obj => obj.id == receiverId)[0].walletAddress,
                amount
              )
            : {
                isDeclined: true,
                message: constantData.InvalidRequestGiftToken
              }
        )
        .then(result =>
          result && result.isDeclined
            ? result
            : result.data && result.data.status
            ? dbAccessor.updateRecordWithPush(
                {
                  _id: ObjectId(userId)
                },
                {
                  giftTokens: {
                    id,
                    userId: receiverId,
                    isSender: true,
                    amount,
                    createdAt: Date.now()
                  },
                  'wallet.transactionLog': {
                    voucharType: 'GiftToken',
                    transactionType: 'Withdraw',
                    walletAddress: walletInfo.filter(
                      obj => obj.id == receiverId
                    )[0].walletAddress,
                    amount: amount,
                    narration: `Gift ${amount} tokens to ${
                      walletInfo.filter(obj => obj.id == receiverId)[0].userName
                    }`,
                    createdAt: Date.now(),
                    txHash: (txhash = result.data.status)
                  }
                },
                desiredModel
              )
            : {
                isDeclined: true,
                message: `Transfer of token is not performed.`
              }
        )
        .then(result =>
          result.isDeclined
            ? result
            : result.result.nModified > 0
            ? dbAccessor.updateRecordWithPush(
                {
                  _id: ObjectId(receiverId)
                },
                {
                  giftTokens: {
                    id,
                    userId,
                    isSender: false,
                    amount,
                    createdAt: Date.now()
                  },
                  'wallet.transactionLog': {
                    voucharType: 'GiftToken',
                    transactionType: 'Deposit',
                    walletAddress: walletInfo.filter(obj => obj.id == userId)[0]
                      .walletAddress,
                    amount: amount,
                    narration: `Gift ${amount} tokens from ${
                      walletInfo.filter(obj => obj.id == userId)[0].userName
                    }`,
                    createdAt: Date.now(),
                    txHash: txhash
                  }
                },
                desiredModel
              )
            : {
                isDeclined: true,
                message: `Record is not updated`
              }
        )
        .then(result =>
          result.isDeclined
            ? result
            : result.result.nModified > 0
            ? dbAccessor.getAvatar(userId, desiredModel)
            : {
                isDeclined: true,
                message: `Record is not updated`
              }
        )
        .then(result => {
          if (result.isDeclined) return result;
          let avatar;
          if (result && result.avatar) avatar = result.avatar;
          const title = 'Gift Token';
          const body = `${userName} sent you ${amount} tokens`;
          const type = constantData.GiftTokens.notificationType;
          const notification = helper.getNotificationObject(
            userId,
            receiverId,
            userName,
            title,
            body,
            avatar,
            id,
            type,
            userId
          );
          notificationBody = helper.notificationBody(
            receiverId,
            title,
            body,
            notification
          );
          return dbAccessor.updateRecord(
            receiverId,
            {
              $push: {
                notifications: notification
              },
              $inc: {
                notificationCount: 1
              }
            },
            desiredModel
          );
        })
        .then(result => {
          if (result.isDeclined) return result;
          firebaseRequest.requesthandler(
            'https://fcm.googleapis.com/fcm/send',
            'POST',
            notificationBody
          );
          //socketNotificationSend
          var socket = desiredModel.app.io;
          socket.to(receiverId).emit('notificationCounterResponse', {
            notificationCount: ++notificationCount
          });
          return {
            isAccept: true
          }; ///;
        })
        .then(result => {
          return result.isDeclined
            ? cb(null, {}, false, result.message)
            : cb(
                null,
                {
                  balance: amount
                },
                true,
                constantData.EmptyString
              );
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  

  //report a user
  desiredModel.reportUser = (req, reqBody, cb) => {
    try {
      const userId = req.reqestedUserId;
      const reportedUserId = reqBody.userId;
      const id = `${Date.now()}${userId}${reportedUserId}`;
      const objSender = {
        id,
        userId: reportedUserId,
        isReporter: true
      };
      const objReceiver = {
        id,
        userId,
        isReporter: false
      };
      dbAccessor
        .updateRecordWithPush(
          {
            _id: ObjectId(userId),
            'reportedUsers.userId': {
              $ne: reportedUserId
            }
          },
          {
            reportedUsers: objSender
          },
          desiredModel
        )

        .then(result =>
          result && result.result && result.result.nModified > 0
            ? dbAccessor.updateRecordWithPush(
                {
                  _id: ObjectId(reportedUserId),
                  'reportedUsers.userId': {
                    $ne: userId
                  }
                },
                {
                  reportedUsers: objReceiver
                },
                desiredModel
              )
            : {
                isDeclined: true
              }
        )
        .then(result =>
          result.isDeclined
            ? cb(null, {}, false, constantData.NoRecordFound)
            : cb(null, objSender, true, constantData.EmptyString)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //report a user
  desiredModel.profileCompleteness = (req, reqBody, cb) => {
    try {
      const userId = req.reqestedUserId;
      const obj = helper.getProfileCompletenessObject(userId);
      dbAccessor
        .getUserById(obj, desiredModel)
        .toArray()
        .then(res =>
          res && res.length > 0
            ? cb(
                null,
                {
                  isProfileCompleted: true
                },
                true,
                ''
              )
            : cb(
                null,
                {
                  isProfileCompleted: false
                },
                true,
                ''
              )
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(desiredModel);
};
