//author : haivh - 12/18/2020
const { columnToLetter } = require(path.join(_rootPath, 'helpers', 'functions', 'handle.string.js'));

var { hmsToNumber, msToTime, hms } = require(path.join(
    _rootPath,
    "helpers",
    "functions",
    "handle.dateTime.js"
));
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

let title = 'Báo cáo thống kê danh sách chat bị nhỡ';
let titleHeadTable = [
    { key: 'date', value: 'STT' },
    { key: 'type', value: 'Thời gian chat' },
    { key: 'code', value: 'Họ tên KH' },
    { key: 'phone', value: 'Số điện thoại' },
    { key: 'idCustomer', value: 'Email' },
    { key: 'field_so_dien_thoai', value: 'Agent' },
    { key: 'field_ho_ten', value: 'Thời gian chờ' },
    { key: 'notes', value: 'Kênh chat' }
]
exports.index = {
    json: function (req, res) {
        let { scope } = req.query;

        switch (scope) {
            case 'search-history-chat':
                if (!req.query.idChat) return res.json({ code: 500 });
                _ChatThread.aggregate([
                    {
                        $match: {
                            _id: _.convertObjectId(req.query.idChat)
                        }
                    },
                    {
                        $lookup: {
                            from: "companychannels", localField: "channelId", foreignField: "_id", as: "channel"
                        }
                    },
                    { $unwind: { path: '$channel', preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticketChat"
                        }
                    },
                    { $unwind: { path: '$ticketChat', preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            messagesChat: {
                                $map:
                                {
                                    input: "$messagesChat",
                                    as: "el",
                                    in: {
                                        name: "$$el.name",
                                        content: "$$el.content",
                                        type: "$$el.type",
                                        createAt: { $add: ["$$el.createAt", 7 * 60 * 60000] }
                                    }
                                }
                            },
                            nameChannel: "$channel.name",
                            website: "$channel.website",
                            ip: "$clientCustomerId",
                            note: "$ticketChat.note",
                            countMessage: {
                                $size: {
                                    $filter:
                                    {
                                        input: "$messagesChat",
                                        as: "el",
                                        cond: { $and: [{ $ne: ["$$el.type", "system"] }, { $ne: ["$$el.type", "system end"] }] }
                                    }
                                }
                            },
                            customerId: 1
                        }
                    }
                ], function (err, result) {
                    console.log(err);
                    if (err) return res.json({ code: 500 })

                    _async.parallel({
                        cusInfo: function (cb) {
                            _Company.findById(_.convertObjectId(req.session.user.companyLeaders[0].company))
                                .populate({
                                    path: 'companyProfile',
                                    model: _CompanyProfile,
                                    select: 'fieldId _id',
                                    populate: {
                                        path: 'fieldId',
                                        model: _CustomerFields,
                                        select: 'displayName modalName status isRequired fieldValue fieldType weight _id',
                                        options: { sort: { weight: 1, displayName: 1 } }
                                    }
                                }).exec(cb)
                        },
                        customer: function (cb) {

                            _async.waterfall([
                                function (next) {
                                    if (!result || !result[0] || !result[0].customerId || result[0].customerId == '') return next();
                                    _Customerindex.findById(result[0].customerId).exec(function (err, data) {
                                        next(err, data)
                                    });
                                }
                            ], cb)
                        },
                    }, function (err, rs) {
                        if (err) return res.json({ code: 500 })
                        let fields = rs.cusInfo.companyProfile.fieldId;
                        let customer = rs.customer;
                        let str = ''

                        if (customer) {
                            for (var i = 0; i < fields.length; i++) {
                                str +=
                                    `<tr class=" p-0">` +
                                    `<td class="col-md-4 m-8 left-side">` + fields[i].displayName + `</td>` +
                                    `<td class="col-md-8 m-8 right-side">` + dynamicCustomerInfo(fields[i], JSON.parse(JSON.stringify(customer))) + `</td>` +
                                    `</tr>`
                            }
                        }
                        res.json({
                            code: err ? 500 : 200,
                            data: result,
                            str: str
                        });
                    })


                })
                break;
            default:
                if (_.has(req.query, 'isDownload')) {
                    exportExcel(req, res);
                }
                else {
                    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
                    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

                    var { aggs, startDay, endDay } = bindAggs(req, res);

                    _ChatThread.aggregatePaginate(_ChatThread.aggregate(aggs), { page: page, limit: rows }, function (error, result, pageCount, count) {
                        var paginator = new pagination.SearchPaginator({
                            prelink: '/report-statistical-list-chat-miss',
                            current: page,
                            rowsPerPage: rows,
                            totalResult: count
                        });

                        res.json({
                            code: error ? 500 : 200,
                            data: result,
                            paging: paginator.getPaginationData()
                        });
                    })

                }
                break;
        }

    },
    html: function (req, res) {
        _async.parallel({
            channel: function (next) {
                _CompanyChannel.find({}, next)
            },
            agent: function (next) {
                _Users.find({ isLoginMobile: 1 }, next)
            }

        }, function (err, result) {
            let channel = result.channel
            let Agent = result.agent

            _.render(req, res, 'report-statistical-list-chat-miss', {
                channel: channel,
                Agent: Agent,
                title: 'Báo cáo thống kê danh sách chat bị nhỡ ',
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], 'export-excel', ['chosen'], ['ApexCharts'], ['numeral']]
            }, true, err);
        })


    }
};
function bindAggs(req, res) {

    let matchQuery = {};
    let startDay, endDay;

    if (_.has(req.query, 'created') && req.query.created) {
        var _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
        var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment().endOf('day');

        startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        matchQuery.createDate = {
            $gte: startDay, $lt: endDay
        }
    }
    if (_.has(req.query, 'agent') && req.query.agent) {
        matchQuery['idAgent'] = { $in: _.arrayObjectId(req.query.agent) }
    }

    if (_.has(req.query, 'channel') && req.query.channel) {
        matchQuery['channelId'] = { $in: _.arrayObjectId(req.query.channel) }
    }
    if (_.has(req.query, 'phoneNumber') && req.query.phoneNumber) {
        matchQuery['phoneNumber'] = req.query.phoneNumber
    }
    if (_.has(req.query, 'nameCustomer') && !_.isEqual(req.query.nameCustomer, '')) {
        matchQuery.nameCustomer = { $regex: new RegExp(_.stringRegex(req.query.nameCustomer), 'i') };
    }
    if (_.has(req.query, 'email') && !_.isEqual(req.query.email, '')) {
        matchQuery.email = { $regex: new RegExp(_.stringRegex(req.query.email), 'i') };
    }



    let aggs = [
        {
            $project: {
                customerMessageCount: 1,
                chatStatus: 1,
                customerId: 1,
                channelId: 1,
                agentId: 1,
                createDate: 1,
                messageChat: {
                    $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } }
                },
                whenModified: 1
            }
        },
        {
            $match: {
                $and: [
                    { customerMessageCount: { $ne: null } },
                    { chatStatus: { $ne: 6 } },
                    {
                        messageChat: 0
                    }
                ]

            }
        },
        {
            $lookup: {
                from: "customerindex", localField: "customerId", foreignField: "_id", as: "customer"
            }
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$agentId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "companychannels", localField: "channelId", foreignField: "_id", as: "channel"
            }
        },
        { $unwind: { path: '$channel', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "users", localField: "agentId", foreignField: "_id", as: "user"
            }
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                createDate: 1,
                nameCustomer: "$customer.field_ho_ten",
                phoneNumber: "$customer.field_so_dien_thoai",
                email: "$customer.field_e_mail",
                agent: "$user.displayName",
                idAgent: "$user._id",
                channel: "$channel.name",
                channelId: "$channel._id",
                timeWait: {
                    $subtract: ['$whenModified', '$createDate']
                },
            }
        },
        {
            $match: matchQuery
        },
        { $sort: { createDate: 1 } }

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

                if(!startDay && !endDay && result.length > 0){
                    startDay = moment(result[0].createDate)
                    endDay =  moment(result[result.length -1].createDate)
                } else {
                    
                    startDay = moment(startDay).startOf('day');
                    endDay =  moment(endDay).add(-7, 'hours').endOf('day');
                }
                startDay = startDay.format('DD/MM/YYYY HH:mm');
                endDay = endDay.format('DD/MM/YYYY HH:mm');


                // createTitleExcel(sheet, title, req.query.created);
                headerReport(startDay, endDay, title , sheet, {});

                createHead(sheet);
                customView(sheet, result.length);
                for (let i = 0; i < result.length; i++) {

                    sheet.addRow([
                        i + 1,
                        _.has(result[i], 'createDate') && result[i].createDate ? moment(result[i].createDate).format('DD/MM/YYYY HH:ss') : '',
                        _.has(result[i], 'nameCustomer') && result[i].nameCustomer ? result[i].nameCustomer : "",
                        _.has(result[i], 'phoneNumber') && result[i].phoneNumber ? result[i].phoneNumber : "",
                        _.has(result[i], 'email') && result[i].email ? result[i].email : "",
                        _.has(result[i], 'agent') && result[i].agent ? result[i].agent : "",
                        _.has(result[i], 'timeWait') && result[i].timeWait ? msToTime(result[i].timeWait) : 0,
                        _.has(result[i], 'channel') && result[i].channel ? result[i].channel : "",

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
                            size: EXCEL_CONFIG.fontSizeTableBody
                        };
                        sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                        // if (charNameColumn != 'G') {
                        //     sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                        // }
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
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'report-statistical-list-chat-miss'), function (error, result) {
                next(error, workbook);
            });
        },
        function (workbook, next) {
            var currentDate = new Date();
            var fileName = path.join(_rootPath, 'assets', 'export', 'report-statistical-list-chat-miss', 'BaoCaoThongKeDanhSachChatBiNho_' + currentDate.getTime() + '.xlsx');
            workbook.xlsx.writeFile(fileName).then(function (error, result) {
                next(error, path.join('assets', 'export', 'report-statistical-list-chat-miss', 'BaoCaoThongKeDanhSachChatBiNho_' + currentDate.getTime() + '.xlsx'));
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
    worksheet.getCell('A6').value = title;
    worksheet.getCell('A6').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 22, underline: 'true', bold: true };
    worksheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('A6:H6');

    if (month) {
        var startMonth = month.split(' - ')[0]
        var endMonth = month.split(' - ')[1] ? month.split(' - ')[1] : _moment().format('DD/MM/YYYY');

        var str = 'Thời gian: Từ ngày: ';
        str += startMonth + ' - Đến ngày : ' + endMonth;
        worksheet.getCell('A7').value = str;
        worksheet.mergeCells('A7:H7');
        worksheet.getCell('A7').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, underline: 'true' };
        worksheet.getCell('A7').alignment = { vertical: 'middle', horizontal: 'center' };

    }
    else {
        worksheet.getCell('C7').value = 'Thời gian : Từ ngày .............. - Đến ngày .................';
        worksheet.mergeCells('C7:F7');
        worksheet.getCell('C7').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, underline: 'true' };
        worksheet.getCell('C7').alignment = { vertical: 'middle', horizontal: 'center' };
    }

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
    dobCol1.width = 10;
    var dobCol2 = worksheet.getColumn(2);
    dobCol2.width = 23;
    var dobCol3 = worksheet.getColumn(3);
    dobCol3.width = 45;
    var dobCol4 = worksheet.getColumn(4);
    dobCol4.width = 23;
    var dobCol5 = worksheet.getColumn(5);
    dobCol5.width = 33;
    var dobCol6 = worksheet.getColumn(6);
    dobCol6.width = 30;
    var dobCol7 = worksheet.getColumn(7);
    dobCol7.width = 23;
    var dobCol8 = worksheet.getColumn(8);
    dobCol8.width = 25;

    //row
    var row = worksheet.getRow(10);
    row.height = 23;
}

/**
 * Vẽ giao diện input thông tin khách hàng
 * @param el Dữ liệu customer field
 * @param v Dữ liệu đầu vào khách hàng
 * @returns {*}
 */
function dynamicCustomerInfo(el, v) {
    var _val = (v &&
        _.has(v, el.modalName) &&
        !_.isEmpty(v[el.modalName]) &&
        !_.isNull(v[el.modalName]) &&
        v[el.modalName].length
        // && _.has(v[el.modalName][0], 'value')
    )
        ?
        v[el.modalName]
        :
        '';

    return _val;
};

