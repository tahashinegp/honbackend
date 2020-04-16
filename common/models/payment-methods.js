'use strict';

const uuidv4 = require('uuid/v4');
const { ObjectId } = require('mongodb');
const paymentHelper = require('../helpers/payment-helper');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const cardValidator = require('card-validator');
const dbAccessor = require('../helpers/dbaccessor');
const constantData = require('../helpers/constant-data');
const config = require('../../server/config');
var braintree = require('braintree');

module.exports = function (paymentMethod) {

  //card number validator
  paymentMethod.cardNumberValidate = (req, cardNumber, cb) => {
    try {
        const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const cardNo = parseInt(cardNumber);
      var numberValidation = cardValidator.number(`${cardNo}`);
      if (!numberValidation.card || !numberValidation.isValid)
        return cb(
          null,
          {
            isValid: false,
            isExist: false
          },
          true,
          constantData.EmptyString
        );
      const match = {
        'paymentMethod.cardNo': cardNo
      };
      // if (reqBody.id)
      //   match['paymentMethod.id'] = {
      //     $ne: reqBody.id
      //   };
      dbAccessor
        .getRecordByAggregation(
          [
            {
              $match: {
                _id: ObjectId(userId)
              }
            },
            {
              $unwind: {
                path: '$paymentMethod',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: match
            },
            {
              $group: {
                _id: '$_id',
                paymentMethod: {
                  $push: '$paymentMethod'
                }
              }
            }
          ],
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          return result.length > 0
            ? cb(
              null,
              {
                isValid: true,
                isExist: true
              },
              true,
              constantData.EmptyString
            )
            : cb(
              null,
              {
                isValid: true,
                isExist: false
              },
              true,
              constantData.EmptyString
            );
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //card security-code validator
  paymentMethod.cardSecurityCodeValidate = (cardNumber, securityCode, cb) => {
    try {
      const cardNo = parseInt(cardNumber);
      const secureCode = parseInt(securityCode);
      const numberValidation = cardValidator.number(`${cardNo}`);
      if (
        !cardNo ||
        !secureCode ||
        !numberValidation.isValid ||
        secureCode.toString().length !== numberValidation.card.code.size
      )
        return cb(
          null,
          {
            isSecurityCodeValid: false
          },
          true,
          constantData.EmptyString
        );
      return cb(
        null,
        {
          isSecurityCodeValid: true
        },
        true,
        constantData.EmptyString
      );
    } catch (err) {
      return cb(
        null,
        {
          isSecurityCodeValid: false
        },
        false,
        constantData.IncorrectRequest
      );
    }
  };

  paymentMethod.getPaymentMethods = (req, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      dbAccessor
        .getRecordByAggregation(
          paymentHelper.getPaymentMethodObj(userId),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (result && result[0] && result[0].paymentMethod)
            return cb(
              null,
              result[0].paymentMethod,
              true,
              constantData.EmptyString
            );
          return cb(null, [], true, constantData.EmptyString);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  paymentMethod.getPaymentMethodById = (req, id, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      dbAccessor
        .getRecordByAggregation(
          paymentHelper.getPaymentMethodByIdObj(userId, id),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (result && result[0] && result[0].paymentMethod)
            return cb(
              null,
              result[0].paymentMethod,
              true,
              constantData.EmptyString
            );
          return cb(null, [], true, constantData.EmptyString);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //payment Method Post
  paymentMethod.paymentMethod = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const cardNo = parseInt(reqBody.cardNo);
      const securityCode = parseInt(reqBody.securityCode);
      const cardHolderName = reqBody.cardHolderName;
      const expiryDate = reqBody.expiryDate;
      const numberValidation = cardValidator.number(`${cardNo}`);
      if (
        !cardNo ||
        !securityCode ||
        !cardHolderName ||
        !expiryDate ||
        !numberValidation.isValid ||
        securityCode.toString().length !== numberValidation.card.code.size
      )
        return cb(null, {}, false, constantData.IncorrectRequest);
      const id = `${Date.now()}${userId}${uuidv4()}`;
      const obj = {
        id,
        cardNo,
        securityCode,
        cardHolderName,
        expiryDate,
        cardTypeName: numberValidation.card.niceType,
        cardTypeValue: numberValidation.card.type,
        isTransactionDeclined: false,
        createdAt: Date.now(),
        isDeleted: false
      };
      dbAccessor
        .getRecordWithParam(
          {
            where: {
              id: userId,
              'paymentMethod.cardNo': cardNo
            },
            fields: {
              id: true
            }
          },
          desiredModel
        )
        .then(result =>
          result
            ? {
              isExist: true
            }
            : dbAccessor.getRecordWithParam(
              {
                where: {
                  id: userId,
                  'paymentMethod.isPrimary': true
                },
                fields: {
                  id: true
                }
              },
              desiredModel
            )
        )
        .then(result => {
          if (result && result.isExist)
            return {
              isExist: true
            };
          obj.isPrimary = result == null;
          return dbAccessor.updateRecord(
            userId,
            {
              $push: {
                paymentMethod: obj
              }
            },
            desiredModel
          );
        })
        .then(result => {
          return result.isExist
            ? cb(null, {}, true, constantData.RecordAlreadyExist)
            : cb(null, obj, true, 'Payment method added successfully!');
        })
        .catch(err => {
          cb(null, err, false, err.message);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //delete payment-method
  paymentMethod.deletePaymentMethod = (req, id, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      dbAccessor
        .updateRecordWithParamAndSet(
          {
            _id: ObjectId(userId),
            'paymentMethod.id': id,
            'paymentMethod.isPrimary': false
          },
          {
            'paymentMethod.$[p].isDeleted': true
          },
          {
            'p.id': id,
            'p.isPrimary': false
          },
          desiredModel
        )
        .then(result => {
          return cb(null, {}, true, constantData.RecordDeleted);
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };
  //update payment-method
  paymentMethod.updatePaymentMethod = (req, id, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const cardNo = parseInt(reqBody.cardNo);
      const securityCode = parseInt(reqBody.securityCode);
      const cardHolderName = reqBody.cardHolderName;
      const expiryDate = reqBody.expiryDate;
      const numberValidation = cardValidator.number(`${cardNo}`);
      if (
        !cardNo ||
        !securityCode ||
        !cardHolderName ||
        !expiryDate ||
        !numberValidation.isValid ||
        securityCode.toString().length !== numberValidation.card.code.size
      )
        return cb(null, {}, false, constantData.IncorrectRequest);
      dbAccessor
        .getRecordByAggregation(
          [
            {
              $match: {
                _id: ObjectId(userId)
              }
            },
            {
              $unwind: {
                path: '$paymentMethod',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                'paymentMethod.id': {
                  $ne: id
                },
                'paymentMethod.cardNo': cardNo
              }
            },
            {
              $group: {
                _id: '$_id',
                paymentMethod: {
                  $push: '$paymentMethod'
                }
              }
            }
          ],
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (result.length > 0)
            return cb(null, {}, false, constantData.RecordAlreadyExist);
          dbAccessor
            .updateRecordWithParamAndSet(
              {
                _id: ObjectId(userId),
                'paymentMethod.id': id
              },
              {
                'paymentMethod.$[p].cardNo': cardNo,
                'paymentMethod.$[p].securityCode': securityCode,
                'paymentMethod.$[p].cardHolderName': cardHolderName,
                'paymentMethod.$[p].expiryDate': expiryDate,
                'paymentMethod.$[p].cardTypeName':
                  numberValidation.card.niceType,
                'paymentMethod.$[p].cardTypeValue': numberValidation.card.type,
                'paymentMethod.$[p].updatedAt': Date.now()
              },
              {
                'p.id': id
              },
              desiredModel
            )
            .then(result =>
              result.result.nModified > 0
                ? dbAccessor
                  .getRecordByAggregation(
                    [
                      {
                        $match: {
                          _id: ObjectId(userId)
                        }
                      },
                      {
                        $unwind: '$paymentMethod'
                      },
                      {
                        $match: {
                          'paymentMethod.id': id
                        }
                      },
                      {
                        $group: {
                          _id: '$_id',
                          paymentMethod: {
                            $push: '$paymentMethod'
                          }
                        }
                      }
                    ],
                    desiredModel
                  )
                  .toArray((err, result) =>
                    err
                      ? cb(null, err, false, err.message)
                      : result &&
                        result[0] &&
                        result[0].paymentMethod &&
                        result[0].paymentMethod.length > 0
                        ? cb(
                          null,
                          result[0].paymentMethod[0],
                          true,
                          constantData.EmptyString
                        )
                        : cb(null, {}, true, constantData.NoRecordFound)
                  )
                : cb(null, {}, true, constantData.NoRecordFound)
            )
            .catch(err => cb(null, err, false, err.message));
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //set primary payment-method
  paymentMethod.resetPrimaryPaymentMethod = (req, id, cb) => {
    try {
      const desiredModel = app.models.Users;
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
              $unwind: '$paymentMethod'
            },
            {
              $match: {
                'paymentMethod.isDeleted': false,
                'paymentMethod.id': id
              }
            },
            {
              $group: {
                _id: '$_id',
                paymentMethod: {
                  $push: '$paymentMethod'
                }
              }
            }
          ],
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (
            !result ||
            !result[0] ||
            !result[0].paymentMethod ||
            result[0].paymentMethod.length < 1
          )
            return cb(null, {}, false, constantData.NoRecordFound);
          const paymentMethodInfo = result[0].paymentMethod[0];
          if (
            paymentMethodInfo.isDeleted ||
            paymentMethodInfo.isPrimary ||
            paymentMethodInfo.isTransactionDeclined
          )
            return cb(
              null,
              {},
              false,
              paymentMethodInfo.isDeleted
                ? 'The card is already removed.'
                : paymentMethodInfo.isPrimary
                  ? 'The card is already primary'
                  : 'The card has a declined transaction'
            );
          dbAccessor
            .updateRecordBasedOnConditions(
              {
                _id: ObjectId(userId),
                'paymentMethod.isPrimary': true
              },
              {
                $set: {
                  'paymentMethod.$[].isPrimary': false
                }
              },
              desiredModel
            )
            .then(result =>
              dbAccessor.updateRecordWithParamAndSet(
                {
                  _id: ObjectId(userId),
                  'paymentMethod.id': paymentMethodInfo.id
                },
                {
                  'paymentMethod.$[p].updatedAt': Date.now(),
                  'paymentMethod.$[p].isPrimary': true
                },
                {
                  'p.id': paymentMethodInfo.id
                },
                desiredModel
              )
            )
            .then(result =>
              dbAccessor
                .getRecordByAggregation(
                  paymentHelper.getPaymentMethodObj(userId),
                  desiredModel
                )
                .toArray((err, result) => {
                  if (err) return cb(null, err, false, err.message);
                  if (result && result[0] && result[0].paymentMethod)
                    return cb(
                      null,
                      result[0].paymentMethod,
                      true,
                      constantData.EmptyString
                    );
                  return cb(null, [], true, constantData.EmptyString);
                })
            )
            .catch(err => cb(null, err, false, err.message));
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  paymentMethod.getNonce = (cb) => {
    var gateway = braintree.connect({
      environment:  braintree.Environment.Sandbox,
      merchantId:   config.braintreeConfig.merchantId,
      publicKey:    config.braintreeConfig.publicKey,
      privateKey:   config.braintreeConfig.privateKey
    });
    gateway.clientToken.generate({}, function (err, res) {
      if (err) return cb(null, {}, false, err.message);
      return cb(null, { clientToken: res.clientToken }, true, constantData.EmptyString);
    });
  }
  hideCommonMethodsHelper.disablingOfRemoteMethods(paymentMethod);
}
