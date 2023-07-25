var zipFolder = require('zip-folder');
var titleExport = 'BÁO CÁO THỐNG KÊ MAIL';
var _TicketMails = require('../modals/tickets-mail')
const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'scope')) {
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

                case 'search-history-mail':
                    if (!req.query.idChat) return res.json({ code: 500 });
                    _TicketMails.aggregate([
                        {
                            $match: {
                                _id: _.convertObjectId(req.query.idChat)
                            }
                        },
                        {
                            $lookup: {
                                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
                            }
                        },
                        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },
                        { $sort: { 'caseId.whenCreated': -1 } },
                        {
                            $group: {
                                _id: "$_id",
                                caseId: {
                                    $push: '$caseId'
                                },
                                aliasId: { $first: '$aliasId' },
                                channelType: { $first: '$channelType' },
                                created: { $first: '$created' },
                                idAgent: { $first: '$idAgent' },
                                idCustomer: { $first: '$idCustomer' },
                                idMailInbound: { $first: '$idMailInbound' },
                                idMailInboundChannel: { $first: '$idMailInboundChannel' },
                                ticketReason: { $first: '$ticketReason' },
                                ticketReasonCategory: { $first: '$ticketReasonCategory' },
                                deadline: { $first: '$deadline' },
                                note: { $first: '$note' },
                                typeMail: { $first: '$typeMail' },
                                status: { $first: '$status' }

                            }
                        },
                        {
                            $lookup: {
                                from: "mailinboundsources", localField: "aliasId", foreignField: "idMailCisco", as: "aliasId"
                            }
                        },
                        { $unwind: { path: '$aliasId', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
                            }
                        },
                        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                caseId: 1,
                                aliasId: 1,
                                channelType: 1,
                                created: 1,
                                idAgent: 1,
                                idCustomer: 1,
                                idMailInbound: 1,
                                idMailInboundChannel: 1,
                                ticketReason: 1,
                                ticketReasonCategory: 1,
                                deadline: 1,
                                note: 1,
                                typeMail: 1,
                                subject: { $arrayElemAt: ["$caseId.subject", -1] },
                                from: { $arrayElemAt: ["$caseId.formEmailAddress", -1] },
                                status: 1
                            }
                        },

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
                                        if (!result[0].idCustomer || result[0].idCustomer == '') return next();
                                        if (!result[0].idCustomer || (result[0].idCustomer && result[0].idCustomer == '')) return next();
                                        _Customerindex.findById(result[0].idCustomer).exec(function (err, data) {
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
                                // for (var i = 0; i < fields.length; i++) {
                                //     str +=
                                //         `<tr class=" p-0">` +
                                //         `<td class="col-md-4 m-8 left-side">` + fields[i].displayName + `</td>` +
                                //         `<td class="col-md-8 m-8 right-side">` + dynamicCustomerInfo(fields[i], JSON.parse(JSON.stringify(customer))) + `</td>` +
                                //         `</tr>`
                                // }
                                for (var i = 0; i < fields.length; i++) {

                                    str +=
                                        `<div class="col-md-6 m-t-10">` +
                                        `   <div class="col-md-4 ` + (i % 2 == 0 ? `text-left` : `text-right`) + `">` +
                                        `       <label for="name" class="control-label p-0"><strong>` + fields[i].displayName + ` :</strong></label>` +
                                        `   </div>` +
                                        `   <div class="col-md-8">` +
                                        // `<input value="" class="form-control " type="text" id="edit_field_ho_ten" name="field_ho_ten:string">` +
                                        dynamicCustomerInfo(fields[i], JSON.parse(JSON.stringify(customer))) +
                                        `   </div>` +
                                        `</div>`
                                }
                            }
                            res.json({
                                code: err ? 500 : 200,
                                data: result[0],
                                str: str
                            });
                        })


                    })
                    break;
            }

        } else {
            let page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            let rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
            let startDay;
            let endDay;

            if (_.has(req.query, 'created') && req.query.created) {
                let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
                let _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

                startDay = (_d1._d < _d2._d) ? _d1 : _d2;
                endDay = (_d1._d < _d2._d) ? _d2 : _d1;

                startDay = startDay.startOf('day')._d;
                endDay = endDay.endOf('day')._d;
            }

            // let agg = [];
            let agg = _TicketMails.aggregate([]);
            agg._pipeline = bindAggs(req, res);
            let conditions = {};
            conditions['agg'] = bindAggs(req, res);
            conditions['startDay'] = startDay;
            conditions['endDay'] = endDay;

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
            _async.parallel({
                sum: function (next) {
                    _TicketMails.aggregate(bindAggsSum(req, res)).exec(next)
                }
            }, function (error, rs) {
                console.log(222, JSON.stringify(agg));

                _TicketMails.aggregatePaginate(agg, { page: page, limit: rows }, function (err, resp, pageCount, count) {
                    // console.log(5555555, JSON.stringify(resp));
                    if (err) {
                        return res.json({ code: 500, message: err.errmsg });
                    }
                    let total = count;
                    if (req.query.exportExcel) {
                        exportExcel(req, conditions, total, (err, link) => {
                            let paginator = new pagination.SearchPaginator({
                                prelink: '/report-statistic-mail',
                                current: page,
                                rowsPerPage: rows,
                                totalResult: count
                            });
                            res.json({
                                code: err ? 500 : 200,
                                data: resp,
                                linkFile: link,
                                sum: rs.sum[0],
                                paging: paginator.getPaginationData()
                            });
                        });

                    } else {
                        let paginator = new pagination.SearchPaginator({
                            prelink: '/report-statistic-mail',
                            current: page,
                            rowsPerPage: rows,
                            totalResult: count
                        });
                        res.json({
                            code: 200,
                            data: resp,
                            sum: rs.sum[0],
                            paging: paginator.getPaginationData()
                        });
                    }

                });
            })
        }
    },
    html: function (req, res) {
        _async.parallel({
            source: function (next) {
                _MailInboundSource.find({}, next)
            },
            agent: function (next) {
                _Users.find({ isLoginMobile: 1 }, next)
            },
            reasonCategories: function (next) {// nhóm tình trạng
                _TicketReasonCategory.find({ status: 1, category: 4 }, next)
            },
            ticketreasons: function (next) { // tình trạng hiện tại
                _TicketReason.find({ status: 1 }, next)
            }
        }, function (err, result) {
            _.render(req, res, 'report-statistic-mail', {
                title: titleExport,
                source: result.source,
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
                _TicketMails.aggregate(_agg, function (err, result) {
                    if (err) return callback(err, null);
                    //lấy data insert exporthistorydetail
                    createExcelFile(
                        req,
                        folderName,
                        _.isEmpty(lastfolderName) ? null : lastfolderName,
                        _fileName,
                        result,
                        conditions.indexTable,
                        { startDay: conditions.startDay, endDay: conditions.endDay },
                        // conditions.service,
                        callback
                    );
                });
            };
            tempParallelTask.push(temp);
            return tempParallelTask;

        }
    } else {
        let temp = function (callback) {
            _TicketMails.aggregate(conditions.agg, function (err, result) {
                if (err) return callback(err, null);
                createExcelFile(
                    req,
                    folderName,
                    null,
                    fileName,
                    result,
                    conditions.indexTable,
                    { startDay: conditions.startDay, endDay: conditions.endDay },
                    // conditions.service
                    callback,
                );
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

function createExcelFile(req, folderName, lastFolderName, fileName, data, indexTable, { startDay, endDay }, callback) {
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
            // _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL), function (key, i) {
            //     if (i < _.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL).length - 1) {
            //         _lstHeader.push(_config.MESSAGE.REPORT_STATISTIC_MAIL[key])
            //     }
            // })
            // let _lstFieldHeader = _lstHeader;

            //tạo lst header fix cứng
            let _lstFieldHeader = [
                'created',
                'customerName',
                'customerPhone',
                'customerEmail',
                'aliasName',
                'subject',
                'totalMail',
                'reasonCategory',
                'reason',
                'status',
                'deadline',
                'agentName',
                'note'
            ]

            let workbook = new _Excel.Workbook();
            workbook.creator = req.session.user.displayName;
            workbook.created = new Date();
            let sheet = workbook.addWorksheet(titleExport);

            if (startDay) {
                startDay = moment(startDay).startOf('day');
                startDay = startDay.format('DD/MM/YYYY HH:mm');
            }

            if (endDay) {
                endDay = moment(endDay).add(-7, 'hours').endOf('day');
                endDay = endDay.format('DD/MM/YYYY HH:mm');
            }

            setWeightColumn(sheet)
            headerReport(startDay, endDay, titleExport, sheet, {});
            //setTitleExcel(sheet);


            //tạo lst header động theo _config 
            let rowHeader = []
            _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL), function (header, i) {
                if (i < _.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL).length - 1) {
                    rowHeader.push(_config.MESSAGE.REPORT_STATISTIC_MAIL[header]);
                }

            });

            //xử lý lựa chọn cột hiển thị 
            _.each(indexTable, function (el) {
                rowHeader.splice(el, 1);
                _lstFieldHeader.splice(el, 1);
            })

            sheet.addRow(rowHeader)
            sheet.lastRow.height = 30;
            sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 11, bold: true }
            for (let i = 1; i <= rowHeader.length; i++) {
                let charNameColumn = _.columnToLetter(i);
                // sheet.lastRow.getCell(charNameColumn).border = {
                //     top: { style: "thin" },
                //     left: { style: "thin" },
                //     bottom: { style: "thin" },
                //     right: { style: "thin" }
                // }
                sheet.lastRow.getCell(charNameColumn).fill = {
                    type: 'gradient',
                    gradient: 'path',
                    center: { left: 0.5, top: 0.5 },
                    stops: [
                        { position: 0, color: { argb: EXCEL_CONFIG.colorTableHeader } },
                        { position: 1, color: { argb: EXCEL_CONFIG.colorTableHeader } }
                    ]
                };
                sheet.lastRow.getCell(charNameColumn).font = {
                    name: EXCEL_CONFIG.fontName,
                    family: 4,
                    size: EXCEL_CONFIG.fontSizeTableHeader,
                    bold: true,
                    color: { argb: 'FFFFFF' }
                };

                sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
            }

            let css = [2, 3, 6]
            _.each(css, (num) => {
                sheet.getRow(num).alignment = { vertical: 'middle', horizontal: 'center' };
            })

            if (data !== null) {
                let dataRow = function (item, lstFieldHeader) {
                    let _dataRow = _.reduce(lstFieldHeader, function (memo, el) {
                        let _temp = item[el] != null ? _convertData(el, item[el]) : '';
                        memo.push(_temp);
                        return memo;
                    }, []);

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

                        sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
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
        20, 25, 20, 30, 20, 20, 30, 30, 20, 20, 20, 20, 25
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
    let matchQueryText = {};

    if (_.has(req.query, 'created') && req.query.created) {
        let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        let startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        let endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        matchQuery.created = {
            $gte: startDay, $lt: endDay
        }
    }

    if (_.has(req.query, 'customerPhone') && req.query.customerPhone) {
        matchQueryText['customerPhone'] = req.query.customerPhone
    }

    if (_.has(req.query, 'customerName') && !_.isEqual(req.query.customerName, '')) {
        matchQueryText.customerName = { $regex: new RegExp(_.stringRegex(req.query.customerName), 'i') };
    }

    if (_.has(req.query, 'customerEmail') && !_.isEqual(req.query.customerEmail, '')) {
        matchQueryText.customerEmail = { $regex: new RegExp(_.stringRegex(req.query.customerEmail), 'i') };
    }

    if (_.has(req.query, 'source') && req.query.source) {
        let listSource = req.query.source.map(function (el) {
            return +el
        })
        matchQuery['aliasId'] = { $in: listSource }
    }

    if (_.has(req.query, 'reasonCategories') && req.query.reasonCategories) {
        matchQuery['ticketReasonCategory'] = { $in: _.arrayObjectId(req.query.reasonCategories) }
    }

    if (_.has(req.query, 'ticketreasons') && req.query.ticketreasons) {
        matchQuery['reason'] = { $in: _.arrayObjectId(req.query.ticketreasons) }
    }

    if (_.has(req.query, 'status') && req.query.status) {
        let listStatus = [];
        _.each(req.query.status, function (el) {
            switch (+el) {
                case 10:
                    listStatus.push({ status: { $ne: 2 } });
                    break;
                default:
                    listStatus.push({ status: { $eq: 2 } });
                    break;
            }
        })
        // let listStatus = req.query.status.map(function (el) {
        //     return +el
        // })
        matchQuery['$or'] = listStatus;
    }

    if (_.has(req.query, 'agent') && req.query.agent) {
        matchQuery['idAgent'] = { $in: _.arrayObjectId(req.query.agent) }
    }

    if (_.has(req.query, 'subject') && !_.isEqual(req.query.subject, '')) {
        matchQueryText.subject = { $regex: new RegExp(_.stringRegex(req.query.subject), 'i') };
    }

    if (_.has(req.query, 'deadline') && req.query.deadline) {
        let _d1 = _moment(req.query.deadline.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.deadline.split(' - ')[1] ? _moment(req.query.deadline.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        let startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        let endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        matchQuery.deadline = {
            $gte: startDay, $lt: endDay
        }
    }


    let aggs = [
        { $match: { typeMail: 1 } },
        {
            $lookup: {
                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
            }
        },
        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },

        {
            $match: matchQuery
        },
        { $sort: { 'caseId.whenCreated': 1 } },
        {
            $group: {
                _id: "$_id",
                caseId: {
                    $push: '$caseId'
                },
                aliasId: { $first: '$aliasId' },
                channelType: { $first: '$channelType' },
                created: { $first: '$created' },
                idAgent: { $first: '$idAgent' },
                idCustomer: { $first: '$idCustomer' },
                idMailInbound: { $first: '$idMailInbound' },
                idMailInboundChannel: { $first: '$idMailInboundChannel' },
                ticketReason: { $first: '$ticketReason' },
                ticketReasonCategory: { $first: '$ticketReasonCategory' },
                deadline: { $first: '$deadline' },
                note: { $first: '$note' },
                typeMail: { $first: '$typeMail' },
                status: { $first: '$status' }

            }
        },
        {
            $project: {
                // caseId: 1,
                firstCaseId: { $arrayElemAt: ["$caseId.whenCreated", 0] },
                totalMail: { $size: '$caseId' },
                aliasId: 1,
                channelType: 1,
                created: 1,
                idAgent: 1,
                idCustomer: 1,
                idMailInbound: 1,
                idMailInboundChannel: 1,
                ticketReason: 1,
                ticketReasonCategory: 1,
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: { $arrayElemAt: ["$caseId.subject", 0] },
                status: 1
            }
        },

        {
            $lookup: {
                from: "customerindex", localField: "idCustomer", foreignField: "_id", as: "idCustomer"
            }
        },
        { $unwind: { path: '$idCustomer', preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
            }
        },
        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "mailinboundsources", localField: "aliasId", foreignField: "idMailCisco", as: "aliasId"
            }
        },
        { $unwind: { path: '$aliasId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "ticketreasoncategories", localField: "ticketReasonCategory", foreignField: "_id", as: "reasonCategory"
            }
        },
        { $unwind: { path: '$reasonCategory', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "ticketreasons", localField: "ticketReason", foreignField: "_id", as: "reason"
            }
        },
        { $unwind: { path: '$reason', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                // caseId: 1,
                firstCaseId: 1,
                totalMail: 1,
                aliasName: '$aliasId.name',
                channelType: 1,
                created: 1,
                agentName: '$idAgent.displayName',
                customerName: '$idCustomer.field_ho_ten',
                customerPhone: '$idCustomer.field_so_dien_thoai',
                customerEmail: '$idCustomer.field_e_mail',
                idMailInbound: 1,
                idMailInboundChannel: 1,
                reasonCategory: '$reasonCategory.name',
                reason: '$reason.name',
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: 1,
                status: 1
            }
        },
        {
            $match: matchQueryText
        },
        {
            $sort: { created: -1 }
        }
    ];
    console.log(111, JSON.stringify(aggs));

    return aggs;
}
function bindAggsSum(req, res) {

    let matchQuery = {};
    let matchQueryText = {};

    if (_.has(req.query, 'created') && req.query.created) {
        let _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        let startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        let endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        matchQuery.created = {
            $gte: startDay, $lt: endDay
        }
    }

    if (_.has(req.query, 'customerPhone') && req.query.customerPhone) {
        matchQueryText['customerPhone'] = req.query.customerPhone
    }

    if (_.has(req.query, 'customerName') && !_.isEqual(req.query.customerName, '')) {
        matchQueryText.customerName = { $regex: new RegExp(_.stringRegex(req.query.customerName), 'i') };
    }

    if (_.has(req.query, 'customerEmail') && !_.isEqual(req.query.customerEmail, '')) {
        matchQueryText.customerEmail = { $regex: new RegExp(_.stringRegex(req.query.customerEmail), 'i') };
    }

    if (_.has(req.query, 'source') && req.query.source) {
        let listSource = req.query.source.map(function (el) {
            return +el
        })
        matchQuery['aliasId'] = { $in: listSource }
    }

    if (_.has(req.query, 'reasonCategories') && req.query.reasonCategories) {
        matchQuery['ticketReasonCategory'] = { $in: _.arrayObjectId(req.query.reasonCategories) }
    }

    if (_.has(req.query, 'ticketreasons') && req.query.ticketreasons) {
        matchQuery['reason'] = { $in: _.arrayObjectId(req.query.ticketreasons) }
    }

    if (_.has(req.query, 'status') && req.query.status) {
        let listStatus = [];
        _.each(req.query.status, function (el) {
            switch (+el) {
                case 10:
                    listStatus.push({ status: { $ne: 2 } });
                    break;
                default:
                    listStatus.push({ status: { $eq: 2 } });
                    break;
            }
        })
        // let listStatus = req.query.status.map(function (el) {
        //     return +el
        // })
        matchQuery['$or'] = listStatus;
    }

    // if (_.has(req.query, 'status') && req.query.status) {
    //     let listStatus = req.query.status.map(function (el) {
    //         return +el
    //     })
    //     matchQuery['status'] = { $in: listStatus }
    // }

    if (_.has(req.query, 'agent') && req.query.agent) {
        matchQuery['idAgent'] = { $in: _.arrayObjectId(req.query.agent) }
    }

    if (_.has(req.query, 'subject') && !_.isEqual(req.query.subject, '')) {
        matchQueryText.subject = { $regex: new RegExp(_.stringRegex(req.query.subject), 'i') };
    }

    if (_.has(req.query, 'deadline') && req.query.deadline) {
        let _d1 = _moment(req.query.deadline.split(' - ')[0], 'DD/MM/YYYY');
        let _d2 = req.query.deadline.split(' - ')[1] ? _moment(req.query.deadline.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        let startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        let endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        matchQuery.deadline = {
            $gte: startDay, $lt: endDay
        }
    }



    let aggs = [
        { $match: { typeMail: 1 } },
        {
            $lookup: {
                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
            }
        },
        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },

        {
            $match: matchQuery
        },
        { $sort: { 'caseId.whenCreated': 1 } },
        {
            $group: {
                _id: "$_id",
                caseId: {
                    $push: '$caseId'
                },
                aliasId: { $first: '$aliasId' },
                channelType: { $first: '$channelType' },
                created: { $first: '$created' },
                idAgent: { $first: '$idAgent' },
                idCustomer: { $first: '$idCustomer' },
                idMailInbound: { $first: '$idMailInbound' },
                idMailInboundChannel: { $first: '$idMailInboundChannel' },
                ticketReason: { $first: '$ticketReason' },
                ticketReasonCategory: { $first: '$ticketReasonCategory' },
                deadline: { $first: '$deadline' },
                note: { $first: '$note' },
                typeMail: { $first: '$typeMail' },
                status: { $first: '$status' }

            }
        },
        {
            $project: {
                caseId: 1,
                totalMail: { $size: '$caseId' },
                aliasId: 1,
                channelType: 1,
                created: 1,
                idAgent: 1,
                idCustomer: 1,
                idMailInbound: 1,
                idMailInboundChannel: 1,
                ticketReason: 1,
                ticketReasonCategory: 1,
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: { $arrayElemAt: ["$caseId.subject", 0] },
                status: 1
            }
        },

        {
            $lookup: {
                from: "customerindex", localField: "idCustomer", foreignField: "_id", as: "idCustomer"
            }
        },
        { $unwind: { path: '$idCustomer', preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
            }
        },
        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "mailinboundsources", localField: "aliasId", foreignField: "idMailCisco", as: "aliasId"
            }
        },
        { $unwind: { path: '$aliasId', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                caseId: 1,
                totalMail: 1,
                aliasName: '$aliasId.name',
                channelType: 1,
                created: 1,
                agentName: '$idAgent.displayName',
                idCustomer: '$idCustomer._id',
                customerName: '$idCustomer.field_ho_ten',
                customerPhone: '$idCustomer.field_so_dien_thoai',
                customerEmail: '$idCustomer.field_e_mail',
                idMailInbound: 1,
                idMailInboundChannel: 1,
                ticketReason: 1,
                ticketReasonCategory: 1,
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: 1,
                status: 1
            }
        },
        {
            $match: matchQueryText
        },









        {
            $group: {
                _id: null,
                idCustomer: { $push: '$idCustomer' },
                sumCase: { $sum: 1 },
                sumMail: { $sum: { $size: '$caseId' } },
                sumComplete: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
                sumUnComplete: { $sum: { $cond: [{ $ne: ['$status', 2] }, 1, 0] } }
            }
        },
        { $unwind: { path: '$idCustomer', preserveNullAndEmptyArrays: true } },

        {
            $group: {
                _id: '$idCustomer',
                sumCase: { $first: '$sumCase' },
                sumMail: { $first: '$sumMail' },
                sumComplete: { $first: '$sumComplete' },
                sumUnComplete: { $first: '$sumUnComplete' }
            }
        },
        {
            $group: {
                _id: null,
                sumCustomer: { $sum: 1 },
                sumCase: { $first: '$sumCase' },
                sumMail: { $first: '$sumMail' },
                sumComplete: { $first: '$sumComplete' },
                sumUnComplete: { $first: '$sumUnComplete' }
            }
        },
    ];
    return aggs;
}

var _convertData = function (field, value) {
    if (field == 'created') {
        return moment(value).format('HH:mm DD/MM/YYYY')
    }
    else if (field == 'deadline') {
        return moment(value).format('DD/MM/YYYY')
    }
    else if (field == 'status') {
        return convertStatus(value);
    }
    else {
        return value
    }
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

let convertStatus = function (n) {
    switch (Number(n)) {
        // case 0:
        //     return 'Chờ xử lý';
        // case 1:
        //     return 'Đang xử lý';
        case 2:
            return 'Hoàn thành';
        default:
            return 'Chưa hoàn thành';
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

