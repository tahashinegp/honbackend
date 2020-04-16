
'use strict';

const walletHelper = require('../helpers/wallet-helper');
const uuidv4 = require('uuid/v4');
const {
  ObjectId
} = require('mongodb');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');
const firebaseRequest = require('../helpers/firebase-request');

module.exports = function (dateRequest) {

  //fireBase login acknowledgement
  dateRequest.requestForDate = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const sendTo = reqBody.sendTo,
        when = new Date(reqBody.when),
        where = reqBody.where,
        tokens = parseInt(reqBody.tokens),
        createdAt = Date.now(),
        senderId = req.reqestedUserId,
        senderName = req.requestedUserName ?
        req.requestedUserName :
        req.requestedUserMail;
      if (senderId == sendTo || !when || !where || !tokens)
        return cb(null, {}, false, constantData.IncorrectRequest);
      let notificationBody, senderInfo, receiverInfo, id;
      id = `${Date.now()}-${sendTo}-${senderId}-${uuidv4()}`;
      senderInfo = {
        id,
        when,
        where,
        tokens,
        userId: sendTo,
        isSender: true,
        status: constantData.Status.pending,
        isRepliedType: true,
        createdAt,
        isDeleted: false
      };
      receiverInfo = {
        id,
        when,
        where,
        tokens,
        userId: senderId,
        isSender: false,
        status: constantData.Status.pending,
        isRepliedType: true,
        createdAt,
        isDeleted: false
      };
      dbAccessor.getRecordByAggregation([
        {$match: {_id: ObjectId(senderId)}},
        {$project: {userType: '$userType'}}
      ], desiredModel).toArray()
      .then(result=> result && result[0] && result[0].userType != constantData.UserType[0] ?
        {isDeclined: true, message: constantData.InvalidRequestDateRequest} : 
        dbAccessor
        .updateRecord(
          sendTo, {
            $push: {
              requestForDates: receiverInfo
            }
          },
          desiredModel
        )
      )      
        .then(result =>
          result.isDeclined ? result :
          dbAccessor.updateRecord(
            senderId, {
              $push: {
                requestForDates: senderInfo
              }
            },
            desiredModel
          )
        )
        .then(result => result.isDeclined ? result : 
          dbAccessor.getAvatar(senderId, desiredModel))
        .then(result => {
          if (result.isDeclined) return result;
          let avatar;
          if (result && result.avatar) avatar = result.avatar;
          const title = 'Date Request Received';
          const dateString = `${when.getDate()} ${
            constantData.MonthList[when.getMonth()]
            } ${when.getFullYear()} ${when.getHours()}:${when.getMinutes()}`;
          const body = `${senderName} requested you for a date on ${dateString}`;
          const type = constantData.DateRequest.notificationType;
          const notification = helper.getNotificationObject(
            senderId,
            sendTo,
            senderName,
            title,
            body,
            avatar,
            id,
            type
          );
          notificationBody = helper.notificationBody(
            sendTo,
            title,
            body,
            notification
          );
          return dbAccessor.updateRecord(
            sendTo, {
              $push: {
                notifications: notification
              },
              $inc: { notificationCount: 1}
            },
            desiredModel
          );
        })
        .then(result =>
          result.isDeclined ? result:
          dbAccessor.getRecordByAggregation([
            {
              $match: {_id: ObjectId(sendTo)}
            },
            {$project: {notificationCount: '$notificationCount'}}
          ], desiredModel
        ).toArray())
        .then(result => {
          if (result.isDeclined) return cb(null, {}, true, result.message);
          firebaseRequest.requesthandler(
            'https://fcm.googleapis.com/fcm/send',
            'POST',
            notificationBody
          );
          if(result[0] && result[0].notificationCount){
            var socket = desiredModel.app.io;
            socket.to(sendTo)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
          }
          return cb(null, {}, true, constantData.RequestSent);
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };


  //Filtering date request
  dateRequest.getDateRequestList = (req, page, limit, event, cb) => {
    try {
      const desiredModel = app.models.Users;
      const range = parseInt(limit) > 0 ? parseInt(limit) : 20;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;
      const userId = req.reqestedUserId;
      const requestedObj = helper.getDateRequestObj(
        userId,
        offset,
        range,
        event
      );
      dbAccessor
        .getRecordByAggregation(requestedObj, desiredModel)
        .toArray((err, result) => {
          return err ?
            cb(null, err, false, err.message) :
            result ?
            cb(null, result, true, constantData.EmptyString) :
            cb(null, [], false, constantData.EmptyString);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //do better request against date request-- send notification only
  dateRequest.doBetter = (req, notificationId, cb) => {
    try {
      const desiredModel = app.models.Users;
      dbAccessor
        .getRecordByAggregation(
          helper.getNotificationByIdObj(
            req.reqestedUserId,
            notificationId
          ),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (
            !(result[0] && result[0].notification && result[0].notification[0])
          )
            return cb(null, {}, false, constantData.NoDataFound);
          const requestId = result[0].notification[0].navigation.requestId,
            sendTo = result[0].notification[0].userId,
            userId = req.reqestedUserId,
            userName = req.requestedUserName ?
            req.requestedUserName :
            req.requestedUserMail;
          if (!sendTo || !requestId)
            return cb(null, {}, false, constantData.IncorrectRequest);
          let notificationBody;
          dbAccessor
            .updateRecordWithParamAndSet({
                $or: [{
                    _id: ObjectId(userId)
                  },
                  {
                    _id: ObjectId(sendTo)
                  }
                ],
                'requestForDates.id': requestId,
                'requestForDates.status': constantData.Status.pending
              }, {
                'requestForDates.$[p].status': constantData.Status.doBetter
              }, {
                'p.id': requestId,
                'p.status': constantData.Status.pending
              },
              desiredModel
            )
            .then(result =>
              result.result.nModified > 0 ?
              dbAccessor.getAvatar(userId, desiredModel) : {
                isDeclined: true,
                message: constantData.RecordNotUpdated
              }
            )
            .then(result => {
              if (result.isDeclined) return result;
              let avatar;
              if (result && result.avatar) avatar = result.avatar;
              const title = 'Date Request Challenged';
              const body = `${userName} thinks that you can do better than that!`;;
              const type = constantData.DateRequestNegotiation.notificationType;
              const notification = helper.getNotificationObject(
                userId,
                sendTo,
                userName,
                title,
                body,
                avatar,
                requestId,
                type
              );
              notificationBody = helper.notificationBody(
                sendTo,
                title,
                body,
                notification
              );
              return dbAccessor.updateRecord(
                sendTo, {
                  $push: {
                    notifications: notification
                  },
                  $inc: { notificationCount: 1}
                },
                desiredModel
              );
            })
            .then(result =>
              result.isDeclined ? result:
              dbAccessor.getRecordByAggregation([
                {
                  $match: {_id: ObjectId(sendTo)}
                },
                {$project: {notificationCount: '$notificationCount'}}
              ], desiredModel
            ).toArray())
            .then(result => {
              if (result.isDeclined) return cb(null, {}, false, result.message);
              firebaseRequest.requesthandler(
                'https://fcm.googleapis.com/fcm/send',
                'POST',
                notificationBody
              );
              if(result[0] && result[0].notificationCount){
                var socket = desiredModel.app.io;
                socket.to(sendTo)
                .emit(
                  'notificationCounterResponse',
                  {notificationCount:result[0].notificationCount}
                );
              }
              return cb(null, {}, true, constantData.RequestSent);
            })
            .catch(err => cb(null, err, false, err.message));
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //Filtering date request by id
  dateRequest.getDateRequestById = (req, id, cb) => {
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
                requestForDates: '$requestForDates'
              }
            },
            {
              $unwind: '$requestForDates'
            },
            {
              $match: {
                'requestForDates.id': id,
                'requestForDates.isDeleted': false
              }
            },
            {
              $project: {
                _id: 0,
                requestForDate: '$requestForDates'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result => {
          return result[0] && result[0].requestForDate ?
            cb(null, result[0].requestForDate, true, constantData.EmptyString) :
            cb(null, {}, true, constantData.EmptyString);
        })
        .catch(err => cb(null, {}, false, constantData.EmptyString));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };
  //deleteDateRequest
  dateRequest.deleteDateRequest = (id, req, cb) => {
    const desiredModel = app.models.Users;
    const userId = req.reqestedUserId;
    const setParam = {};
    setParam[`requestForDates.$[p].isDeleted`] = true;
    dbAccessor
      .getRecordByAggregation(
        [{
            $match: {
              _id: ObjectId(userId)
            }
          },
          {
            $unwind: '$requestForDates'
          },
          {
            $match: {
              'requestForDates.id': id
            }
          },
          {
            $project: {
              userId: '$requestForDates.userId'
            }
          }
        ],
        desiredModel
      )
      .toArray()
      .then(otherId => {
        dbAccessor
          .updateRecordWithParamAndSet({
              _id: {
                $in: [ObjectId(userId), ObjectId(otherId[0].userId)]
              },
              'requestForDates.id': id
            },
            setParam, {
              'p.id': id
            },
            desiredModel
          )
          .then(result => {
            if (result.result.nModified > 0)
              return cb(null, {}, true, 'Date successfully Deleted');
            else return cb(null, {}, false, 'No data found');
          })
          .catch(err => {
            return cb(null, err, false, '2nd last' + err.message);
          });
      })
      .catch(err => {
        return cb(null, err, false, 'last' + err.message);
      });
  };
  //
  //update date request by id
  dateRequest.updateDateRequestById = (req, id, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName ?
        req.requestedUserName :
        req.requestedUserMail;
      const object = helper.objectMapper(['where', 'when'], reqBody);
      if (Object.keys(object).length === 0)
        return cb(null, {}, false, constantData.IncorrectRequest);
      object.when ? (object.when = new Date(object.when)) : (object = object);
      let sendTo, notificationBody;
      const setParam = {};
      const param = Object.keys(object);
      for (var i = 0; i < Object.keys(object).length; i++)
        setParam[`requestForDates.$[p].${param[i]}`] = object[param[i]];
      dbAccessor
        .updateRecordWithParamAndSet({
            _id: ObjectId(userId),
            'requestForDates.id': id
          },
          setParam, {
            'p.id': id
          },
          desiredModel
        )
        .then(result => {
          return result.result &&
            result.result.nModified &&
            result.result.nModified > 0 ?
            dbAccessor
            .getRecordByAggregation(
              [{
                  $match: {
                    _id: ObjectId(userId)
                  }
                },
                {
                  $project: {
                    requestForDates: '$requestForDates'
                  }
                },
                {
                  $unwind: '$requestForDates'
                },
                {
                  $match: {
                    'requestForDates.id': id
                  }
                },
                {
                  $project: {
                    _id: 0,
                    userId: '$requestForDates.userId'
                  }
                }
              ],
              desiredModel
            )
            .toArray() : {
              isDeclined: true
            };
        })
        .then(result => {
          if (result.isDeclined)
            return {
              isDeclined: true
            };
          else if (result && result[0] && result[0].userId) {
            sendTo = result[0].userId;
            return dbAccessor.getAvatar(userId, desiredModel);
          } else
            return {
              isDeclined: true
            };
        })
        .then(result => {
          if (result.isDeclined)
            return {
              isDeclined: true
            };
          let avatar;
          if (result && result.avatar) avatar = result.avatar;
          const title = 'Date Request Received';
          const body = `${userName} updated the date request!`;
          const type = constantData.DateRequest.notificationType;
          const notification = helper.getNotificationObject(
            userId,
            sendTo,
            userName,
            title,
            body,
            avatar,
            id,
            type
          );
          notificationBody = helper.notificationBody(
            sendTo,
            title,
            body,
            notification
          );

          return dbAccessor.updateRecord(
            sendTo, {
              $push: {
                notifications: notification
              },
              $inc: { notificationCount: 1}
            },
            desiredModel
          );
        })
        
        .then(result => {
          if (result.isDeclined || result.count == 0)
            return {
              isDeclined: true
            };
          firebaseRequest.requesthandler(
            'https://fcm.googleapis.com/fcm/send',
            'POST',
            notificationBody
          );
          return {
            isDone: true
          };
        })
        .then(result =>
          result.isDeclined ? result:
          dbAccessor.getRecordByAggregation([
            {
              $match: {_id: ObjectId(sendTo)}
            },
            {$project: {notificationCount: '$notificationCount'}}
          ], desiredModel
        ).toArray())
        .then(result =>{
          if(result[0] && result[0].notificationCount){
            var socket = desiredModel.app.io;
            socket.to(sendTo)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
          }
          return result.isDeclined ?
          cb(null, {}, false, constantData.NoRecordFound) :
          cb(null, object, true, constantData.RequestSent)
        }
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //update request
  dateRequest.requestUpdate = (id, req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const requestType = reqBody.requestType;
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName ?
        req.requestedUserName :
        req.requestedUserMail;
      let request, senderWallet, senderPrivateKey, tokens2, sendTo, receiverWallet;
      if (!requestType)
        return cb(null, {}, false, constantData.IncorrectRequest);
      dbAccessor
        .getRecordByAggregation(
          [{
              $match: {
                _id: ObjectId(userId)
              }
            },
            {
              $project: {
                requestForDates: {
                  $filter: {
                    input: '$requestForDates',
                    as: 'requestForDates',
                    cond: {
                      $eq: ['$$requestForDates.id', id]
                    }
                  }
                },
                walletAddress: '$wallet.walletAddress',
                privateKey: '$wallet.privateKey',
                _id: 0
              }
            }
          ],
          desiredModel
        )
        .toArray((err, result) => {
          if(err) return cb(null, {}, false, err.message);
          if (
            !result[0] ||
            !result[0].requestForDates ||
            !result[0].requestForDates[0] || 
            !result[0].walletAddress ||
            !result[0].privateKey
          )
            return cb(null, {}, false, constantData.NoRecordFound);
          senderWallet = result[0].walletAddress;
          senderPrivateKey = result[0].privateKey;
          request = result[0].requestForDates[0];
          tokens2 = request.tokens;
          sendTo = request.userId;
            let notificationBody;
            switch (request.isSender) {
              case true:
                if (
                  requestType !=
                  constantData.DateRequestConfirm.notificationType &&
                  requestType !=
                  constantData.DateRequestNegotiation.notificationType &&
                  requestType != constantData.DateRequestDecline.notificationType
                  &&
                  requestType != constantData.DateRequestHappened.notificationType
                )
                  return cb(
                    null, {},
                    false,
                    constantData.InvalidRequest
                  );
                break;
              case false:
                if (
                  requestType !=
                  constantData.DateRequestAccept.notificationType &&
                  requestType != constantData.DateRequestDecline.notificationType
                )
                  return cb(null, {}, false, constantData.InvalidRequest);
                break;
              default:
                break;
            }
            switch (requestType) {
              case constantData.DateRequestAccept.notificationType:
                dbAccessor
                  .updateRecordWithParamAndSet({
                      _id: {
                        $in: [ObjectId(sendTo), ObjectId(userId)]
                      },
                      'requestForDates.id': id,
                      'requestForDates.status': constantData.Status.pending
                    }, {
                      'requestForDates.$[p].status': constantData.Status.accept,
                      'requestForDates.$[p].isRepliedType': true
                    }, {
                      'p.id': id,
                      'p.status': constantData.Status.pending
                    },
                    desiredModel
                  )
                  .then(result =>
                    result.result && result.result.nModified > 0 ?
                    dbAccessor.getAvatar(userId, desiredModel) : {
                      isDeclined: true,
                      message: 'request not valid'
                    }
                  )
                  .then(result => {
                    if (result.isDeclined) return result;
                    let avatar;
                    if (result && result.avatar) avatar = result.avatar;
                    const title = 'Date Request Accepted';
                    const body = `${userName} accepted your date request. Good luck!`;
                    const type = constantData.DateRequestAccept.notificationType;
                    const notification = helper.getNotificationObject(
                      userId,
                      sendTo,
                      userName,
                      title,
                      body,
                      avatar,
                      id,
                      type
                    );
                    notificationBody = helper.notificationBody(
                      sendTo,
                      title,
                      body,
                      notification
                    );
                    return dbAccessor.updateRecord(
                      sendTo, {
                        $push: {
                          notifications: notification
                        },
                        $inc: { notificationCount: 1}
                      },
                      desiredModel
                    );
                  })
                  .then(result =>
                    result.isDeclined ? result:
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {notificationCount: '$notificationCount'}}
                    ], desiredModel
                  ).toArray())
                  .then(result => {
                    if (result.isDeclined)
                      return cb(null, {}, false, result.message);
                    firebaseRequest.requesthandler(
                      'https://fcm.googleapis.com/fcm/send',
                      'POST',
                      notificationBody
                    );
                    if(result[0] && result[0].notificationCount){
                      var socket = desiredModel.app.io;
                      socket.to(sendTo)
                      .emit(
                        'notificationCounterResponse',
                        {notificationCount:result[0].notificationCount}
                      );
                    }
                    return cb(null, {}, true, constantData.RequestSent);
                  })
                  .catch(err => cb(null, err, false, err.message));
                break;
              case constantData.DateRequestNegotiation.notificationType:
                const tokens = reqBody.tokens;
                if (!tokens)
                  return cb(null, {}, false, constantData.IncorrectRequest);
                const previousTokens = request.tokens;

                dbAccessor
                  .updateRecordWithParamAndSet({
                      _id: {
                        $in: [ObjectId(sendTo), ObjectId(userId)]
                      },
                      'requestForDates.id': id,
                      'requestForDates.status': constantData.Status.doBetter
                    }, {
                      'requestForDates.$[p].tokens': tokens,
                      'requestForDates.$[p].status': constantData.Status.pending
                    }, {
                      'p.id': id,
                      'p.status': constantData.Status.doBetter
                    },
                    desiredModel
                  )
                  .then(result => {
                    if (result.result && result.result.nModified == 0)
                      return {
                        isDeclined: true,
                        message: 'Request not valid'
                      };
                    const negotiation = {
                      tokens,
                      previousTokens,
                      createdAt: Date.now()
                    };
                    return dbAccessor.updateRecordWithParamAndPush({
                        _id: {
                          $in: [ObjectId(sendTo), ObjectId(userId)]
                        },
                        'requestForDates.id': id
                      }, {
                        'requestForDates.$[p].negotiations': negotiation
                      }, {
                        'p.id': id
                      },
                      desiredModel
                    );
                  })
                  .then(result =>
                    result.isDeclined ?
                    result :
                    result.result && result.result.nModified == 0 ? {
                      isDeclined: false,
                      message: 'Request not valid'
                    } :
                    dbAccessor.getAvatar(userId, desiredModel)
                  )
                  .then(result => {
                    if (result.isDeclined) return result;
                    let avatar;
                    if (result && result.avatar) avatar = result.avatar;
                    const title = 'Date Request Received';
                    const body = `${userName} has done better this time. Please reconsider the Date Request.`;
                    const type = constantData.DateRequest.notificationType;
                    const notification = helper.getNotificationObject(
                      userId,
                      sendTo,
                      userName,
                      title,
                      body,
                      avatar,
                      id,
                      type
                    );
  
                    notificationBody = helper.notificationBody(
                      sendTo,
                      title,
                      body,
                      notification
                    );
                    return dbAccessor.updateRecord(
                      sendTo, {
                        $push: {
                          notifications: notification
                        },
                        $inc: { notificationCount: 1}
                      },
                      desiredModel
                    );
                  })
                  .then(result =>
                    result.isDeclined ? result:
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {notificationCount: '$notificationCount'}}
                    ], desiredModel
                  ).toArray())
                  .then(result => {
                    if (result.isDeclined)
                      return cb(null, {}, false, result.message);
                    firebaseRequest.requesthandler(
                      'https://fcm.googleapis.com/fcm/send',
                      'POST',
                      notificationBody
                    );
                    if(result[0] && result[0].notificationCount){
                      var socket = desiredModel.app.io;
                      socket.to(sendTo)
                      .emit(
                        'notificationCounterResponse',
                        {notificationCount:result[0].notificationCount}
                      );
                    }
                    return cb(null, {}, true, constantData.UpdatedSuccessfully);
                  })
                  .catch(err => cb(null, err, false, err.message));
                break;
              case constantData.DateRequestConfirm.notificationType:
                walletHelper.transferTokens(
                  senderWallet,
                  senderPrivateKey,
                  constantData.EthereumAdminWalletAddress,
                  tokens2
                )
                .then(result => 
                  result.data && result.data.status ?
                  dbAccessor
                  .updateRecordWithParamAndSet({
                      _id: {
                        $in: [ObjectId(sendTo), ObjectId(userId)]
                      },
                      'requestForDates.id': id,
                      'requestForDates.status': constantData.Status.accept
                    }, {
                      'requestForDates.$[p].status': constantData.Status.confirm,
                      'requestForDates.$[p].isRepliedType': false
                    }, {
                      'p.id': id,
                      'p.status': constantData.Status.accept
                    },
                    desiredModel
                  ): {
                    isDeclined: true,
                    message: 'Blockchain transaction not possible'
                })
                  .then(result =>
                    result.isDeclined ? result :
                    result.result && result.result.nModified > 0 ?
                    dbAccessor.getAvatar(userId, desiredModel) : {
                      isDeclined: true,
                      message: 'request not valid'
                    }
                  )
                  .then(result => {
                    if (result.isDeclined) return result;
                    let avatar;
                    if (result && result.avatar) avatar = result.avatar;
                    const title = 'Date Request Confirmation';
                    const body = `${userName} confirmed the date. Good luck!`;
                    const type = constantData.DateRequestConfirm.notificationType;
                    const notification = helper.getNotificationObject(
                      userId,
                      sendTo,
                      userName,
                      title,
                      body,
                      avatar,
                      id,
                      type
                    );
                    notificationBody = helper.notificationBody(
                      sendTo,
                      title,
                      body,
                      notification
                    );
                    return dbAccessor.updateRecord(
                      sendTo, {
                        $push: {
                          notifications: notification
                        },
                        $inc: { notificationCount: 1}
                      },
                      desiredModel
                    );
                  })
                  
                  .then(result =>
                    result.isDeclined ? result:
                    
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {notificationCount: '$notificationCount'}}
                    ], desiredModel
                  ).toArray())
                  .then(result => {
                    if (result.isDeclined)
                      return cb(null, {}, false, result.message);
                    firebaseRequest.requesthandler(
                      'https://fcm.googleapis.com/fcm/send',
                      'POST',
                      notificationBody
                    );
                    if(result[0] && result[0].notificationCount){
                      var socket = desiredModel.app.io;
                      socket.to(sendTo)
                      .emit(
                        'notificationCounterResponse',
                        {notificationCount:result[0].notificationCount}
                      );
                    }
                    return cb(null, {}, true, constantData.UpdatedSuccessfully);
                  })
                  .catch(err => cb(null, err, false, err.message));
                break;
              case constantData.DateRequestHappened.notificationType:
                dbAccessor
                  .updateRecordWithParamAndSet({
                        _id: {
                          $in: [ObjectId(sendTo), ObjectId(userId)]
                        }
                    }, {
                      'requestForDates.$[p].status': constantData.Status.happen,
                      'requestForDates.$[p].isRepliedType': false
                    }, {
                      'p.id': id,
                      'p.status': constantData.Status.confirm
                    },
                    desiredModel
                  )
                  .then(result =>{
                    return result.result && result.result.nModified > 0 ?
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {walletAddress: '$wallet.walletAddress'}}
                    ], desiredModel
                  ).toArray() : {
                      isDeclined: true,
                      message: 'request not valid'
                    }
                  }
                  )
                  .then(result => {
                    receiverWallet = result[0].walletAddress;
                   return result.isDeclined ? result :
                    result && result.length > 0 ?
                    dbAccessor.getAvatar(userId, desiredModel) : {
                      isDeclined: true,
                      message: 'request not valid'
                    }
                  }
                    )
                  .then(result => {
                    if (result.isDeclined) return result;
                    let avatar;
                    if (result && result.avatar) avatar = result.avatar;
                    const title = 'Date has Sparkled';
                    const body = `${userName} confirmed that the date had taken place.`;
                    const type =
                      constantData.DateRequestHappened.notificationType;
                    const notification = helper.getNotificationObject(
                      userId,
                      sendTo,
                      userName,
                      title,
                      body,
                      avatar,
                      id,
                      type
                    );
  
                    notificationBody = helper.notificationBody(
                      sendTo,
                      title,
                      body,
                      notification
                    );
                    return dbAccessor.updateRecord(
                      sendTo, {
                        $push: {
                          notifications: notification
                        },
                        $inc: { notificationCount: 1}
                      },
                      desiredModel
                    )
                     
                  })
                  .then(result => 
                    result.isDeclined ? result:
                    walletHelper.transferTokens(
                      constantData.EthereumAdminWalletAddress,
                      constantData.EthereumAdminWalletPrivateKey,
                      receiverWallet,
                      tokens2
                    )
                    )
                  .then(result =>
                    result.isDeclined ? result:
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {notificationCount: '$notificationCount'}}
                    ], desiredModel
                  ).toArray())
                  .then(result => {
                    if (result.isDeclined)
                      return cb(null, {}, false, result.message);
                    firebaseRequest.requesthandler(
                      'https://fcm.googleapis.com/fcm/send',
                      'POST',
                      notificationBody
                    );
                    if(result[0] && result[0].notificationCount){
                      var socket = desiredModel.app.io;
                      socket.to(sendTo)
                      .emit(
                        'notificationCounterResponse',
                        {notificationCount:result[0].notificationCount}
                      );
                    }
                    return cb(null, {}, true, constantData.UpdatedSuccessfully);
                  })
                  .catch(err => cb(null, err, false, err.message));
                break;
              case constantData.DateRequestNotHappened.notificationType:
                dbAccessor
                  .updateRecordWithParamAndSet({
                      _id: {
                        $in: [ObjectId(sendTo), ObjectId(userId)]
                      },
                      'requestForDates.id': id,
                      'requestForDates.status': constantData.Status.confirm
                    }, {
                      'requestForDates.$[p].status': constantData.Status.notHappen,
                      'requestForDates.$[p].isRepliedType': false
                    }, {
                      'p.id': id,
                      'p.status': constantData.Status.confirm
                    },
                    desiredModel
                  )
                  .then(result =>
                    result.result && result.result.nModified > 0 ?
                    dbAccessor.getAvatar(userId, desiredModel) : {
                      isDeclined: true,
                      message: 'request not valid'
                    }
                  )
                  .then(result => {
                    if (result.isDeclined) return result;
                    let avatar;
                    if (result && result.avatar) avatar = result.avatar;
                    const title = "Date was dropped out";
                    const body = `${userName} confirmed that the date didn't take place`;
                    const type =
                      constantData.DateRequestHappened.notificationType;
                    const notification = helper.getNotificationObject(
                      userId,
                      sendTo,
                      userName,
                      title,
                      body,
                      avatar,
                      id,
                      type
                    );
  
                    notificationBody = helper.notificationBody(
                      sendTo,
                      title,
                      body,
                      notification
                    );
                    return dbAccessor.updateRecord(
                      sendTo, {
                        $push: {
                          notifications: notification
                        },
                        $inc: { notificationCount: 1}
                      },
                      desiredModel
                    );
                  })
                  .then(result =>
                    result.isDeclined ? result:
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {notificationCount: '$notificationCount'}}
                    ], desiredModel
                  ).toArray())
                  .then(result => {
                    if (result.isDeclined)
                      return cb(null, {}, false, result.message);
                    firebaseRequest.requesthandler(
                      'https://fcm.googleapis.com/fcm/send',
                      'POST',
                      notificationBody
                    );
                    if(result[0] && result[0].notificationCount){
                      var socket = desiredModel.app.io;
                      socket.to(sendTo)
                      .emit(
                        'notificationCounterResponse',
                        {notificationCount:result[0].notificationCount}
                      );
                    }
                    return cb(null, {}, true, constantData.UpdatedSuccessfully);
                  })
                  .catch(err => cb(null, err, false, err.message));
                break;
              case constantData.DateRequestDecline.notificationType:
                dbAccessor
                  .updateRecordWithParamAndSet({
                      _id: {
                        $in: [ObjectId(sendTo), ObjectId(userId)]
                      },
                      'requestForDates.id': id
                    }, {
                      'requestForDates.$[p].status': constantData.Status.decline,
                      'requestForDates.$[p].isRepliedType': false
                    }, {
                      'p.id': id
                    },
                    desiredModel
                  )
  
                  .then(result =>
                    result.result && result.result.nModified > 0 ?
                    dbAccessor.getAvatar(userId, desiredModel) : {
                      isDeclined: true,
                      message: 'request not valid'
                    }
                  )
                  .then(result => {
                    if (result.isDeclined) return result;
                    let avatar;
                    if (result && result.avatar) avatar = result.avatar;
                    const title = 'Date Request Declined';
                    const body = `${userName} declined your date request`;
                    const type = constantData.DateRequestDecline.notificationType;
                    const notification = helper.getNotificationObject(
                      userId,
                      sendTo,
                      userName,
                      title,
                      body,
                      avatar,
                      id,
                      type
                    );
  
                    notificationBody = helper.notificationBody(
                      sendTo,
                      title,
                      body,
                      notification
                    );
                    return dbAccessor.updateRecord(
                      sendTo, {
                        $push: {
                          notifications: notification
                        },
                        $inc: { notificationCount: 1}
                      },
                      desiredModel
                    );
                  })
                  .then(result =>
                    result.isDeclined ? result:
                    dbAccessor.getRecordByAggregation([
                      {
                        $match: {_id: ObjectId(sendTo)}
                      },
                      {$project: {notificationCount: '$notificationCount'}}
                    ], desiredModel
                  ).toArray())
                  .then(result => {
                    if (result.isDeclined)
                      return cb(null, {}, false, result.message);
                    firebaseRequest.requesthandler(
                      'https://fcm.googleapis.com/fcm/send',
                      'POST',
                      notificationBody
                    );
                    if(result[0] && result[0].notificationCount){
                      var socket = desiredModel.app.io;
                      socket.to(sendTo)
                      .emit(
                        'notificationCounterResponse',
                        {notificationCount:result[0].notificationCount}
                      );
                    }
                    return cb(null, {}, true, constantData.UpdatedSuccessfully);
                  })
                  .catch(err => cb(null, err, false, err.message));
                break;
              default:
                return cb(null, {}, false, constantData.TypeMismatch);
            }
          })
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(dateRequest);
}
