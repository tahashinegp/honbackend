'use strict';

const { ObjectId } = require('mongodb');
const hideCommonMethodsHelper = require('../helpers/excluded-default-methods');
const app = require('../../server/server');
const dbAccessor = require('../helpers/dbaccessor');
const helper = require('../helpers/helper-methods.js');
const constantData = require('../helpers/constant-data');

module.exports = function (appPreference) {

  //appPreferenceUpdate
  appPreference.updateAppPreference = (req, reqBody, cb) => {
    try {
        const desiredModel = app.models.Users;
      const userId = req.reqestedUserId;
      const object = helper.objectMapper(constantData.CustomPrefernce, reqBody);
      let obj = helper.ObjectValidator(object, [
        {
          messageNotification: helper.booleanChecker
        },
        {
          dateNotification: helper.booleanChecker
        },

        {
          arrangementNotification: helper.booleanChecker
        },
        {
          walletNotification: helper.booleanChecker
        },
        {
          photoNotification: helper.booleanChecker
        }
      ]);

      if (Object.keys(obj).length === 0)
        return cb(null, {}, false, constantData.InvalidRequest);
      const dbObject = {};
      Object.keys(obj).forEach(element => {
        dbObject[`appPreference.${element}`] = obj[element];
      });
      dbAccessor
        .updateRecord(
          userId,
          {
            $set: dbObject
          },
          desiredModel
        )
        .then(result =>
          result.count > 0
            ? cb(null, obj, true, constantData.UpdatedSuccessfully)
            : cb(null, {}, false, constantData.RecordNotUpdated)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  //get appPreference
  appPreference.getAppPreference = (req, cb) => {
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
                appPreference: '$appPreference'
              }
            }
          ],
          desiredModel
        )
        .toArray()
        .then(result =>
          result && result[0] && result[0].appPreference
            ? cb(null, result[0].appPreference, true, constantData.EmptyString)
            : cb(null, {}, true, constantData.NoRecordFound)
        )
        .catch(err => cb(null, err, false, err.message));
    } catch (err) {
      return cb(null, err, false, err.message);
    }
  };

  hideCommonMethodsHelper.disablingOfRemoteMethods(appPreference);
}