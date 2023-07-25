

var {
	getRequestDefault
} = require(path.join(_rootPath, 'commons', 'functions', 'index.js'));

exports.index = function (req, res) {
    var result1 = [];
    var total = {
        totalCall: 0,
        connected: 0,
        callDuration: 0
    };
    var listMonth = [];
    var comQuery = {};
    var startDate = 0,
        endDate = 0;
    let {skillGroups} = req.query;
    if (req.session.auth.company) {
        comQuery._id = _.convertObjectId(req.session.auth.company._id);
    }
    _async.waterfall([
        function (cb) {
            if (_.has(req.query, "startDate")) {
                startDate = _moment(req.query['startDate'], "DD/MM/YYYY").startOf('day').format("YYYY-MM-DD HH:mm:ss")
                cb();
            } else {
                // _CdrTransInfo.findOne({}, { startTime: 1 }, { sort: { startTime: 1 } }, function (err, r) {
                //     if (r) {
                //         startDate = r.startTime;
                    // } else {
                        startDate = _moment().startOf('month').format("YYYY-MM-DD HH:mm:ss")
                //     }
                    cb();
                // })
            }
        },
        function (cb) {
            if (_.has(req.query, "endDate")) {
                endDate = _moment(req.query['endDate'], "DD/MM/YYYY").endOf('day').format("YYYY-MM-DD HH:mm:ss");
                cb()
            } else {
                // _CdrTransInfo.findOne({}, { endTime: 1 }, { sort: { endTime: -1 } }, function (err, r) {
                //     if (r) {
                //         endDate = r.endTime;
                //     } else {
                        endDate = _moment().format("YYYY-MM-DD HH:mm:ss")
                //     }
                    cb();
                // })
            }
        }
        // , function (cb) {
        //     listMonth.push(moment(startDate).format('DD/MM/YYYY'));
        //     for (var m = moment(endDate); moment(m.format("MM/YYYY"), "MM/YYYY").isAfter(moment(moment(startDate).format("MM/YYYY"), "MM/YYYY")); m.subtract(1, 'months')) {
        //         listMonth.push(m.format('DD/MM/YYYY'));
        //     }
        //     cb();
        // }
    ], function (err) {
        _Company.find(comQuery, function (err, com) {
            _.isEmpty(req.query) ? (_.render(req, res, 'report-inbound-by-queue', {
                title: 'Báo cáo gọi vào - Báo cáo theo queue',
                result1: [],
                result2: [],
                result3: [],
                result4: [],
                company: com,
                total: total,
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', 'highchart']
            }, true, err)) : (_async.parallel({
                result1: function (cb) {
                    var company = _.has(req.query, 'idCompany') ? req.query.idCompany : _.pluck(com, "_id");
                    
                    getReportRTCallType(startDate, endDate, skillGroups, 'skillGroup', (err, result) =>{
                        cb(err, result);
                    });
                },
                result2: function (cb) {
                    
                    return getReportRTCallType(startDate, endDate, skillGroups, 'month', (err, result) =>{
                        console.log({err, result});
                        cb(err, result);
                    });
                },
                result3: function (cb) {
                    /* Dailyusage */
                    return getReportRTCallType(startDate, endDate, skillGroups, 'day', (err, result) =>{
                        console.log({err, result});
                        cb(err, result);
                    });
                },
                result4: function (cb) {
                    /* Hourusage */
                    var companyId = [];
                    if (_.has(req.query, 'idCompany')) {
                        _.each(req.query.idCompany, function (o) {
                            companyId.push(_.convertObjectId(o));
                        })
                    } else {
                        companyId = _.pluck(com, "_id");
                    }
                    _Services.distinct("_id", { idCompany: { $in: companyId } }, function (err, service) {
                        var query = {};
                        query.startTime = {
                            $gte: startDate,
                            $lte: endDate
                        };
                        query.transType = { $in: [1, 7] };
                        query.serviceId = { $in: service };
                        var aggregate = [];
                        aggregate.push({ $match: query });
                        aggregate.push({
                            $group: {
                                _id: {
                                    _id: "$callId",
                                    month: { $month: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } },
                                    year: { $year: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } },
                                    day: { $dayOfMonth: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } },
                                    hour: { $hour: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } }
                                },
                                count: { $sum: 1 },
                                agentAnswer: { $sum: { $cond: [{ "$and": [{ "$eq": ["$serviceType", 3] }, { "$eq": ["$subReason", null] }] }, "$answerTime", 0] } },
                                callDuration: { $sum: { $cond: [{ "$and": [{ "$eq": ["$serviceType", 3] }, { "$eq": ["$subReason", null] }] }, "$callDuration", 0] } },
                                avgCallDuration: { $avg: { $cond: [{ $and: [{ "$eq": ["$subReason", null] }, { $eq: ["$serviceType", 3] }, { $gt: ["$answerTime", 0] }] }, "$callDuration", null] } }
                            }
                        });
                        aggregate.push({
                            $group: {
                                _id: {
                                    hour: '$_id.hour',
                                    day: '$_id.day',
                                    month: "$_id.month",
                                    year: "$_id.year"
                                },
                                connected: { $sum: { $cond: [{ $gt: ["$agentAnswer", 0] }, 1, 0] } },
                                totalCall: { $sum: 1 },
                                callDuration: { $sum: "$callDuration" },
                                avgCallDuration: { $avg: "$callDuration" }
                            }
                        });
                        aggregate.push({
                            $sort: {
                                '_id.hour': 1
                            }
                        });
                        _CdrTransInfo.aggregate(aggregate, function (err, r) {
                            cb(err, r);
                        })
                    })
                }
            }, function (err, results) {
                /**
                 * 2020/11/17 hainv
                 * tính total từ result1
                 */

                if(results && results.result1) {
                   
                    results.result1.forEach(item => {
                        total.totalCall += item.totalCall;
                        total.connected += item.connected;
                        total.callDuration += item.callDuration;
                    });
                }

                _.render(req, res, 'report-inbound-by-queue', {
                    title: 'Báo cáo gọi vào - Báo cáo theo queue',
                    result1: results.result1,
                    result2: results.result2, // báo cáo theo tháng
                    result3: results.result3, // Báo cáo theo ngày
                    result4: results.result4, // Báo cáo theo giờ
                    company: com,
                    total: total,
                    plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', 'highchart']
                }, true, err);
            }));
        })
    });
}

function getReportRTCallType(startDate, endDate, skillGroups, groupBy = 'skillGroup', callback) {

    let options = {
        startDate,
        endDate,
        callType: _config.cisco.apiCisco.callType,
        skillGroup: _config.cisco.apiCisco.skillGroup,
    };

    if(groupBy) options.groupBy = `groupBy=${groupBy}`;

    getRequestDefault(_config.cisco.apiCisco, `reportTCDGroupBy/byQueueMapping`, options, function(err, data) {

        if (!err ) {

            callback(null, data);
        }else {
            callback({message: err});
        }
    })
}