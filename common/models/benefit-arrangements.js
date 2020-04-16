'use strict';

const { ObjectId } = require('mongodb');
const walletHelper = require('../helpers/wallet-helper');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');
const firebaseRequest = require('../helpers/firebase-request');

module.exports = function (benefitArrangement) {

   //post Benefit Arrangement
   benefitArrangement.setBenefitArrangement = (req, reqBody, cb) => {
    try {
        const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName;
      const amount = parseInt(reqBody.tokens);
      const receiverId = reqBody.receiverId;
      const id = `${Date.now()}${userId}${receiverId}`;
      ObjectId(receiverId);
      const currTime = Date.now();
      if (!userId || !amount || !receiverId)
        return cb(null, {}, false, constantData.IncorrectRequest);
      let notificationBody, benefitArrangementInfo;
      dbAccessor
        .getRecords(
          {
            where: {
              or: [
                {
                  id: userId
                },
                {
                  id: receiverId
                }
              ]
            },
            fields: {
              id: true,
              userType: true
            }
          },
          desiredModel
        )
        .then(result =>
          result.filter(obj => obj.id == userId)[0].userType == 'keeper' &&
            result.filter(obj => obj.id == receiverId)[0].userType == 'honey'
            ? dbAccessor
              .getRecordByAggregation(
                [
                  {
                    $match: {
                      _id: ObjectId(userId)
                    }
                  },
                  {
                    $project: {
                      benefitArrangements: '$benefitArrangements',
                      walletAddress: '$wallet.walletAddress'
                    }
                  },
                  {
                    $unwind: '$benefitArrangements'
                  },
                  {
                    $match: {
                      'benefitArrangements.userId': receiverId,
                      'benefitArrangements.isDeleted': false
                    }
                  },
                  {
                    $group: {
                      _id: '$_id',
                      benefitArrangements: {
                        $push: '$benefitArrangements.userId'
                      },
                      walletAddress: {$first: '$walletAddress'}
                    }
                  }
                ],
                desiredModel
              )
              .toArray()
            : {
              isDeclined: true,
              message: constantData.InvalidRequestBenefitArrangement
            }
        )
        .then(result => {
          benefitArrangementInfo = result;
         return result && result.isDeclined ? result : dbAccessor
          .getRecordByAggregation(
            [
              {
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
          ).toArray()
        })
        .then(result => result && result.isDeclined
            ? result :
            result && result[0] && result[0].walletAddress
            ? walletHelper.getWalletBalance(result[0].walletAddress) :
            {
              isDeclined: true,
              message: constantData.NoRecordFound
            }
        )
        .then(result => result.isDeclined ? result:
          result && result.data && result.data.balance > amount
          ? {}
          : { isDeclined: true, message: constantData.insufficientFund })
        .then(result =>
          result.isDeclined
            ? result
            : benefitArrangementInfo[0] &&
            benefitArrangementInfo[0].benefitArrangements &&
            benefitArrangementInfo[0].benefitArrangements.length > 0
              ? {
                isDeclined: true,
                message: constantData.DuplicateBenefitArrangement
              }
              : dbAccessor.updateRecord(
                userId,
                {
                  $push: {
                    benefitArrangements: {
                      id,
                      amount,
                      isSender: true,
                      userId: receiverId,
                      createdAt: currTime,
                      updatedAt: currTime,
                      isDeleted: false,
                      status: constantData.Status.pending
                    }
                  }
                },
                desiredModel
              )
        )
        .then(result =>
          result.isDeclined
            ? result
            : result.count == 0
              ? {
                isDeclined: true,
                message: constantData.RecordNotSaved
              }
              : dbAccessor.updateRecord(
                receiverId,
                {
                  $push: {
                    benefitArrangements: {
                      id,
                      amount,
                      isSender: false,
                      userId: userId,
                      createdAt: currTime,
                      updatedAt: currTime,
                      isDeleted: false,
                      status: constantData.Status.pending
                    }
                  }
                },
                desiredModel
              )
        )
        .then(result => result.isDeclined
            ? result
            : result.count > 0
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
          const title = 'Tangible Loving Sincerity';
          const body = `${userName} offered you some TLS`;
          const type = constantData.BenefitArrangements.notificationType;
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
              $inc: { notificationCount: 1}
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
          return {}; ///;
        })
        .then(result =>
          result.isDeclined ? result:
          dbAccessor.getRecordByAggregation([
            {
              $match: {_id: ObjectId(receiverId)}
            },
            {$project: {notificationCount: '$notificationCount'}}
          ], desiredModel
        ).toArray())
        .then(result => {
          if(result[0] && result[0].notificationCount){
            var socket = desiredModel.app.io;
            socket.to(receiverId)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
          }
          return result.isDeclined
          ? cb(null, {}, false, result.message)
          : cb(
            null,
            {
              id,
              amount,
              isSender: true,
              userId: receiverId,
              createdAt: currTime,
              updatedAt: currTime,
              isDeleted: false,
              status: constantData.Status.pending
            },
            true,
            constantData.EmptyString
          )})
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //get Benefit Arrangement
  benefitArrangement.getBenefitArrangements = (req, page, limit, cb) => {
    try {
        const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const range = parseInt(limit) > 0 ? parseInt(limit) : 20;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;
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
                benefitArrangements: '$benefitArrangements'
              }
            },
            {
              $unwind: '$benefitArrangements'
            },
            {
              $match: {
                'benefitArrangements.isDeleted': false
              }
            },
            {
              $sort: {
                'benefitArrangements.createdAt': -1
              }
            },
            {
              $skip: offset
            },
            {
              $limit: range
            },
            {
              $sort: {
                'benefitArrangements.createdAt': 1
              }
            },
            {
              $group: {
                _id: '$_id',
                benefitArrangements: {
                  $push: {
                    userId: {
                      $convert: {
                        input: '$benefitArrangements.userId',
                        to: 'objectId'
                      }
                    },
                    id: '$benefitArrangements.id',
                    startedAt: '$benefitArrangements.createdAt',
                    tokens: '$benefitArrangements.amount',
                    isSender: '$benefitArrangements.isSender',
                    status: '$benefitArrangements.status',
                    isDeleted: '$benefitArrangements.isDeleted',
                  }
                }
              }
            },
            {
              $unwind: '$benefitArrangements'
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  userId: '$benefitArrangements.userId'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          {
                            $eq: ['$_id', '$$userId']
                          }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      _id: 1,
                      userName: 1,
                      avatar: 1
                    }
                  }
                ],
                as: 'benefitArrangements.users'
              }
            },
            {
              $project: {
                user: {
                  $arrayElemAt: ['$benefitArrangements.users', 0]
                },
                id: '$benefitArrangements.id',
                startedAt: '$benefitArrangements.startedAt',
                tokens: '$benefitArrangements.tokens',
                isSender: '$benefitArrangements.isSender',
                status: '$benefitArrangements.status',
                isDeleted: '$benefitArrangements.isDeleted'
              }
            },
            {
              $project: {
                _id: 0,
                userId: '$user._id',
                id: '$id',
                userName: '$user.userName',
                avatar: '$user.avatar',
                startedAt: '$startedAt',
                tokens: '$tokens',
                isSender: '$isSender',
                status: '$status',
                isDeleted: '$isDeleted'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result =>
          result
            ? cb(null, result, true, constantData.EmptyString)
            : cb(null, [], true, constantData.EmptyString)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //update Benefit Arrangement
  benefitArrangement.updateBenefitArrangement = (req, reqBody, id, cb) => {
    try {
        const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName;
      const tokens = parseInt(reqBody.tokens);
      if (!tokens) return cb(null, {}, false, constantData.IncorrectRequest);
      let receiverId,
        benefitArrangementInfo, notificationBody,
        currDate = Date.now();
      dbAccessor
        .getRecords(
          {
            where: {
              or: [
                {
                  id: userId
                }
              ]
            },
            fields: {
              id: true,
              userType: true
            }
          },
          desiredModel
        )
        .then(result =>
          result.filter(obj => obj.id == userId)[0].userType == 'keeper'
            ? dbAccessor
              .getRecordByAggregation(
                [
                  {
                    $match: {
                      _id: ObjectId(userId)
                    }
                  },
                  {
                    $project: {
                      benefitArrangements: '$benefitArrangements'
                    }
                  },
                  {
                    $unwind: '$benefitArrangements'
                  },
                  {
                    $match: {
                      'benefitArrangements.id': id,
                      'benefitArrangements.isDeleted': false
                    }
                  },
                  {
                    $group: {
                      _id: '$_id',
                      benefitArrangements: {
                        $push: '$benefitArrangements'
                      }
                    }
                  }
                ],
                desiredModel
              )
              .toArray()
            : {
              isDeclined: true,
              message: constantData.InvalidRequestBenefitArrangement
            }
        )
        .then(result => {
          if (result.isDeclined) return result;
          else if (
            result[0] &&
            result[0].benefitArrangements &&
            result[0].benefitArrangements.length > 0
          ) {
            receiverId = result[0].benefitArrangements[0].userId;
            benefitArrangementInfo = result[0].benefitArrangements[0];
            const previousAmount = result[0].benefitArrangements[0].amount;
            benefitArrangementInfo.amount = tokens;
            benefitArrangementInfo.updatedAt = currDate;
            delete benefitArrangementInfo.arrangementLog;
            return dbAccessor.updateRecordWithParamAndPush(
              {
                $and: [
                  {
                    $or: [
                      {
                        _id: ObjectId(userId)
                      },
                      {
                        _id: ObjectId(receiverId)
                      }
                    ]
                  },
                  {
                    'benefitArrangements.id': id
                  }
                ]
              },
              {
                'benefitArrangements.$[p].arrangementLog': {
                  amount: previousAmount,
                  startedDate: result[0].benefitArrangements[0].updatedAt
                }
              },
              {
                'p.id': id
              },
              desiredModel
            );
          } else
            return {
              isDeclined: true,
              message: constantData.NoRecordFound
            };
        })
        .then(result =>
          result.isDeclined
            ? result
            : result.result.nModified < 2
              ? {
                isDeclined: true,
                message: constantData.RecordNotUpdated
              }
              : dbAccessor.updateRecordWithParamAndSet(
                {
                  $and: [
                    {
                      $or: [
                        {
                          _id: ObjectId(userId)
                        },
                        {
                          _id: ObjectId(receiverId)
                        }
                      ]
                    },
                    {
                      'benefitArrangements.id': id
                    }
                  ]
                },
                {
                  'benefitArrangements.$[p].amount': tokens,
                  'benefitArrangements.$[p].updatedAt': currDate
                },
                {
                  'p.id': id
                },
                desiredModel
              )
        )
        .then(result => {
          return result.isDeclined
            ? result
            : result.result.nModified > 0
              ? dbAccessor.getAvatar(userId, desiredModel)
              : {
                isDeclined: true,
                message: `Record is not updated`
              }
        }
        )
        .then(result => {
          if (result.isDeclined) return result;
          let avatar;
          if (result && result.avatar) avatar = result.avatar;
          const title = 'Tangible Loving Sincerity';
          const body = `${userName} revised the TLS consideration to ${tokens}`;
          const type = constantData.BenefitArrangements.notificationType;
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
              $inc: { notificationCount: 1}
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
          return {};
        })
        .then(result =>
          result.isDeclined ? result:
          dbAccessor.getRecordByAggregation([
            {
              $match: {_id: ObjectId(receiverId)}
            },
            {$project: {notificationCount: '$notificationCount'}}
          ], desiredModel
        ).toArray())
        .then(result => {
          if(result[0] && result[0].notificationCount){
            var socket = desiredModel.app.io;
            socket.to(receiverId)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
          }
          return result.isDeclined
          ? cb(null, {}, false, result.message)
          : cb(null, benefitArrangementInfo, true, constantData.EmptyString)})
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

    //get Benefit Arrangement by Id
    benefitArrangement.getBenefitArrangementById = (req, id, cb) => {
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
                  $project: {
                    benefitArrangements: '$benefitArrangements'
                  }
                },
                {
                  $unwind: '$benefitArrangements'
                },
                {
                  $match: {
                    'benefitArrangements.id': id
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    let: {
                      userId: {
                        $convert: {
                          input: '$benefitArrangements.userId',
                          to: 'objectId'
                        }
                      }
                    },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              {
                                $eq: ['$_id', '$$userId']
                              }
                            ]
                          }
                        }
                      },
                      {
                        $project: {
                          _id: 1,
                          userName: 1,
                          avatar: 1
                        }
                      }
                    ],
                    as: 'benefitArrangements.users'
                  }
                },
                {
                  $project: {
                    user: {
                      $arrayElemAt: ['$benefitArrangements.users', 0]
                    },
                    id: '$benefitArrangements.id',
                    startedAt: '$benefitArrangements.createdAt',
                    tokens: '$benefitArrangements.amount',
                    isSender: '$benefitArrangements.isSender',
                    status: '$benefitArrangements.status',
                    isDeleted: '$benefitArrangements.isDeleted',
                  }
                },
                {
                  $project: {
                    _id: 0,
                    userId: '$user._id',
                    id: '$id',
                    userName: '$user.userName',
                    avatar: '$user.avatar',
                    startedAt: '$startedAt',
                    tokens: '$tokens',
                    isSender: '$isSender',
                    status: '$status',
                    isDeleted: '$isDeleted',
                  }
                }
              ],
              desiredModel
            )
            .toArray((err, result) =>
              err
              ? cb(null, err, false, err.message)
              : result && result[0] // &&
                ? // result[0].BenefitArrangement &&
                // result[0].BenefitArrangement.length > 0
                cb(null, result[0], true, '')
                : cb(null, {}, true, ''));
        } catch (err) {
          return cb(null, err, false, err.message);
        }
      };

  //delete Benefit Arrangement
  benefitArrangement.respondToBenefitArrangement = (req, reqBody, cb) => {
    try {
        const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const userName = req.requestedUserName;
      const id = reqBody.id;
      let notificationBody, receiverId;
      const obj = {};
      if (helper.isTrue(reqBody.isAccepted)) obj['benefitArrangements.$[p].status'] = constantData.Status.accept;
      else {
        obj['benefitArrangements.$[p].isDeleted'] = true;
        obj['benefitArrangements.$[p].status'] = constantData.Status.decline;
        obj['benefitArrangements.$[p].cancelledBy'] = userId;
      }
      const notificationBodyState = helper.isTrue(reqBody.isAccepted)
        ? constantData.Status.accept
        : constantData.Status.decline;
      dbAccessor
        .isUserExist(
          userId,
          {
            userType: true,
            id: true
          },
          desiredModel
        )
        .then(result => result && result.userType === 'honey'
          ? dbAccessor
            .getRecordByAggregation(
              [
                {
                  $match: {
                    _id: ObjectId(userId)
                  }
                },
                {
                  $project: {
                    benefitArrangements: '$benefitArrangements'
                  }
                },
                {
                  $unwind: '$benefitArrangements'
                },
                {
                  $match: {
                    'benefitArrangements.id': id,
                    'benefitArrangements.status': constantData.Status.pending
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    benefitArrangements: {
                      $push: '$benefitArrangements.userId'
                    }
                  }
                }
              ],
              desiredModel
            )
            .toArray() :
          {
            isDeclined: true,
            message: 'you are not authorized for this action'
          }
        )
        .then(result => {
          if(result &&
            result[0] &&
            result[0].benefitArrangements &&
            result[0].benefitArrangements.length > 0)
            receiverId = result[0].benefitArrangements[0];
          return result && result.isDeclined ? result :
            result &&
              result[0] &&
              result[0].benefitArrangements &&
              result[0].benefitArrangements.length > 0
              ? dbAccessor.updateRecordWithParamAndSet(
                {
                  $and: [
                    {
                      $or: [
                        {
                          _id: ObjectId(userId)
                        },
                        {
                          _id: ObjectId(result[0].benefitArrangements[0])
                        }
                      ]
                    },
                    {
                      'benefitArrangements.id': id
                    }
                  ]
                },
                obj,
                {
                  'p.id': id
                },
                desiredModel
              )
              : {
                isDeclined: true,
                message: constantData.NoRecordFound
              };
        })
        .then(result => result.isDeclined
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
          const title = 'Tangible Loving Sincerity';
          const body = `${userName} ${notificationBodyState} the TLS consideration`;
          const type = constantData.BenefitArrangementResponse.notificationType;
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
              $inc: { notificationCount: 1}
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
          return {};
        })
        .then(result =>
          result.isDeclined ? result:
          dbAccessor.getRecordByAggregation([
            {
              $match: {_id: ObjectId(receiverId)}
            },
            {$project: {notificationCount: '$notificationCount'}}
          ], desiredModel
        ).toArray())
        .then(result => {
          if(result[0] && result[0].notificationCount){
            var socket = desiredModel.app.io;
            socket.to(receiverId)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
          }
          return result.isDeclined
          ? cb(null, {}, false, result.message)
          : cb(null, {}, true, constantData.EmptyString);})
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //delete Benefit Arrangement
  benefitArrangement.deleteBenefitArrangement = (req, id, cb) => {
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
              $project: {
                benefitArrangements: '$benefitArrangements'
              }
            },
            {
              $unwind: '$benefitArrangements'
            },
            {
              $match: {
                'benefitArrangements.id': id
              }
            },
            {
              $group: {
                _id: '$_id',
                benefitArrangements: {
                  $push: '$benefitArrangements.userId'
                }
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result => {
          return result &&
            result[0] &&
            result[0].benefitArrangements &&
            result[0].benefitArrangements.length > 0
            ? dbAccessor.updateRecordWithParamAndSet(
              {
                $and: [
                  {
                    $or: [
                      {
                        _id: ObjectId(userId)
                      },
                      {
                        _id: ObjectId(result[0].benefitArrangements[0])
                      }
                    ]
                  },
                  {
                    'benefitArrangements.id': id
                  }
                ]
              },
              {
                'benefitArrangements.$[p].status': constantData.Status.decline,
                'benefitArrangements.$[p].isDeleted': true,
                'benefitArrangements.$[p].cancelledBy': userId,
              },
              {
                'p.id': id
              },
              desiredModel
            )
            : {
              isDeclined: true,
              message: constantData.NoRecordFound
            };
        })
        .then(result =>
          result && result.isDeclined ? cb(null, {}, true, result.message)
            : result && result.result && result.result.nModified > 0 ?
              cb(null, {}, true, constantData.RecordDeleted)
              : cb(null, {}, true, constantData.NoUpdateFound))
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(benefitArrangement);
}
