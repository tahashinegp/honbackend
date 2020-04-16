const Cryptr = require("cryptr");
const cryptr = new Cryptr("d6F3Efeqdf4784784jkdfhsdfwefuhsdjnsufhwer");
const uuidv4 = require("uuid/v4"),
  jwt = require("jsonwebtoken"),
  config = require("../../server/config"),
  constantData = require("./constant-data"),
  bcrypt = require("bcryptjs"),
  { ObjectId } = require("mongodb"),
  dbAccessor = require("./dbaccessor"),
  passRules = require("password-rules");

module.exports = {
  authObj: userName => authObj(userName),
  encryptionMethod: (id, code, mail) =>
    encrypt(`${id}/${Date.now() + 15 * 60 * 1000}/${code}/${mail}`),
  encrypt: text => encrypt(text),
  encryptionForgetMethod: (userId, mail) =>
    encrypt(`${userId}/${Date.now() + 15 * 60 * 1000}/${mail}`),

  decryptionMethod: hexCode => {
    const arrayStr = decrypt(hexCode);
    return parseInt(arrayStr.split("/")[1]) > Date.now() ? arrayStr : [];
  },

  checkprofileCompleteness: result => checkprofileCompleteness(result),

  checkMandatoryFieldsIsFilled: result => checkMandatoryFieldsIsFilled(result),

  createToken: (id, userName, userMail) => createToken(id, userName, userMail),
  createRefreshToken: id => createRefreshToken(id),

  ObjectValidator: (obj, fields) => objValidation(obj, fields),

  objectMapper: (definedModel, obj) => objMapper(definedModel, obj),

  emailverification: mail => emailverification(mail),

  typeverification: type => constantData.UserType.includes(type),

  isTrue: field => field === "true" || field == true,

  notificationBody: (receiverId, title, body, notification) =>
    JSON.stringify({
      to: `/topics/${receiverId}`,
      notification: { title, body },
      data: notification
    }),

  getRandomNumber: length => getRandomNumber(length),

  bcryptCompare: (password, givenPassword) =>
    bcrypt.compareSync(password, givenPassword),

  bcryptSync: password => bcrypt.hashSync(password, bcrypt.genSaltSync(13)),

  caseConversion: (obj, fields) => caseConversion(obj, fields),

  getNotificationObject: (
    userId,
    sendTo,
    userName,
    title,
    body,
    avatar,
    requestId,
    notificationType,
    refferenceId = undefined
  ) => {
    return {
      id: `${Date.now()}-${userId}-${sendTo}-${uuidv4()}`,
      userId: userId,
      userName,
      title,
      body,
      avatar,
      isSeen: false,
      createdAt: Date.now(),
      navigation: {
        requestId,
        notificationType,
        refferenceId
      }
    };
  },

  getOwnInfoObj: id => {
    let match = {};
    isObjectId(id, ObjectId)
      ? (match = {
          $or: [{ _id: ObjectId(id) }, { userName: id }]
        })
      : (match["userName"] = id);
    match["isDeleted"] = false;

    return [
      {
        $match: match
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          userType: "$uesrType",
          userMail: "$userMail",
          additionalEmail: "$additionalEmail",
          userName: "$userName",
          aboutMe: "$aboutMe",
          name: "$name",
          birthDate: "$birthDate",
          gender: "$gender",
          netWorth: "$netWorth",
          avatar: "$avatar",
          city: "$city",
          country: "$country",
          additionalEmail: "$additionalEmail",
          nationality: "$nationality",
          relationshipLifestyle: "$relationshipLifestyle",
          smokingStatus: "$smokingStatus",
          alcoholicStatus: "$alcoholicStatus",
          childrenStatus: "$childrenStatus",
          languages: "$languages",
          academicQualification: "$academicQualification",
          height: "$height",
          weight: "$weight",
          bodyFitness: "$bodyFitness",
          relationshipStatus: "$relationshipStatus",
          benefitArrangement: "$benefitArrangement",
          desiredRelationship: "$desiredRelationship"
        }
      }
    ];
  },

  getDateRequestObj: (id, offset, range, event) =>
    getDateRequestObj(id, offset, range, event),
  getLimitedNotificationObj: (userId, offset, range) =>
    getLimitedNotificationObj(userId, offset, range),
  getOtherInfoObj: (ownId, id) => getOtherInfoObj(ownId, id),
  booleanChecker: field => booleanChecker(field),
  getBothPublicPrivateObj: (offset, limit, userId) =>
    getBothPublicPrivateObj(offset, limit, userId),
  getSearchedUsersObj: (
    userId,
    userType,
    userName,
    userMail,
    regexp,
    offset,
    range
  ) =>
    getSearchedUsersObj(
      userId,
      userType,
      userName,
      userMail,
      regexp,
      offset,
      range
    ),
  filteredUsersObj: (
    userId,
    interestedIn,
    offset,
    range,
    location,
    max,
    min,
    relationshipStatus,
    relationshipType,
    relationshipLifestyle,
    benefitArrangement,
    sortBy
  ) =>
    filteredUsersObj(
      userId,
      interestedIn,
      offset,
      range,
      location,
      max,
      min,
      relationshipStatus,
      relationshipType,
      relationshipLifestyle,
      benefitArrangement,
      sortBy
    ),

  transactionHistoryObj: (userId, offset, limit) =>
    transactionHistoryObj(userId, offset, limit),
  getPhotoRequestIdObj: (userId, submittorId) =>
    getPhotoRequestIdObj(userId, submittorId),
  requestForPrivatePhoto: (condition, param, willInsert, desiredModel) =>
    requestForPrivatePhoto(condition, param, willInsert, desiredModel),
  getUserCodeObj: (id, type, code) => getUserCodeObj(id, type, code),
  getNotificationByIdObj: (userId, notificationId) =>
    getNotificationByIdObj(userId, notificationId),
  getBenefitArrangementObj: (userId, requestId) =>
    getBenefitArrangementObj(userId, requestId),
  getGiftTokenObj: (userId, requestId) => getGiftTokenObj(userId, requestId),
  getIndividualRequestObj: (userId, requestId) =>
    getIndividualRequestObj(userId, requestId),
  findCustomRangePrivatePhotosObj: (userId, offset, range, requestBy) =>
    findCustomRangePrivatePhotosObj(userId, offset, range, requestBy),
  findCustomRangePublicPhotosObj: (userId, offset, range) =>
    findCustomRangePublicPhotosObj(userId, offset, range),
  getActivePasswordObj: userId => getActivePasswordObj(userId),
  getIndividualRequestObjForPicture: (userId, requestId) =>
    getIndividualRequestObjForPicture(userId, requestId),
  getProfileCompletenessObject: userId => getProfileCompletenessObject(userId),
  emailServiceObj: (toAddresses, data, subject) =>
    emailServiceObj(toAddresses, data, subject),
  passPolicy: password =>
    new passRules(password, {
      minimumLength: 6,
      maximumLength: 50,
      requireCapital: true,
      requireLower: true,
      requireNumber: true,
      requireSpecial: true
    }),
  emailTemplate: (userName, baseUrlProtocol, baseUrl, code) =>
    emailTemplate(userName, baseUrlProtocol, baseUrl, code)
};

//encryption method
const encrypt = text => cryptr.encrypt(text);

//decryption method
const decrypt = encryptedString => cryptr.decrypt(encryptedString);

function checkprofileCompleteness(result) {
  return result.userType &&
    result.weight &&
    result.isMailVerified &&
    result.isPhoneVerified &&
    result.isVideoVerified &&
    result.height &&
    result.userName &&
    result.bodySpecs &&
    result.bodyFitness &&
    result.benefitArrangement &&
    result.relationshipStatus &&
    result.desiredRelationship &&
    result.interestedIn &&
    result.birthDate &&
    result.name &&
    result.gender &&
    result.aboutMe &&
    result.netWorth &&
    result.passcode
    ? true
    : false;
}

function getProfileCompletenessObject(userId) {
  return [
    {
      $match: {
        _id: ObjectId(userId),
        userType: {
          $exists: true
        },
        weight: {
          $exists: true
        },
        isMailVerified: {
          $exists: true
        },
        height: {
          $exists: true
        },
        userName: {
          $exists: true
        },
        bodySpecs: {
          $exists: true
        },
        bodyFitness: {
          $exists: true
        },
        benefitArrangement: {
          $exists: true
        },
        relationshipStatus: {
          $exists: true
        },
        desiredRelationship: {
          $exists: true
        },
        interestedIn: {
          $exists: true
        },
        birthDate: {
          $exists: true
        },
        name: {
          $exists: true
        },
        gender: {
          $exists: true
        },
        aboutMe: {
          $exists: true
        },
        netWorth: {
          $exists: true
        },
        passcode: {
          $exists: true
        }
      }
    },
    {
      $project: {
        _id: 0,
        id: "$_id"
      }
    }
  ];
}

function checkMandatoryFieldsIsFilled(result) {
  return result.userMail &&
    result.userType &&
    result.interestedIn &&
    result.userName &&
    result.birthDate &&
    result.gender &&
    result.relationshipStatus &&
    result.netWorth &&
    result.desiredRelationship
    ? true
    : false;
}

function createToken(id, userName, userMail) {
  const claims = {
    issuer: "HoneyGramApi",
    subject: id,
    userName: userName,
    userMail: userMail
  };

  return jwt.sign(claims, config.secret, {
    expiresIn: 86400
  }); // expires in 24 hours
}

function createRefreshToken(id) {
  const claims = {
    issuer: "HoneyGramApi",
    subject: id,
    flag: config.apiToken
  };

  return jwt.sign(claims, config.secret, {
    expiresIn: 31536000
  });
}

//validation
function objValidation(obj, fields) {
  let state = true;
  if (fields && fields.length > 0) {
    fields.forEach(singleRecord => {
      const key = Object.keys(singleRecord);
      const value = Object.values(singleRecord);
      if (obj[key[0]] && !value[0](obj[key[0]])) state = false; //call the function value[0] with parameter obj[key[0]]
    });
  }
  return state ? obj : {};
}
//case conversion
function caseConversion(obj, fields) {
  fields.forEach(singleRecord => {
    if (obj[singleRecord]) obj[singleRecord] = obj[singleRecord].toLowerCase();
  });
  return obj;
}

//mapper
function objMapper(definedModel, obj) {
  let retObj = {};
  for (var prop in obj) {
    if (definedModel.indexOf(prop) != -1) {
      retObj[prop] = obj[prop];
    }
  }
  return retObj;
}

function emailverification(mail) {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/g;
  const verifier = mail.match(regex);
  return verifier && verifier.length > 0 ? true : false;
}

function getRandomNumber(length) {
  let randomNumber = Math.floor(
    Math.random() * parseInt("1".padEnd(length + 1, "0"))
  ).toString();
  if (randomNumber.length < length) return getRandomNumber(length);
  else return randomNumber;
}

function getOtherInfoObj(ownId, id) {
  let match = {};
  isObjectId(id, ObjectId)
    ? (match = {
        $or: [{ _id: ObjectId(id) }, { userName: id }]
      })
    : (match["userName"] = id);
  match.isDeleted = false;
  match["reportedUsers.userId"] = { $ne: ownId };

  const project = getProjectFilterObj();
  //project.publicPhotos = '$publicPhotos';
  project.photos = "$photos";

  const finalProjection = getProjectFilterObj();
  finalProjection.images = {
    $slice: ["$images", 10]
  };
  finalProjection._id = 0;
  const group = getGroupFilterObj();
  group.images = {
    $push: "$photos.urlLink"
  };

  const returnGroup = getGroupFilterObj();
  returnGroup.images = {
    $first: "$images"
  };
  return [
    {
      $match: match
    },
    {
      $project: project
    },
    {
      $unwind: {
        path: "$photos",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        "photos.isDeleted": {
          $ne: true
        },
        "photos.isPrivate": {
          $ne: true
        }
      }
    },
    {
      $group: group
    },
    {
      $project: finalProjection
    }
  ];
}

function getProjectFilterObj() {
  return {
    id: "$id", //..
    name: "$name", //
    userType: "$userType", //
    userName: "$userName", //
    avatar: "$avatar", //
    birthDate: "$birthDate", //
    country: "$country", //
    city: "$city", //
    benefitArrangement: "$benefitArrangement", //
    interestedIn: "$interestedIn", //
    relationshipLifestyle: "$relationshipLifestyle",
    desiredRelationship: "$desiredRelationship", //
    bodySpecs: "$bodySpecs", //
    height: "$height", //
    weight: "$weight", //
    relationshipStatus: "$relationshipStatus", //
    aboutMe: "$aboutMe" //
  };
}

function getGroupFilterObj() {
  return {
    _id: "$_id",
    id: {
      $first: "$_id"
    },
    name: {
      $first: "$name"
    },
    userType: {
      $first: "$userType"
    },
    userName: {
      $first: "$userName"
    },
    avatar: {
      $first: "$avatar"
    },
    birthDate: {
      $first: "$birthDate"
    },
    country: {
      $first: "$country"
    },
    city: {
      $first: "$city"
    },
    benefitArrangement: {
      $first: "$benefitArrangement"
    },
    interestedIn: {
      $first: "$interestedIn"
    },
    desiredRelationship: {
      $first: "$desiredRelationship"
    },
    bodySpecs: {
      $first: "$bodySpecs"
    },
    height: {
      $first: "$height"
    },
    weight: {
      $first: "$weight"
    },
    aboutMe: {
      $first: "$aboutMe"
    },
    relationshipStatus: {
      $first: "$relationshipStatus"
    },
    relationshipLifestyle:{
      $first: "relationshipLifestyle"
    }
  };
}

function isObjectId(id, objectId) {
  try {
    if (objectId(id)) return true;
    else return false;
  } catch {
    return false;
  }
}
function booleanChecker(field) {
  try {
    return typeof field == "boolean" ? true : false;
  } catch (err) {
    return false;
  }
}

function getDateRequestObj(id, offset, range, event) {
  const currDate = new Date();
  const match =
    event == "upcoming"
      ? {
          "requestForDates.when": {
            $gt: currDate
          }
        }
      : event == "past"
      ? {
          "requestForDates.when": {
            $lt: currDate
          }
        }
      : {};
  match["requestForDates.isDeleted"] = false;
  return [
    {
      $match: {
        _id: ObjectId(id)
      }
    },
    { $project: { requestForDates: "$requestForDates" } },
    {
      $unwind: "$requestForDates"
    },
    {
      $match: match
    },
    {
      $sort: {
        "requestForDates.createdAt": -1
      }
    },
    {
      $skip: offset
    },
    {
      $limit: range
    },
    {
      $lookup: {
        from: "users",
        let: {
          userId: {
            $convert: {
              input: "$requestForDates.userId",
              to: "objectId"
            }
          }
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$userId"] }]
              }
            }
          },
          { $project: { userName: 1, avatar: 1 } }
        ],
        as: "requestForDates.users"
      }
    },

    {
      $project: {
        user: { $arrayElemAt: ["$requestForDates.users", 0] },
        id: "$requestForDates.id",
        when: "$requestForDates.when",
        where: "$requestForDates.where",
        tokens: "$requestForDates.tokens",
        isSender: "$requestForDates.isSender",
        status: "$requestForDates.status",
        isRepliedType: "$requestForDates.isRepliedType",
        createdAt: "$requestForDates.createdAt"
      }
    },
    {
      $project: {
        _id: 0,
        userName: "$user.userName",
        avatar: "$user.avatar",
        userId: "$user._id",
        id: "$id",
        when: "$when",
        where: "$where",
        tokens: "$tokens",
        isSender: "$isSender",
        status: "$status",
        isRepliedType: "$isRepliedType",
        createdAt: "$createdAt"
      }
    }
  ];
}

function getLimitedNotificationObj(userId, offset, range) {
  return [
    { $match: { _id: ObjectId(userId) } },
    { $unwind: "$notifications" },
    { $sort: { "notifications.createdAt": -1 } },
    { $skip: offset },
    { $limit: range },
    {
      $group: {
        _id: "$_id",
        id: {
          $first: "$_id"
        },
        notifications: {
          $push: "$notifications"
        }
      }
    },
    { $project: { notifications: "$notifications" } }
  ];
}

function getBothPublicPrivateObj(offset, limit, userId) {
  return [
    { $match: { _id: ObjectId(userId) } },
    { $unwind: "$photos" },
    { $match: { "photos.isDeleted": false } },
    { $sort: { "photos.createdAt": -1 } },
    { $skip: offset },
    { $limit: parseInt(limit) },
    {
      $project: {
        _id: 0,
        id: "$photos.id",
        urlLink: "$photos.urlLink",
        isPrivate: "$photos.isPrivate"
        // {
        //   $cond: {
        //     if: '$photos.privateUrlLink',
        //     then: true,
        //     else: false
        //   }
        // }
      }
    }
  ];
}

function getSearchedUsersObj(
  userId,
  userType,
  userName,
  userMail,
  regexp,
  offset,
  range
) {
  return [
    {
      $match: {
        _id: {
          $ne: ObjectId(userId)
        },
        "reportedUsers.userId": { $ne: userId },
        isDeleted: false,
        userType: {
          $exists: true
        },
        interestedIn: {
          $exists: true
        },
        userName: {
          $exists: true
        },
        birthDate: {
          $exists: true
        },
        gender: {
          $exists: true
        },
        relationshipStatus: {
          $exists: true
        },
        netWorth: {
          $exists: true
        },
        desiredRelationship: {
          $exists: true
        },
        userType: {
          $ne: userType
        },
        userName: {
          $ne: userName
        },
        userMail: {
          $ne: userMail
        },
        $or: [
          {
            userName: regexp
          },
          {
            userMail: regexp
          },
          {
            name: regexp
          }
        ]
      }
    },
    {
      $sort: {
        createdAt: -1
      }
    },
    {
      $skip: offset
    },
    {
      $limit: range
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        userName: "$userName",
        birthDate: "$birthDate",
        country: "$country",
        city: "$city",
        name: "$name",
        avatar: "$avatar"
      }
    }
  ];
}
function createDate(years) {
  var date = new Date();
  date.setDate(date.getDate());
  date.setMonth(date.getMonth());
  date.setFullYear(date.getFullYear() - years);
  return date;
}
function filteredUsersObj(
  userId,
  interestedIn,
  offset,
  range,
  location,
  max,
  min,
  relationshipStatus,
  relationshipType,
  relationshipLifestyle,
  benefitArrangement,
  sortBy
) {
  const match = interestedIn !== 'both'? {
    _id: {
      $ne: ObjectId(userId)
    },
    "reportedUsers.userId": { $ne: userId },
    userType: {
      $exists: true
    },
    interestedIn: {
      $exists: true
    },
    userName: {
      $exists: true
    },
    // gender: {
    //   $exists: true
    // },
    // relationshipStatus: {
    //   $exists: true
    // },
    // netWorth: {
    //   $exists: true
    // },
    // desiredRelationship: {
    //   $exists: true
    // },
    gender: interestedIn
  }:{
    _id: {
      $ne: ObjectId(userId)
    },
   "reportedUsers.userId": { $ne: userId },
    userType: {
      $exists: true
    },
    interestedIn: {
      $exists: true
    },
    userName: {
      $exists: true
    },
    // gender: {
    //   $exists: true
    // },
    // relationshipStatus: {
    //   $exists: true
    // },
    // netWorth: {
    //   $exists: true
    // },
    // desiredRelationship: {
    //   $exists: true
    // }
  };
  const sort = {};
  if (sortBy) sort["lastActiveAt"] = -1;
  else sort["createdAt"] = -1;
  if (relationshipStatus) match.relationshipStatus = relationshipStatus;
  if (relationshipType) match.desiredRelationship = relationshipType;
  if (benefitArrangement) match.benefitArrangement = benefitArrangement;
  if (location) match.country = location;

  if (max && min)
    match.birthDate = { $gt: createDate(max), $lt: createDate(min) };

  return [
    {
      $match: match
    },
    {
      $sort: sort
    },
    {
      $skip: offset
    },
    {
      $limit: range
    },
    {
      $unwind: {
        path: "$photos",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        "photos.isPrivate": {
          $ne: true
        },
        "photos.isDeleted": {
          $ne: true
        }
      }
    },
    {
      $group: {
        _id: "$_id",
        id: {
          $first: "$_id"
        },
        userType: {
          $first: "$userType"
        },
        userName: {
          $first: "$userName"
        },
        birthDate: {
          $first: "$birthDate"
        },
        country: {
          $first: "$country"
        },
        benefitArrangement: {
          $first: "$benefitArrangement"
        },
        interestedIn: {
          $first: "$interestedIn"
        },
        desiredRelationship: {
          $first: "$desiredRelationship"
        },
        bodySpecs: {
          $first: "$bodySpecs"
        },
        height: {
          $first: "$height"
        },
        weight: {
          $first: "$weight"
        },
        aboutMe: {
          $first: "$aboutMe"
        },
        relationshipStatus: {
          $first: "$relationshipStatus"
        },
        relationshipLifestyle:{
          $first:"$relationshipLifestyle"
        },
        images: {
          $push: "$photos.urlLink"
        },
        avatar: {
          $first: "$avatar"
        }
      }
    },
    {
      $project: {
        id: "$id",
        userType: "$userType",
        userName: "$userName",
        birthDate: "$birthDate",
        country: "$country",
        benefitArrangement: "$benefitArrangement",
        interestedIn: "$interestedIn",
        desiredRelationship: "$desiredRelationship",
        bodySpecs: "$bodySpecs",
        height: "$height",
        weight: "$weight",
        relationshipStatus: "$relationshipStatus",
        relationshipLifestyle: "$relationshipLifestyle",
        aboutMe: "$aboutMe",
        images: {
          $slice: ["$images", 5]
        },
        avatar: "$avatar"
      }
    }
  ];
}

function transactionHistoryObj(userId, offset, limit) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $unwind: "$wallet.transactionLog"
    },
    { $sort: { "wallet.transactionLog.createdAt": -1 } },
    {
      $skip: offset
    },
    {
      $limit: limit
    },
    {
      $group: {
        _id: "$_id",
        transactionLog: {
          $push: "$wallet.transactionLog"
        }
      }
    }
  ];
}

function getPhotoRequestIdObj(userId, submittorId) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: {
        privatePhotoAccessibleUsers: "$privatePhotoAccessibleUsers"
      }
    },
    {
      $unwind: "$privatePhotoAccessibleUsers"
    },
    {
      $match: {
        "privatePhotoAccessibleUsers.userId": submittorId
      }
    },
    {
      $group: {
        _id: "$_id",
        id: {
          $push: "$privatePhotoAccessibleUsers.id"
        },
        status: {
          $push: "$privatePhotoAccessibleUsers.status"
        }
      }
    }
  ];
}

function requestForPrivatePhoto(condition, param, willInsert, desiredModel) {
  return willInsert
    ? dbAccessor.updateRecordWithPush(condition, param, desiredModel)
    : dbAccessor.updateRecordWithSet(condition, param, desiredModel);
}

function getUserCodeObj(id, type, code) {
  return [
    {
      $match: {
        _id: ObjectId(id)
      }
    },
    {
      $unwind: "$verification"
    },
    {
      $match: {
        "verification.verificationType": type,
        "verification.code": code,
        "verification.isActive": true
      }
    },
    {
      $group: {
        _id: "$_id",
        id: {
          $first: "$_id"
        },
        verification: {
          $push: "$verification"
        }
      }
    }
  ];
}

function getNotificationByIdObj(userId, notificationId) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $unwind: `$notifications`
    },
    {
      $match: {
        "notifications.id": notificationId
      }
    },
    {
      $group: {
        _id: "$_id",
        notification: {
          $push: "$notifications"
        }
      }
    }
  ];
}

function getIndividualRequestObj(userId, requestId) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: { requestForDates: "$requestForDates" }
    },
    {
      $unwind: "$requestForDates"
    },
    {
      $match: {
        "requestForDates.id": requestId,
        "requestForDates.isDeleted": false
      }
    },
    {
      $group: {
        _id: "$_id",
        requestForDates: {
          $push: "$requestForDates"
        }
      }
    },
    {
      $project: { _id: 0, id: "$_id", requestForDates: "$requestForDates" }
    }
  ];
}

function getGiftTokenObj(userId, requestId) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: { giftTokens: "$giftTokens" }
    },
    {
      $unwind: "$giftTokens"
    },
    {
      $match: { "giftTokens.id": requestId }
    },
    {
      $group: {
        _id: "$_id",
        giftTokens: {
          $push: "$giftTokens"
        }
      }
    },
    {
      $project: { _id: 0, id: "$_id", giftTokens: "$giftTokens" }
    }
  ];
}
function getBenefitArrangementObj(userId, requestId) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: { benefitArrangements: "$benefitArrangements" }
    },
    {
      $unwind: "$benefitArrangements"
    },
    {
      $match: { "benefitArrangements.id": requestId }
    },
    {
      $group: {
        _id: "$_id",
        benefitArrangements: {
          $push: "$benefitArrangements"
        }
      }
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        benefitArrangements: "$benefitArrangements"
      }
    }
  ];
}

function getIndividualRequestObjForPicture(userId, requestId) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: { privatePhotoAccessibleUsers: "$privatePhotoAccessibleUsers" }
    },
    {
      $unwind: "$privatePhotoAccessibleUsers"
    },
    {
      $match: { "privatePhotoAccessibleUsers.id": requestId }
    },
    {
      $group: {
        _id: "$_id",
        privatePhotoAccessibleUsers: {
          $push: "$privatePhotoAccessibleUsers"
        }
      }
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        privatePhotoAccessibleUsers: "$privatePhotoAccessibleUsers"
      }
    }
  ];
}

function findCustomRangePrivatePhotosObj(userId, offset, range, requestBy) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: {
        photos: "$photos",
        privatePhotoAccessibleUsers: "$privatePhotoAccessibleUsers"
      }
    },
    {
      $unwind: "$photos"
    },
    {
      $match: {
        "photos.isDeleted": false,
        "photos.isPrivate": true
      }
    },
    {
      $sort: {
        "photos.createdAt": -1
      }
    },
    {
      $skip: offset
    },
    {
      $limit: range
    },
    {
      $group: {
        _id: "$_id",
        privatePhotos: {
          $push: "$photos"
        },
        privatePhotoAccessibleUsers: {
          $first: "$privatePhotoAccessibleUsers"
        }
      }
    },
    {
      $project: {
        privatePhotos: "$privatePhotos",
        accessibleUsers: {
          $filter: {
            input: "$privatePhotoAccessibleUsers",
            as: "privatePhotoAccessibleUsers",
            cond: {
              $eq: ["$$privatePhotoAccessibleUsers.userId", requestBy]
            }
          }
        }
      }
    }
  ];
}

function findCustomRangePublicPhotosObj(userId, offset, range) {
  return [
    {
      $match: {
        _id: ObjectId(userId)
      }
    },
    {
      $project: {
        images: "$photos"
      }
    },
    {
      $unwind: {
        path: "$images",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: {
        "images.isDeleted": {
          $ne: true
        },
        "images.isPrivate": {
          $ne: true
        }
      }
    },
    {
      $sort: {
        "images.createdAt": -1
      }
    },
    {
      $skip: offset
    },
    {
      $limit: range
    },
    {
      $group: {
        _id: "$_id",
        images: {
          $push: "$images.urlLink"
        }
      }
    },
    {
      $project: {
        _id: 0,
        images: "$images"
      }
    }
  ];
}

function authObj(userName) {
  return [
    {
      $match: {
        $or: [{ userName }, { userMail: userName }, { userPhone: userName }],
        isDeleted: false
      }
    },
    {
      $project: {
        id: "$_id",
        userType: "$userType",
        userName: "$userName",
        userMail: "$userMail",
        birthDate: "$birthDate",
        name: "$name",
        isMailVerified: "$isMailVerified",
        isProfileVerified: "$isProfileVerified",
        gender: "$gender",
        netWorth: "$netWorth",
        interestedIn: "$interestedIn",
        relationshipStatus: "$relationshipStatus",
        desiredRelationship: "$desiredRelationship",
        aboutMe: "$aboutMe",
        benefitArrangement: "$benefitArrangement",
        bodySpecs: "$bodySpecs",
        bodyFitness: "$bodyFitness",
        height: "$height",
        weight: "$weight",
        avatar: "$avatar",
        city: "$city",
        country: "$country",
        credentials: "$credentials",
        subscriptions: "$subscriptions",
        passcode: "$passcode"
      }
    },
    {
      $unwind: {
        path: "$credentials",
        preserveNullAndEmptyArrays: true
      }
    },
    { $match: { "credentials.isDeleted": { $ne: true } } },
    {
      $group: {
        _id: "$_id",
        id: { $first: "$_id" },
        userType: { $first: "$userType" },
        userName: { $first: "$userName" },
        userMail: { $first: "$userMail" },
        birthDate: { $first: "$birthDate" },
        name: { $first: "$name" },
        isMailVerified: { $first: "$isMailVerified" },
        isProfileVerified: { $first: "$isProfileVerified" },
        gender: { $first: "$gender" },
        netWorth: { $first: "$netWorth" },
        interestedIn: { $first: "$interestedIn" },
        relationshipStatus: { $first: "$relationshipStatus" },
        desiredRelationship: { $first: "$desiredRelationship" },
        benefitArrangement: { $first: "$benefitArrangement" },
        bodySpecs: { $first: "$bodySpecs" },
        bodyFitness: { $first: "$bodyFitness" },
        height: { $first: "$height" },
        weight: { $first: "$weight" },
        avatar: { $first: "$avatar" },
        city: { $first: "$city" },
        country: { $first: "$country" },
        credentials: { $push: "$credentials.password" },
        subscriptions: { $first: "$subscriptions" },
        passcode: { $first: "$passcode" }
      }
    }
  ];
}

function getActivePasswordObj(userId) {
  return [
    {
      $match: {
        _id: ObjectId(userId),
        "credentials.isDeleted": false
      }
    },
    {
      $project: {
        credentials: {
          $filter: {
            input: "$credentials",
            as: "credentials",
            cond: {
              $eq: ["$$credentials.isDeleted", false]
            }
          }
        },
        _id: 0
      }
    }
  ];
}

const emailServiceObj = (toAddresses, data, subject) => {
  return {
    Destination: {
      ToAddresses: [toAddresses]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: data
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject
      }
    },
    Source: "noreply@honeygram.co",
    ReplyToAddresses: ["noreply@honeygram.co"]
  };
};

//extra
const notificationCount = id => {
  return [
    { $match: { _id: ObjectId(id) } },
    { $project: { notificationCount: "$notificationCount" } }
  ];
};

const emailTemplate = (userName, baseUrlProtocol, baseUrl, code) => `<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--<![endif]-->
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title></title>
  <!--[if !mso]><!-->
  <style type="text/css">
    .address-description a {
      color: #000000;
      text-decoration: none;
    }
    @media (max-device-width: 480px) {
      .vervelogoplaceholder {
        height: 83px;
      }
    }
  </style>
</head>
<body
  style="margin-top:0 ;margin-bottom:0 ;margin-right:0 ;margin-left:0 ;padding-top:0px;padding-bottom:0px;padding-right:0px;padding-left:0px;"
>
  <center
    style="width:100%;table-layout:fixed;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#e1e5e8"
  >
    <div
      style="max-width:600px;margin-top:0;margin-bottom:0;margin-right:auto;margin-left:auto;"
    >

      <table
        align="center"
        cellpadding="0"
        style="border-spacing:0;font-family:'Muli',Arial,sans-serif;color:#333333;Margin:0 auto;width:100%;max-width:600px;"
      >
        <tbody>
          <tr>
            <td
              align="center"
              class="vervelogoplaceholder"
              height="143"
              style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;height:143px;vertical-align:middle;"
              valign="middle"
            >
              <div
                style="argin:0;text-align:center;font-family:'flama-condensed','Arial Narrow',Arial;font-weight:700;font-size:30px;Margin-bottom:26px"
              >
                HoneyGram
              </div>
            </td>
          </tr>
          <tr>
            <td
              class="one-column"
              style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;background-color:#ffffff;"
            >
              <table style="border-spacing:0;" width="100%">
                <tbody>
                  <tr>
                    <td
                      align="center"
                      class="inner"
                      style="padding-top:15px;padding-bottom:15px;padding-right:30px;padding-left:30px;"
                      valign="middle"
                    >
<h1 style="font-family: 'flama-condensed','Arial Narrow',Arial;
font-weight: 700;">Hey ${userName}</h1>
                      <img
                        alt="Forgot Password"
                        class="banner"
                        height="93"
                        src="https://umsbckend.blob.core.windows.net/umsimages/bottle.png"
                        style="border-width: 0px; margin-top: 30px; width: 255px; height: 93px;"
                        width="255"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td
                      class="inner contents center"
                      style="padding-top:15px;padding-bottom:15px;padding-right:30px;padding-left:30px;text-align:left;"
                    >
                      <center>
                        <p
                          class="h1 center"
                          style="Margin:0;text-align:center;font-family:'flama-condensed','Arial Narrow',Arial;font-weight:100;font-size:30px;Margin-bottom:26px;"
                        >
                          Forgot your password?
                        </p>
                        <p
                          class="description center"
                          style="font-family:'Muli','Arial Narrow',Arial;Margin:0;text-align:center;max-width:320px;color:#a1a8ad;line-height:24px;font-size:15px;Margin-bottom:10px;margin-left: auto; margin-right: auto;"
                        >
                          <span
                            style='color: rgb(161, 168, 173); font-family: Muli, "Arial Narrow", Arial; font-size: 15px; text-align: center; background-color: rgb(255, 255, 255);'
                            >That's okay, it happens! Click on the button below
                            to reset your password.</span
                          >
                        </p>
                        <a href='${baseUrlProtocol}//${baseUrl}/password/reset?_c=${code}'  target="_blank">
                        <img
                            alt="Reset your Password"
                            height="54"
                            src="https://umsbckend.blob.core.windows.net/umsimages/resetpassword.png"
                            style="border-width: 0px; margin-top: 30px; margin-bottom: 50px; width: 260px; height: 54px;"
                            width="260"
                        /></a>
                      </center>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td height="40">
              <p style="line-height: 40px; padding: 0 0 0 0; margin: 0 0 0 0;">
                &nbsp;
              </p>
              <p>&nbsp;</p>
            </td>
          </tr>
          <tr>
            <td
              align="center"
              style="padding-bottom:0;padding-right:0;padding-left:0;padding-top:0px;"
              valign="middle"
            >
              <span
                class="sg-image"
                data-imagelibrary="%7B%22width%22%3A%228%22%2C%22height%22%3A18%2C%22alt_text%22%3A%22Facebook%22%2C%22alignment%22%3A%22%22%2C%22border%22%3A0%2C%22src%22%3A%22https%3A//marketing-image-production.s3.amazonaws.com/uploads/0a1d076f825eb13bd17a878618a1f749835853a3a3cce49111ac7f18255f10173ecf06d2b5bd711d6207fbade2a3779328e63e26a3bfea5fe07bf7355823567d.png%22%2C%22link%22%3A%22%23%22%2C%22classes%22%3A%7B%22sg-image%22%3A1%7D%7D"
                ><img
                  alt="Facebook"
                  height="18"
                  src="https://marketing-image-production.s3.amazonaws.com/uploads/0a1d076f825eb13bd17a878618a1f749835853a3a3cce49111ac7f18255f10173ecf06d2b5bd711d6207fbade2a3779328e63e26a3bfea5fe07bf7355823567d.png"
                  style="border-width: 0px; margin-right: 21px; margin-left: 21px; width: 8px; height: 18px;"
                  width="8"
              /></span>
              <img
                alt="Twitter"
                height="18"
                src="https://marketing-image-production.s3.amazonaws.com/uploads/6234335b200b187dda8644356bbf58d946eefadae92852cca49fea227cf169f44902dbf1698326466ef192bf122aa943d61bc5b092d06e6a940add1368d7fb71.png"
                style="border-width: 0px; margin-right: 16px; margin-left: 16px; width: 23px; height: 18px;"
                width="23"
              />
              <img
                alt="Instagram"
                height="18"
                src="https://marketing-image-production.s3.amazonaws.com/uploads/650ae3aa9987d91a188878413209c1d8d9b15d7d78854f0c65af44cab64e6c847fd576f673ebef2b04e5a321dc4fed51160661f72724f1b8df8d20baff80c46a.png"
                style="border-width: 0px; margin-right: 16px; margin-left: 16px; width: 18px; height: 18px;"
                width="18"
              />
            </td>
          </tr>

          <tr>
            <td height="25">
              <p style="line-height: 25px; padding: 0 0 0 0; margin: 0 0 0 0;">
                &nbsp;
              </p>
              <p>&nbsp;</p>
            </td>
          </tr>
          <tr>
            <td
              style="padding-top:0;padding-bottom:0;padding-right:30px;padding-left:30px;text-align:center;Margin-right:auto;Margin-left:auto;"
            >
              <center>
                <p
                  style="font-family:'Muli',Arial,sans-serif;Margin:0;text-align:center;Margin-right:auto;Margin-left:auto;font-size:15px;color:#a1a8ad;line-height:23px;"
                >
                  Problems or questions? Call us at
                  <span style="white-space: nowrap">212.810.2899</span>
                </p>
                <p
                  style="font-family:'Muli',Arial,sans-serif;Margin:0;text-align:center;Margin-right:auto;Margin-left:auto;font-size:15px;color:#a1a8ad;line-height:23px;"
                >
                  or email
                  <a
                    href="mailto:hello@honeygram.com"
                    style="color:#a1a8ad;text-decoration:underline;"
                    target="_blank"
                    >hello@honeygram.com</a
                  >
                </p>
              </center>
            </td>
          </tr>
          <tr>
            <td height="40">
              <p style="line-height: 40px; padding: 0 0 0 0; margin: 0 0 0 0;">
                &nbsp;
              </p>
              <p>&nbsp;</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </center>
</body>`;
