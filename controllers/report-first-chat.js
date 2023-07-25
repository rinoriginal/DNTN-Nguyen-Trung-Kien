var titlePage = 'first-chat';
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
                // _async.waterfall([
                //     function (callback) {
                //         if (!_.isEmpty(req.session.auth.company)) {
                //             var companyId = _.convertObjectId(req.session.auth.company._id);
                //             _ServicesChat.aggregate([
                //                 {$match: {idCompany: companyId}},
                //                 {$project: {_id: 1}}
                //             ], function (err, result) {
                //                 if (err) return callback(err, null);
                //                 cond.push({$match: {_id: {$in: _.pluck(result, '_id')}}});
                //                 callback(err, cond);
                //             });
                //         } else {
                //             callback(null, []);
                //         }
                //     },
                //     function (cond, callback) {
                //         cond.push({
                //             $project: {
                //                 name: 1,
                //                 _id: 1,
                //                 idCompany: 1
                //             }
                //         });
                //         _ServicesChat.aggregate(cond, callback);
                //     }
                // ], callback);

                var cond= [];
                if (!_.isEmpty(req.session.auth.company)) {
                    var companyId = _.convertObjectId(req.session.auth.company._id);
                    cond.push({$match:{"_id" : companyId}})
                }
                cond.push(
                    {$lookup: {
                            from: "companychannels",
                            localField: "_id",
                            foreignField: "idCompany",
                            as: "channels"
                        }},
                    {$unwind: "$channels"},
                    {$lookup: {
                            from: "servicechats",
                            localField: "channels._id",
                            foreignField: "idChannel",
                            as: "services"
                        }},
                    {$unwind: "$services"},
                    {$project: {
                            _id: "$services._id",
                            name: "$services.name",
                            idCompany: "$_id",
                        }}
                        )

                _Company.aggregate(cond, function(err, result){
                    // log.debug(109, err);
                    // log.debug(110, result);
                    callback(null, result)
                });
            },
            campaigns: function (callback) {
                return callback(null, []);
                // _async.waterfall([
                //     function (callback) {
                //         if (!_.isEmpty(req.session.auth.company)) {
                //             var companyId = _.convertObjectId(req.session.auth.company._id);
                //             _Campains.aggregate([
                //                 {$match: {idCompany: companyId}},
                //                 {$project: {_id: 1}}
                //             ], function (err, result) {
                //                 if (err) return callback(err, null);
                //                 cond.push({$match: {_id: {$in: _.pluck(result, '_id')}}});
                //                 callback(err, cond);
                //             });
                //         } else {
                //             callback(null, []);
                //         }
                //     },
                //     function (cond, callback) {
                //         cond.push({
                //             $project: {
                //                 name: 1,
                //                 _id: 1,
                //                 idCompany: 1
                //             }
                //         });
                //         _Campains.aggregate(cond, callback);
                //     }
                // ], callback);
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
            return _.render(req, res, 'report-first-chat', {
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
        // function(next){
        //     _Tickets.distinct('callId', _query, next);
        // },
        function (next) {
            var agg = [];

            agg.push({ $match: _query });
            agg.push({ $match: { status: 2 } },
                { $sort: { created: 1 } },
                {
                    $group: {
                        _id: {
                            service: "$idService",
                            day: { $dayOfMonth: "$created" }
                        }
                        , firstTicket: { $first: "$$ROOT" }

                    }
                },
                {
                    $lookup: {
                        from: "chatthreads",
                        localField: "firstTicket.threadId",
                        foreignField: "_id",
                        as:  "thread"
                    }},
                {$unwind:{path: "$thread", preserveNullAndEmptyArrays: true}},
                {$lookup: {
                        from: "chatlogs",
                        localField: "firstTicket.threadId",
                        foreignField: "threadId",
                        as: "logs"
                    }
                },
                {
                    $project: {
                        ticketId: "$firstTicket._id",
                        ticketCreated: "$firstTicket.created",
                        ticketAgentId: "$firstTicket.agentId",
                        serviceId: "$firstTicket.idService",
                        threadId: "$thread._id",
                        threadAgentId: "$thread.agentId",
                        threadAgentStatus: "$thread.agentStatusLogs",
                        threadCreated: "$thread.created",
                        logs: 1
                    }}	,
                {$unwind: {path: "$threadAgentStatus", preserveNullAndEmptyArrays:true}},
                {$group: {
                        _id: "$_id",
                        ticketId: { $first: "$ticketId" },
                        ticketCreated: { $first: "$ticketCreated" },
                        ticketAgentId: { $first: "$ticketAgentId" },
                        serviceId: { $first: "$serviceId" },
                        threadId: { $first: "$threadId" },
                        threadAgentId: { $first: "$threadAgentId" },
                        threadAgentStatus: { $first: "$threadAgentStatus" },
                        threadCreated: { $first: "$threadCreated" },
                        logs: { $first: "$logs" }
                    }
                },

                {$unwind:{path: "$logs", preserveNullAndEmptyArrays: true}},
                {$group: {
                        _id: "$_id",
                        ticketId: { $first: "$ticketId" },
                        ticketCreated: { $first: "$ticketCreated" },
                        ticketAgentId: { $first: "$ticketAgentId" },
                        serviceId: { $first: "$serviceId" },
                        threadId: { $first: "$threadId" },
                        threadAgentId: { $first: "$threadAgentId" },
                        threadAgentStatus: { $first: "$threadAgentStatus" },
                        threadCreated: { $first: "$threadCreated" },
                        firstLog: { $first: "$logs" },
                        lastLog: { $last: "$logs" },
                        logCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        ticketId: 1,
                        ticketCreated: 1,
                        ticketAgentId: 1,
                        serviceId: 1,
                        threadId: 1,
                        threadAgentId: 1,
                        threadAgentStatus: 1,
                        threadCreated: 1,
                        firstLog: 1,
                        lastLog: 1,
                        logCount: 1,
                        duration: { $subtract: ["$lastLog.created", "$threadCreated"] },
                        waitTime: { $subtract: ["$threadAgentStatus.created", "$threadCreated"] },
                        chatTime: { $subtract: ["$lastLog.created", "$firstLog.created"] }
                    }
                },

                {
                    $group: {
                        _id: null,
                        totalChat: { $sum: 1 },
                        totalDuration: { $sum: "$duration" },
                        avgDuration: { $avg: "$duration" },
                        waitDuration: { $sum: "$waitTime" },
                        chatDuration: { $sum: "$chatTime" },
                        avgChatDuration: { $avg: "$chatTime" }
                    }
                });

            _TicketsChat.aggregate(agg, function (err, _transData) {


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


            var aggsDetail = [{ $match: _query }];



            aggsDetail.push({ $match: { status: 2 } },
                { $sort: { created: 1 } },
                {
                    $group: {
                        _id: {
                            service: "$idService",
                            day: { $dayOfMonth: "$created" }
                        }
                        , firstTicket: { $first: "$$ROOT" }

                    }
                },
                {
                    $lookup: {
                        from: "chatthreads",
                        localField: "firstTicket.threadId",
                        foreignField: "_id",
                        as:  "thread"
                    }},
                {$unwind:{path: "$thread", preserveNullAndEmptyArrays: true}},
                {$lookup: {
                        from: "chatlogs",
                        localField: "firstTicket.threadId",
                        foreignField: "threadId",
                        as: "logs"
                    }
                },
                {
                    $project: {
                        ticketId: "$firstTicket._id",
                        ticketCreated: "$firstTicket.created",
                        ticketAgentId: "$firstTicket.idAgent",
                        serviceId: "$firstTicket.idService",
                        threadId: "$thread._id",
                        threadAgentId: "$thread.agentId",
                        threadCustomerId: "$thread.customerId",
                        threadAgentStatus: "$thread.agentStatusLogs",
                        threadCreated: "$thread.created",
                        status: "$thread.status",
                        logs: 1
                    }}	,
                {$unwind: {path: "$threadAgentStatus", preserveNullAndEmptyArrays:true}},
                {$group: {
                        _id: "$_id",
                        ticketId: {$first: "$ticketId"},
                        ticketCreated: {$first: "$ticketCreated"},
                        ticketAgentId: {$first: "$ticketAgentId"},
                        serviceId: {$first: "$serviceId"},
                        threadId: {$first: "$threadId"},
                        threadAgentId: {$first: "$threadAgentId"},
                        threadAgentStatus: {$first: "$threadAgentStatus"},
                        threadCustomerId: {$first: "$threadCustomerId"},
                        threadCreated: {$first: "$threadCreated"},
                        status: {$first: "$status"},
                        logs: {$first: "$logs"}
                    }},
                {$unwind:{path: "$logs", preserveNullAndEmptyArrays: true}},
                {$group: {
                        _id: "$_id",
                        ticketId: { $first: "$ticketId" },
                        ticketCreated: { $first: "$ticketCreated" },
                        ticketAgentId: { $first: "$ticketAgentId" },
                        serviceId: { $first: "$serviceId" },
                        threadId: { $first: "$threadId" },
                        threadAgentId: { $first: "$threadAgentId" },
                        threadAgentStatus: { $first: "$threadAgentStatus" },
                        threadCustomerId: { $first: "$threadCustomerId" },
                        threadCreated: { $first: "$threadCreated" },
                        status: { $first: "$status" },
                        firstLog: { $first: "$logs" },
                        lastLog: { $last: "$logs" },
                        logCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        ticketId: 1,
                        ticketCreated: 1,
                        ticketAgentId: 1,
                        serviceId: 1,
                        threadId: 1,
                        threadAgentId: 1,
                        threadAgentStatus: 1,
                        threadCustomerId: 1,
                        threadCreated: 1,
                        firstLog: 1,
                        lastLog: 1,
                        logCount: 1,
                        status: 1,
                        duration: { $subtract: ["$lastLog.created", "$threadCreated"] },
                        waitTime: { $subtract: ["$threadAgentStatus.created", "$threadCreated"] },
                        chatTime: { $subtract: ["$lastLog.created", "$firstLog.created"] }
                    }
                },
                {
                    $lookup: {
                        from: "ticketchats",
                        localField: "ticketId",
                        foreignField: "_id",
                        as: "tickets"
                    }
                },
                { $unwind: "$tickets" },
                {
                    $group: {
                        _id: "$_id",
                        ticketId: { $first: "$ticketId" },
                        ticketCreated: { $first: "$ticketCreated" },
                        ticketAgentId: { $first: "$ticketAgentId" },
                        serviceId: { $first: "$serviceId" },
                        threadId: { $first: "$threadId" },
                        threadAgentId: { $first: "$threadAgentId" },
                        threadAgentStatus: { $first: "$threadAgentStatus" },
                        threadCustomerId: { $first: "$threadCustomerId" },
                        threadCreated: { $first: "$threadCreated" },
                        status: { $first: "$status" },
                        firstLog: { $first: "$firstLog" },
                        lastLog: { $first: "$lastLog" },
                        logCount: { $first: "$logCount" },
                        duration: { $first: "$duration" },
                        waitTime: { $first: "$waitTime" },
                        chatTime: { $first: "$chatTime" },
                        ticket_count: { $sum: 1 },
                        ticketProcessing: { $sum: { $cond: { if: { $eq: ["$tickets.status", 1] }, then: 1, else: 0 } } },
                        ticketDone: { $sum: { $cond: { if: { $eq: ["$tickets.status", 2] }, then: 1, else: 0 } } }
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "ticketAgentId",
                        foreignField: "_id",
                        as: "agent"
                    }
                },
                { $unwind: "$agent" },
                {
                    $lookup: {
                        from: "field_ho_ten",
                        localField: "threadCustomerId",
                        foreignField: "entityId",
                        as: "customer"
                    }
                },
                { $unwind: "$customer" },
                {
                    $lookup: {
                        from: "field_so_dien_thoai",
                        localField: "threadCustomerId",
                        foreignField: "entityId",
                        as: "customerPhone"
                    }
                },
                { $unwind: "$customerPhone" },
                {
                    $project: {
                        ticketId: 1,
                        ticketCreated: 1,
                        ticketAgentId: 1,
                        serviceId: 1,
                        threadId: 1,
                        threadAgentId: 1,
                        threadAgentStatus: 1,
                        threadCustomerId: 1,
                        threadCreated: 1,
                        status: 1,
                        firstLog: 1,
                        lastLog: 1,
                        logCount: 1,
                        duration: 1,
                        waitTime: 1,
                        chatTime: 1,
                        ticket_count: 1,
                        ticketProcessing: 1,
                        ticketDone: 1,
                        customer_name: "$customer.value",
                        customer_phone: "$customerPhone.value",
                        agent_name: "$agent.name"
                    }
                },
                { $unwind: "$threadAgentId" },
                {
                    $lookup: {
                        from: "users",
                        localField: "threadAgentId",
                        foreignField: "_id",
                        as: "agent"
                    }
                },
                { $unwind: "$agent" },
                {
                    $project: {
                        ticketId: 1,
                        ticketCreated: 1,
                        ticketAgentId: 1,
                        serviceId: 1,
                        threadId: 1,
                        threadAgentId: 1,
                        threadAgentStatus: 1,
                        threadCustomerId: 1,
                        threadCreated: 1,
                        status: 1,
                        firstLog: 1,
                        lastLog: 1,
                        logCount: 1,
                        duration: 1,
                        waitTime: 1,
                        chatTime: 1,
                        ticket_count: 1,
                        ticketProcessing: 1,
                        ticketDone: 1,
                        customer_name: 1,
                        customer_phone: 1,
                        agent_name: 1,
                        threadAgentName: "$agent.name"
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        ticketId: { $first: "$ticketId" },
                        ticketCreated: { $first: "$ticketCreated" },
                        ticketAgentId: { $first: "$ticketAgentId" },
                        serviceId: { $first: "$serviceId" },
                        threadId: { $first: "$threadId" },
                        threadAgentId: { $push: "$threadAgentId" },
                        threadAgentStatus: { $first: "$threadAgentStatus" },
                        threadCustomerId: { $first: "$threadCustomerId" },
                        threadCreated: { $first: "$threadCreated" },
                        status: { $first: "$status" },
                        firstLog: { $first: "$firstLog" },
                        lastLog: { $first: "$lastLog" },
                        logCount: { $first: "$logCount" },
                        duration: { $first: "$duration" },
                        waitTime: { $first: "$waitTime" },
                        chatTime: { $first: "$chatTime" },
                        ticket_count: { $first: "$ticket_count" },
                        ticketProcessing: { $first: "$ticketProcessing" },
                        ticketDone: { $first: "$ticketDone" },
                        customer_name: { $first: "$customer_name" },
                        customer_phone: { $first: "$customer_phone" },
                        agent_name: { $first: "$agent_name" },
                        threadAgentName: { $push: "$threadAgentName" }
                    }
                });
            var raw_query = aggsDetail;
            if (!_.has(req.query, 'download-excel-detail')) {
                aggsDetail.push({ $skip: (page - 1) * rows });
                aggsDetail.push({ $limit: rows });
            }
            _TicketsChat.aggregate(aggsDetail, function (err, ticketData) {
                ticketData = _.map(ticketData, function (el) {


                    el.chat_date = _moment(el.firstLog.created).format('DD-MM-YYYY');
                    el.start_time = _moment(el.firstLog.created).format('HH:mm:ss');
                    el.end_time = _moment(el.lastLog.created).format('HH:mm:ss');
                    el.chat_duration = hms(el.chatTime / 1000);

                    return el;
                });

                next(err, ticketData, raw_query);
            });
        },
        function (data, raw_query, next) {
            _TicketsChat.aggregate(raw_query, function (err, totalItem) {

                var paginator = new pagination.SearchPaginator({
                    prelink: _.removeURLParameter(req.url, 'detail-page'),
                    current: page,
                    rowsPerPage: rows,
                    totalResult: totalItem.length
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
        created: { $gte: 0 }
    };

    if (_.has(req.query, 'start-date')) {
        var startTime = req.query['start-date'] + ' ' + (!!req.query['start-hour'] ? req.query['start-hour'] : '00:00');
        startTime = _moment(startTime, 'DD/MM/YYYY HH:mm').valueOf();
        _query['created']['$gte'] = new Date(startTime);
    }

    if (_.has(req.query, 'end-date')) {
        var endTime = req.query['end-date'] + ' ' + (!!req.query['end-hour'] ? req.query['end-hour'] : '23:00');
        endTime = _moment(endTime, 'DD/MM/YYYY HH:mm').endOf('hour').valueOf();
        _query['created']['$lte'] = new Date(endTime);
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
            // _ServicesChat.find({idCompany: req.query['company']}, function(err, result){
            //     _query['$or'] = [{idService: {$in: _.pluck(result, '_id')}}];
            //     next();
            // });
            var agg = [];

            agg.push({ $match: { "idCompany": new mongodb.ObjectID(req.query.company) } },
                {
                    $lookup: {
                        from: "servicechats",
                        localField: "_id",
                        foreignField: "idChannel",
                        as: "serviceChat"
                    }
                },
                { $unwind: "$serviceChat" },
                {
                    $project: {
                        serviceId: "$serviceChat._id"
                    }
                });
            _CompanyChannel.aggregate(agg, function (err, result) {
                _query['$or'] = [{ idService: { $in: _.pluck(result, 'serviceId') } }];
                next();
            })
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
                        el.totalChat,
                        hms(el.totalDuration / 1000),
                        hms(el.avgDuration / 1000),
                        hms(el.waitDuration / 1000),
                        hms(el.chatDuration / 1000),
                        hms(el.avgChatDuration / 1000)
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
                , 'trạng thái'
                , 'ngày chat'
                , 'giờ bắt đầu'
                , 'thời lượng chat'
                , 'giờ kết thúc'
                , 'tổng số phiếu'
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
                        el.status == 0 ? "Hoàn thành" : "Đang chat",
                        el.chat_date,
                        el.start_time,
                        el.chat_duration,
                        el.end_time,
                        el.ticket_count,
                        el.ticketDone,
                        el.ticketProcessing
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