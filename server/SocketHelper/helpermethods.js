module.exports = {
  isUserExist: async (userId, socket) => await isUserExist(userId, socket),
  isUserDisconnected: async (userId, socket) =>
    await isUserDisconnected(userId, socket),
  sendMessageObj: (senderId, receiverId, messageContent) =>
    sendMessageObj(senderId, receiverId, messageContent),
  findPairObj: (senderId, receiverId) => findPairObj(senderId, receiverId),
  getMessagesObj: (senderId, receiverId, offset, limit) =>
    getMessagesObj(senderId, receiverId, offset, limit),
  getUserListObj: id => getUserListObj(id),
  isReportedObj: (id, receiverId) => [
    {
      $match: {
        _id: id
      }
    },
{$unwind: '$reportedUsers'},
{$match: {'reportedUsers.userId':receiverId}},
    { $project: {
      _id: '$_id',
      isReporter: '$reportedUsers.isReporter'
    }
  }
]
};

//is user exist in socket
async function isUserExist(userId, socket) {
  try {
    let isExist = true;
    for (let socketProp in socket) {
      if (socket[socketProp].userId == userId) {
        isExist = false;
        break;
      }
    }
    return isExist;
  } catch {
    return false;
  }
}

//is user exist in socket
async function isUserDisconnected(userId, socket) {
  try {
    let count = 0;
    for (let socketProp in socket) {
      if (socket[socketProp].userId == userId) count++;
    }
    return count == 0 ? true : false;
  } catch {
    return false;
  }
}

function getUserListObj(id) {
  return [
    { $match: { members: { $elemMatch: { userId: id } }, isDeleted: false } },
    { $unwind: '$messages' },
    { $sort: { 'messages.sentAt': -1 } },
    // { $limit: 1 },
    {$addFields: { count: 0} },
{
  $project: {
    _id: '$_id',
    messages: '$messages',
    members: '$members',
    count:{
    "$sum": {
      "$cond": [
          { "$and": [
              { "$ifNull": [ "$messages.seenAt", false ] }
          ]},
          0,
          1
      ]
  }
  }
}
},
    {
      $group: {
        _id: '$_id',
        lastMessage: { $push: '$messages.message' },
        messages: { $push: '$messages' },
        members: { $first: '$members' },
        count: {$sum: '$count'}
    }
  },



    { $unwind: '$members' },
    { $match: { 'members.userId': { $ne: id } } },
    { $project: { members: '$members', count: '$count', lastMessage: '$lastMessage' } },
    {
      $group: {
        _id: '$_id',
        member: { $push: '$members.userId' },
        lastMessage: { $first: '$lastMessage' },
        count: { "$first": '$count' }
      }
    },
    {
      $project: {
        member: { $arrayElemAt: ['$member', 0] },
        lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
        count: '$count'
      }
    },
    {
      $lookup: {
        from: 'users',
        let: { userId: { $convert: { input: '$member', to: 'objectId' } } },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$_id', '$$userId'] }] } } },
          {
            $project: {
              _id: 1,
              userName: 1,
              avatar: 1,
              lastActiveAt: 1,
              birthDate: 1,
              country: 1,
              isActive: 1
            }
          }
        ],
        as: 'users'
      }
    },
    {
      $project: {
        user: { $arrayElemAt: ['$users', 0] },
        lastMessage: '$lastMessage' ,
        count: '$count'
      }
    },
    {
      $project: {
        count: '$count',
        userName: '$user.userName',
        userId: '$user._id',
        activeState: '$user.isActive',
        avatar: '$user.avatar',
        lastMessage: '$lastMessage',
        lastActiveTime: '$user.lastActiveAt',
        birthDate: '$user.birthDate',
        country: '$user.country'
      }
    }
  ];
}

function getMessagesObj(senderId, receiverId, offset, limit) {
  return [
    {
      $match: {
        $and: [
          { members: { $elemMatch: { userId: senderId } } },
          { members: { $elemMatch: { userId: receiverId } } }
        ],
        isDeleted: false
      }
    },
    { $unwind: '$messages' },
    { $match: { 'messages.isDeleted': false } },
    { $sort: { 'messages.sentAt': -1 } },
    { $skip: offset },
    { $limit: limit },
    { $sort: { 'messages.sentAt': 1 } },
    {
      $group: {
        _id: '$_id',
        messages: { $push: '$messages' },
        members: {$first: '$members'}
      }
    },
    { $project: { _id: 0, id: '$_id', messages: '$messages', members: '$members' } }
  ];
}

function findPairObj(senderId, receiverId) {
  return [
    {
      $match: {
        $and: [
          { members: { $elemMatch: { userId: senderId } } },
          { members: { $elemMatch: { userId: receiverId } } }
        ],
        isDeleted: false
      }
    },
    { $project: { _id: 0, id: '$_id' } }
  ];
}

function sendMessageObj(senderId, receiverId, messageContent) {
  return {
    messageId: `${Date.now()}${senderId}${receiverId}`,
    message: messageContent,
    sentAt: new Date(),
    senderId: senderId,
    isDeleted: false
  };
}
