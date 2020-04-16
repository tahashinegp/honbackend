const uuidv4 = require('uuid/v4');
const constData = require('./constant-data');
const { ObjectId } = require('mongodb');
module.exports = {
  userExist: (userName, desiredModel) => isExist(userName, desiredModel),

  isUserExist: (id, fields, desiredModel) =>
    isUserExist(id, fields, desiredModel),

  getRecord: (id, desiredModel) => getRecord(id, desiredModel),

  getRecords: (param, desiredModel) => getRecords(param, desiredModel),

  getUsers: desiredModel => getUsers(desiredModel),

  getUserById: (condition, desiredModel) =>
    getUserById(condition, desiredModel),

  getOwnInfo: (condition, desiredModel) => getOwnInfo(condition, desiredModel),

  getAvatar: (id, desiredModel) => getAvatar(id, desiredModel),

  getRecordByAggregation: (condition, desiredModel) => 
    getRecordByAggregation(condition, desiredModel),

  getRecordWithParam: (condition, desiredModel) =>
    getRecordWithParam(condition, desiredModel),

  createUser: (object, desiredModel) => createUser(object, desiredModel),

  bulkUpload: (id, photoArray, desiredModel) =>
    bulkUpload(id, photoArray, desiredModel),

  updateRecord: (id, obj, desiredModel) => updateRecord(id, obj, desiredModel),

  updateRecordBasedOnConditions: (conditions, obj, desiredModel) =>
    updateRecordBasedOnConditions(conditions, obj, desiredModel),

  updateRecordWithPull: (condition, pullParam, desiredModel) =>
    updateRecordWithPull(condition, pullParam, desiredModel),

  updateRecordWithSet: (condition, setParam, desiredModel) =>
    updateRecordWithSet(condition, setParam, desiredModel),

  updateRecordWithPush: (condition, pushParam, desiredModel) =>
    updateRecordWithPush(condition, pushParam, desiredModel),

  updateRecordWithParamAndSet: (
    condition,
    setParam,
    filterParam,
    desiredModel
  ) =>
    updateRecordWithParamAndSet(condition, setParam, filterParam, desiredModel),

  updateRecordWithParamAndPush: (
    condition,
    pushParam,
    filterParam,
    desiredModel
  ) =>
    updateRecordWithParamAndPush(
      condition,
      pushParam,
      filterParam,
      desiredModel
    )
};

//is exist
function isExist(userName, desiredModel) { 
  return desiredModel.findOne(
    {
      where: {
        $or: [
          {
            userName: userName
          },
          {
            userMail: userName
          },
          {
            userPhone: userName
          }
        ]
      },
      fields: {
        id: true
      }
  }
  );
}

//create user
function createUser(obj, desiredModel) {
  obj.appPreference = {
    messageNotification: true,
    dateNotification: true,
    arrangementNotification: true,
    walletNotification: true,
    photoNotification: true
  };
  return desiredModel.create(obj);
}

//get record
function getRecord(id, desiredModel) {
  return desiredModel.findOne({
    where: {
      id: id
    },
    fields: {
      id: true
    }
  });
}

//get record with param
function getRecordWithParam(param, desiredModel) {
  return desiredModel.findOne(param);
}

//get record
function getRecords(param, desiredModel) {
  return desiredModel.find(param);
}

//update record
function updateRecord(id, obj, desiredModel) {
  return desiredModel.update(
    {
      id
    },
    obj
  );
}

//update record with condition
function updateRecordBasedOnConditions(conditions, obj, desiredModel) {
  return desiredModel.update(conditions, obj);
}

//get users
function getUsers(desiredModel) {
  const fields = constData.UserFieldsForDiscover;
  fields.id = true;
  return desiredModel.find({
    where: {
      isDeleted: false
    },
    fields: fields
  });
}

//get own info
function getOwnInfo(condition, desiredModel) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.aggregate(condition);
}

//get user by id
function getUserById(condition, desiredModel) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.aggregate(condition);
}

//bulk upload
function bulkUpload(id, photoArray, desiredModel) {
  const pushObj = {};
  pushObj['photos'] = {
    $each: photoArray
  };
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.updateMany(
    {
      _id: ObjectId(id)
    },
    {
      $push: pushObj
    }
  );
}

//is user exist
function isUserExist(id, fields, desiredModel) {
  return desiredModel.findOne({
    where: {
      or: [
        {
          id: id
        }
      ],
      isDeleted: false
    },
    fields: fields
  });
}

//get avatar
function getAvatar(id, desiredModel) {
  return desiredModel.findOne({
    where: {
      id
    },
    fields: {
      avatar: true
    }
  });
}

//get record by aggregation
function getRecordByAggregation(condition, desiredModel) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.aggregate(condition);
}

//update record with param and set
function updateRecordWithParamAndSet(
  condition,
  setParam,
  filterParam,
  desiredModel
) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.updateMany(
    condition,
    { $set: setParam },
    { arrayFilters: [filterParam] }
  );
}

//update record with set
function updateRecordWithSet(condition, setParam, desiredModel) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.updateMany(condition, { $set: setParam });
}

//update record with param and push
function updateRecordWithParamAndPush(
  condition,
  pushParam,
  filterParam,
  desiredModel
) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.updateMany(
    condition,
    { $push: pushParam },
    { arrayFilters: [filterParam] }
  );
}

//update record
function updateRecordWithPush(condition, pushParam, desiredModel) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.updateMany(condition, { $push: pushParam });
}

//pull from array
function updateRecordWithPull(condition, pullParam, desiredModel) {
  const desiredMongo = desiredModel
    .getDataSource()
    .connector.collection(desiredModel.modelName);
  return desiredMongo.updateMany(condition, { $pull: pullParam }, { multi: true });
}
