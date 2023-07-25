//author : haivh - 12/18/2020
const { columnToLetter } = require(path.join(_rootPath, 'helpers', 'functions', 'handle.string.js'));
var { hmsToNumber, hms } = require(path.join(
    _rootPath,
    "helpers",
    "functions",
    "handle.dateTime.js"
));
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

let title = 'BÁO CÁO THỐNG KÊ MAIL THEO TUẦN';
let titleHeadTable = [
    { key: 'date', value: 'STT' },
    { key: 'week', value: 'Tuần' },
    { key: 'type', value: 'Nguồn mail' },
    { key: 'code', value: 'Tổng số luồng mail' },
    { key: 'idCustomer', value: 'Tổng số mail' },
    { key: 'field_so_dien_thoai', value: 'Chưa hoàn thành' },
    { key: 'field_ho_ten', value: 'Hoàn thành' }
]
exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'isDownload')) {
            exportExcel(req, res);
        }
        else {
            var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
            var aggs = bindAggs(req, res)

            _async.parallel({
                // aggregate all để tính tổng toàn bộ các bản ghi
                sum: function (next) {
                    let matchQuery = {};
                    if (_.has(req.query, 'status') && req.query.status) {
                        if (_.indexOf(req.query.status, '1') != -1 && _.indexOf(req.query.status, '2') != -1) {
                            // matchQuery = {}
                            matchQuery['$or'] = [
                                { 'ticket.status': 0 },
                                { 'ticket.status': 1 },
                                { 'ticket.status': 2 },
                                { 'ticket.status': null }
                            ]
                        }
                        else if (_.indexOf(req.query.status, '1') != -1) {
                            // matchQuery['ticket.status'] = { $ne: 2 }
                            matchQuery['ticket.status'] = { $ne: 2 }
                        }

                        else {
                            matchQuery['ticket.status'] = { $eq: 2 }
                        }
                    }
                    if (_.has(req.query, 'created') && req.query.created) {
                        var _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
                        var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment().endOf('day');

                        var startDay = (_d1._d < _d2._d) ? _d1 : _d2;
                        var endDay = (_d1._d < _d2._d) ? _d2 : _d1;
                        startDay = startDay.startOf('day')._d;
                        endDay = endDay.endOf('day')._d;

                        matchQuery['ticket.created'] = {
                            $gte: startDay, $lt: endDay
                        }
                    }
                    if (_.has(req.query, 'source') && req.query.source) {
                        matchQuery['_id'] = { $in: _.arrayObjectId(req.query.source) }
                    }


                    _MailInboundSource.aggregate([
                        {
                            $lookup: {
                                from: "ticketmails", localField: "idMailCisco", foreignField: "aliasId", as: "ticket"
                            }
                        },
                        { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "mailinbounds", localField: "ticket.caseId", foreignField: "caseId", as: "ticket.threads"
                            }
                        },
                        {
                            $match: {
                                'ticket.typeMail': 1
                            }
                        },
                        {
                            $match: matchQuery
                        },
                        {
                            $project: {
                                _id: 1,
                                ticket: 1,
                                name: 1,
                                week: {
                                    $cond: [
                                        { $ifNull: ['$ticket.created', false] },
                                        {

                                            $concat: [
                                                {
                                                    $concat: ['T', { $cond: [{ $lt: [{ $week: "$ticket.created" }, 10] }, '0', ''] },
                                                        {
                                                            $convert: {
                                                                input: {
                                                                    $add: [
                                                                        { $convert: { input: { $substr: [{ $week: "$ticket.created" }, 0, 2] }, to: "int" } },
                                                                        1
                                                                    ]
                                                                }, to: "string"
                                                            }
                                                        }

                                                    ]
                                                },
                                                ' - ',
                                                { $substr: [{ $year: "$ticket.created" }, 0, 4] }
                                            ]
                                        },
                                        null


                                    ]
                                },
                                threadMail: { $size: "$ticket.threads" },
                                done: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ifNull: ["$ticket.status", false] },
                                                { $eq: ["$ticket.status", 2] }
                                            ]
                                        },
                                        true,
                                        false
                                    ]

                                },
                                unDone: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $ne: ["$ticket.status", 2] },
                                                {
                                                    $or: [
                                                        { $eq: ["$ticket.status", 0] },
                                                        { $eq: ["$ticket.status", 1] },
                                                        { $ifNull: ["$ticket.status", true] }
                                                    ]
                                                }

                                            ]
                                        },
                                        true,
                                        false
                                    ]
                                }
                            }
                        },

                        {
                            $group: {
                                _id: {
                                    idSource: "$_id",
                                    week: "$week"
                                },
                                week: { $last: "$week" },
                                threadMail: { $push: "$threadMail" },
                                done: { $push: "$done" },
                                unDone: { $push: "$unDone" },
                                ticket: { $push: "$ticket" },
                                name: { $last: "$name" },
                                minTime: { $min: '$ticket.created' }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                week: 1,
                                threadMail: 1,
                                done: {
                                    $filter: {
                                        input: "$done",
                                        as: "item",
                                        cond: {
                                            $eq: ["$$item", true]
                                        }
                                    }
                                },
                                unDone: {
                                    $filter: {
                                        input: "$unDone",
                                        as: "item",
                                        cond: {
                                            $eq: ["$$item", true]
                                        }
                                    }
                                },
                                ticket: 1,
                                name: 1,
                                minTime: 1


                            }
                        },

                        {
                            $group: {
                                _id: "$week",
                                source: {
                                    $push:
                                    {
                                        name: '$name',
                                        ticket: "$ticket",
                                        done: "$done",
                                        unDone: "$unDone",
                                        threadMail: "$threadMail"
                                    }
                                },
                                minTime: { $min: "$minTime" }
                            }
                        },
                        { $sort: { minTime: 1 } }
                    ]).exec(next)
                }
            }, function (err, rs) {
                _MailInboundSource.aggregatePaginate(_MailInboundSource.aggregate(aggs), { page: page, limit: rows }, function (error, result, pageCount, count) {
                    var paginator = new pagination.SearchPaginator({
                        prelink: '/report-statistical-mail-by-week',
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
        }
    },
    html: function (req, res) {
        _async.parallel({
            source: function (next) {
                _MailInboundSource.find({}, next)
            },
            reasonCategories: function (next) {// nhóm tình trạng
                _TicketReasonCategory.find({ status: 1, category: 4 }, next)
            },
            ticketreasons: function (next) { // tình trạng hiện tại
                _TicketReason.find({ status: 1 }, next)
            },

        }, function (err, result) {
            let Source = result.source
            let reasonCategories = result.reasonCategories
            let ticketreasons = result.ticketreasons

            _.render(req, res, 'report-statistical-mail-by-week', {
                Source: Source,
                reasonCategories: reasonCategories,
                ticketreasons: ticketreasons,
                title: 'Báo cáo thống kê mail theo tuần ',
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], 'export-excel', ['chosen'], ['ApexCharts'], ['numeral']]
            }, true, err);
        })


    }
};
function bindAggs(req, res) {

    let matchQuery = {};
    if (_.has(req.query, 'status') && req.query.status) {
        if (_.indexOf(req.query.status, '1') != -1 && _.indexOf(req.query.status, '2') != -1) {
            // matchQuery = {}
            matchQuery['$or'] = [
                { 'ticket.status': 0 },
                { 'ticket.status': 1 },
                { 'ticket.status': 2 },
                { 'ticket.status': null }
            ]
        }
        else if (_.indexOf(req.query.status, '1') != -1) {
            // matchQuery['ticket.status'] = { $ne: 2 }
            matchQuery['ticket.status'] = { $ne: 2 }
        }

        else {
            matchQuery['ticket.status'] = { $eq: 2 }
        }
    }
    if (_.has(req.query, 'created') && req.query.created) {
        var _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
        var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment().endOf('day');

        var startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        var endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;

        matchQuery['ticket.created'] = {
            $gte: startDay, $lt: endDay
        }
    }
    if (_.has(req.query, 'source') && req.query.source) {
        matchQuery['_id'] = { $in: _.arrayObjectId(req.query.source) }
    }


    let aggs = [
        {
            $lookup: {
                from: "ticketmails", localField: "idMailCisco", foreignField: "aliasId", as: "ticket"
            }
        },
        { $unwind: { path: '$ticket', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "mailinbounds", localField: "ticket.caseId", foreignField: "caseId", as: "ticket.threads"
            }
        },
        {
            $match: {
                'ticket.typeMail': 1
            }
        },
        {
            $match: matchQuery
        },
        {
            $project: {
                _id: 1,
                ticket: 1,
                name: 1,
                week: {
                    $cond: [
                        { $ifNull: ['$ticket.created', false] },
                        {

                            $concat: [
                                {
                                    $concat: ['T', { $cond: [{ $lt: [{ $week: "$ticket.created" }, 10] }, '0', ''] },
                                        {
                                            $convert: {
                                                input: {
                                                    $add: [
                                                        { $convert: { input: { $substr: [{ $week: "$ticket.created" }, 0, 2] }, to: "int" } },
                                                        1
                                                    ]
                                                }, to: "string"
                                            }
                                        }

                                    ]
                                },
                                ' - ',
                                { $substr: [{ $year: "$ticket.created" }, 0, 4] }
                            ]
                        },
                        null


                    ]
                },
                threadMail: { $size: "$ticket.threads" },
                done: {
                    $cond: [
                        {
                            $and: [
                                { $ifNull: ["$ticket.status", false] },
                                { $eq: ["$ticket.status", 2] }
                            ]
                        },
                        true,
                        false
                    ]

                },
                unDone: {
                    $cond: [
                        {
                            $and: [
                                { $ne: ["$ticket.status", 2] },
                                {
                                    $or: [
                                        { $eq: ["$ticket.status", 0] },
                                        { $eq: ["$ticket.status", 1] },
                                        { $ifNull: ["$ticket.status", true] }
                                    ]
                                }

                            ]
                        },
                        true,
                        false
                    ]
                }
            }
        },
        {
            $group: {
                _id: {
                    idSource: "$_id",
                    week: "$week"
                },
                week: { $last: "$week" },
                threadMail: { $push: "$threadMail" },
                done: { $push: "$done" },
                unDone: { $push: "$unDone" },
                ticket: { $push: "$ticket" },
                name: { $last: "$name" },
                minTime: { $min: '$ticket.created' }
            }
        },
        {
            $project: {
                _id: 1,
                week: 1,
                threadMail: 1,
                done: {
                    $filter: {
                        input: "$done",
                        as: "item",
                        cond: {
                            $eq: ["$$item", true]
                        }
                    }
                },
                unDone: {
                    $filter: {
                        input: "$unDone",
                        as: "item",
                        cond: {
                            $eq: ["$$item", true]
                        }
                    }
                },
                ticket: 1,
                name: 1,
                minTime: 1


            }
        },

        {
            $group: {
                _id: "$week",
                source: {
                    $push:
                    {
                        name: '$name',
                        ticket: "$ticket",
                        done: "$done",
                        unDone: "$unDone",
                        threadMail: "$threadMail"
                    }
                },
                minTime: { $min: "$minTime" }
            }
        },
        { $sort: { minTime: 1 } }
    ];

    return aggs;

}
function exportExcel(req, res) {
    var limitIndex = 300;
    var sumSheet = Math.ceil(req.query.totalResult / limitIndex);
    var waterFallTask = [];
    var startRowWeek = 11;

    var aggs = bindAggs(req, res);
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

            _MailInboundSource.aggregate(aggs, function (error, result) {

                var sheet = workbook.addWorksheet('sheet' + indexSheet, { state: 'visible' });

                createTitleExcel(sheet, title, req.query.created);
                createHead(sheet);
                customView(sheet, result.length);
                for (let i = 0; i < result.length; i++) {
                    for (let j = 0; j < result[i].source.length; j++) {
                        var countMail = 0
                        countMail += result[i].source[j].threadMail.reduce((a, b) => a + b, 0)
                        sheet.addRow([
                            (i + 1),
                            result[i]._id ? result[i]._id : '',
                            result[i].source[j].name ? result[i].source[j].name : '',
                            result[i].source[j].ticket ? result[i].source[j].ticket.length : 0,
                            countMail ? countMail : 0,
                            result[i].source[j].unDone ? result[i].source[j].unDone.length : 0,
                            result[i].source[j].done ? result[i].source[j].done.length : 0,
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
                                size: 10
                            };
                            sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                            // if (charNameColumn != 'G') {
                            //     sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                            // }
                        }
                    }
                    let endRowWeek = startRowWeek + (result[i].source.length - 1)
                    for (let i = 1; i <= 7; i++) {
                        if (i == 1 || i == 2) {
                            let mergeRow = columnToLetter(i) + startRowWeek + ':' + columnToLetter(i) + endRowWeek;
                            sheet.mergeCells(mergeRow);
                        }
                    }
                    startRowWeek += result[i].source.length;



                    // hiển thị cột
                    if (i == result.length - 1) {

                        sheet.addRow([''])
                        sheet.addRow([('TỔNG LUỒNG MAIL'), (''), req.query.sumSource]);
                        for (let i = 1; i <= 3; i++) {
                            let charNameColumn = columnToLetter(i);

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
                                size: 10,
                                bold: true,
                                color: { argb: 'FFFFFF' }
                            };
                            sheet.lastRow.getCell('A').alignment = { vertical: 'middle' };

                            sheet.lastRow.getCell('C').border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            }
                            sheet.lastRow.getCell('C').font = {
                                name: EXCEL_CONFIG.fontName,
                                family: 4,
                                size: 10,
                            };
                            sheet.lastRow.getCell('C').alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                        var row = sheet.lastRow;
                        sheet.mergeCells(`A${row._number}:B${row._number}`);
                        sheet.getRow(row._number).height = 20;

                        sheet.addRow([''])
                        sheet.addRow([('TỔNG MAIL'), (''), req.query.sumMail]);
                        for (let i = 1; i <= 3; i++) {
                            let charNameColumn = columnToLetter(i);

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
                                size: 10,
                                bold: true,
                                color: { argb: 'FFFFFF' }
                            };
                            sheet.lastRow.getCell('A').alignment = { vertical: 'middle' };

                            sheet.lastRow.getCell('C').border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            }
                            sheet.lastRow.getCell('C').font = {
                                name: EXCEL_CONFIG.fontName,
                                family: 4,
                                size: 10,
                            };
                            sheet.lastRow.getCell('C').alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                        var row = sheet.lastRow;
                        sheet.mergeCells(`A${row._number}:B${row._number}`);
                        sheet.getRow(row._number).height = 20;

                        sheet.addRow([''])
                        sheet.addRow([('HOÀN THÀNH'), (''), req.query.sumDone]);
                        for (let i = 1; i <= 3; i++) {
                            let charNameColumn = columnToLetter(i);

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
                                size: 10,
                                bold: true,
                                color: { argb: 'FFFFFF' }
                            };
                            sheet.lastRow.getCell('A').alignment = { vertical: 'middle' };

                            sheet.lastRow.getCell('C').border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            }
                            sheet.lastRow.getCell('C').font = {
                                name: EXCEL_CONFIG.fontName,
                                family: 4,
                                size: 10,
                            };
                            sheet.lastRow.getCell('C').alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                        var row = sheet.lastRow;
                        sheet.mergeCells(`A${row._number}:B${row._number}`);
                        sheet.getRow(row._number).height = 20;

                        sheet.addRow([''])
                        sheet.addRow([('CHƯA HOÀN THÀNH'), (''), req.query.sumUnDone]);
                        for (let i = 1; i <= 3; i++) {
                            let charNameColumn = columnToLetter(i);

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
                                size: 10,
                                bold: true,
                                color: { argb: 'FFFFFF' }
                            };
                            sheet.lastRow.getCell('A').alignment = { vertical: 'middle' };

                            sheet.lastRow.getCell('C').border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            }
                            sheet.lastRow.getCell('C').font = {
                                name: EXCEL_CONFIG.fontName,
                                family: 4,
                                size: 10,
                            };
                            sheet.lastRow.getCell('C').alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                        var row = sheet.lastRow;
                        sheet.mergeCells(`A${row._number}:B${row._number}`);
                        sheet.getRow(row._number).height = 20;

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
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'report-statistical-mail-by-week'), function (error, result) {
                next(error, workbook);
            });
        },
        function (workbook, next) {
            var currentDate = new Date();
            var fileName = path.join(_rootPath, 'assets', 'export', 'report-statistical-mail-by-week', 'BaoCaoThongKeMailTheoTuan_' + currentDate.getTime() + '.xlsx');
            workbook.xlsx.writeFile(fileName).then(function (error, result) {
                next(error, path.join('assets', 'export', 'report-statistical-mail-by-week', 'BaoCaoThongKeMailTheoTuan_' + currentDate.getTime() + '.xlsx'));
            });
        }
    );

    _async.waterfall(waterFallTask, function (error, result) {
        res.json({ code: error ? 500 : 200, data: '/' + result });
    });


}

function createTitleExcel(worksheet, title, day) {
    worksheet.addRow(['']);
    worksheet.addRow(['BELLSYSTEM 24 -  HOA SAO',
        '', '', '',
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 10, bold: true };
    worksheet.mergeCells('A2:B2');
    worksheet.mergeCells('E2:I2');

    worksheet.addRow(['TELEHUB T1',
        '', '', '',
        'Độc lập - Tự do - Hạnh phúc']);
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 10, bold: false };
    worksheet.mergeCells('A3:B3');
    worksheet.mergeCells('E3:I3');

    worksheet.addRow(['']);
    worksheet.addRow(['']);
    worksheet.getCell('C6').value = title;
    worksheet.getRow(6).height = 35;
    worksheet.getRow(6).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 16, underline: 'true', bold: true };
    worksheet.getRow(6).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('C6:F6');

    worksheet.addRow([]);

    if (day) {
        var startMonth = _moment(day.split(' - ')[0], 'DD-MM-YYYY').week() + ' - ' + _moment(day.split(' - ')[0], 'DD-MM-YYYY').year()
        var endMonth = day.split(' - ')[1] ?
            _moment(day.split(' - ')[1], 'DD-MM-YYYY').week() + ' - ' + _moment(day.split(' - ')[1], 'DD-MM-YYYY').year() :
            _moment().week() + ' - ' + _moment().year();

        var str = 'Thời gian: Từ tuần: ';
        str += startMonth + ' - Đến tuần : ' + endMonth;
        worksheet.getCell('A8').value = str;
    }
    else {
        worksheet.getCell('A8').value = 'Thời gian : Từ tuần .............. - Đến tuần .................';
    }
    worksheet.getRow(8).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 10, underline: 'true' };
    worksheet.getRow(8).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('A8:H8');

    worksheet.addRow([]);
    worksheet.addRow([]);
}
function customView(worksheet, countRow) {

    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = columnToLetter(i);
        worksheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        }
        worksheet.lastRow.getCell(charNameColumn).font = {
            name: EXCEL_CONFIG.fontName,
            family: 4,
            size: 12,
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
    dobCol1.width = 15;
    var dobCol2 = worksheet.getColumn(2);
    dobCol2.width = 15;
    var dobCol3 = worksheet.getColumn(3);
    dobCol3.width = 23;
    var dobCol4 = worksheet.getColumn(4);
    dobCol4.width = 23;
    var dobCol5 = worksheet.getColumn(5);
    dobCol5.width = 20;
    var dobCol6 = worksheet.getColumn(6);
    dobCol6.width = 25;
    var dobCol7 = worksheet.getColumn(7);
    dobCol7.width = 25;

    //row
    var row = worksheet.getRow(10);
    row.height = 23;
}

