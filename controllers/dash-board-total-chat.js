const {
  genTime,
  queryData,
  handleData,
} = require('../commons/generalDataMonitor');

exports.index = {
  json: function (req, res) {
    const date = genTime();
    const aggregateCurrentMonth = bindAgg(date.startDateCurrentMonth, date.endDateCurrentMonth);
    const aggregatePreviousMonth = bindAgg(date.startDatePrevMonth, date.endDatePrevMonth);

    queryData(_ChatThread, aggregateCurrentMonth, aggregatePreviousMonth, function (err, result) {
      let data = {};

      if (result) {
        let defaultData = {
          count: 0,
          chatReceive: 0,
          chatMiss: 0,
          chatOffline: 0
        }

        let dataCurrentMonth = result.dataCurrentMonth && result.dataCurrentMonth.length > 0 && result.dataCurrentMonth[0]
          ? result.dataCurrentMonth[0]
          : defaultData;

        let dataPreviousMonth = result.dataPreviousMonth && result.dataPreviousMonth.length > 0 && result.dataPreviousMonth[0]
          ? result.dataPreviousMonth[0]
          : defaultData;

        data = {
          totalChat: handleData(dataCurrentMonth.count, dataPreviousMonth.count),
          totalChatReceive: handleData(dataCurrentMonth.chatReceive, dataPreviousMonth.chatReceive),
          totalChatMiss: handleData(dataCurrentMonth.chatMiss, dataPreviousMonth.chatMiss),
          totalChatOffline: handleData(dataCurrentMonth.chatOffline, dataPreviousMonth.chatOffline),
        }
      }

      return res.json({ code: err ? 500 : 200, message: err ? err.message : data });
    })
  }
}

function bindAgg(startTime, endtime) {
  let matchQuery = {};

  if (startTime) {
    matchQuery.createDate = {
      $gte: startTime,
      $lt: endtime,
    }
  }

  let aggregateQuery = [
    {
      $match: {
        createDate: { $ne: null },
        activityStatus: 9000
      }
    },
    {
      $lookup: {
        from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticketChat"
      }
    },
    { $unwind: { path: '$ticketChat', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        customerMessageCount: 1,
        createDate: 1,
        chatStatus: 1,
        whenModified: 1,
        // converReceive: {
        //   $cond:
        //     [
        //       {
        //         $or: [
        //           {
        //             $or: [
        //               {
        //                 $and: [
        //                   { $gt: ['$customerMessageCount', 1] },
        //                   { $eq: ['$chatStatus', 1] }
        //                 ]
        //               },
        //               { $eq: ['$chatStatus', 4] },

        //             ]
        //           },
        //           {
        //             $and: [
        //               {
        //                 $or: [
        //                   { $eq: ['$activitySubStatus', 5900] },
        //                   { $eq: ['$activitySubStatus', 4900] }
        //                 ]
        //               },
        //               {
        //                 $or: [
        //                   { $eq: ['$activityStatus', 4000] },
        //                   { $eq: ['$activityStatus', 5000] }
        //                 ]
        //               }
        //             ]

        //           }
        //         ]
        //       },
        //       1, 0]
        // },
        converReceive: {
          $cond:
            [
              {
                // $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                $and: [
                  { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                  {
                    $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                  }
                ]
              },
              1, 0]
        },
        // converMiss: {
        //   $cond: [
        //     {
        //       $or: [
        //         {
        //           $and: [
        //             { $lte: ['$customerMessageCount', 1] },
        //             { $eq: ['$chatStatus', 1] }
        //           ]
        //         },
        //         {
        //           $and: [
        //             { $eq: ['$customerMessageCount', 0] },
        //             { $eq: ['$chatStatus', 5] }
        //           ]
        //         }
        //       ]

        //     },
        //     1, 0]
        // },
        converMiss: {
          $cond: [
            {
              // $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
              $and: [
                { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                {
                  $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                }
              ]
            },
            1, 0]
        },
        converOffline: {
          $cond: [
            {
              $and: [
                { $eq: ['$customerMessageCount', null] },
                { $eq: ['$chatStatus', 6] }
              ]
            },
            1, 0]
        },
        idAgent: "$ticketChat.idAgent",
        reasonCategory: "$ticketChat.ticketReasonCategory",
        reason: "$ticketChat.ticketReason",
        status: "$ticketChat.status",
        channelId: 1

      }
    },
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        chatMiss: { $sum: "$converMiss" },
        chatOffline: { $sum: "$converOffline" },
        chatReceive: { $sum: "$converReceive" }
      }
    },
    {
      $project: {
        count: { $add: ["$chatMiss", "$chatOffline", "$chatReceive"] },
        chatMiss: 1,
        chatOffline: 1,
        chatReceive: 1,
      }
    }
  ]

  return aggregateQuery;
}