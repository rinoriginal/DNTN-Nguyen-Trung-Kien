
var titlePage = 'Báo cáo gọi vào ra';
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
                    if (!result) next({ message: "No data" });
                    createExcelFile(result, next);
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
                _Company.aggregate([{ $project: { _id: 1, name: 1 } }], callback);
            },
            services: function (callback) {
                _Services.aggregate([
                    {
                        $project: {
                            name: 1,
                            _id: 1,
                            idCompany: 1
                        }
                    }
                ], callback);
            },
            campaigns: function (callback) {
                _Campains.aggregate([
                    {
                        $project: {
                            name: 1,
                            _id: 1,
                            idCompany: 1
                        }
                    }
                ], callback);
            },
            agents: function (callback) {
                _Users.find({}, callback);
            },
            data: function (callback) {
                getData(req, callback);
            },
            dataDetail: function (callback) {
                if (!req.query['is-detail']) return callback();
                getDataDetail(req, callback);
            }
        }, function (err, result) {
            return _.render(req, res, 'report-outbound-inbound', {
                title: titlePage,
                plugins: ['moment', 'jquery-mask', ['bootstrap-select'], ['bootstrap-daterangepicker']],
                companies: result.companies,
                services: result.services,
                campaigns: result.campaigns,
                agents: result.agents,
                data: !!result.data ? result.data : {},
                //paging: !!result.data ? result.data.paging : null,
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
    var _data = {};
    _async.waterfall([
        function (next) {
            getQuery(req, function (result) {
                _query = result;
                next();
            });
        },
        function (next) {
            _Tickets.distinct('callId', {
                $and: [
                    _query,
                    { idCampain: { $ne: null } }
                ]
            }, next);
        },
        function (ticketCallIds, next) {
            var callIds = [];
            _.each(ticketCallIds, function (el) {
                if (!el) return;
                callIds = callIds.concat(el);
            });

            if (callIds.length == 0) {
                return next(null, [{ total: 0, connected: 0 }]);
            }

            var transAggs = [];
            var transQuery = {};
            transQuery.transType = { $in: [1, 6, 7, 8] };
            transQuery.serviceType = 3;
            transQuery.callDuration = { $exists: true };
            transAggs.push({ $match: transQuery });

            transAggs.push({ $match: { callId: { $in: callIds } } });

            transAggs.push({
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    connected: { $sum: { $cond: [{ $gt: ["$startTime", 0] }, 1, 0] } }
                }
            });

            _CdrTransInfo.aggregate(transAggs, next);
        },
        function (data, next) {
            _data.outbound_total = data[0].total;
            _data.outbound_connected = data[0].connected;
            _Tickets.count({
                $and: [
                    _query,
                    { idCampain: { $ne: null } }
                ]
            }, next);
        },
        function (count, next) {
            _data.outbound_tickets = count;
            _Tickets.distinct('callId', {
                $and: [
                    _query,
                    { idService: { $ne: null } }
                ]
            }, next);
        },
        function (ticketCallIds, next) {
            var callIds = [];
            _.each(ticketCallIds, function (el) {
                if (!el) return;
                callIds = callIds.concat(el);
            });

            if (callIds.length == 0) {
                return next(null, [{ total: 0, connected: 0 }]);
            }

            var transAggs = [];
            var transQuery = {};
            transQuery.transType = { $in: [1, 6, 7, 8] };
            transQuery.serviceType = 3;
            transQuery.callDuration = { $exists: true };
            transAggs.push({ $match: transQuery });

            transAggs.push({ $match: { callId: { $in: callIds } } });

            transAggs.push({
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    connected: { $sum: { $cond: [{ $gt: ["$startTime", 0] }, 1, 0] } }
                }
            });

            _CdrTransInfo.aggregate(transAggs, next);
        },
        function (data, next) {
            _data.inbound_total = data[0].total;
            _data.inbound_connected = data[0].connected;
            _data.inbound_missing = data[0].total - data[0].connected;
            _Tickets.count({
                $and: [
                    _query,
                    { idService: { $ne: null } }
                ]
            }, next);
        },
        function (count, next) {
            _data.inbound_tickets = count;
            next(null, _data);
        }
    ], function (err, result) {
        cb(err, result);
    });
}

function getDataDetail(req, cb) {
    var page = _.has(req.query, 'detail-page') ? parseInt(req.query['detail-page']) : 1;
    var rows = _.has(req.query, 'detail-rows') ? parseInt(req.query['detail-rows']) : 10;
    var _query = {};
    var _data = {};
    _async.waterfall([
        function (next) {
            getQuery(req, function (result) {
                _query = result;
                next();
            });
        },
        function (next) {
            _Tickets.distinct('callId', {
                $and: [
                    _query,
                    { idCampain: { $ne: null } }
                ]
            }, next);
        },
        function (ticketCallIds, next) {
            var callIds = [];
            _.each(ticketCallIds, function (el) {
                if (!el) return;
                callIds = callIds.concat(el);
            });

            if (callIds.length == 0) {
                return next(null, []);
            }

            var transAggs = [];
            var transQuery = {};
            transQuery.transType = { $in: [1, 6, 7, 8] };
            transQuery.serviceType = 3;
            transQuery.callDuration = { $exists: true };
            transAggs.push({ $match: transQuery });

            transAggs.push({ $match: { callId: { $in: callIds } } });

            transAggs.push({
                $group: {
                    _id: "$agentId",
                    total: { $sum: 1 },
                    callDuration: { $sum: { $cond: [{ $gt: ["$answerTime", 0] }, "$callDuration", 0] } },
                    avgCallDuration: { $avg: { $cond: [{ $gt: ["$answerTime", 0] }, "$callDuration", null] } }
                }
            });

            transAggs.push({
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'agent_name'
                }
            });
            transAggs.push({ $unwind: { path: '$agent_name', preserveNullAndEmptyArrays: true } });

            _CdrTransInfo.aggregate(transAggs, next);
        },
        function (data, next) {
            _.each(data, function (el) {
                if (!el._id) el._id = 'null';

                _data[el._id.toString()] = {
                    agent: !!el.agent_name ? el.agent_name.displayName : 'null',
                    outbound_total: el.total,
                    outbound_call_duration: el.callDuration,
                    outbound_avg_call_duration: el.avgCallDuration,
                    inbound_connect: 0,
                    inbound_wait_duration: 0,
                    inbound_call_duration: 0,
                    inbound_avg_call_duration: 0
                };
            });
            _Tickets.distinct('callId', {
                $and: [
                    _query,
                    { idService: { $ne: null } }
                ]
            }, next);
        },
        function (ticketCallIds, next) {
            var callIds = [];
            _.each(ticketCallIds, function (el) {
                if (!el) return;
                callIds = callIds.concat(el);
            });

            if (callIds.length == 0) {
                return next(null, []);
            }

            var transAggs = [];
            var transQuery = {};
            transQuery.transType = { $in: [1, 6, 7, 8] };
            transQuery.serviceType = 3;
            transQuery.callDuration = { $exists: true };
            transAggs.push({ $match: transQuery });

            transAggs.push({ $match: { callId: { $in: callIds } } });

            transAggs.push({
                $group: {
                    _id: "$agentId",
                    connect: { $sum: { $cond: [{ $gt: ["$startTime", 0] }, 1, 0] } },
                    callDuration: { $sum: { $cond: [{ $gt: ["$answerTime", 0] }, "$callDuration", 0] } },
                    avgCallDuration: { $avg: { $cond: [{ $gt: ["$answerTime", 0] }, "$callDuration", null] } },
                    waitDuration: { $sum: "$waitDuration" }
                }
            });

            transAggs.push({
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'agent_name'
                }
            });
            transAggs.push({ $unwind: { path: '$agent_name', preserveNullAndEmptyArrays: true } });

            _CdrTransInfo.aggregate(transAggs, next);
        },
        function (data, next) {
            _.each(data, function (el) {
                if (!el._id) el._id = 'null';
                var obj = _data[el._id.toString()];
                if (!obj) {
                    obj = {
                        outbound_total: 0,
                        outbound_call_duration: 0,
                        outbound_avg_call_duration: 0,
                        inbound_connect: 0,
                        inbound_wait_duration: 0,
                        inbound_call_duration: 0,
                        inbound_avg_call_duration: 0
                    };
                }
                obj.agent = !!el.agent_name ? el.agent_name.displayName : 'null';
                obj.inbound_connect = el.connect;
                obj.inbound_wait_duration = el.waitDuration;
                obj.inbound_call_duration = el.callDuration;
                obj.inbound_avg_call_duration = el.avgCallDuration;

                _data[el._id.toString()] = obj;
            });

            next(null, _.map(_.keys(_data), function (key) {
                return _data[key];
            }));
        }
    ], function (err, result) {
        var paginator = new pagination.SearchPaginator({
            prelink: _.removeURLParameter(req.url, 'detail-page'),
            current: page,
            rowsPerPage: rows,
            totalResult: result.length
        });

        cb(err, {
            paging: paginator.getPaginationData(),
            data: _.has(req.query, 'download-excel-detail') ? result : result.slice((page - 1) * rows, page * rows)
        });
    });
}

function getQuery(req, cb) {
    var _query = {
    };

    if (_.has(req.query, 'start-date')) {
        var startTime = req.query['start-date'] + ' ' + (!!req.query['start-hour'] ? req.query['start-hour'] : '00:00');
        startTime = _moment(startTime, 'DD/MM/YYYY HH:mm')._d;
        if (!_query['created']) _query['created'] = {};
        _query['created']['$gte'] = startTime;
    }

    if (_.has(req.query, 'end-date')) {
        var endTime = req.query['end-date'] + ' ' + (!!req.query['end-hour'] ? req.query['end-hour'] : '23:00');
        endTime = _moment(endTime, 'DD/MM/YYYY HH:mm').endOf('hour')._d;
        if (!_query['created']) _query['created'] = {};
        _query['created']['$lte'] = endTime;
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
                'OUTBOUND-TỔNG SỐ GỌI RA'
                , 'OUTBOUND-SỐ LƯỢNG CUỘC GỌI KẾT NỐI'
                , 'OUTBOUND-TỔNG SỐ PHIẾU'
                , 'INBOUND-TỔNG SỐ GỌI VÀO'
                , 'INBOUND-SỐ LƯỢNG CUỘC GỌI ĐƯỢC PHỤC VỤ'
                , 'INBOUND-SỐ LƯỢNG CUỘC GỌI LỠ'
                , 'INBOUND-TỔNG SỐ PHIẾU'
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
                sheet.addRow([
                    data.outbound_total,
                    data.outbound_connected,
                    data.outbound_tickets,
                    data.inbound_total,
                    data.inbound_connected,
                    data.inbound_missing,
                    data.inbound_tickets
                ]);
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
                'ĐIỆN THOẠI VIÊN'
                , 'OUTBOUND-TỔNG SỐ CUỘC GỌI'
                , 'OUTBOUND-THỜI GIAN ĐÀM THOẠI'
                , 'OUTBOUND-THỜI GIAN ĐÀM THOẠI TB'
                , 'INBOUND-SỐ LƯỢNG CUỘC GỌI KẾT NỐI'
                , 'INBOUND-THỜI GIAN CHỜ'
                , 'INBOUND-THỜI LƯỢNG ĐÀM THOẠI	'
                , 'INBOUND-THỜI LƯỢNG ĐÀM THOẠI TB'
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
                        el.agent,
                        el.outbound_total,
                        hms(el.outbound_call_duration / 1000),
                        hms(el.outbound_avg_call_duration / 1000),
                        el.inbound_connect,
                        hms(el.inbound_wait_duration / 1000),
                        hms(el.inbound_call_duration / 1000),
                        hms(el.inbound_avg_call_duration / 1000)
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