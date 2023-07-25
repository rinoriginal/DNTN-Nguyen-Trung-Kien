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

    queryData(_TicketsMail, aggregateCurrentMonth, aggregatePreviousMonth, function (err, result) {
      let data = {};

      if (result) {
        let defaultData = {
          sumCaseId: 0,
          sumMail: 0,
          sumComplete: 0,
          sumInprogress: 0
        }

        let dataCurrentMonth = result.dataCurrentMonth && result.dataCurrentMonth.length > 0 && result.dataCurrentMonth[0]
          ? result.dataCurrentMonth[0]
          : defaultData;

        let dataPreviousMonth = result.dataPreviousMonth && result.dataPreviousMonth.length > 0 && result.dataPreviousMonth[0]
          ? result.dataPreviousMonth[0]
          : defaultData;

        data = {
          totalCaseId: handleData(dataCurrentMonth.sumCaseId, dataPreviousMonth.sumCaseId),
          totalMail: handleData(dataCurrentMonth.sumMail, dataPreviousMonth.sumMail),
          totalMailComplete: handleData(dataCurrentMonth.sumComplete, dataPreviousMonth.sumComplete),
          totalMailOffline: handleData(dataCurrentMonth.sumInprogress, dataPreviousMonth.sumInprogress),
        }
      }

      return res.json({ code: err ? 500 : 200, message: err ? err.message : data });
    })
  }
}

function bindAgg(startTime, endtime) {
  let matchQuery = {};

  if (startTime) {
    matchQuery.created = {
      $gte: startTime,
      $lt: endtime,
    }
  }

  const aggregateQuery = [
    {
      $match: {
        typeMail: 1,
        idAgent: { $ne: null }
      }
    },
    {
      $lookup: {
        from: "mailinbounds",
        localField: "caseId",
        foreignField: "caseId",
        as: "caseId"
      }
    },
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: null,
        sumCaseId: {
          $sum: 1
        },
        sumMail: {
          $sum: {
            $size: '$caseId'
          }
        },
        sumComplete: {
          $sum: {
            $cond: [{
              $eq: ['$status', 2]
            }, 1, 0]
          }
        },
        sumInprogress: {
          $sum: {
            $cond: [{
              $ne: ['$status', 2]
            }, 1, 0]
          }
        }
      }
    }
  ];

  return aggregateQuery;
}