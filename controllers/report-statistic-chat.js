var zipFolder = require('zip-folder');
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));
var titleExport = 'BÁO CÁO THỐNG KÊ HỘI THOẠI CHAT';
exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'scope')) {
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
        } else {
            let page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            let rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
            // let agg = [];
            let agg = _ChatThread.aggregate([]);
            agg._pipeline = bindAggs(req, res).aggs;
            let conditions = {};
            conditions['agg'] = bindAggs(req, res).aggs;
            if (_.has(req.query, 'indexTable')) {
                let arrIndexTable = [];
                _.each(req.query.indexTable, function (el) {
                    arrIndexTable.push(Number(el))
                })
                arrIndexTable.sort(function (a, b) {
                    return b - a;
                });
                conditions['indexTable'] = arrIndexTable;
            }
            _ChatThread.aggregatePaginate(agg, { page: page, limit: rows }, function (err, resp, pageCount, count) {
                // console.log(5555555, JSON.stringify(resp));

                if (err) {
                    return res.json({ code: 500, message: err.errmsg });
                }
                let total = count;
                if (req.query.exportExcel) {
                    exportExcel(req, conditions, total, bindAggs(req, res), (err, link) => {
                        let paginator = new pagination.SearchPaginator({
                            prelink: '/report-statistic-chat',
                            current: page,
                            rowsPerPage: rows,
                            totalResult: count
                        });
                        res.json({
                            code: err ? 500 : 200,
                            data: resp,
                            linkFile: link,
                            paging: paginator.getPaginationData()
                        });
                    });

                } else {
                    let paginator = new pagination.SearchPaginator({
                        prelink: '/report-statistic-chat',
                        current: page,
                        rowsPerPage: rows,
                        totalResult: count
                    });
                    res.json({
                        code: 200,
                        data: resp,
                        paging: paginator.getPaginationData()
                    });
                }

            });
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
            }
        }, function (err, result) {
            _.render(req, res, 'report-statistic-chat', {
                title: 'BÁO CÁO THỐNG KÊ HỘI THOẠI CHAT',
                channel: result.channel,
                agent: result.agent,
                reasonCategories: result.reasonCategories,
                ticketreasons: result.ticketreasons,
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
            }, true);
        })

    }
}

function exportExcel(req, conditions, totalResult, {startDay, endDay}, cb) {
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
                        , conditions.indexTable
                        , {startDay, endDay}
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
                    , conditions.indexTable
                    , {startDay, endDay}
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

function createExcelFile(req, folderName, lastFolderName, fileName, data, indexTable, {startDay, endDay}, callback) {
    let options = {
        filename: path.join(_rootPath, 'assets', 'export', 'cdr', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function createFolder(callback) {
            //lastFolderName : là folderName được check lại khi 1 lẫn export nếu có nhiều hơn 1 file excel sẽ không tạo mới
            if (!lastFolderName) {
                fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr', folderName), callback);
            } else {
                callback(null, null)
            }
        },
        function (t, callback) {
            fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), callback);
        },
        function createExcelFile(_config, callback) {
            //tạo lst get data header động theo _config 
            // let _lstHeader = []
            // _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT), function (key, i) {
            //     if (i < _.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT).length - 1) {
            //         _lstHeader.push(_config.MESSAGE.REPORT_STATISTIC_CHAT[key])
            //     }
            // })
            // let _lstFieldHeader = _lstHeader;

            //tạo lst header fix cứng
            let _lstFieldHeader = [
                'createDate',
                'customerName',
                'customerPhone',
                'customerEmail',
                'channelName',
                'typeChat',
                'reasonCategory',
                'reason',
                'status',
                'chatWaitTime',
                'msgTime',
                'chatTime',
                'sumMsg',
                'whenModified',
                'nameAgent',
                'note'
            ]

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
            // setTitleExcel(sheet);

            //tạo lst header động theo _config 
            let rowHeader = []
            _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT), function (header, i) {
                if (i < _.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT).length - 1) {
                    rowHeader.push(_config.MESSAGE.REPORT_STATISTIC_CHAT[header]);
                }

            });

            //xử lý lựa chọn cột hiển thị 
            _.each(indexTable, function (el) {
                rowHeader.splice(el, 1);
                _lstFieldHeader.splice(el, 1);
            })

            sheet.addRow(rowHeader)
            
            // sheet.lastRow.height = 30;
            // sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            // sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 10, bold: true }

            for (let i = 1; i <= rowHeader.length; i++) {
                let charNameColumn = _.columnToLetter(i);
                let curCell = sheet.lastRow.getCell(charNameColumn);
                // curCell.border = {
                //     top: { style: "thin" },
                //     left: { style: "thin" },
                //     bottom: { style: "thin" },
                //     right: { style: "thin" }
                // }
                
                curCell.font = {
                    name: EXCEL_CONFIG.fontName,
                    family: 4,
                    size: EXCEL_CONFIG.fontSizeTableHeader,
                    bold: true,
                    color: { argb: 'FFFFFF' }
                };

                curCell.fill = {
                    type: 'gradient',
                    gradient: 'path',
                    center: { left: 0.5, top: 0.5 },
                    stops: [
                      { position: 0, color: { argb: EXCEL_CONFIG.colorTableHeader } },
                      { position: 1, color: { argb: EXCEL_CONFIG.colorTableHeader } }
                    ]
                };

                curCell.alignment = { vertical: 'middle', horizontal: 'center' };
            }

        
            if (data !== null) {
                let lstTime = [
                    'chatWaitTime',
                    'msgTime',
                    'chatTime'
                ]

                let dataRow = function (item, lstFieldHeader) {
                    let _dataRow = _.reduce(lstFieldHeader, function (memo, el) {
                        let _temp = item[el] ? _convertData(el, item[el]) : (lstTime.indexOf(el) > -1 ? '00:00:00' : '');
                        memo.push(_temp);
                        return memo;
                    }, []);

                    // let _dataRow = [
                    //     el.createDate ? moment(el.createDate).format('HH:mm DD/MM/YYYY') : '',
                    //     el.customerName ? el.customerName : '',
                    //     el.customerPhone ? el.customerPhone : '',
                    //     el.customerEmail ? el.customerEmail : '',
                    //     el.channelName ? el.channelName : '',
                    //     el.typeChat ? convertTypeChat(el.typeChat) : '',
                    //     el.reasonCategory ? el.reasonCategory : '',
                    //     el.reason ? el.reason : '',
                    //     el.status ? convertStatus(el.status) : '',
                    //     el.chatWaitTime ? msToTime(el.chatWaitTime) : '',
                    //     el.msgTime ? msToTime(el.msgTime) : '',
                    //     el.chatTime ? msToTime(el.chatTime) : '',
                    //     el.messagesChatDetail ? el.messagesChatDetail.length : '',
                    //     el.whenModified ? moment(el.whenModified).format('HH:mm') : '',
                    //     el.nameAgent ? el.nameAgent : '',
                    //     el.note ? el.note : '',
                    // ]

                    return _dataRow;
                }

                _async.eachSeries(data, function (item, callback) {
                    sheet.addRow(dataRow(item, _lstFieldHeader));
                    sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
                    sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: EXCEL_CONFIG.fontSizeTableBody };
                    for (let i = 1; i <= rowHeader.length; i++) {
                        let charNameColumn = _.columnToLetter(i);
                        sheet.lastRow.getCell(charNameColumn).border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" }
                        }
                    }
                    callback(null);
                }, function (err, result) {

                    // workbook.xlsx.writeFile(options.filename)
                    //     .then(callback);
                    workbook.xlsx.writeFile(options.filename)
                        .then(function (errr, rss) {
                            callback(errr, rss)
                        });
                });
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(callback);
            }
        }
    ], function (err, result) {
        // console.log('dfdfdf', err, JSON.stringify(data[data.length - 1]._id));
        // callback(err, { objectId: data[data.length - 1]._id, _folderName: folderName });
        callback(err, { objectId: data[data.length - 1] ? data[data.length - 1]._id : null, _folderName: folderName });
    });
};

function setWeightColumn(worksheet) {
    let valueWidthColumn = [
        25, 25, 20, 30, 20, 20, 30, 30, 20, 30, 30, 30, 30, 25, 25, 20
    ]
    _.each(valueWidthColumn, function (item, j) {
        worksheet.getColumn(++j).width = item;
    })

}

function setTitleExcel(sheet) {
    sheet.getCell('A2').value = 'BELLSYSTEM 24 - HOA SAO';
    sheet.mergeCells('A2:C2');

    sheet.getCell('A3').value = 'DATA CENTER';
    sheet.mergeCells('A3:C3');

    sheet.getCell('G2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    sheet.mergeCells('G2:I2');

    sheet.getCell('G3').value = 'Độc lập - Tự do - Hạnh Phúc';
    sheet.mergeCells('G3:I3');

    sheet.getCell('A6').value = titleExport;
    sheet.getRow(6).font = { name: EXCEL_CONFIG.fontName, size: 18 };
    sheet.mergeCells('A6:I6');

    sheet.addRow([]);
    sheet.addRow([]);
}

// var bindAggs = function (req, res) {
//     let _agg = [];
//     let _search = req.query;
//     let query = {};
//     _agg.push({ $match: {}})
//     return _agg;
// }

function bindAggs(req, res) {

    let matchQuery = {};
    let startDay, endDay;

    if (_.has(req.query, 'created') && req.query.created) {
        let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        matchQuery.createDate = {
            $gte: startDay, $lt: endDay
        }
    }

    if (_.has(req.query, 'customerPhone') && req.query.customerPhone) {
        matchQuery['customerPhone'] = req.query.customerPhone
    }

    if (_.has(req.query, 'customerName') && !_.isEqual(req.query.customerName, '')) {
        matchQuery.customerName = { $regex: new RegExp(_.stringRegex(req.query.customerName), 'i') };
    }

    if (_.has(req.query, 'customerEmail') && !_.isEqual(req.query.customerEmail, '')) {
        matchQuery.customerEmail = { $regex: new RegExp(_.stringRegex(req.query.customerEmail), 'i') };
    }

    if (_.has(req.query, 'channel') && req.query.channel) {
        matchQuery['channelId'] = { $in: _.arrayObjectId(req.query.channel) }
    }

    if (_.has(req.query, 'typeChat') && req.query.typeChat) {
        let listTypeChat = req.query.typeChat.map(function (el) {
            return +el
        })
        matchQuery['typeChat'] = { $in: listTypeChat }
    }

    if (_.has(req.query, 'reasonCategories') && req.query.reasonCategories) {
        matchQuery['reasonCategory'] = { $in: _.arrayObjectId(req.query.reasonCategories) }
    }

    if (_.has(req.query, 'ticketreasons') && req.query.ticketreasons) {
        matchQuery['reason'] = { $in: _.arrayObjectId(req.query.ticketreasons) }
    }

    if (_.has(req.query, 'status') && req.query.status) {
        let listStatus = req.query.status.map(function (el) {
            return +el
        })
        matchQuery['status'] = { $in: listStatus }
    }

    if (_.has(req.query, 'agent') && req.query.agent) {
        matchQuery['agentId'] = { $in: _.arrayObjectId(req.query.agent) }
    }

    if (_.has(req.query, 'note') && !_.isEqual(req.query.note, '')) {
        matchQuery.note = { $regex: new RegExp(_.stringRegex(req.query.note), 'i') };
    }

    if (_.has(req.query, 'deadline') && req.query.deadline) {
        let _d1 = _moment(req.query.deadline.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.deadline.split(' - ')[1] ? _moment(req.query.deadline.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        let startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        let endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day').add(7, 'hours')._d;
        endDay = endDay.endOf('day').add(7, 'hours')._d;
        matchQuery.deadline = {
            $gte: startDay, $lt: endDay
        }
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
            $lookup: {
                from: "customerindex", localField: "customerId", foreignField: "_id", as: "customerId"
            }
        },
        { $unwind: { path: '$customerId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "companychannels", localField: "channelId", foreignField: "_id", as: "channel"
            }
        },
        { $unwind: { path: '$channel', preserveNullAndEmptyArrays: true } },

        { $unwind: { path: '$agentId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "users", localField: "agentId", foreignField: "_id", as: "nameAgent"
            }
        },
        { $unwind: { path: '$nameAgent', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                createDate: 1,
                customerName: "$customerId.field_ho_ten",
                customerPhone: "$customerId.field_so_dien_thoai",
                customerEmail: "$customerId.field_e_mail",
                channelId: 1,
                channelName: "$channel.name",
                //thông tin phân loại loại cuộc chat
                customerMessageCount: 1,
                chatStatus: 1,
                // typeChat: {
                //     $cond: [
                //         // { $or: [{ $gt: ['$customerMessageCount', 0] }, { $and: [{ $eq: ['$customerMessageCount', 0] }, { $eq: ['$chatStatus', 4] }] }] },
                //         {
                //             $and: [
                //                 { $gt: ['$customerMessageCount', 1] },
                //                 { $in: ['$chatStatus', [1, 4]] }
                //             ]
                //         }, 1,//cuộc chat tiếp nhận
                //         {
                //             $cond: [
                //                 // { $and: [{ $eq: ['$customerMessageCount', 0] }, { $in: ['$chatStatus', [1, 5]] }] },
                //                 {
                //                     $or: [
                //                         { $and: [{ $lte: ['$customerMessageCount', 1] }, { $eq: ['$chatStatus', 1] }] },
                //                         { $and: [{ $eq: ['$customerMessageCount', 0] }, { $eq: ['$chatStatus', 5] }] }
                //                     ]
                //                 }, 2, //cuộc chat nhỡ
                //                 {
                //                     $cond: [
                //                         {
                //                             $and: [
                //                                 { $eq: ['$customerMessageCount', null] }, { $eq: ['$chatStatus', 6] }]
                //                         }, 3, //cuộc chat offline
                //                         0 //khác
                //                     ]
                //                 }
                //             ]
                //         }
                //     ]
                // },
                typeChat: {
                    $cond: [
                        {
                            $and: [
                                { $eq: ['$customerMessageCount', null] }, { $eq: ['$chatStatus', 6] }]
                        }, 3,//cuộc chat offline
                        {
                            $cond: [
                                {
                                    $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                }, 2, //cuộc chat nhỡ
                                {
                                    $cond: [
                                        {
                                            $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                        }, 1, //cuộc chat tiếp nhận
                                        0 //khác
                                    ]
                                }
                            ]
                        }
                    ]
                },

                reasonCategory: "$ticketChat.ticketReasonCategory",
                reason: "$ticketChat.ticketReason",
                status: "$ticketChat.status",

                //thông tin thời gian chờ
                chatWaitTime: {
                    $cond: [
                        { $ne: ["$agentAnswerMessageFirstTime", ""] },
                        { $add: [{ $subtract: ['$agentAnswerMessageFirstTime', '$createDate'] }, 25200000] },
                        { $add: [{ $subtract: ['$whenModified', '$createDate'] }] }
                    ]
                },

                //thông tin tính số lượng tin nhắn, tính thời gian hội thoại
                //loại bỏ các tin nhắn hệ thống để tính thời gian hội thoại của agent và customer
                messagesChatDetail: {
                    $filter:
                    {
                        input: "$messagesChat",
                        as: "el",
                        cond: { $and: [{ $ne: ["$$el.type", "system"] }, { $ne: ["$$el.type", "system end"] }] }
                    }
                },

                //thông tin thời lượng phiên chat 
                // chatTime: { $subtract: ['$whenModified', '$createDate'] },
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
                //thông tin thời điểm kết thúc phiên chat
                whenModified: 1,

                agentId: 1,
                nameAgent: '$nameAgent.displayName',
                note: "$ticketChat.note",
                deadline: "$ticketChat.deadline",
            }
        },
        {
            $match: matchQuery
        },
        {
            $lookup: {
                from: "ticketreasoncategories", localField: "reasonCategory", foreignField: "_id", as: "reasonCategory"
            }
        },
        { $unwind: { path: '$reasonCategory', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "ticketreasons", localField: "reason", foreignField: "_id", as: "reason"
            }
        },
        { $unwind: { path: '$reason', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                createDate: 1,
                customerName: 1,
                customerPhone: 1,
                customerEmail: 1,
                channelId: 1,
                channelName: 1,

                //thông tin loại cuộc chat
                typeChat: 1,

                reasonCategory: '$reasonCategory.name',
                reason: '$reason.name',
                status: 1,

                //thông tin thời gian chờ
                chatWaitTime: 1,

                //Thông tin thời gian hội thoại
                // msgTime: { $add: [{ $subtract: [{ $last: "$messagesChatDetail.createAt" }, '$createDate'] }, 25200000] },
                // msgTime: { $add: [{ $subtract: [{ $arrayElemAt: ["$messagesChatDetail.createAt", -1] }, '$createDate'] }, 25200000] },
                msgTime: { $add: [{ $subtract: [{ $arrayElemAt: ["$messagesChatDetail.createAt", -1] }, { $arrayElemAt: ["$messagesChatDetail.createAt", 0] }] }] },

                //thông tin thời lượng phiên chat 
                chatTime: 1,

                //thông tin tính số lượng tin nhắn, tính thời gian hội thoại
                //loại bỏ các tin nhắn hệ thống để tính thời gian hội thoại của agent và customer
                // messagesChatDetail: 1,
                sumMsg: { $size: '$messagesChatDetail' },


                //thông tin thời điểm kết thúc phiên chat
                whenModified: 1,

                agentId: 1,
                nameAgent: 1,
                note: 1,
            }
        },

        {
            $sort: { createDate: -1 }
        }
    ];

    return {
        aggs,
        startDay,
        endDay,
    };
}

var _convertData = function (field, value) {

    let lstTime = [
        'chatWaitTime',
        'msgTime',
        'chatTime'
    ]
    if (lstTime.indexOf(field) > -1) {
        return msToTime(value);
    } else if (field == 'createDate') {
        return moment(value).format('HH:mm:ss DD/MM/YYYY')
    }
    else if (field == 'typeChat') {
        return convertTypeChat(value);
    }
    else if (field == 'status') {
        return convertStatus(value);
    }
    else if (field == 'whenModified') {
        return moment(value).format('HH:mm:ss DD/MM/YYYY')
    }
    else { return value }
}
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
let convertTypeChat = function (n) {
    switch (Number(n)) {
        case 0:
            return '';
        case 1:
            return 'Tiếp nhận';
        case 2:
            return 'Nhỡ';
        case 3:
            return 'Offline';
    }
}
let convertStatus = function (n) {
    switch (Number(n)) {
        case 0:
            return 'Chờ xử lý';
        case 1:
            return 'Đang xử lý';
        case 2:
            return 'Hoàn thành';
        default:
            return '';
    }
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
    ) ? v[el.modalName] : '';
    return _val;
};

