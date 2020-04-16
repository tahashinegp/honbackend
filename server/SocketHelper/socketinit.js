const { ObjectId } = require("mongodb");
const helper = require("./helpermethods.js");
const commonHelper = require("../../common/helpers/helper-methods");
const dictionary = require("./dictionary.js");
const dbAccessor = require("../../common/helpers/dbaccessor");
const firebaseRequest = require('../../common/helpers/firebase-request');

module.exports = {
    socketIntializer: (models) => socketIntializer(models)
}

const socketIntializer = (models) => {
    var io = models.users.app.io;
    io.use(async (socket, next) => {
      if (!socket.handshake.query.userId)
        next(new Error(dictionary.authenticationError));
      const connectResult = await dbAccessor.updateRecord(
        socket.handshake.query.userId,
        { isActive: true },
        models.users
      );
      return connectResult.count > 0
        ? next()
        : next(new Error(dictionary.authenticationError));
    });

    //connect
    io.on(dictionary.connection, async socket => {
      if (
        await helper.isUserExist(
          socket.handshake.query.userId,
          io.sockets.connected
        )
      ) {
        socket.userId = socket.handshake.query.userId;
        io.emit(dictionary.onActiveInactive, {
          activeState: true,
          userId: socket.userId
        });
      } else socket.userId = socket.handshake.query.userId;

      socket.join(socket.handshake.query.userId);
      // console.log(app.io.sockets.adapter.rooms);
      //disconnect
      socket.on(dictionary.disconnect, async () => {
        if (
          await helper.isUserDisconnected(
            socket.handshake.query.userId,
            io.sockets.connected
          )
        ) {
          await dbAccessor.updateRecord(
            socket.handshake.query.userId,
            { isActive: false, lastActiveAt: Date.now() },
            models.users
          );

          io.emit(dictionary.onActiveInactive, {
            activeState: false,
            userId: socket.userId
          });
        }
      });

      socket.on(dictionary.connect, () => {});

      //sendMessage
      socket.on(dictionary.sendMessage, async data => {
        const roomName = data.senderId + data.receiverId + Date.now();
        for (let element in io.sockets.connected) {
          if (
            io.sockets.connected[element].userId == data.receiverId ||
            io.sockets.connected[element].userId == data.senderId
          )
            io.sockets.connected[element].join(roomName);
        }

        const reportObj = await dbAccessor
          .getRecordByAggregation(
            helper.isReportedObj(ObjectId(data.senderId), data.receiverId),
            models.users
          )
          .toArray();
        const userName = await models.users.findOne({
          where:{ _id: data.senderId },
          fields:{ userName: 1}
        });
        const isReportedUser =
          reportObj.length == 0
            ? undefined
            : { isReported: true, isReporter: reportObj[0].isReporter };
        const obj = helper.sendMessageObj(
          data.senderId,
          data.receiverId,
          data.message
        );
        const id = `${Date.now()}${data.senderId}${data.receiverId}`;
const title = `Message from ${userName.userName}`;
const body = `${userName.userName} send you a message`;
const avatar = await dbAccessor.getAvatar(data.senderId, models.users);
  const notification = commonHelper.getNotificationObject(
    data.senderId,
    data.receiverId,
    userName.userName,
    title,
    body,
    avatar,
    data.senderId,
    "type"
  );
        const notificationBody = commonHelper.notificationBody(
          data.receiverId,
          title,
          body,
          notification
        );
        await firebaseRequest.requesthandler(
          'https://fcm.googleapis.com/fcm/send',
          'POST',
          notificationBody
        );

        const findPairObj = helper.findPairObj(data.senderId, data.receiverId);
        const result = isReportedUser
          ? {}
          : await dbAccessor
              .getRecordByAggregation(findPairObj, models.conversations)
              .toArray();
        const pushResult = isReportedUser
          ? {}
          : result && result.length > 0
          ? await dbAccessor.updateRecordWithPush(
              { _id: ObjectId(result[0].id) },
              { messages: obj },
              models.conversations
            )
          : await models.conversations.create(
              {
                members: [
                  { userId: data.senderId },
                  { userId: data.receiverId }
                ],
                messages: [obj],
                isDeleted: false
              },
              { allowExtendedOperators: true }
            );
        obj.clientMsgId = data.clientMsgId;
        await dbAccessor.updateRecord(
          data.receiverId,
          {
            $inc: {
              messageCount: 1
            }
          },
          models.users
        );
        const counter = await dbAccessor
          .getRecordByAggregation(
            [
              { $match: { _id: ObjectId(data.receiverId) } },
              {
                $project: {
                  messageCount: "$messageCount"
                }
              }
            ],
            models.users
          )
          .toArray();
        obj.messageCount = counter[0].messageCount;
        
        io
          // .to(roomName)
          .to(data.receiverId)
          .emit(
            dictionary.sendMessageResponse,
            isReportedUser
              ? isReportedUser
              : pushResult.members ||
                (pushResult.result && pushResult.result.nModified)
              ? obj
              : null
          );
      });

      //seen messages
      socket.on(dictionary.messageHaveSeen, async data => {
        await dbAccessor.updateRecordWithParamAndSet(
          {
            $and: [
              { members: { $elemMatch: { userId: data.senderId } } },
              { members: { $elemMatch: { userId: data.receiverId } } }
            ]
          },
          {
            "messages.$[p].seenAt": Date.now()
          },
          {
            "p.seenAt": { $exists: false }
          },
          models.conversations
        );

        const userListObj = helper.getUserListObj(
          socket.handshake.query.userId
        );
        const result = await dbAccessor
          .getRecordByAggregation(userListObj, models.conversations)
          .toArray();
        io
          .to(socket.handshake.query.userId)
          .emit(dictionary.recentUserListResponse, result);
        // messageSeenResponse
      });

      //getMessage
      socket.on(dictionary.getMessages, async data => {
        const limit = !parseInt(data.limit) ? 20 : parseInt(data.limit);
        const page = !parseInt(data.page) ? 1 : parseInt(data.page);
        const offset = parseInt(page - 1) * limit;
        const condition = helper.getMessagesObj(
          data.senderId,
          data.receiverId,
          offset,
          limit
        );
        const result = await dbAccessor
          .getRecordByAggregation(condition, models.conversations)
          .toArray();
        io
          .to(socket.id)
          .emit(
            dictionary.getMessagesResponse,
            result && result[0] ? result[0] : null
          );
      });

      //recent List
      socket.on(dictionary.recentUserList, async () => {
        const userListObj = helper.getUserListObj(
          socket.handshake.query.userId
        );
        const result = await dbAccessor
          .getRecordByAggregation(userListObj, models.conversations)
          .toArray();
        io
          .to(socket.id)
          .emit(
            dictionary.recentUserListResponse,
            result && result[0] && result.length > 0 ? result : []
          );
      });

      //lastActiveTime
      socket.on(dictionary.lastActiveTime, async data => {
        const result = await dbAccessor.getRecordWithParam(
          { where: { id: data.userId }, fields: { lastActiveAt: true } },
          models.users
        );
        io
          .to(socket.id)
          .emit(
            dictionary.lastActiveTimeResponse,
            result && result.lastActiveAt ? result : null
          );
      });

      //deleteMessage
      socket.on(dictionary.deleteConversation, async data => {
        const findPairObj = helper.findPairObj(data.senderId, data.receiverId);
        const result = await dbAccessor
          .getRecordByAggregation(findPairObj, models.conversations)
          .toArray();
        const finalResult =
          result && result[0] && result[0].id
            ? await dbAccessor.updateRecord(
                result[0].id,
                { isDeleted: true },
                models.conversations
              )
            : { count: 0 };
        io
          .to(socket.id)
          .emit(
            dictionary.deleteConversationResponse,
            finalResult.count && finalResult.count > 0
              ? { isDeleted: true }
              : { isDeleted: false }
          );
      });

      //notificationCounter
      socket.on(dictionary.notificationCounter, async data => {
        const result = await await dbAccessor
          .getRecordByAggregation(
            [
              { $match: { _id: ObjectId(data.userId) } },
              {
                $project: {
                  notificationCount: "$notificationCount"
                }
              }
            ],
            models.users
          )
          .toArray();
        io
          .to(socket.id)
          .emit(
            dictionary.notificationCounterResponse,
            result && result.length > 0
              ? { notificationCount: result[0].notificationCount }
              : { notificationCount: 0 }
          );
      });

      //messageCounter
      socket.on(dictionary.messageCounter, async data => {
        const result = await await dbAccessor
          .getRecordByAggregation(
            [
              { $match: { _id: ObjectId(data.userId) } },
              {
                $project: {
                  messageCount: "$messageCount"
                }
              }
            ],
            models.users
          )
          .toArray();
        io
          .to(socket.id)
          .emit(
            dictionary.messageCounterResponse,
            result && result.length > 0
              ? { messageCount: result[0].messageCount }
              : { messageCount: 0 }
          );
      });

      //previewNotifications
      socket.on(dictionary.previewNotifications, async data => {
        await dbAccessor.updateRecord(
          data.userId,
          { notificationCount: 0 },
          models.users
        );
        io.to(socket.id).emit(dictionary.notificationCounterResponse, {
          notificationCount: 0
        });
      });

      //previewMessages
      socket.on(dictionary.previewMessages, async data => {
        await dbAccessor.updateRecord(
          data.userId,
          { messageCount: 0 },
          models.users
        );
        io
          .to(socket.id)
          .emit(dictionary.messageCounterResponse, { messageCount: 0 });
      });
    });
}