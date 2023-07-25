
var titlePage = 'Thời gian xử lý trung bình';
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

        }, function (err, result) {
            return _.render(req, res, 'report-processing-time', {
                title: titlePage,
                plugins: ['moment', 'jquery-mask', ['bootstrap-select'], ['bootstrap-daterangepicker']],
                companies: result.companies,
                agents: result.agents,
                data: !!result.data && !!result.data.data ? result.data.data : [],
                paging: !!result.data && !!result.data.paging ? result.data.paging : null
            }, true, err);
        });
    }
}

function getData(req, cb) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

    var _total = 0;
    var _aggs = [];

    _async.waterfall([
        function (next) {
            getQuery(req, next);
        },
        function (result, next) {
            _aggs = result;
            _WorkLog.aggregate(result, next);
        },
        function (result, next) {
            _total = result.length;

            _aggs.push({ $skip: (page - 1) * rows });
            _aggs.push({ $limit: rows });

            _WorkLog.aggregate(_aggs, next);
        }
    ], function (err, result) {

        var paginator = new pagination.SearchPaginator({
            prelink: _.removeURLParameter(req.url, 'page'),
            current: page,
            rowsPerPage: rows,
            totalResult: _total
        });

        var data = {
            data: result.map(function (el) {
                el.voiceTime = hms(el.voiceTime / 1000);
                el.voiceAvg = hms(el.voiceAvg / 1000);
                el.chatTime = hms(el.chatTime / 1000);
                el.chatAvg = hms(el.chatAvg / 1000);
                el.emailTime = hms(el.emailTime / 1000);
                el.emailAvg = hms(el.emailAvg / 1000);
                return el;
            }),
            paging: paginator.getPaginationData(),
        }

        cb(err, data);
    });
}


function getQuery(req, cb) {
    var aggs = [];
    var _query = { completeTime: { $ne: null }, processTime: { $ne: null } };

    if (_.has(req.query, 'startDate') && !!req.query['startDate']) {
        _query['createTime'] = {};
        _query['createTime']['$gte'] = _moment(req.query['startDate'], 'DD/MM/YYYY').startOf('day')._d;
    }

    if (_.has(req.query, 'endDate') && !!req.query['endDate']) {
        if (!_query['createTime']) _query['createTime'] = {};
        _query['createTime']['$lte'] = _moment(req.query['endDate'], 'DD/MM/YYYY').endOf('day')._d;
    }

    if (_.has(req.query, 'agent')) _query['idAgent'] = _.isArray(req.query['agent']) ? { $in: req.query['agent'].map(function (el) { return _.convertObjectId(el) }) } : _.convertObjectId(req.query['agent']);

    if (_.has(req.query, 'company')) _query['idCompany'] = _.isArray(req.query['company']) ? { $in: req.query['company'].map(function (el) { return _.convertObjectId(el) }) } : _.convertObjectId(req.query['company']);

    if (_.has(req.query, 'channel')) _query['type'] = _.isArray(req.query['channel']) ? { $in: req.query['channel'].map(function (el) { return Number(el) }) } : Number(req.query['channel']);

    log.info('---------------- ', _query);

    aggs.push({ $match: _query });

    aggs.push({
        $group: {
            _id: "$idAgent",
            voiceTime: { $sum: { $cond: [{ $eq: ["$type", 1] }, "$processTime", 0] } },
            voiceTicket: { $sum: { $cond: [{ $eq: ["$type", 1] }, 1, 0] } },
            voiceAvg: { $avg: { $cond: [{ $eq: ["$type", 1] }, "$processTime", null] } },
            chatTime: { $sum: { $cond: [{ $eq: ["$type", 2] }, "$processTime", 0] } },
            chatTicket: { $sum: { $cond: [{ $eq: ["$type", 2] }, 1, 0] } },
            chatAvg: { $avg: { $cond: [{ $eq: ["$type", 2] }, "$processTime", null] } },
            emailTime: { $sum: { $cond: [{ $eq: ["$type", 3] }, "$processTime", 0] } },
            emailTicket: { $sum: { $cond: [{ $eq: ["$type", 3] }, 1, 0] } },
            emailAvg: { $avg: { $cond: [{ $eq: ["$type", 3] }, "$processTime", null] } },

        }
    });

    aggs.push({ $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } });
    aggs.push({ $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } });

    cb(null, aggs);
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
                'AGENT'
                , 'VOICE'
                , 'CHAT'
                , 'EMAIL'
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
                        el.agent ? el.agent.displayName : "",
                        el.voiceTime,
                        el.chatTime,
                        el.emailTime,
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