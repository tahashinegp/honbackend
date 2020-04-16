'use strict';
//test
var Jimp = require('jimp');
const fs = require('fs-extra');
const uuidv4 = require('uuid/v4');
const {
  ObjectId
} = require('mongodb');
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

module.exports = function (images) {

  // get public photo
  images.filteredPublicPhotos = (req, userId, page, cb) => {
    try {
      const desiredModel = app.models.Users;
      const range = 10;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;
      dbAccessor
        .getRecordByAggregation(
          helper.findCustomRangePublicPhotosObj(userId, offset, range),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) cb(null, err, false, err.message);
          if (result && result[0] && result[0].images)
            return cb(null, result[0].images, true, constantData.EmptyString);
          else return cb(null, [], true, constantData.EmptyString);
        });
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  // get private photo
  images.filteredPrivatePhotos = (req, userId, page, cb) => {
    try {

      const desiredModel = app.models.Users;
      const requestBy = req.reqestedUserId;
      const range = 10;
      const offset = ((parseInt(page) > 0 ? page : 1) - 1) * range;

      dbAccessor
        .getRecordByAggregation(
          helper.findCustomRangePrivatePhotosObj(
            userId,
            offset,
            range,
            requestBy
          ),
          desiredModel
        )
        .toArray((err, result) => {
          if (err) return cb(null, err, false, err.message);
          if (result && result[0]) {
            const isPermitted = imageHelper.isPermittedForPrivatePhoto(
              requestBy,
              userId,
              result[0].accessibleUsers ? result[0].accessibleUsers : []
            );
            return cb(
              null, {
                isPermitted: isPermitted,
                images: imageHelper.processPrivatePhoto(
                  isPermitted,
                  result[0].privatePhotos
                )
              },
              true,
              constantData.EmptyString
            );
          } else return cb(null, [], true, constantData.EmptyString);
        });
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  images.privatePhotoAccessRequest = (req, reqBody, cb) => {
    const desiredModel = app.models.Users;
    const grantorId = reqBody.userId;
    const submittorId = req.reqestedUserId;
    const submittorName = req.requestedUserName ?
      req.requestedUserName :
      req.requestedUserMail;
    const status = constantData.Status.pending;
    let willInsert = true, notificationCount;
    if (!grantorId || !submittorId)
      return cb(null, {}, false, constantData.IncorrectRequest);
    dbAccessor
      .getRecordByAggregation(
        helper.getPhotoRequestIdObj(grantorId, submittorId),
        desiredModel
      )
      .toArray((err, result) => {
        if (err) return cb(null, err, false, err.message);
        if(result && result[0] && result[0].status && result[0].status[0] && result[0].status[0].toLowerCase() == "Pending".toLowerCase())
          return cb(null, {}, false, "Already have a request");
        let permissionId = `${Date.now()}${submittorId}${uuidv4()}`;
        if (result && result[0]) {
          willInsert = false;
          permissionId = result[0].id[0];
        }
        let notificationBody;

        const condition = willInsert ?
          {
            _id: ObjectId(grantorId)
          } :
          {
            _id: ObjectId(grantorId),
            'privatePhotoAccessibleUsers.userId': submittorId
          };
        const param = willInsert ?
          {
            privatePhotoAccessibleUsers: {
              id: permissionId,
              userId: submittorId,
              status: status,
              isRepliedType: true
            }
          } :
          {
            'privatePhotoAccessibleUsers.$.status': status,
            isRepliedType: true
          };
        helper
          .requestForPrivatePhoto(condition, param, willInsert, desiredModel)
          .then(result => dbAccessor.getAvatar(submittorId, desiredModel))
          .then(result => {
            let avatar;
            if (result && result.avatar) avatar = result.avatar;
            const title = 'Private Photo Request';
            const body = `${submittorName} requested for access to your private photos`;
            const type = constantData.PhotoRequest.notificationType;
            const notification = helper.getNotificationObject(
              submittorId,
              grantorId,
              submittorName,
              title,
              body,
              avatar,
              permissionId,
              type,
              submittorId
            );
            notificationBody = helper.notificationBody(
              grantorId,
              title,
              body,
              notification
            );
            return dbAccessor.updateRecord(
              grantorId, {
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
                $match: {_id: ObjectId(grantorId)}
              },
              {$project: {notificationCount: '$notificationCount'}}
            ], desiredModel
          ).toArray())
          .then(result => {
            firebaseRequest.requesthandler(
              'https://fcm.googleapis.com/fcm/send',
              'POST',
              notificationBody
            );
            var socket = desiredModel.app.io;
            socket.to(grantorId)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
            return cb(null, {}, true, constantData.PrivatePhotoAccessRequest);
          })
          .catch(err => cb(null, err, false, err.message));
      });
  };

  // private photo permission to view by specific user
  images.privatePhotoAccess = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const submittorId = reqBody.userId;
      // const requestId = reqBody.requestId;
      const status = helper.isTrue(reqBody.isAccept) ?
        constantData.Status.accept :
        constantData.Status.decline;
      const grantorId = req.reqestedUserId;
      const grantorName = req.requestedUserName ?
        req.requestedUserName :
        req.requestedUserMail;

      if (!submittorId || !grantorId || !status)
        return cb(null, {}, false, constantData.IncorrectRequest);
      let notificationBody;

      dbAccessor
        .updateRecordWithParamAndSet({
            _id: ObjectId(grantorId),
            'privatePhotoAccessibleUsers.userId': submittorId
          }, {
            'privatePhotoAccessibleUsers.$[p].status': status,
            'privatePhotoAccessibleUsers.$[p].isRepliedType': false
          }, {
            'p.userId': submittorId
          },
          desiredModel
        )
        .then(result => {
            return result.result.nModified > 0 ?
              dbAccessor.getAvatar(grantorId, desiredModel) :
              {
                isError: true,
                message: constantData.NoUpdateFound
              }
          }

        )
        .then(result => {
          if (result.isError)
            return result;
          let avatar;
          if (result && result.avatar) avatar = result.avatar;
          const title = `Private Photo Request ${status.toLowerCase()}`;
          const body = `${grantorName} has ${status} you private photos access`;
          const type = constantData.PhotoResponse.notificationType;
          const notification = helper.getNotificationObject(
            submittorId,
            grantorId,
            grantorName,
            title,
            body,
            avatar,
            undefined,
            type,
            submittorId
          );

          notificationBody = helper.notificationBody(
            submittorId,
            title,
            body,
            notification
          );
          return dbAccessor.updateRecord(
            submittorId, {
              $push: {
                notifications: notification
              },
              $inc: { notificationCount: 1}
            },
            desiredModel
          );
        })
        .then(result =>
          result.isError ? result:
          dbAccessor.getRecordByAggregation([
            {
              $match: {_id: ObjectId(submittorId)}
            },
            {$project: {notificationCount: '$notificationCount'}}
          ], desiredModel
        ).toArray())
        .then(result => {
          if (result.isError)
            return cb(
              null, {},
              false,
              result.message
            );
          firebaseRequest.requesthandler(
            'https://fcm.googleapis.com/fcm/send',
            'POST',
            notificationBody
          );
          if(result[0] && result[0].notificationCount){
            var socket = desiredModel.app.io;
            socket.to(submittorId)
            .emit(
              'notificationCounterResponse',
              {notificationCount:result[0].notificationCount}
            );
          }
          return cb(
            null, {},
            true,
            `${constantData.PrivatePhotoAccess} ${status.toLowerCase()}`
          );
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

  // get private and public photos
  images.getPublicPrivatePhotos = (req, page, limit, cb) => {
    try {
      const desiredModel = app.models.Users;
      const offset = (page - 1) * limit;
      const userId = req.reqestedUserId;
      dbAccessor
        .getRecordByAggregation(
          helper.getBothPublicPrivateObj(offset, limit, userId),
          desiredModel
        )
        .toArray()
        .then(result => cb(null, result, true, constantData.EmptyString))
        .catch(err => cb(null, {}, false, constantData.EmptyString));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  // delete photos
  images.deleteImages = (req, reqBody, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const photoArray = reqBody.photoArray;
      dbAccessor
        .updateRecordWithParamAndSet({
            _id: ObjectId(userId),
            'photos.id': {
              $in: photoArray
            }
          }, {
            'photos.$[p].isDeleted': true
          }, {
            'p.id': {
              $in: photoArray
            }
          },
          desiredModel
        )
        .then(result =>
          result.result.nModified > 0 ?
          cb(null, photoArray, true, constantData.RecordDeleted) :
          cb(null, {}, false, constantData.NoRecordFound)
        )
        .catch(err => {
          cb(null, err, false, constantData.EmptyString)});
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  images.changePhotoType = (req, id, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      dbAccessor.getRecordByAggregation([{
            $match: {
              _id: ObjectId(userId)
            }
          },
          {
            $project: {
              photos: '$photos'
            }
          },
          {
            $unwind: '$photos'
          },
          {
            $match: {
              'photos.id': id
            }
          },
          {
            $project: {
              isPrivate: '$photos.isPrivate'
            }
          }
        ], desiredModel).toArray()
        .then(result =>
          result && result[0] && typeof (result[0].isPrivate) == 'boolean' ? dbAccessor
          .updateRecordWithParamAndSet({
              _id: ObjectId(userId),
              'photos.id': id
            }, {
              'photos.$[p].isPrivate': !result[0].isPrivate
            }, {
              'p.id': id
            },
            desiredModel
          ) :
          {
            isDeclined: true,
            message: constantData.NoRecordFound
          }
        )
        .then(result =>
          result && result.isDeclined ? cb(null, {}, false, result.message) :
          result.result.nModified > 0 ?
          cb(
            null, {
              id
            },
            true,
            constantData.UpdatedSuccessfully
          ) :
          cb(null, {}, false, constantData.RecordNotDeleted)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  }

  // delete photos
  images.deleteOneImage = (req, id, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      dbAccessor.getAvatar(userId, desiredModel)
      .then(result => {
        return dbAccessor
        .getRecordByAggregation(
          [
            {
              $match:
                  {
                    _id: ObjectId(userId)
                  }
            },
            {
              $unwind: '$photos'
            },
            {
              $match:
                  {
                    'photos.id': id,
                    'photos.urlLink': result.avatar
                  }
            },
            {
              $project: {
                userName: '$userName'
              }
            }
          ],
          desiredModel
        ).toArray()

      })
      .then(result => {
        return result.length > 0 ? dbAccessor
          .updateRecordWithParamAndSet({
              _id: ObjectId(userId),
              'photos.id': id
            }, {
              'photos.$[p].isDeleted': true,
              'avatar': imageHelper.getDbPath(
                req.headers.host,
                constantData.ContainersName[0],
                constantData.DefaultPictureName,
                undefined
              )
            }, {
              'p.id': id
            },
            desiredModel
          ): dbAccessor
          .updateRecordWithParamAndSet({
              _id: ObjectId(userId),
              'photos.id': id
            }, {
              'photos.$[p].isDeleted': true
            }, {
              'p.id': id
            },
            desiredModel
          )
      })
      .then(result =>
          result.result.nModified > 0 ?
            cb(
              null, {
                id
              },
              true,
              constantData.RecordDeleted
            ): cb(
              null, {},
              false,
              constantData.NoUpdateFound
            ))
            .catch(err=> {
              cb(null, err, false, err.message)})
            }catch (err) {
      return cb(null, err, false, err.message);
    }
  };


  // delete photos
  images.changeProfileImage = (req, id, cb) => {
    try {
      const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      let avatar;
      dbAccessor
        .getRecordByAggregation(
          [
            {
              $match:
                  {
                    _id: ObjectId(userId)
                  }
            },
            {
              $unwind: '$photos'
            },
            {
              $match:
                  {
                    'photos.id': id
                  }
            },
            {
              $project: {
                'photoName': '$photos.urlLink'
              }
            }
          ],
          desiredModel
        ).toArray()
      .then(result =>{
        avatar = result[0].photoName;

       return result.length > 0 ? dbAccessor
        .updateRecord(ObjectId(userId), {$set:{
            'avatar':result[0].photoName
          }},
          desiredModel
        )
        : {error: true}
      }

      )
      .then(result =>{
        return result.error ? cb(
          null, {},
          false,
          constantData.NoRecordFound
        ):
        result.count > 0 ?
            cb(
              null, {
                avatar: avatar
              },
              true,
              constantData.UpdatedSuccessfully
            ): cb(
              null, {},
              false,
              constantData.NoUpdateFound
            )
      }
       )
            .catch(err=> cb(null, err, false, err.message))
            }catch (err) {
      return cb(null, err, false, err.message);
    }
  };


  hideCommonMethodsHelper.disablingOfRemoteMethods(images);
}
