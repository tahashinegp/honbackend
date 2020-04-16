'use strict';
const constData = require('../helpers/constant-data');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const dbAccessor = require('../helpers/dbaccessor');
// const nodeGeocoder = require('node-geocoder');
const apiCaller = require('../helpers/api-caller');

module.exports = function(Configuration) {
  const desiredModel = Configuration;
  desiredModel.getAllInfo = cb => {
    try {
      desiredModel
        .findOne({})
        .then(result => cb(null, result, true, constData.EmptyString))
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  desiredModel.getTerms = cb => {
    try {
      desiredModel
        .find({
          fields: {
            _id: 0,
            termsAndConditions: 1
          }
        })
        .then(result =>
          result && result[0]
            ? cb(null, result[0], true, constData.EmptyString)
            : cb(null, {}, false, constData.NoRecordFound)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  desiredModel.getContactInfo = cb => {
    try {
      desiredModel
        .find({
          fields: {
            _id: 0,
            contactInfo: 1
          }
        })
        .then(result =>
          result && result[0]
            ? cb(null, result[0], true, constData.EmptyString)
            : cb(null, {}, false, constData.NoRecordFound)
        )
        .catch(err => cb(null, {}, false, err.message));
    } catch (err) {
      return cb(null, {}, false, err.message);
    }
  };

  desiredModel.getVersion = (type, cb) => {
    try {
      if (type !== 'web' && type !== 'mobile')
        return cb(null, {}, false, constData.TypeMismatch);
      dbAccessor
        .getRecordByAggregation(
          [
            {
              $unwind: '$versions'
            },
            {
              $match: {
                'versions.versionType': type,
                'versions.isDeleted': false
              }
            },
            {
              $project: {
                _id: 0,
                version: '$versions.version',
                content: '$versions.content'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result =>
          result && result[0]
            ? cb(null, result[0], true, constData.EmptyString)
            : cb(null, {}, false, constData.NoRecordFound)
        )
        .catch(err => {
          return cb(null, err, false, err.message);
        });
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  desiredModel.createTermsAndCondition = (reqBody, cb) => {
    const termsAndCondition = reqBody.terms;
    const contactInfo = reqBody.contact;
    const mobileVersion = reqBody.mobileVersion;
    const webVersion = reqBody.webVersion;
    const mobileContent = reqBody.mobileContent;
    const webContent = reqBody.webContent;
    if (
      !termsAndCondition ||
      !contactInfo ||
      !mobileVersion ||
      !webVersion ||
      !mobileContent ||
      !webContent
    )
      return cb(null, {}, false, constData.IncorrectRequest);
    desiredModel
      .find()
      .then(result =>
        result.length > 0
          ? {
              isDeclined: true,
              message: constData.RecordAlreadyExist
            }
          : desiredModel.create({
              termsAndConditions: termsAndCondition,
              contactInfo: contactInfo,
              versions: [
                {
                  versionType: 'mobile',
                  version: mobileVersion,
                  content: mobileContent,
                  createdAt: Date.now(),
                  isDeleted: false
                },
                {
                  versionType: 'web',
                  version: webVersion,
                  content: webContent,
                  createdAt: Date.now(),
                  isDeleted: false
                }
              ]
            })
      )
      .then(result =>
        result.isDeclined
          ? cb(null, {}, false, result.message)
          : cb(null, {}, true, constData.CreatedSuccessfully)
      )
      .catch(err => cb(null, err, true, err.message));
  };

  desiredModel.updateVersions = (req, reqBody, cb) => {
    try {
      if (reqBody.type !== 'web' && reqBody.type !== 'mobile')
        return cb(null, {}, false, constData.TypeMismatch);
      if (!reqBody.type || !reqBody.version || !reqBody.content)
        return cb(null, {}, false, constData.InvalidRequest);
      const obj = {
        versionType: reqBody.type,
        version: reqBody.version,
        content: reqBody.content,
        modifiedBy: req.reqestedUserId,
        createdAt: Date.now(),
        isDeleted: false
      };
      dbAccessor
        .updateRecordWithParamAndSet(
          {
            'versions.isDeleted': false,
            'versions.versionType': reqBody.type
          },
          {
            'versions.$[p].isDeleted': true
          },
          {
            'p.isDeleted': false,
            'p.versionType': reqBody.type
          },
          desiredModel
        )
        .then(result => {
          dbAccessor.updateRecordWithPush(
            {},
            {
              versions: obj
            },
            desiredModel
          );
        })
        .then(result =>
          cb(
            null,
            {
              result
            },
            true,
            constData.UpdatedSuccessfully
          )
        )
        .catch(err => cb(null, {}, false, err.message));
    } catch (err) {
      return cb(null, {}, false, err.message);
    }
  };

  desiredModel.updateTerms = (reqBody, cb) => {
    try {
      const termsAndCondition = reqBody.terms;
      dbAccessor
        .updateRecordWithSet(
          {},
          {
            termsAndConditions: termsAndCondition
          },
          desiredModel
        )
        .then(result => cb(null, {}, true, constData.UpdatedSuccessfully))
        .catch(err => cb(null, {}, false, err.message));
    } catch (err) {
      return cb(null, {}, false, err.message);
    }
  };
  desiredModel.updateContact = (reqBody, cb) => {
    try {
      const contactInfo = reqBody.contactInfo;
      dbAccessor
        .updateRecordWithSet(
          {},
          {
            contactInfo: contactInfo
          },
          desiredModel
        )
        .then(result => cb(null, {}, true, constData.UpdatedSuccessfully))
        .catch(err => cb(null, {}, false, err.message));
    } catch (err) {
      return cb(null, {}, false, err.message);
    }
  };

  desiredModel.iplocation = (lat, lon, cb) => {
    try {
      if (!lat || !lon) return cb(null, {}, false, constData.IncorrectRequest);
      apiCaller.getCountry(lat, lon).then(res =>{
        return cb(null, { country: res.data.address.country }, true, constData.EmptyString)
      })
      .catch(err => {
         return cb(null, {}, false, err.message)
      })
    } catch (err) {
      return cb(null, {}, false, err.message);
    }
  };
  hideCommonMethodsHelper.disablingOfRemoteMethods(desiredModel);
};
