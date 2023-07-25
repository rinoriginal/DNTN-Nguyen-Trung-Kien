//author : haivh - 12/18/2020
const { columnToLetter } = require(path.join(_rootPath, 'helpers', 'functions', 'handle.string.js'));
var { hmsToNumber, hms } = require(path.join(
    _rootPath,
    "helpers",
    "functions",
    "handle.dateTime.js"
));
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

let title = 'Báo cáo thống kê hội thoại chat theo tháng';
let titleHeadTable = [
    { key: 'date', value: 'Tháng' },
    { key: 'type', value: 'SL hội thoại chat' },
    { key: 'code', value: 'Hội thoại tiếp nhận' },
    { key: 'idCustomer', value: 'Hội thoại nhỡ' },
    { key: 'field_so_dien_thoai', value: 'Offline' },
    { key: 'field_ho_ten', value: 'TL hội thoại' },
    { key: 'notes', value: 'TL hội thoại trung bình' },
    { key: 'value', value: 'TG chờ trung bình' }
]
exports.index = {
    json: function (req, res) {

        let { scope } = req.query;

        switch (scope) {
            case 'searchReason':
                _TicketReasonCategory.aggregate([{
                    $match: { _id: { $in: _.arrayObjectId(req.query.category) } }
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
                ], function (err, result) {
                    res.json({
                        code: err ? 500 : 200,
                        data: result
                    });
                })
                break;

            default:
                if (_.has(req.query, 'isDownload')) {
                    exportExcel(req, res);
                }
                else {
                    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
                    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
                    var { aggs } = bindAggs(req, res)

                    _async.parallel({
                        // aggregate all để tính tổng toàn bộ các bản ghi
                        sum: function (next) {
                            let matchQuery = {};
                            if (_.has(req.query, 'created') && req.query.created) {
                                var _d1 = _moment(req.query.created.split(' - ')[0], 'MM/YYYY');
                                var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'MM/YYYY') : _moment().endOf('month');

                                var startMonth = (_d1._d < _d2._d) ? _d1 : _d2;
                                var endMonth = (_d1._d < _d2._d) ? _d2 : _d1;
                                startMonth = startMonth.startOf('month')._d;
                                endMonth = endMonth.endOf('month')._d;
                                matchQuery.createDate = {
                                    $gte: startMonth, $lt: endMonth
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

                            _ChatThread.aggregate([
                                { $match: { createDate: { $ne: null } } },
                                {
                                    $lookup: {
                                        from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticketChat"
                                    }
                                },
                                { $unwind: { path: '$ticketChat', preserveNullAndEmptyArrays: true } },
                                {
                                    $project: {
                                        month: {
                                            $cond: [
                                                { $ifNull: ['$createDate', false] },
                                                {

                                                    $concat: [
                                                        { $concat: [{ $cond: [{ $lt: [{ $month: "$createDate" }, 10] }, '0', ''] }, { $substr: [{ $month: "$createDate" }, 0, 2] }] },
                                                        '/',
                                                        { $substr: [{ $year: "$createDate" }, 0, 4] }
                                                    ]
                                                },
                                                null


                                            ]
                                        },
                                        customerMessageCount: 1,
                                        createDate: 1,
                                        chatStatus: 1,
                                        whenModified: 1,
                                        timeWait: {
                                            $cond: [
                                                {

                                                    $and: [
                                                        { $eq: ['$customerMessageCount', null] },
                                                        { $eq: ['$chatStatus', 6] }
                                                    ]

                                                },

                                                0,
                                                {
                                                    $cond: [
                                                        {
                                                            $and: [

                                                                { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                                                {
                                                                    $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                                                }
                                                            ]
                                                        },
                                                        { $subtract: ['$whenModified', '$createDate'] },
                                                        {
                                                            $cond: [
                                                                { $eq: ['$agentAnswerMessageFirstTime', ""] },
                                                                0,
                                                                { $subtract: [{ $add: ['$agentAnswerMessageFirstTime', 7 * 60 * 60000] }, '$createDate'] }
                                                            ]
                                                        }

                                                    ]
                                                }

                                            ]
                                        },
                                        timeConver:
                                        {
                                            $cond: [
                                                {
                                                    $and: [
                                                        { $ne: ['$customerMessageCount', null] },
                                                        { $ne: ['$chatStatus', 6] }
                                                    ]
                                                },
                                                {
                                                    $subtract: ['$whenModified', '$createDate']
                                                }, 0
                                            ]
                                        }
                                        ,
                                        converMiss:
                                        {
                                            $cond:
                                                [
                                                    {
                                                        $and: [
                                                            { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                                            {
                                                                $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                                            }
                                                        ]
                                                    }
                                                    ,
                                                    1, 0]
                                        },
                                        converOffline:
                                        {
                                            $cond:
                                                [
                                                    {
                                                        $and: [
                                                            { $eq: ['$customerMessageCount', null] },
                                                            { $eq: ['$chatStatus', 6] }
                                                        ]
                                                    },
                                                    1, 0]
                                        },
                                        converReceive:
                                        {
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
                                        _id: "$month",
                                        count: { $sum: 1 },
                                        month: { $last: "$month" },
                                        timeConver: { $push: "$timeConver" },
                                        timeWait: { $push: "$timeWait" },
                                        converMiss: { $push: "$converMiss" },
                                        converOffline: { $push: "$converOffline" },
                                        converReceive: { $push: "$converReceive" }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        count: 1,
                                        month: 1,
                                        timeConver: {
                                            $reduce: {
                                                input: '$timeConver',
                                                initialValue: 0,
                                                in: { $add: ["$$value", "$$this"] }
                                            }

                                        },
                                        timeWait: {
                                            $reduce: {
                                                input: '$timeWait',
                                                initialValue: 0,
                                                in: { $add: ["$$value", "$$this"] }
                                            }

                                        },
                                        converMiss: 1,
                                        converOffline: 1,
                                        converReceive: 1
                                    }
                                },
                                {
                                    $sort: { _id: 1 }
                                }
                            ]).exec(next)
                        }
                    }, function (err, rs) {
                        _ChatThread.aggregatePaginate(_ChatThread.aggregate(aggs), { page: page, limit: rows }, function (error, result, pageCount, count) {
                            var paginator = new pagination.SearchPaginator({
                                prelink: '/report-statistical-conversation-by-month',
                                current: page,
                                rowsPerPage: rows,
                                totalResult: count
                            });

                            res.json({
                                code: error ? 500 : 200,
                                data: result,
                                sum: rs.sum,
                                paging: paginator.getPaginationData()
                            });
                        })
                    })
                    break;
                }

        }
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
            },

        }, function (err, result) {
            let channel = result.channel
            let Agent = result.agent
            let reasonCategories = result.reasonCategories
            let ticketreasons = result.ticketreasons

            _.render(req, res, 'report-statistical-conversation-by-month', {
                channel: channel,
                Agent: Agent,
                reasonCategories: reasonCategories,
                ticketreasons: ticketreasons,
                title: 'Báo cáo thống kê hội thoại chat theo tháng ',
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], 'export-excel', ['chosen'], ['ApexCharts'], ['numeral']]
            }, true, err);
        })


    }
};
function bindAggs(req, res) {

    let matchQuery = {};
    let startDay, endDay;

    if (_.has(req.query, 'created') && req.query.created) {
        var _d1 = _moment(req.query.created.split(' - ')[0], 'MM/YYYY');
        var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'MM/YYYY') : _moment().endOf('month');

        startMonth = (_d1._d < _d2._d) ? _d1 : _d2;
        endMonth = (_d1._d < _d2._d) ? _d2 : _d1;
        startMonth = startMonth.startOf('month')._d;
        endMonth = endMonth.endOf('month')._d;
        matchQuery.createDate = {
            $gte: startMonth, $lt: endMonth
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
        { $match: { createDate: { $ne: null } } },
        {
            $lookup: {
                from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticketChat"
            }
        },
        { $unwind: { path: '$ticketChat', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                month: {
                    $cond: [
                        { $ifNull: ['$createDate', false] },
                        {

                            $concat: [
                                { $concat: [{ $cond: [{ $lt: [{ $month: "$createDate" }, 10] }, '0', ''] }, { $substr: [{ $month: "$createDate" }, 0, 2] }] },
                                '/',
                                { $substr: [{ $year: "$createDate" }, 0, 4] }
                            ]
                        },
                        null


                    ]
                },
                customerMessageCount: 1,
                createDate: 1,
                chatStatus: 1,
                whenModified: 1,
                timeWait: {
                    $cond: [
                        {

                            $and: [
                                { $eq: ['$customerMessageCount', null] },
                                { $eq: ['$chatStatus', 6] }
                            ]

                        },

                        0,
                        {
                            $cond: [
                                {
                                    $and: [

                                        { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                        {
                                            $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                        }
                                    ]
                                },
                                { $subtract: ['$whenModified', '$createDate'] },
                                {
                                    $cond: [
                                        { $eq: ['$agentAnswerMessageFirstTime', ""] },
                                        0,
                                        { $subtract: [{ $add: ['$agentAnswerMessageFirstTime', 7 * 60 * 60000] }, '$createDate'] }
                                    ]
                                }

                            ]
                        }

                    ]
                },
                timeConver:
                {
                    $cond: [
                        {
                            $and: [
                                { $ne: ['$customerMessageCount', null] },
                                { $ne: ['$chatStatus', 6] }
                            ]
                        },
                        {
                            $subtract: ['$whenModified', '$createDate']
                        }, 0
                    ]
                }
                ,
                converMiss:
                {
                    $cond:
                        [
                            {
                                $and: [
                                    { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                    {
                                        $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                    }
                                ]
                            }
                            ,
                            1, 0]
                },
                converOffline:
                {
                    $cond:
                        [
                            {
                                $and: [
                                    { $eq: ['$customerMessageCount', null] },
                                    { $eq: ['$chatStatus', 6] }
                                ]
                            },
                            1, 0]
                },
                converReceive:
                {
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
                _id: "$month",
                count: { $sum: 1 },
                month: { $last: "$month" },
                timeConver: { $push: "$timeConver" },
                timeWait: { $push: "$timeWait" },
                converMiss: { $push: "$converMiss" },
                converOffline: { $push: "$converOffline" },
                converReceive: { $push: "$converReceive" }
            }
        },
        {
            $project: {
                _id: 1,
                count: 1,
                month: 1,
                timeConver: {
                    $reduce: {
                        input: '$timeConver',
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this"] }
                    }

                },
                timeWait: {
                    $reduce: {
                        input: '$timeWait',
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this"] }
                    }

                },
                converMiss: 1,
                converOffline: 1,
                converReceive: 1
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
function exportExcel(req, res) {
    var limitIndex = 300;
    var sumSheet = Math.ceil(req.query.totalResult / limitIndex);
    var waterFallTask = [];

    var { aggs, startDay, endDay } = bindAggs(req, res);
    waterFallTask.push(function (next) {
        aggs.push({ $skip: 0 });
        aggs.push({ $limit: limitIndex });

        var workbook = new _Excel.Workbook();
        workbook.creator = req.session.user.displayName;
        workbook.created = new Date();

        next(null, workbook, aggs, 1)
    });

    for (var i = 1; i <= sumSheet; i++) {


        waterFallTask.push(function (workbook, aggs, indexSheet, next) {

            _ChatThread.aggregate(aggs, function (error, result) {

                var sheet = workbook.addWorksheet('sheet' + indexSheet, { state: 'visible' });

                if (!startDay && !endDay && result.length > 0) {
                    startDay = moment(result[0].createDate)
                    endDay = moment(result[result.length - 1].createDate)
                } else {

                    startDay = moment(startDay).startOf('day');
                    endDay = moment(endDay).endOf('day');
                }
                startDay = startDay.format('MM/YYYY');
                endDay = endDay.format('MM/YYYY');

                // createTitleExcel(sheet, title, req.query.created);
                headerReport(startDay, endDay, title, sheet, { month: true });
                createHead(sheet);
                customView(sheet, result.length);
                for (let i = 0; i < result.length; i++) {

                    let converOffline = result[i].converOffline ? _.compact(result[i].converOffline).length : 0
                    let converMiss = result[i].converMiss ? _.compact(result[i].converMiss).length : 0
                    let converReceive = result[i].converReceive ? _.compact(result[i].converReceive).length : 0

                    let timeConvertAvg = result[i].timeConver / (converMiss + converReceive)

                    let timeWaitAvg = result[i].timeWait / (converMiss + converReceive)

                    sheet.addRow([
                        result[i].month ? result[i].month : '',
                        converOffline + converMiss + converReceive,
                        converReceive,
                        converMiss,
                        converOffline,
                        hms(result[i].timeConver),
                        hms(timeConvertAvg),
                        hms(timeWaitAvg)


                    ]);
                    // hiển thị dòng
                    for (let i = 1; i <= titleHeadTable.length; i++) {
                        let charNameColumn = columnToLetter(i);

                        sheet.lastRow.getCell(charNameColumn).border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" }
                        }
                        sheet.lastRow.getCell(charNameColumn).font = {
                            name: EXCEL_CONFIG.fontName,
                            family: 4,
                            size: EXCEL_CONFIG.fontSizeTableHeader
                        };
                        sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                        // if (charNameColumn != 'G') {
                        //     sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                        // }
                    }

                    // hiển thị cột
                    if (i == result.length - 1) {
                        var row = sheet.lastRow;
                        sheet.addRow([]);

                        sheet.addRow([('TỔNG'), req.query.countConverChat, req.query.sumConverReceive, req.query.sumConverMiss, req.query.sumOffline, hms(req.query.timeConver), hms(req.query.timeConverAvg), hms(req.query.timeWaitAvg)]);
                        for (let i = 1; i <= titleHeadTable.length; i++) {
                            let charNameColumn = columnToLetter(i);

                            sheet.lastRow.getCell(charNameColumn).border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            }
                            sheet.lastRow.getCell(charNameColumn).font = {
                                name: EXCEL_CONFIG.fontName,
                                family: 4,
                                size: 12,
                            };
                            sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };

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
                                bold: true,
                                color: { argb: 'FFFFFF' }
                            };
                            sheet.lastRow.getCell('A').border = {
                                top: { style: "thin", color: { argb: 'F33535' } },
                                left: { style: "thin", color: { argb: 'F33535' } },
                                bottom: { style: "thin", color: { argb: 'F33535' } },
                                right: { style: "thin", color: { argb: 'F33535' } }
                            }
                        }

                    }

                }

                aggs.pop();
                aggs.pop();
                aggs.push({ $skip: (indexSheet * limitIndex) });
                aggs.push({ $limit: limitIndex });

                indexSheet = indexSheet + 1;
                next(null, workbook, aggs, indexSheet);
            })
        });
    }

    waterFallTask.push(
        function (workbook, aggs, indexSheet, next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'report-statistical-conversation-by-month'), function (error, result) {
                next(error, workbook);
            });
        },
        function (workbook, next) {
            var currentDate = new Date();
            var fileName = path.join(_rootPath, 'assets', 'export', 'report-statistical-conversation-by-month', 'BaoCaoThongKeHoiThoaiChatTheoThang_' + currentDate.getTime() + '.xlsx');
            workbook.xlsx.writeFile(fileName).then(function (error, result) {
                next(error, path.join('assets', 'export', 'report-statistical-conversation-by-month', 'BaoCaoThongKeHoiThoaiChatTheoThang_' + currentDate.getTime() + '.xlsx'));
            });
        }
    );

    _async.waterfall(waterFallTask, function (error, result) {
        res.json({ code: error ? 500 : 200, data: '/' + result });
    });


}

function createTitleExcel(worksheet, title, month) {
    worksheet.addRow(['']);
    worksheet.addRow(['BELLSYSTEM 24 -  HOA SAO',
        '', '', '', '', '',
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 13, bold: true };
    worksheet.mergeCells('A2:C2');
    worksheet.mergeCells('G2:J2');

    worksheet.addRow(['TELEHUB T1',
        '', '', '', '', '',
        'Độc lập - Tự do - Hạnh phúc']);
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 13, bold: false };
    worksheet.mergeCells('A3:C3');
    worksheet.mergeCells('G3:J3');

    worksheet.addRow(['']);
    worksheet.addRow(['']);
    worksheet.getCell('C6').value = title;
    worksheet.getCell('C6').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 16, underline: 'true', bold: true };
    worksheet.getCell('C6').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('C6:F6');

    if (month) {
        var startMonth = month.split(' - ')[0]
        var endMonth = month.split(' - ')[1] ? month.split(' - ')[1] : _moment().format('MM/YYYY');

        var str = 'Thời gian: Từ tháng: ';
        str += startMonth + '- Đến tháng : ' + endMonth;
        worksheet.getCell('C7').value = str;
    }
    else {
        worksheet.getCell('C7').value = 'Thời gian : Từ tháng .............. - Đến tháng .................';
    }
    worksheet.getCell('C7').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, underline: 'true' };
    worksheet.getCell('C7').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('C7:F7');

    worksheet.addRow([]);
    worksheet.addRow([]);
}
function customView(worksheet, countRow) {

    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = columnToLetter(i);
        // worksheet.lastRow.getCell(charNameColumn).border = {
        //     top: { style: "thin" },
        //     left: { style: "thin" },
        //     bottom: { style: "thin" },
        //     right: { style: "thin" }
        // }
        worksheet.lastRow.getCell(charNameColumn).font = {
            name: EXCEL_CONFIG.fontName,
            family: 4,
            size: EXCEL_CONFIG.fontSizeTableHeader,
            bold: true,
            color: { argb: 'FFFFFF' }
        };
        worksheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
    }

}


function createHead(worksheet) {
    //Header 01
    worksheet.addRow(_.pluck(titleHeadTable, 'value'));
    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = _.columnToLetter(i);
        // worksheet.lastRow.getCell(charNameColumn).border = {
        //     top: { style: "thin" },
        //     left: { style: "thin" },
        //     bottom: { style: "thin" },
        //     right: { style: "thin" }
        // }

        worksheet.lastRow.getCell(charNameColumn).fill = {
            type: 'gradient',
            gradient: 'path',
            center: { left: 0.5, top: 0.5 },
            stops: [
                { position: 0, color: { argb: EXCEL_CONFIG.colorTableHeader } },
                { position: 1, color: { argb: EXCEL_CONFIG.colorTableHeader } }
            ]
        };
        worksheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
    }



    var dobCol1 = worksheet.getColumn(1);
    dobCol1.width = 20;
    var dobCol2 = worksheet.getColumn(2);
    dobCol2.width = 23;
    var dobCol3 = worksheet.getColumn(3);
    dobCol3.width = 23;
    var dobCol4 = worksheet.getColumn(4);
    dobCol4.width = 23;
    var dobCol5 = worksheet.getColumn(5);
    dobCol5.width = 20;
    var dobCol6 = worksheet.getColumn(6);
    dobCol6.width = 25;
    var dobCol7 = worksheet.getColumn(7);
    dobCol7.width = 30;
    var dobCol8 = worksheet.getColumn(8);
    dobCol8.width = 25;

    //row
    var row = worksheet.getRow(10);
    row.height = 23;
}

