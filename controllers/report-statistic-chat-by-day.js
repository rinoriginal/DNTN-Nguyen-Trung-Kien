var zipFolder = require('zip-folder');
var titleExport = 'BÁO CÁO THỐNG KÊ HỘI THOẠI CHAT THEO NGÀY';
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

                // let paginator = new pagination.SearchPaginator({
                //     prelink: '/report-statistic-chat-by-day',
                //     current: page,
                //     rowsPerPage: rows,
                //     totalResult: count
                // });
                // res.json({ code: 200, data: resp, paging: paginator.getPaginationData() });
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
            reasonCategories: function (next) {// nhóm tình trạng
                _TicketReasonCategory.find({ status: 1, category: 3 }, next)
            },
            ticketreasons: function (next) { // tình trạng hiện tại
                _TicketReason.find({ status: 1 }, next)
            }
        }, function (err, result) {
            _.render(req, res, 'report-statistic-chat-by-day', {
                title: 'BÁO CÁO THỐNG KÊ HỘI THOẠI CHAT THEO NGÀY',
                channel: result.channel,
                agent: result.agent,
                reasonCategories: result.reasonCategories,
                ticketreasons: result.ticketreasons,
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
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

function createExcelFile(req, folderName, lastFolderName, fileName, data, { startDay, endDay }, callback) {
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
                "TXT_DATE",
                "TXT_TOTAL_CHAT",
                "TXT_CHAT_CONNECT",
                "TXT_CHAT_MISS",
                "TXT_OFFLINE",
                "TXT_CHAT_REPLY",
                "TXT_AVG_CHAT_REPLY",
                "TXT_AVG_WAIT_TIME"
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
                rowHeader.push(_config.MESSAGE.REPORT_STATISTIC_CHAT_BY_DAY[header]);
            });
            sheet.addRow(rowHeader)

            for (let i = 1; i <= excelHeader.length; i++) {
                let charNameColumn = _.columnToLetter(i);
                let curCell = sheet.lastRow.getCell(charNameColumn);
                // sheet.lastRow.getCell(charNameColumn).border = {
                //     top: { style: "thin" },
                //     left: { style: "thin" },
                //     bottom: { style: "thin" },
                //     right: { style: "thin" }
                // };
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
            let sumChatMiss = 0;
            let sumOffline = 0;
            let sumChatTime = 0;
            let sumChatTimeAvg = 0;
            let sumWaitTimeAvg = 0;
            data.forEach(function (el) {
                sumChat += el.count;
                sumChatReceive += (el.chatReceive);
                sumChatMiss += el.chatMiss;
                sumOffline += el.chatOffline;
                sumChatTime += el.chatTime;
                // sumChatTime += el.chatTime;
                sumChatTimeAvg += (el.chatReceive + el.chatMiss) == 0 ? 0 : (el.chatTime / (el.chatReceive + el.chatMiss));
                sumWaitTimeAvg += (el.chatReceive + el.chatMiss) == 0 ? 0 : (el.waitTime / (el.chatReceive + el.chatMiss));
            })
            let sumRows = [
                ('TỔNG'),
                sumChat,
                sumChatReceive,
                sumChatMiss,
                sumOffline,
                msToTime(sumChatTime),
                msToTime(sumChatTimeAvg),
                msToTime(sumWaitTimeAvg)
            ]

            if (data !== null) {
                _async.eachSeries(data, function (el, callback) {
                    sheet.addRow([
                        el.date,
                        el.count,
                        el.chatReceive,
                        el.chatMiss,
                        el.chatOffline,
                        msToTime(el.chatTime),
                        (el.chatReceive + el.chatMiss) == 0 ? '00:00:00' : msToTime(el.chatTime / (el.chatReceive + el.chatMiss)),
                        (el.chatReceive + el.chatMiss) == 0 ? '00:00:00' : msToTime(el.waitTime / (el.chatReceive + el.chatMiss)),
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
                sheet.lastRow.getCell('A').border = {
                    top: { style: "thin", color: { argb: 'F33535' } },
                    left: { style: "thin", color: { argb: 'F33535' } },
                    bottom: { style: "thin", color: { argb: 'F33535' } },
                    right: { style: "thin", color: { argb: 'F33535' } }
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
        // console.log('dfdfdf', err, JSON.stringify(data[data.length - 1]._id));
        callback(err, { objectId: data[data.length - 1] ? data[data.length - 1]._id : null, _folderName: folderName });
    });
};

function setWeightColumn(worksheet) {
    let valueWidthColumn = [
        15, 25, 20, 20, 20, 20, 30, 30, 10
    ]
    _.each(valueWidthColumn, function (item, j) {
        worksheet.getColumn(++j).width = item;
    })

}

function bindAggs(req, res) {

    let matchQuery = {};
    let startDay, endDay;
    // if (_.has(req.query, 'created') && req.query.created) {
    //     var _d1 = _moment(req.query.created.split(' - ')[0], 'MM/YYYY');
    //     var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'MM/YYYY') : _moment(_d1).endOf('month');

    //     var startMonth = (_d1._d < _d2._d) ? _d1 : _d2;
    //     var endMonth = (_d1._d < _d2._d) ? _d2 : _d1;
    //     startMonth = startMonth.startOf('month')._d;
    //     endMonth = endMonth.endOf('month')._d;
    //     matchQuery.createDate = {
    //         $gte: startMonth, $lt: endMonth
    //     }
    // }

    if (_.has(req.query, 'created') && req.query.created) {
        let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day').add(7, 'hours')._d;
        endDay = endDay.endOf('day').add(7, 'hours')._d;
        matchQuery.createDate = {
            $gte: startDay, $lt: endDay
        }
    }
    if (_.has(req.query, 'agent') && req.query.agent) {
        matchQuery['idAgent'] = { $in: _.arrayObjectId(req.query.agent) }
    }
    if (_.has(req.query, 'reasonCategories') && req.query.reasonCategories) {
        matchQuery['reasonCategory'] = { $in: _.arrayObjectId(req.query.reasonCategories) }
    }
    if (_.has(req.query, 'ticketreasons') && req.query.ticketreasons) {
        matchQuery['reason'] = { $in: _.arrayObjectId(req.query.ticketreasons) }
    }
    if (_.has(req.query, 'channel') && req.query.channel) {
        matchQuery['channelId'] = { $in: _.arrayObjectId(req.query.channel) }
    }
    if (_.has(req.query, 'status') && req.query.status) {
        let listStatus = req.query.status.map(function (el) {
            return +el
        })
        matchQuery['status'] = { $in: listStatus }
    }


    let aggs = [
        { $match: { createDate: { $ne: null }, activityStatus: 9000 } },
        {
            $lookup: {
                from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticketChat"
            }
        },
        { $unwind: { path: '$ticketChat', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                date: {
                    $cond: [
                        { $ifNull: ['$createDate', false] },
                        {

                            $concat: [
                                { $concat: [{ $cond: [{ $lt: [{ $dayOfMonth: "$createDate" }, 10] }, '0', ''] }, { $substr: [{ $dayOfMonth: "$createDate" }, 0, 2] }] },
                                '/',
                                { $concat: [{ $cond: [{ $lt: [{ $month: "$createDate" }, 10] }, '0', ''] }, { $substr: [{ $month: "$createDate" }, 0, 2] }] },
                                '/',
                                { $substr: [{ $year: "$createDate" }, 0, 4] }
                            ]
                        },
                        null


                    ]
                },
                // agentResponseCount: 1,
                customerMessageCount: 1,
                chatStatus: 1,
                createDate: 1,
                // createDate: { $add : ['$createDate', 25200000 ] },
                eventDateGMT: 1,
                // chatTime: {
                //     $cond: [{
                //         $or: [
                //             { $or: [{ $gt: ['$customerMessageCount', 0] }, { $and: [{ $eq: ['$customerMessageCount', 0] }, { $eq: ['$chatStatus', 4] }] }] },
                //             { $and: [{ $eq: ['$customerMessageCount', 0] }, { $eq: ['$chatStatus', 1] }] }
                //         ]
                //     }, { $subtract: ['$whenModified', '$createDate'] }, 0]
                // },
                chatTime: {
                    $cond: [
                        {
                            $and: [
                                { $and: [{ $eq: ['$customerMessageCount', null] }, { $eq: ['$chatStatus', 6] }] }
                            ]
                        },
                        0,
                        { $subtract: ['$whenModified', '$createDate'] }
                    ]
                },
                waitTime: {
                    // $cond: [{
                    //     $or: [
                    //         { $or: [{ $gt: ['$customerMessageCount', 0] }, { $and: [{ $eq: ['$customerMessageCount', 0] }, { $eq: ['$chatStatus', 4] }] }] },
                    //         { $and: [{ $eq: ['$customerMessageCount', 0] }, { $eq: ['$chatStatus', 1] }] }
                    //     ]
                    // }, { $cond: [{ $ne: ["$agentAnswerMessageFirstTime", ""] }, { $add: [{ $subtract: ['$agentAnswerMessageFirstTime', '$createDate'] }, 25200000] }, 0] }, 0]
                    $cond: [
                        { $ne: ["$agentAnswerMessageFirstTime", ""] },
                        { $add: [{ $subtract: ['$agentAnswerMessageFirstTime', '$createDate'] }, 25200000] },
                        { $add: [{ $subtract: ['$whenModified', '$createDate'] }] }
                    ]
                },
                idAgent: "$ticketChat.idAgent",
                reasonCategory: "$ticketChat.ticketReasonCategory",
                reason: "$ticketChat.ticketReason",
                status: "$ticketChat.status",
                channelId: 1,
                messagesChat: 1
            }
        },
        {
            $match: matchQuery
        },
        {
            $group: {
                _id: "$date",
                count: { $sum: 1 },
                chatReceive: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                    {
                                        $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                    }
                                ]
                            }
                            , 1, 0
                        ]
                    }
                },
                chatMiss: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                    {
                                        $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                    }
                                ]
                            }, 1, 0]
                    }
                },
                chatOffline: { $sum: { $cond: [{ $and: [{ $eq: ['$customerMessageCount', null] }, { $eq: ['$chatStatus', 6] }] }, 1, 0] } },
                chatTime: { $sum: "$chatTime" },
                waitTime: { $sum: "$waitTime" },
                date: { $last: "$date" },
                createDate: { $last: "$createDate" },
            }
        },
        {
            $sort: { createDate: 1 }
        }
    ];

    return {
        aggs,
        startDay,
        endDay
    };
}