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


app.use(fileUpload());

module.exports = function (upload) {
  // Authentication Method for honeygram
  upload.fileUpload = (req, isPrivate, cb) => {
    try {

        const desiredModel = app.models.Users;
      var userId = req.reqestedUserId;
      isPrivate = helper.isTrue(isPrivate);
      if (!req.files) return cb(null, {}, false, constantData.NoRecordFound);
      let fileContainer = imageHelper.reqestedFilesArrayProcessing(req.files);
      const currDate = Date.now();
      let photoArray = bulkImageSaveToDisk(
        userId,
        req.headers.host,
        currDate,
        fileContainer,
        isPrivate
      );
      dbAccessor
        .bulkUpload(userId, photoArray, desiredModel)
        .then(result => {
          return cb(null, result, true, constantData.PictureUploaded);
        })
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  // Profile Picture Upload
  upload.profilePictureUpload = (req, cb) => {
    try {

        const desiredModel = app.models.Users;
      var userId = req.reqestedUserId;

      const isArray =
      req.files && req.files[''] && req.files[''].length ? true : false;
      if (isArray || !req.files)
        return cb(null, {}, false, constantData.IncorrectRequest);
      const fileType = imageHelper.getFileType(req.files[''].name);
      const container = fileType ? constantData.ContainersName[0] : undefined;
      if (!container) return cb(null, {}, false, constantData.IncorrectRequest);
      Jimp.read(req.files[''].data, (err, processedImage) => {
        if (err) return cb(null, err, false, err.message);
        processedImage
          .quality(60)
          .greyscale()
          .blur(50)
          .getBuffer(Jimp.MIME_JPEG, (err, buff) => {
            if (err) return cb(null, err, false, err.message);
            AWS.config.update(config.awsSecurity);
            var s3 = new AWS.S3();
            const imgObj = imageHelper.imageProcessing(req.headers.host, Date.now(), constantData.BucketName, req.files[''].name, userId, false)
            s3.putObject({
              Bucket: constantData.BucketName,
              Key: imgObj.filePath,
              Body: req.files[''].data,
              ContentType: req.files[''].mimetype
            }, (err, data) => {
              if (err) return cb(null, err, false, err.message);
              s3.putObject({
                Bucket: constantData.BucketName,
                Key: imgObj.privateFilePath,
                Body: buff,
                ContentType: req.files[''].mimetype
              }, (err, data) => {
                if (err) return cb(null, err, false, err.message);
                dbAccessor
                  .updateRecord(
                    userId,
                    {
                      $push: {
                        photos: imgObj.uploadContent
                      }
                    },
                    desiredModel
                  )
                  .then(result => {
                    dbAccessor.updateRecord(
                      userId,
                      {
                        $set: {
                          avatar: imgObj.uploadContent.urlLink
                        }
                      },
                      desiredModel
                    )
                  }
                  )
                  .then(result =>
                    cb(
                      null,
                      {
                        avatar: imgObj.uploadContent.urlLink
                      },
                      true,
                      constantData.PictureUploaded
                    )
                  )
                  .catch(err => cb(null, err, false, constantData.IncorrectRequest));
              })
            })
          });
      });
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };

   // Profile Picture Upload base64
   upload.profilePictureUploadBaseSixtyFour = (req, reqBody, cb) => {
    try {

        const desiredModel = app.models.Users;
      var userId = req.reqestedUserId;
      const baseString = reqBody.baseString;
      const type = reqBody.baseString.split('/')[1].split(';')[0];
      const mimeType = type == 'jpg' || type == 'jpeg' ? 'image/jpeg' : type == 'png' ? 'image/png' : 'image/png';
      const name = reqBody.name;
      const bufferStrings = baseString.split(';base64,')[1];
      const buff32 = Buffer.from(bufferStrings, 'base64');
      Jimp.read(buff32, (err, processedImage) => {
        if (err) return cb(null, err, false, err.message);
        processedImage
          .quality(60)
          .greyscale()
          .blur(50)
          .getBuffer(Jimp.MIME_JPEG, (err, buff) => {
            if (err) return cb(null, err, false, err.message);
            AWS.config.update(config.awsSecurity);
            var s3 = new AWS.S3();
            const imgObj = imageHelper.imageProcessing(req.headers.host, Date.now(), constantData.BucketName, name, userId, false)
            s3.putObject({
              Bucket: constantData.BucketName,
              Key: imgObj.filePath,
              Body: buff32,
              ContentType: mimeType
            }, (err, data) => {
              if (err) return cb(null, err, false, err.message);
              s3.putObject({
                Bucket: constantData.BucketName,
                Key: imgObj.privateFilePath,
                Body: buff,
                ContentType: mimeType
              }, (err, data) => {
                if (err) return cb(null, err, false, err.message);
                dbAccessor
                  .updateRecord(
                    userId,
                    {
                      $push: {
                        photos: imgObj.uploadContent
                      }
                    },
                    desiredModel
                  )
                  .then(result => {
                    dbAccessor.updateRecord(
                      userId,
                      {
                        $set: {
                          avatar: imgObj.uploadContent.urlLink
                        }
                      },
                      desiredModel
                    )
                  }
                  )
                  .then(result =>
                    cb(
                      null,
                      {
                        avatar: imgObj.uploadContent.urlLink
                      },
                      true,
                      constantData.PictureUploaded
                    )
                  )
                  .catch(err => cb(null, err, false, constantData.IncorrectRequest));
              })
            })
          });
      });
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };
// Video Upload
upload.videoUpload = (req, cb) => {
    try {
        const desiredModel = app.models.Users;
      var userId = req.reqestedUserId;
      const isArray =
        req.files && req.files[''] && req.files[''].length ? true : false;
      if (isArray || !req.files)
        return cb(null, {}, false, constantData.IncorrectRequest);
      const fileType = imageHelper.getFileType(req.files[''].name);
      const container =
        fileType == false ? constantData.ContainersName[1] : undefined;
      if (!container) return cb(null, {}, false, constantData.IncorrectRequest);
      AWS.config.update(config.awsSecurity);
      var s3 = new AWS.S3();
      const imgObj = imageHelper.videoProcessing(req.headers.host, Date.now(), constantData.BucketName, req.files[''].name, userId)
      s3.putObject({
        Bucket: constantData.BucketName,
        Key: imgObj.filePath,
        Body: req.files[''].data,
        ContentType: req.files[''].mimetype
      }, (err, data) => {
        if (err) return cb(null, err, false, err.message);
        dbAccessor
          .updateRecord(
            userId,
            {
              $push: {
                videos: imgObj.uploadContent
              }
            },
            desiredModel
          )
          .then(result => cb(null, {}, true, constantData.PictureUploaded))
          .catch(err => cb(null, err, false, err.message));
      })
    } catch (err) {
      cb(null, err, false, err.message);
    }
  };
  hideCommonMethodsHelper.disablingOfRemoteMethods(upload);
}


const bulkImageSaveToDisk = (userId, host, currDate, fileContainer = [], isPrivate) => {
    let returnArray = [];
    fileContainer.forEach(singlePhoto => {
      const imgObj = imageHelper.imageProcessing(
        host,
        currDate,
        constantData.BucketName,
        singlePhoto.name,
        userId,
        isPrivate
        )
      Jimp.read(singlePhoto.data, (err, processedImage) => {
        if (err) return;
        processedImage
          .quality(60)
          .greyscale()
          .blur(50)
          .getBuffer(Jimp.MIME_JPEG, (err, buff) => {
            if (err) return;
            AWS.config.update(config.awsSecurity);
            var s3 = new AWS.S3();
            s3.putObject({
              Bucket: constantData.BucketName,
              Key: imgObj.filePath,
              Body: singlePhoto.data,
              ContentType: singlePhoto.mimetype
            }, (err, data) => {
              if (err) return;
              s3.putObject({
                Bucket: constantData.BucketName,
                Key: imgObj.privateFilePath,
                Body: buff,
                ContentType: singlePhoto.mimetype
              }, (err, data) => {
                if (err) return;
                return singlePhoto;
              })
            })

          });
      });
      returnArray.push(imgObj.uploadContent);
    }
    );
    return returnArray;
  }
