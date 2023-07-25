var zipFolder = require('zip-folder');
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

var { TICKET_REASON_CATEGORY, TICKET_REASON } = require('../helpers/constants/ticketReason.const');

var titleExport = 'BÁO CÁO THỐNG KÊ MAIL THEO NGÀY';
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
        _TicketsMail.aggregate(bindAggs(req, res).aggs).exec(next)
      }
    }, function (error, rs) {
      _TicketsMail.aggregatePaginate(agg, { page: page, limit: rows }, function (err, resp, pageCount, count) {
        if (err) {
          return res.json({ code: 500 });
        }
        let total = count;
        if (req.query.exportExcel) {
          exportExcel(req, conditions, total, (err, link) => {
            let paginator = new pagination.SearchPaginator({
              prelink: '/report-statistic-email-by-day',
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
            prelink: '/report-statistic-email-by-day',
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
      mailInboundSource: function (next) {
        _MailInboundSource.find({ status: 1 }, next)
      },
      reasonCategories: function (next) {// nhóm tình trạng
        _TicketReasonCategory.find({
          status: TICKET_REASON_CATEGORY.status.Activate,
          category: TICKET_REASON_CATEGORY.category.Email
        }, next)
      },
      ticketreasons: function (next) { // tình trạng hiện tại
        _TicketReason.find({ status: TICKET_REASON.status.Activate }, next)
      }
    }, function (err, result) {
      console.log(result);
      _.render(req, res, 'report-statistic-email-by-day', {
        title: titleExport,
        mailInboundSource: result.mailInboundSource,
        reasonCategories: result.reasonCategories,
        ticketreasons: result.ticketreasons,
        plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
      }, true);
    });
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
        _TicketsMail.aggregate(_agg, function (err, result) {
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

      _TicketsMail.aggregate(conditions.agg, function (err, result) {
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
          fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'report-statistic-email-by-day'), callback);
        },
        cdr: function (callback) {
          fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'), callback);
        }
      }, callback);
    },
    function (t, callback) {
      let folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
      let folderZip = path.join(_rootPath, 'assets', 'export', 'report-statistic-email-by-day', folderName + '.zip');

      zipFolder(folderPath, folderZip, function (err) {
        console.log(err);
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

function createExcelFile(req, folderName, lastFolderName, fileName, data, { startDay, endDay }, callback) {
  if (data.length <= 0) {
    return callback({ code: 500 });
  }

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
        "TXT_STT",
        "TXT_DATE",
        "TXT_SOURCE_EMAIL",
        "TXT_TOTAL_FLOW_MAIL",
        "TXT_TOTAL_EMAIL",
        "TXT_UNDONE",
        "TXT_DONE"
      ];

      let workbook = new _Excel.Workbook();
      workbook.creator = req.session.user.displayName;
      workbook.created = new Date();
      let sheet = workbook.addWorksheet(titleExport);

      if (!startDay && !endDay && data.length > 0) {
        startDay = moment(data[0].createDate)
        endDay = moment(data[data.length - 1].createDate)
      } else {

        startDay = moment(startDay).startOf('day');
        endDay = moment(endDay).add(-7, 'hours').endOf('day');
      }
      startDay = startDay.format('DD/MM/YYYY HH:mm');
      endDay = endDay.format('DD/MM/YYYY HH:mm');

      setWeightColumn(sheet)

      headerReport(startDay, endDay, titleExport, sheet, {});

      let rowHeader = []
      _.each(excelHeader, function (header) {
        rowHeader.push(_config.MESSAGE.REPORT_STATISTIC_EMAIL_BY_DAY[header]);
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

      if (data !== null) {
        // Hiển thị data 
        let startRow = 11;
        let index = 0;
        data.forEach(el => {
          index += 1;
          el.data.forEach(function (inner_el) {
            sheet.addRow([
              index,
              el._id,
              inner_el.nameSource,
              inner_el.totalSource,
              inner_el.totalMail,
              inner_el.unDone,
              inner_el.done,
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
          })

          let endRow = startRow + (el.data.length - 1);
          let mergeIndex = 'A' + startRow + ':A' + endRow;
          let mergeDate = 'B' + startRow + ':B' + endRow;
          startRow += el.data.length;
          sheet.mergeCells(mergeIndex);
          sheet.mergeCells(mergeDate);
        });


        //Hiển thị tổng
        let sumEmailSource = 0;
        let sumMail = 0;
        let sumDone = 0;
        let sumUndone = 0;

        data.forEach(function (el) {
          el.data.forEach(function (child_el) {
            sumEmailSource += child_el.totalSource;
            sumMail += child_el.totalMail;
            sumDone += child_el.done;
            sumUndone += child_el.unDone;
          });
        });

        let totalData = {
          'TỔNG LUỒNG MAIL': sumEmailSource,
          'TỔNG MAIL': sumMail,
          'HOÀN THÀNH': sumDone,
          'CHƯA HOÀN THÀNH': sumUndone,
        }

        for (const property in totalData) {
          sheet.addRow([]);
          sheet.addRow([property, totalData[property]]);

          sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: EXCEL_CONFIG.fontSizeTableBody };

          sheet.lastRow.getCell('A').fill = {
            type: 'gradient',
            gradient: 'path',
            center: { left: 0.5, top: 0.5 },
            stops: [
              { position: 0, color: { argb: 'ff0000' } },
              { position: 1, color: { argb: 'ff0000' } }
            ]
          };

          sheet.lastRow.getCell('A').font = {
            name: EXCEL_CONFIG.fontName,
            family: 4,
            size: EXCEL_CONFIG.fontSizeTableBody,
            bold: true,
            color: { argb: 'FFFFFF' }
          };
          sheet.lastRow.getCell('A').alignment = { vertical: 'middle' };

          sheet.lastRow.getCell('B').border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
          }
          sheet.lastRow.getCell('B').alignment = { vertical: 'middle', horizontal: 'center' };
        }

        workbook.xlsx.writeFile(options.filename).then(function (errr, rss) {
          callback(errr, rss)
        });
      } else {
        workbook.xlsx.writeFile(options.filename)
          .then(callback);
      }
    }
  ], function (err, result) {
    // console.log('dfdfdf', err, JSON.stringify(data[data.length - 1]._id));
    callback(err, { objectId: data[data.length - 1] ? data[data.length - 1]._id : null, _folderName: folderName });
  });
};

function setWeightColumn(worksheet) {
  let valueWidthColumn = [
    20, 20, 50, 20, 20, 20, 20, 20, 20, 20, 20, 20
  ]
  _.each(valueWidthColumn, function (item, j) {
    worksheet.getColumn(++j).width = item;
  })

}

function bindAggs(req, res) {
  let matchQuery = {};
  let startDay, endDay;

  if (_.has(req.query, 'created') && req.query.created) {
    let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
    let _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

    startDay = (_d1._d < _d2._d) ? _d1 : _d2;
    endDay = (_d1._d < _d2._d) ? _d2 : _d1;
    startDay = startDay.startOf('day').add(7, 'hours')._d;
    endDay = endDay.endOf('day').add(7, 'hours')._d;
    matchQuery.created = {
      $gte: startDay, $lt: endDay
    }
  }

  if (_.has(req.query, 'source') && req.query.source) {
    matchQuery['idSource'] = { $in: _.arrayObjectId(req.query.source) }
  }

  if (_.has(req.query, 'reasonCategories') && req.query.reasonCategories) {
    matchQuery['ticketReasonCategory'] = { $in: _.arrayObjectId(req.query.reasonCategories) }
  }

  if (_.has(req.query, 'ticketreasons') && req.query.ticketreasons) {
    matchQuery['ticketReason'] = { $in: _.arrayObjectId(req.query.ticketreasons) }
  }

  if (_.has(req.query, 'status') && req.query.status) {
    // let listStatus = req.query.status.map(function (el) {
    //   return +el
    // })
    // matchQuery['status'] = { $in: listStatus }
    let listStatus = [];
    _.each(req.query.status, function (el) {
      switch (Number(el)) {
        case 2:
          listStatus.push({ status: { $eq: 2 } });
          break;
        default:
          listStatus.push({ status: { $ne: 2 } });
          break;
      }
    })
    matchQuery['$or'] = listStatus;
  }

  let aggs = [
    {
      $match: {
        typeMail: 1,
        idAgent: { $ne: null }
      }
    },
    {
      $lookup: {
        from: 'mailinbounds',
        localField: 'caseId',
        foreignField: 'caseId',
        as: 'mailinbounds'
      }
    },
    {
      $lookup: {
        from: 'mailinboundchannels',
        localField: 'idMailInboundChannel',
        foreignField: '_id',
        as: 'mailinboundchannels'
      }
    },
    {
      $unwind: {
        path: '$mailinboundchannels',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $lookup: {
        from: 'mailinboundsources',
        localField: 'aliasId',
        foreignField: 'idMailCisco',
        as: 'mailinboundsources'
      }
    },
    {
      $unwind: {
        path: '$mailinboundsources',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        date: {
          $cond: [
            { $ifNull: ['$created', false] },
            {
              $concat: [
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $dayOfMonth: "$created" }, 10] }, '0', ''] },
                    { $substr: [{ $dayOfMonth: "$created" }, 0, 2] }
                  ]
                },
                '/',
                {
                  $concat: [
                    { $cond: [{ $lt: [{ $month: "$created" }, 10] }, '0', ''] },
                    { $substr: [{ $month: "$created" }, 0, 2] }
                  ]
                },
                '/',
                { $substr: [{ $year: "$created" }, 0, 4] }
              ]
            },
            null
          ]
        },
        created: 1,
        ticketReason: 1,
        ticketReasonCategory: 1,
        status: {
          $cond: [
            { $ifNull: ['$status', false] },
            '$status',
            0
          ]
        },
        aliasId: 1,
        nameChannel: '$mailinboundchannels.name',
        nameSource: '$mailinboundsources.name',
        valueSource: '$mailinboundsources.idMailCisco',
        idSource: '$mailinboundsources._id',
        totalMail: {
          $size: "$mailinbounds"
        },
        unDone: {
          $cond: [
            { $lt: ['$status', 2] },
            1,
            0
          ]
        },
        done: {
          $cond: [
            { $eq: ['$status', 2] },
            1,
            0
          ]
        },

      }
    },
    {
      $match: matchQuery
    },
    {
      $group: {
        _id: {
          date: "$date",
          idSource: "$idSource",
          nameSource: '$nameSource',
          valueSource: '$valueSource',
          nameChannel: '$nameChannel'
        },
        totalSource: {
          $sum: 1
        },
        totalMail: {
          $sum: '$totalMail'
        },
        unDone: {
          $sum: '$unDone'
        },
        done: {
          $sum: '$done'
        }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        date: { $last: "$_id.date" },
        data: {
          $push: {
            nameSource: "$_id.nameSource",
            valueSource: '$_id.valueSource',
            nameChannel: '$_id.nameChannel',
            totalSource: '$totalSource',
            totalMail: "$totalMail",
            unDone: "$unDone",
            done: "$done"
          },

        }
      },

    },
    { $sort: { date: -1 } }
  ]
  return {
    aggs,
    startDay,
    endDay
  };
}