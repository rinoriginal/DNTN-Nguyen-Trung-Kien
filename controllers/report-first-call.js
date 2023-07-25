
var titlePage = 'first-call';
var searchNotFoundError = new Error('Không tìm thấy kết quả với khoá tìm kiếm');
var accessDenyError = new Error('Không đủ quyền truy cập');
var parseJSONToObject = require(path.join(_rootPath, 'queue', 'common', 'parseJSONToObject.js'));
var zipFolder = require('zip-folder');
var cond = [];
exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'download-excel')) {
            _async.waterfall([
                function (next) {
                    getData(req, next);
                },
                function (result, next) {
                    if (!result.data) next({ message: "No data" });
                    createExcelFile(result.data, next);
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err.message : result });
            });
        }

        if (_.has(req.query, 'download-excel-detail')) {
            if (!_.has(req.query, 'is-detail')) return res.json({ code: 500, message: "No data" });

            _async.waterfall([
                function (next) {
                    getDataDetail(req, next);
                },
                function (result, next) {
                    if (!result.data) next({ message: "No data" });
                    createExcelFileDetail(result.data, next);
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err.message : result });
            });
        }
    },
    html: function (req, res) {
        _async.parallel({
            companies: function (callback) {
                if (!_.isEmpty(req.session.auth.company)) {
                    var obj = [{
                        name: req.session.auth.company.name,
                        _id: _.convertObjectId(req.session.auth.company._id)
                    }];
                    callback(null, obj);
                } else {
                    _Company.aggregate([{ $project: { _id: 1, name: 1 } }], callback);
                }
            },
            services: function (callback) {
                _async.waterfall([
                    function (callback) {
                        if (!_.isEmpty(req.session.auth.company)) {
                            var companyId = _.convertObjectId(req.session.auth.company._id);
                            _Services.aggregate([
                                { $match: { idCompany: companyId } },
                                { $project: { _id: 1 } }
                            ], function (err, result) {
                                if (err) return callback(err, null);
                                cond.push({ $match: { _id: { $in: _.pluck(result, '_id') } } });
                                callback(err, cond);
                            });
                        } else {
                            callback(null, []);
                        }
                    },
                    function (cond, callback) {
                        cond.push({
                            $project: {
                                name: 1,
                                _id: 1,
                                idCompany: 1
                            }
                        });
                        _Services.aggregate(cond, callback);
                    }
                ], callback);
            },
            campaigns: function (callback) {
                _async.waterfall([
                    function (callback) {
                        if (!_.isEmpty(req.session.auth.company)) {
                            var companyId = _.convertObjectId(req.session.auth.company._id);
                            _Campains.aggregate([
                                { $match: { idCompany: companyId } },
                                { $project: { _id: 1 } }
                            ], function (err, result) {
                                if (err) return callback(err, null);
                                cond.push({ $match: { _id: { $in: _.pluck(result, '_id') } } });
                                callback(err, cond);
                            });
                        } else {
                            callback(null, []);
                        }
                    },
                    function (cond, callback) {
                        cond.push({
                            $project: {
                                name: 1,
                                _id: 1,
                                idCompany: 1
                            }
                        });
                        _Campains.aggregate(cond, callback);
                    }
                ], callback);
            },
            agents: function (callback) {
                _async.waterfall([
                    function (callback) {
                        _Company.distinct("_id", req.session.auth.company ? { _id: req.session.auth.company } : {}, function (err, com) {
                            _AgentGroups.distinct("_id", { idParent: { $in: com } }, function (err, result) {
                                if (err) return callback(err, null);
                                _Users.aggregate([{
                                    $match: {
                                        $or: [
                                            { 'agentGroupLeaders.group': { $in: result } },
                                            { 'agentGroupMembers.group': { $in: result } },
                                            { 'companyLeaders.company': { $in: com } }
                                        ]
                                    }
                                }], callback);
                            });
                        })
                    }
                ], callback);
            },
            data: function (callback) {
                getData(req, callback);
            },
            dataDetail: function (callback) {
                if (!req.query['is-detail']) return callback();
                getDataDetail(req, callback);
            }
        }, function (err, result) {
            return _.render(req, res, 'report-first-call', {
                title: titlePage,
                plugins: ['moment', 'jquery-mask', ['bootstrap-select'], ['bootstrap-daterangepicker']],
                companies: result.companies,
                services: result.services,
                campaigns: result.campaigns,
                agents: result.agents,
                data: !!result.data ? result.data.data : [],
                paging: !!result.data ? result.data.paging : null,
                dataDetail: !!result.dataDetail ? result.dataDetail.data : [],
                pagingDetail: !!result.dataDetail ? result.dataDetail.paging : null
            }, true, err);
        });
    }
};

function getData(req, cb) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    var _query = {};
    _async.waterfall([
        function (next) {
            getQuery(req, function (result) {
                _query = result;
                next();
            });
        },
        function (next) {
            _Tickets.aggregate([
                { $match: _query },
                { $unwind: "$callId" },
                {
                    $lookup: {
                        from: 'cdrtransinfos',
                        localField: 'callId',
                        foreignField: 'callId',
                        as: 'call'
                    }
                },
                { $unwind: "$call" },
                {
                    $match: {
                        'call.transType': { $in: [1, 6, 7, 8] },
                        'call.serviceType': 3,
                        'call.callDuration': { $exists: true }
                    }
                },
                {
                    $group: {
                        _id: "$callId",
                        totalDuration: { $sum: { $cond: [{ $ne: [{ $max: "$call.answerTime" }, null] }, { $subtract: ['$call.endTime', '$call.ringTime'] }, 0] } },
                        callDuration: { $sum: "$call.callDuration" },
                        status: { $max: "$call.answerTime" },
                        startTime: { $first: "$call.startTime" },
                        fcrTime: { $first: "$fcrTime" }
                    }
                },
                { $match: { fcrTime: { $ne: null }, startTime: { $gt: 0 } } },
                {
                    $group: {
                        _id: {
                            year: { $year: "$fcrTime" },
                            month: { $month: "$fcrTime" },
                            day: { $dayOfMonth: "$fcrTime" }
                        },
                        totalCall: { $sum: 1 },
                        totalDuration: { $sum: "$totalDuration" },
                        avgDuration: { $avg: "$totalDuration" },
                        callDuration: { $sum: { $cond: [{ $ne: ["$status", null] }, "$callDuration", 0] } },
                        avgCallDuration: { $avg: { $cond: [{ $ne: ["$status", null] }, "$callDuration", null] } }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }

            ], next);
        },
        function (_transData, next) {
            _transData = _.map(_transData, function (el) {
                el.date = el._id.day + '-' + pad(el._id.month, 2) + '-' + el._id.year;
                el.waitDuration = el.totalDuration - el.callDuration;
                return el;
            });

            var paginator = new pagination.SearchPaginator({
                prelink: _.removeURLParameter(req.url, 'page'),
                current: page,
                rowsPerPage: rows,
                totalResult: _transData.length
            }
            );
            next(null, {
                paging: paginator.getPaginationData(),
                data: !_.has(req.query, 'download-excel') ? _transData.slice((page - 1) * 10, page * 10) : _transData
            });
        }
    ], function (err, result) {
        cb(err, result);
    });
}

function getData1(req, cb) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    var _query = {};
    _async.waterfall([
        function (next) {
            getQuery(req, function (result) {
                _query = result;
                next();
            });
        },
        function (next) {
            _Tickets.distinct('callId', _query, next);
        },
        function (ticketCallIds, next) {
            var callIds = [];
            _.each(ticketCallIds, function (el) {
                if (!el) return;
                callIds = callIds.concat(el);
            });

            if (callIds.length == 0) return next(null);

            var transAggs = [];
            var transQuery = {};
            transQuery.transType = { $in: [1, 6, 7, 8] };
            transQuery.serviceType = 3;
            transQuery.callDuration = { $exists: true };
            transAggs.push({ $match: transQuery });

            transAggs.push({ $match: { callId: { $in: callIds } } });

            transAggs.push({
                $group: {
                    _id: "$callId",
                    totalDuration: { $sum: { $cond: [{ $ne: [{ $max: "$answerTime" }, null] }, { $subtract: ['$endTime', '$ringTime'] }, 0] } },
                    callDuration: { $sum: "$callDuration" },
                    status: { $max: "$answerTime" },
                    startTime: { $first: "$startTime" }
                }
            });

            transAggs.push({ $match: { startTime: { $gt: 0 } } });

            transAggs.push({
                $group: {
                    _id: {
                        year: { $year: { "$add": [new Date(0), "$startTime"] } },
                        month: { $month: { "$add": [new Date(0), "$startTime"] } },
                        day: { $dayOfMonth: { "$add": [new Date(0), "$startTime"] } }
                    },
                    totalCall: { $sum: 1 },
                    totalDuration: { $sum: "$totalDuration" },
                    avgDuration: { $avg: "$totalDuration" },
                    callDuration: { $sum: { $cond: [{ $ne: ["$status", null] }, "$callDuration", 0] } },
                    avgCallDuration: { $avg: { $cond: [{ $ne: ["$status", null] }, "$callDuration", null] } }
                }
            });

            transAggs.push({ $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } });

            _CdrTransInfo.aggregate(transAggs, function (err, _transData) {
                _transData = _.map(_transData, function (el) {
                    el.date = el._id.day + '-' + pad(el._id.month, 2) + '-' + el._id.year;
                    el.waitDuration = el.totalDuration - el.callDuration;
                    return el;
                });

                var paginator = new pagination.SearchPaginator({
                    prelink: _.removeURLParameter(req.url, 'page'),
                    current: page,
                    rowsPerPage: rows,
                    totalResult: _transData.length
                }
                );
                next(err, {
                    paging: paginator.getPaginationData(),
                    data: !_.has(req.query, 'download-excel') ? _transData.slice((page - 1) * 10, page * 10) : _transData
                });
            });
        }
    ], function (err, result) {
        cb(err, result);
    });
}

function getDataDetail(req, cb) {
    var page = _.has(req.query, 'detail-page') ? parseInt(req.query['detail-page']) : 1;
    var rows = _.has(req.query, 'detail-rows') ? parseInt(req.query['detail-rows']) : 10;
    var _query = {};
    _async.waterfall([
        function (next) {
            getQuery(req, function (result) {
                _query = result;
                next();
            });
        },
        function (next) {
            if (_.has(req.query, 'detail-date')) {
                _query['fcrTime'] = {
                    $gte: _moment(req.query['detail-date'], 'DD-MM-YYYY').startOf('day')._d,
                    $lte: _moment(req.query['detail-date'], 'DD-MM-YYYY').endOf('day')._d
                }
            }

            var aggsDetail = [{ $match: _query }];

            aggsDetail.push({
                $lookup: {
                    from: 'field_so_dien_thoai',
                    localField: 'idCustomer',
                    foreignField: 'entityId',
                    as: 'customer_phone'
                }
            });
            aggsDetail.push({ $unwind: '$customer_phone' });
            aggsDetail.push({
                $lookup: {
                    from: 'field_ho_ten',
                    localField: 'idCustomer',
                    foreignField: 'entityId',
                    as: 'customer_name'
                }
            });
            // aggsDetail.push({$unwind: '$customer_name'});
            aggsDetail.push({ $unwind: { path: '$customer_name', preserveNullAndEmptyArrays: true } });
            aggsDetail.push({
                $lookup: {
                    from: 'users',
                    localField: 'idAgent',
                    foreignField: '_id',
                    as: 'agent_name'
                }
            });
            // aggsDetail.push({$unwind: '$agent_name'});
            // aggsDetail.push({$unwind: '$callId'});
            aggsDetail.push({ $unwind: { path: '$agent_name', preserveNullAndEmptyArrays: true } });
            aggsDetail.push({ $unwind: { path: '$callId', preserveNullAndEmptyArrays: true } });
            aggsDetail.push({
                $lookup: {
                    from: 'cdrtransinfos',
                    localField: 'callId',
                    foreignField: 'callId',
                    as: 'callId'
                }
            });
            // aggsDetail.push({$unwind: '$callId'});
            aggsDetail.push({ $unwind: { path: '$callId', preserveNullAndEmptyArrays: true } });
            aggsDetail.push({
                $match: {
                    'callId.serviceType': 3
                }
            });

            if (!_.has(req.query, 'download-excel-detail')) {
                aggsDetail.push({ $skip: (page - 1) * rows });
                aggsDetail.push({ $limit: rows });
            }

            _Tickets.aggregate(aggsDetail, function (err, ticketData) {
                ticketData = _.map(ticketData, function (el) {
                    el.customer_phone = !!el.customer_phone ? el.customer_phone.value : "";
                    el.customer_name = !!el.customer_name ? el.customer_name.value : "";
                    el.agent_name = !!el.agent_name ? el.agent_name.displayName : "";

                    if (!el.callId) return el;

                    el.called = el.callId.answerTime > 0 ? 1 : 0;
                    el.call_date = _moment(el.callId.startTime).format('DD-MM-YYYY');
                    el.start_time = _moment(el.callId.startTime).format('HH:mm:ss');
                    el.end_time = _moment(el.callId.endTime).format('HH:mm:ss');
                    el.called_time = _moment(el.callId.answerTime).format('HH:mm:ss');
                    el.call_duration = hms(el.callId.callDuration / 1000);

                    return el;
                });

                next(err, ticketData);
            });
        },
        function (data, next) {
            _Tickets.count(_query, function (err, totalItem) {

                var paginator = new pagination.SearchPaginator({
                    prelink: _.removeURLParameter(req.url, 'detail-page'),
                    current: page,
                    rowsPerPage: rows,
                    totalResult: totalItem
                });
                pagingDetail = paginator.getPaginationData();
                next(err, {
                    paging: paginator.getPaginationData(),
                    data: data
                });
            });
        }
    ], function (err, result) {
        cb(err, result);
    });
}

function getQuery(req, cb) {
    var _query = {
        fcr: 1,
        fcrTime: { $ne: null }
    };

    if (_.has(req.query, 'start-date')) {
        var startTime = req.query['start-date'] + ' ' + (!!req.query['start-hour'] ? req.query['start-hour'] : '00:00');
        startTime = _moment(startTime, 'DD/MM/YYYY HH:mm')._d;
        _query['fcrTime']['$gte'] = startTime;
    }

    if (_.has(req.query, 'end-date')) {
        var endTime = req.query['end-date'] + ' ' + (!!req.query['end-hour'] ? req.query['end-hour'] : '23:00');
        endTime = _moment(endTime, 'DD/MM/YYYY HH:mm').endOf('hour')._d;
        _query['fcrTime']['$lte'] = endTime;
    }

    if (_.has(req.query, 'campaign')) {
        var queryValue = req.query['campaign'];
        var key = queryValue.indexOf('campaign_') >= 0 ? 'idCampain' : 'idService';
        _query[key] = _.convertObjectId(queryValue.replace(queryValue.indexOf('campaign_') >= 0 ? 'campaign_' : 'service_', ''));;
    }

    if (_.has(req.query, 'agent')) _query['idAgent'] = _.convertObjectId(req.query['agent']);

    _async.waterfall([
        function (next) {
            if (_.has(req.query, 'campaign') || !_.has(req.query, 'company')) return next();
            _Services.find({ idCompany: req.query['company'] }, function (err, result) {
                _query['$or'] = [{ idService: { $in: _.pluck(result, '_id') } }];
                next();
            });
        },
        function (next) {
            if (_.has(req.query, 'campaign') || !_.has(req.query, 'company')) return next();
            _Campains.find({ idCompany: req.query['company'] }, function (err, result) {
                if (!_query['$or']) _query['$or'] = [];
                _query['$or'].push({ idCampain: { $in: _.pluck(result, '_id') } });
                next();
            });
        }
    ], function () {
        cb(_query);
    });
}

function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
}

function hms(secs) {
    if (isNaN(secs)) return "0:00:00";
    var sec = Math.ceil(secs);
    var minutes = Math.floor(sec / 60);
    sec = sec % 60;
    var hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    return pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(sec, 2);
}

function createExcelFile(data, callback) {
    var currentDate = new Date();
    var folderName = currentDate.getTime() + "";
    var fileName = titlePage + '-' + _moment(currentDate).format('DD-MM-YYYY');

    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'csv', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function (callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'csv', folderName), callback);
        },
        // Ghi dữ liệu ra file
        function (t, next) {
            var excelHeader = [
                'ngày'
                , 'tổng số cuộc gọi'
                , 'tổng số thời gian'
                , 'thời gian tb'
                , 'thời gian chờ'
                , 'thời lượng đàm thoại'
                , 'thời lượng đàm thoại tb'
            ];

            var workbook = new _Excel.Workbook();
            workbook.creator = "admin";
            workbook.created = new Date();
            var sheet = workbook.addWorksheet(titlePage);
            var column = [];

            _.each(excelHeader, function (header) {
                column.push({
                    header: header,
                    key: header,
                    width: header.length
                });
            });
            sheet.columns = column;

            if (data !== null) {
                // Ghi dữ liệu
                _.each(data, function (el) {
                    sheet.addRow([
                        el.date,
                        el.totalCall,
                        hms(el.totalDuration / 1000),
                        hms(el.avgDuration / 1000),
                        hms(el.waitDuration / 1000),
                        hms(el.callDuration / 1000),
                        hms(el.avgCallDuration / 1000)
                    ]);
                });
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            }
        },
        function (next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), next);
        },
        function (t, callback) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'csv', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                callback(err, folderZip.replace(_rootPath, ''));
            });
        }
    ], callback);
};

function createExcelFileDetail(data, callback) {
    var currentDate = new Date();
    var folderName = currentDate.getTime() + "";
    var fileName = titlePage + '-detail-' + _moment(currentDate).format('DD-MM-YYYY');

    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'csv', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function (callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'csv', folderName), callback);
        },
        // Ghi dữ liệu ra file
        function (t, next) {
            var excelHeader = [
                'sđt khách hàng'
                , 'tên khách hàng'
                , 'điện thoại viên'
                , 'nhận cuộc gọi'
                , 'trạng thái'
                , 'ngày gọi'
                , 'giờ bắt đầu'
                , 'giờ nhấc máy'
                , 'thời lượng đàm thoại'
                , 'giờ kết thúc'
                , 'hoàn thành'
                , 'đang xử lý'
            ];

            var workbook = new _Excel.Workbook();
            workbook.creator = "admin";
            workbook.created = new Date();
            var sheet = workbook.addWorksheet(titlePage);
            var column = [];

            _.each(excelHeader, function (header) {
                column.push({
                    header: header,
                    key: header,
                    width: header.length
                });
            });
            sheet.columns = column;

            if (data !== null) {
                // Ghi dữ liệu
                _.each(data, function (el) {
                    sheet.addRow([
                        el.customer_phone,
                        el.customer_name,
                        el.agent_name,
                        el.called == 1 ? "YES" : "NO",
                        el.status == 0 ? "Chờ xử lý" : (el.status == 1 ? "Đang xử lý" : (el.status == 2 ? "Hoàn thành" : '')),
                        el.call_date,
                        el.start_time,
                        el.called_time,
                        el.call_duration,
                        el.end_time,
                        el.status == 2 ? "YES" : "NO",
                        el.status == 1 ? "YES" : "NO",
                    ]);
                });
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            }
        },
        function (next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), next);
        },
        function (t, callback) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'csv', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                callback(err, folderZip.replace(_rootPath, ''));
            });
        }
    ], callback);
};