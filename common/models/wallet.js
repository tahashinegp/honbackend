'use strict';

const {
  ObjectId
} = require('mongodb');
const walletHelper = require('../helpers/wallet-helper');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');
const config = require('../../server/config');
const paypal = require("paypal-rest-sdk");
const braintree = require('braintree');

module.exports = function (wallet) {

  //get Balance
  wallet.getWalletBalance = (req, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;

      dbAccessor
        .getRecordByAggregation(
          [{
              $match: {
                _id: ObjectId(userId)
              }
            },
            {
              $project: {
                walletAddress: '$wallet.walletAddress'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result =>
          result && result[0] && result[0].walletAddress ?
          walletHelper.getWalletBalance(result[0].walletAddress) :
          {
            isDeclined: true
          }
        )
        .then(result => result.isDeclined ?
          cb(null, {}, false, constantData.NoRecordFound) :
          result && result.data && result.data.balance ?
          cb(
            null, {
              balance: result.data.balance
            },
            true,
            constantData.EmptyString
          ) :
          cb(null, {}, true, constantData.NoRecordFound)
        )
        .catch(err => {
          return cb(null, {}, false, err.message);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //top up Balance
  wallet.topUpWalletBalance = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const tokens = reqBody.tokens;
      const amount = reqBody.amount;
      const nonce = reqBody.clientNonce;
      var gateway = braintree.connect({
        environment: braintree.Environment.Sandbox,
        merchantId: config.braintreeConfig.merchantId,
        publicKey: config.braintreeConfig.publicKey,
        privateKey: config.braintreeConfig.privateKey
      });
      if (!tokens || amount * 10 != tokens)
        return cb(null, {}, false, constantData.IncorrectRequest);

      gateway.transaction.sale({
          amount: amount,
          paymentMethodNonce: nonce,
          options: {
            submitForSettlement: true
          }
        })
        .then(result =>
          !result.success ? {
            isDeclined: true,
            message: constantData.GatewayParamsMismatch
          } :
          dbAccessor
          .getRecordByAggregation(
            [{
                $match: {
                  _id: ObjectId(userId)
                }
              },
              {
                $project: {
                  walletAddress: '$wallet.walletAddress'
                }
              }
            ],
            desiredModel
          )
          .toArray())
        .then(result => result.isDeclined ? result :
          result[0] && result[0].walletAddress ?
          walletHelper.topUpWalletBalance(result[0].walletAddress, tokens) :
          {
            isDeclined: true,
            message: constantData.NoRecordFound
          }
        )
        .then(result =>
          result.isDeclined ?
          result :
          result && result.data && result.data.mintHash ?
          dbAccessor.updateRecordWithPush({
              _id: ObjectId(userId)
            }, {
              'wallet.transactionLog': {
                voucharType: 'Top-Up',
                transactionType: 'Deposit',
                tokens: tokens,
                amount: amount,
                narration: `Deposited ${tokens} tokens by USD ${amount}`,
                createdAt: Date.now(),
                txHash: result.data.mintHash
              }
            },
            desiredModel
          ) :
          {
            isDeclined: true,
            message: constantData.BlockchainParamsMismatch
          }
        )
        .then(result => {
            if (result.isDeclined)
              return cb(null, {}, true, result.message)
            return cb(
              null, {
                balance: tokens,
                amount: amount
              },
              true,
              constantData.EmptyString
            )
          }
        )
        .catch(err => {
          return cb(null, {}, false, err.message);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };
  //withdraw Balance
  wallet.withdraWalletBalance = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const amount = reqBody.tokens;
      const receiverWalletAddress = reqBody.walletAddress;
      if (!amount) return cb(null, {}, false, constantData.IncorrectRequest);
      dbAccessor
        .getRecordByAggregation(
          [{
              $match: {
                _id: ObjectId(userId)
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
        .then(result =>
          result && result[0] && result[0].walletAddress ?
          walletHelper.withdraWalletBalance(
            result[0].walletAddress,
            result[0].privateKey,
            receiverWalletAddress,
            amount
          ) :
          {
            isDeclined: true
          }
        )
        .then(result =>
          result.isDeclined ?
          {
            isDeclined: true
          } :
          result && result.data && result.data.status ?
          dbAccessor.updateRecordWithPush({
              _id: ObjectId(userId)
            }, {
              'wallet.transactionLog': {
                voucharType: 'Withdraw',
                transactionType: 'Withdraw',
                walletAddress: receiverWalletAddress,
                amount: amount,
                narration: `Withdrawn ${amount} tokens`,
                createdAt: Date.now(),
                txHash: result.data.status
              }
            },
            desiredModel
          ) :
          {
            isDeclined: true
          }
        )
        .then(result =>
          result.isDeclined ?
          cb(null, {}, true, constantData.NoRecordFound) :
          cb(
            null, {
              balance: amount
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

  //do better request against date request-- send notification only
  wallet.walletHistory = (page, limit, req, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const dataLimit = !parseInt(limit) ? 20 : parseInt(limit);
      const offset =
        parseInt((!parseInt(page) ? 1 : parseInt(page)) - 1) * limit;
      dbAccessor
        .getRecordByAggregation(
          helper.transactionHistoryObj(userId, offset, dataLimit),
          desiredModel
        )
        .toArray((err, result) =>
          err ?
          cb(null, err, false, err.message) :
          !result || !result[0] || !result[0].transactionLog ?
          cb(null, {}, false, constantData.NoRecordFound) :
          cb(null, result[0].transactionLog, true, constantData.EmptyString)
        );
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(wallet);
}
