/**
 * function lấy danh sách nhóm trạng thái và trạng thái trong ticket reason
 */
module.exports = (match = {}, callback) => {
  const aggregateData = [
    {
      $match: match
    },
    {
      $project: {
        _id: 1, name: 1
      }
    },
    {
      $lookup: {
        from: 'ticketreasons',
        localField: '_id',
        foreignField: 'idCategory',
        as: 'tr'
      }
    },
    {
      $unwind: {
        path: '$tr',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $sort: {
        'tr.priority': 1
      }
    },
    {
      $lookup: {
        from: 'ticketsubreasons',
        localField: 'tr._id',
        foreignField: 'idReason',
        as: 'tr.subReason'
      }
    },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        tReason: {
          $push: {
            trId: '$tr._id',
            name: '$tr.name',
            subReason: '$tr.subReason'
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        tReason: {
          trId: 1,
          name: 1,
          subReason: {
            _id: 1,
            name: 1,
            priority: 1,
          }
        }
      }
    }
  ]

  _TicketReasonCategory.aggregate(aggregateData, function (err, result) {
    callback(err, result);
  });
};