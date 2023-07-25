var zipFolder = require('zip-folder');
var titleExport = 'BÁO CÁO THỐNG KÊ HỘI THOẠI CHAT THEO KHUNG GIỜ';
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

exports.index = {
  json: function (req, res) {
    let page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    let rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    let agg = [];
    agg._pipeline = bindAggs(req, res).aggs;
    let conditions = {};
    conditions['agg'] = bindAggs(req, res).aggs;
    conditions['startDay'] = bindAggs(req, res).startDay;
    conditions['endDay'] = bindAggs(req, res).endDay;

    _async.parallel({
      sum: function (next) {
        _ChatThread.aggregate(bindAggs(req, res).aggs).exec(next)
      }
    }, function (error, rs) {
      _ChatThread.aggregatePaginate(agg, { page: page, limit: rows }, function (err, resp, pageCount, count) {
        if (err) {
          return res.json({ code: 500 });
        }
        let total = count;
        if (req.query.exportExcel) {
          exportExcel(req, conditions, total, (err, link) => {
            let paginator = new pagination.SearchPaginator({
              prelink: '/report-statistic-chat-by-day',
              current: page,
              rowsPerPage: rows,
              totalResult: count
            });
            res.json({
              code: err ? 500 : 200,
              data: resp,
              linkFile: link,
              sum: rs.sum,
              paging: paginator.getPaginationData()
            });
          });

        } else {
          let paginator = new pagination.SearchPaginator({
            prelink: '/report-statistic-chat-by-day',
            current: page,
            rowsPerPage: rows,
            totalResult: count
          });
          res.json({
            code: 200,
            data: resp,
            sum: rs.sum,
            paging: paginator.getPaginationData()
          });
        }
      });
    })


  },
  html: function (req, res) {
    _async.parallel({
      channel: function (next) {
        _CompanyChannel.find({}, next)
      },
      agent: function (next) {
        _Users.find({ isLoginMobile: 1 }, next)
      },
    }, function (err, result) {
      _.render(req, res, 'report-statistic-chat-by-time', {
        title: titleExport,
        channel: result.channel,
        agent: result.agent,
        plugins: [['moment'], ['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
      }, true);
    })

  }
}

function exportExcel(req, conditions, totalResult, cb) {
  let maxRecordPerFile = 65000;
  // let maxParallelTask = 1;
  let waterFallTask = [];
  let currentDate = new Date();
  let folderName = req.session.user._id + "-" + currentDate.getTime();
  let fileName = titleExport + ' ' + _moment(currentDate).format('DD-MM-YYYY');
  console.log('folderName', folderName);
  // linkFile = path.join('assets', 'export', 'export-ternal', folderName + '.zip');
  let date = new Date().getTime();

  if (totalResult > maxRecordPerFile) {
    // for (let k = 0; k < Math.ceil(totalResult / (maxRecordPerFile * maxParallelTask)); ++k) {
    for (let k = 0; k < Math.ceil(totalResult / maxRecordPerFile); k++) {
      let tempWaterfall = [];
      if (k == 0) {
        tempWaterfall = function (callback) {
          _async.parallel(createParallelTask(k), callback);
        }
      } else {
        tempWaterfall = function (objectId, callback) {
          let lastObjectId = objectId[0].objectId;
          let lastFolderName = objectId[0]._folderName;
          _async.parallel(createParallelTask(k, lastObjectId, lastFolderName), callback);
        }
      }
      waterFallTask.push(tempWaterfall);
    }

    let createParallelTask = function (index, objectId, lastfolderName) {
      let tempParallelTask = [];
      let _fileName = fileName + '-' + index
      let temp = function (callback) {
        let _agg = [...conditions.agg];
        if (_.isEmpty(objectId)) {
          _agg.push({ $limit: maxRecordPerFile });
        } else {
          _agg.push({ $match: { _id: { $gt: _.convertObjectId(objectId) } } }, { $limit: maxRecordPerFile });
        }
        _ChatThread.aggregate(_agg, function (err, result) {
          if (err) return callback(err, null);
          //lấy data insert exporthistorydetail
          createExcelFile(req
            , folderName
            , _.isEmpty(lastfolderName) ? null : lastfolderName
            , _fileName
            , result
            , { startDay: conditions.startDay, endDay: conditions.endDay }
            // , conditions.time
            // , conditions.service
            , callback);
        });
      };
      tempParallelTask.push(temp);
      return tempParallelTask;

    }
  } else {
    let temp = function (callback) {

      _ChatThread.aggregate(conditions.agg, function (err, result) {
        if (err) return callback(err, null);
        createExcelFile(req
          , folderName
          , null
          , fileName
          , result
          , { startDay: conditions.startDay, endDay: conditions.endDay }

          // , conditions.time
          // , conditions.service
          , callback);
      });
    };
    waterFallTask.push(temp);
  }
  waterFallTask.push(
    function (objectId, callback) {
      _async.parallel({
        archiver: function (callback) {
          fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'export-ternal'), callback);
        },
        cdr: function (callback) {
          fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'), callback);
        }
      }, callback);
    },
    function (t, callback) {
      let folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
      let folderZip = path.join(_rootPath, 'assets', 'export', 'export-ternal', folderName + '.zip');

      zipFolder(folderPath, folderZip, function (err) {
        console.log(err);
        // linkFile = path.join('assets', 'export', 'export-ternal', folderName + '.zip');
        callback(err, folderZip.replace(_rootPath, ''));
      });
      console.log(222, folderPath, folderZip);

    }
  );

  _async.waterfall(waterFallTask, function (err, folderZip) {
    console.log(err);
    console.log('folderZipppp', folderZip);
    cb(err, folderZip);
    // res.json({ code: err ? 500 : 200, message: err ? err.message : folderZip });
    // linkFile = folderZip;
  });
}

function createExcelFile(req, folderName, lastFolderName, fileName, data, {startDay, endDay}, callback) {
  let options = {
    filename: path.join(_rootPath, 'assets', 'export', 'cdr', folderName, fileName + '.xlsx'),
    useStyles: true,
    useSharedStrings: true,
    dateFormat: 'DD/MM/YYYY HH:mm:ss'
  };

  _async.waterfall([
    function createFolder(callback) {
      if (!lastFolderName) {
        fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr', folderName), callback);
      } else {
        callback(null, null)
      }
    },
    function (t, callback) {
      fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), callback);
    },
    function createExcelFilez(_config, callback) {
      let excelHeader = [
        "TXT_TIME_SLOT",
        "TXT_TOTAL_CHAT",
        "TXT_CHAT_CONNECT",
        "TXT_TOTAL_CHAT_REPLY",
        "TXT_AVG_CHAT_REPLY",
        "TXT_TOTAL_MSG",
        "TXT_CHAT_MISS",
        "TXT_OFFLINE",
        "TXT_AVG_WAIT_TIME",
        "TXT_TOTAL_WAIT_TIME_GT_SLA",
      ];

      let workbook = new _Excel.Workbook();
      workbook.creator = req.session.user.displayName;
      workbook.created = new Date();
      let sheet = workbook.addWorksheet(titleExport);

      if(!startDay && !endDay && data.length > 0){
        startDay = moment(data[0].createDate)
        endDay =  moment(data[data.length -1].createDate)
      } else {
          
          startDay = moment(startDay).startOf('day');
          endDay =  moment(endDay).add(-7, 'hours').endOf('day');
      }
      startDay = startDay.format('DD/MM/YYYY HH:mm');
      endDay = endDay.format('DD/MM/YYYY HH:mm');

      setWeightColumn(sheet)
      headerReport(startDay, endDay, titleExport , sheet, {});

      let rowHeader = []
      _.each(excelHeader, function (header) {
        rowHeader.push(_config.MESSAGE.REPORT_STATISTIC_CHAT_BY_TIME[header]);
      });
      sheet.addRow(rowHeader)

      for (let i = 1; i <= excelHeader.length; i++) {
        let charNameColumn = _.columnToLetter(i);
        let curCell = sheet.lastRow.getCell(charNameColumn);

        curCell.fill = {
          type: 'gradient',
          gradient: 'path',
          center: { left: 0.5, top: 0.5 },
          stops: [
            { position: 0, color: { argb: EXCEL_CONFIG.colorTableHeader } },
            { position: 1, color: { argb: EXCEL_CONFIG.colorTableHeader } }
          ]
        };
        curCell.font = {
          name: EXCEL_CONFIG.fontName,
          family: 4,
          size: EXCEL_CONFIG.fontSizeTableHeader,
          bold: true,
          color: { argb: 'FFFFFF' }
        };

        curCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }


      //data row Tổng
      var msToTime = function (s) {
        if (!s || s == 0) return '00:00:00';
        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;
        return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
      }

      let sumChat = 0;
      let sumChatReceive = 0;
      let sumChatTime = 0;
      let sumChatTimeAvg = 0;
      let sumTotalMessage = 0;
      let sumChatMiss = 0;
      let sumOffline = 0;
      let sumWaitTimeBiggerSLA = 0;
      let sumWaitTimeAvg = 0;

      data.forEach(function (el) {
        sumChat += el.count;
        sumChatReceive += (el.chatReceive);
        sumChatTime += el.chatTime;
        sumChatTimeAvg += (el.chatReceive + el.chatMiss) != 0
          ? el.chatTime / (el.chatReceive + el.chatMiss)
          : 0
        sumTotalMessage += el.totalMessage;
        sumChatMiss += el.chatMiss;
        sumOffline += el.chatOffline;
        sumWaitTimeAvg += (el.chatReceive + el.chatMiss) != 0
          ? el.chatWaitTime / (el.chatReceive + el.chatMiss)
          : 0
        sumWaitTimeBiggerSLA += el.chatWaitTimeBiggerSLA;
      })
      let sumRows = [
        ('TỔNG'),
        sumChat,
        sumChatReceive,
        msToTime(sumChatTime),
        msToTime(sumChatTimeAvg),
        sumTotalMessage,
        sumChatMiss,
        sumOffline,
        msToTime(sumWaitTimeAvg),
        sumWaitTimeBiggerSLA,
      ]

      if (data !== null) {

        let hoursList = [];
        for (let i = 0; i < 24; i++) {
          hoursList.push(i)
        }

        hoursList.forEach((item) => {
          let dataFound = data.find((i) => Number(item) == Number(i._id));
          if (!dataFound) {
            let element = {};
            element._id = item,
              element.count = 0,
              element.chatReceive = 0,
              element.chatTime = 0,
              element.totalMessage = 0,
              element.chatMiss = 0,
              element.chatOffline = 0,
              element.chatWaitTimeBiggerSLA = 0,

              data.push(element);
          }
        });

        data.sort(function (a, b) {
          return a._id - b._id;
        });

        _async.eachSeries(data, function (el, callback) {
          sheet.addRow([
            el._id,
            el.count,
            el.chatReceive,
            msToTime(el.chatTime),
            msToTime(
              (el.chatReceive + el.chatMiss) != 0
                ? el.chatTime / (el.chatReceive + el.chatMiss)
                : 0
            ),
            el.totalMessage,
            el.chatMiss,
            el.chatOffline,
            msToTime(
              (el.chatReceive + el.chatMiss + el.chatOffline) != 0
                ? el.chatWaitTime / (el.chatReceive + el.chatMiss)
                : 0
            ),
            el.chatWaitTimeBiggerSLA,
          ]);
          sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
          sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: EXCEL_CONFIG.fontSizeTableBody };
          for (let i = 1; i <= excelHeader.length; i++) {
            let charNameColumn = _.columnToLetter(i);
            sheet.lastRow.getCell(charNameColumn).border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" }
            }
          }
          callback(null, sumRows);
        }, function (err, result) {
          // workbook.xlsx.writeFile(options.filename)
          //     .then(callback);
          // workbook.xlsx.writeFile(options.filename)
          //     .then(function (errr, rss) {
          //         callback(errr, rss)
          //     });
        });
        sheet.addRow([]);
        sheet.addRow(sumRows);
        sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
        sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: EXCEL_CONFIG.fontSizeTableBody };
        for (let i = 1; i <= excelHeader.length; i++) {
          let charNameColumn = _.columnToLetter(i);
          sheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          }
        }
        sheet.lastRow.getCell('A').fill = {
          type: 'gradient',
          gradient: 'path',
          center: { left: 0.5, top: 0.5 },
          stops: [
            { position: 0, color: { argb: 'F33535' } },
            { position: 1, color: { argb: 'F33535' } }
          ]
        };
        sheet.lastRow.getCell('A').font = {
          name: EXCEL_CONFIG.fontName,
          family: 4,
          size: EXCEL_CONFIG.fontSizeTableBody,
          bold: true,
          color: { argb: 'FFFFFF' }
        };
        workbook.xlsx.writeFile(options.filename).then(function (errr, rss) {
          callback(errr, rss)
        });
      } else {
        workbook.xlsx.writeFile(options.filename)
          .then(callback);
      }
    }
  ], function (err, result) {
    console.log('dfdfdf', err, JSON.stringify(data[data.length - 1]._id));
    callback(err, { objectId: data[data.length - 1]._id, _folderName: folderName });
  });
};

function setWeightColumn(worksheet) {
  let valueWidthColumn = [
    10, 20, 20, 20, 20, 20, 15, 15, 20, 30
  ]
  _.each(valueWidthColumn, function (item, j) {
    worksheet.getColumn(++j).width = item;
  })

}


function bindAggs(req, res) {
  let matchQuery = {};
  let startDay, endDay;

  if (req.query.created || req.query.channel || req.query.agent) {
    matchQuery.$and = [];

    if (req.query.created) {
      let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
      let _d2 = req.query.created.split(' - ')[1]
        ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY')
        : _moment(_d1).endOf('day');

      startDay = (_d1._d < _d2._d) ? _d1 : _d2;
      endDay = (_d1._d < _d2._d) ? _d2 : _d1;
      startDay = startDay.startOf('day').add(7, 'hours')._d;
      endDay = endDay.endOf('day').add(7, 'hours')._d;

      matchQuery.$and.push(
        { createDate: { $gte: startDay, $lt: endDay } }
      )
    }

    if (req.query.channel) {
      matchQuery.$and.push(
        { channelId: { $in: _.arrayObjectId(req.query.channel) } }
      )
    }

    if (req.query.agent) {
      matchQuery.$and.push(
        { agentId: { $in: _.arrayObjectId(req.query.agent) } }
      )
    }
  }

  let aggs = [
    {
      $match: {
        createDate: { $ne: null },
        activityStatus: 9000
      }
    },
    {
      $match: matchQuery
    },
    {
      $lookup: {
        from: "companychannels",
        localField: "channelId",
        foreignField: "_id",
        as: "companyChannel"
      }
    },
    {
      $unwind: {
        path: "$companyChannel",
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: "agentId",
        foreignField: "_id",
        as: "agent"
      }
    },
    {
      $unwind: {
        path: '$agent',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        time: {
          $cond: [
            { $ifNull: ['$createDate', false] },
            { $hour: { $add: ['$createDate', 7 * 60 * 60000] } },
            null
          ]
        },
        customerMessageCount: 1,
        chatStatus: 1,
        createDate: 1,
        eventDateGMT: 1,
        chatTime: {
          $cond: [
            {
              $and: [
                { $ne: ['$customerMessageCount', null] },
                { $ne: ['$chatStatus', 6] },
              ]
            }, { $subtract: ['$whenModified', '$createDate'] }, 0
          ]
        },
        chatWaitTime: {
          $cond: [
            { $ne: ["$agentAnswerMessageFirstTime", ""] },
            { $add: [{ $subtract: ['$agentAnswerMessageFirstTime', '$createDate'] }, 25200000] },
            { $add: [{ $subtract: ['$whenModified', '$createDate'] }] }
          ]
        },
        messagesChat: {
          $filter: {
            input: "$messagesChat",
            as: "el",
            cond: { $and: [{ $ne: ["$$el.type", "system"] }, { $ne: ["$$el.type", "system end"] }] }
          }
        },
        slaTimeReceive: { $multiply: ['$companyChannel.slaTimeReceive', 1000] },
        chatReceive: {
          $cond:
            [
              {
                $and: [
                  { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                  {
                    $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                  }
                ]
              },
              1, 0]
        },
        chatMiss: {
          $cond: [
            {
              $and: [
                { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                {
                  $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                }
              ]
            },
            1, 0]
        },
        chatOffline: {
          $cond: [
            {
              $and: [
                { $eq: ['$customerMessageCount', null] },
                { $eq: ['$chatStatus', 6] }
              ]
            },
            1, 0]
        },
      }
    },
    {
      $group: {
        _id: "$time",
        count: { $sum: 1 },
        chatReceive: { $sum: '$chatReceive' },
        chatMiss: { $sum: '$chatMiss' },
        chatOffline: { $sum: '$chatOffline' },
        chatTime: { $sum: '$chatTime' },
        chatWaitTime: { $sum: '$chatWaitTime' },
        totalMessage: { $sum: { $size: "$messagesChat" } },
        chatWaitTimeBiggerSLA: {
          $sum: { $cond: [{ $gt: ['$chatWaitTime', '$slaTimeReceive'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 1,
        count: { $add: ['$chatReceive', '$chatMiss', '$chatOffline'] },
        chatReceive: 1,
        chatMiss: 1,
        chatOffline: 1,
        chatTime: 1,
        chatWaitTime: 1,
        totalMessage: 1,
        chatWaitTimeBiggerSLA: 1,
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];

  return {
    aggs,
    startDay,
    endDay
  };
}