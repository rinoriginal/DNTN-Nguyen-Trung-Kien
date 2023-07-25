
var {
    getRequestDefault
} = require(path.join(_rootPath, 'commons', 'functions', 'index.js'));
const {
    TYPE_MISSCALL,
    TYPE_CALL_HANDLE,
} = require("../helpers/constants");
const { reasonToTelehub, sumByKey } = require("../helpers/functions");

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
    let { skillGroups } = req.query;
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

                    getReportRTCallType(startDate, endDate, skillGroups, '', (err, result) => {
                        cb(err, result);
                    });
                }
                // result2: function (cb) {

                //     return getReportRTCallType(startDate, endDate, skillGroups, 'month', (err, result) =>{
                //         console.log({err, result});
                //         cb(err, result);
                //     });
                // },
                // result3: function (cb) {
                //     /* Dailyusage */
                //     return getReportRTCallType(startDate, endDate, skillGroups, 'day', (err, result) =>{
                //         console.log({err, result});
                //         cb(err, result);
                //     });
                // },
                // result4: function (cb) {
                //     /* Hourusage */
                //     var companyId = [];
                //     if (_.has(req.query, 'idCompany')) {
                //         _.each(req.query.idCompany, function (o) {
                //             companyId.push(_.convertObjectId(o));
                //         })
                //     } else {
                //         companyId = _.pluck(com, "_id");
                //     }
                //     _Services.distinct("_id", { idCompany: { $in: companyId } }, function (err, service) {
                //         var query = {};
                //         query.startTime = {
                //             $gte: startDate,
                //             $lte: endDate
                //         };
                //         query.transType = { $in: [1, 7] };
                //         query.serviceId = { $in: service };
                //         var aggregate = [];
                //         aggregate.push({ $match: query });
                //         aggregate.push({
                //             $group: {
                //                 _id: {
                //                     _id: "$callId",
                //                     month: { $month: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } },
                //                     year: { $year: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } },
                //                     day: { $dayOfMonth: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } },
                //                     hour: { $hour: { $add: [new Date(7 * 60 * 60 * 1000), "$startTime"] } }
                //                 },
                //                 count: { $sum: 1 },
                //                 agentAnswer: { $sum: { $cond: [{ "$and": [{ "$eq": ["$serviceType", 3] }, { "$eq": ["$subReason", null] }] }, "$answerTime", 0] } },
                //                 callDuration: { $sum: { $cond: [{ "$and": [{ "$eq": ["$serviceType", 3] }, { "$eq": ["$subReason", null] }] }, "$callDuration", 0] } },
                //                 avgCallDuration: { $avg: { $cond: [{ $and: [{ "$eq": ["$subReason", null] }, { $eq: ["$serviceType", 3] }, { $gt: ["$answerTime", 0] }] }, "$callDuration", null] } }
                //             }
                //         });
                //         aggregate.push({
                //             $group: {
                //                 _id: {
                //                     hour: '$_id.hour',
                //                     day: '$_id.day',
                //                     month: "$_id.month",
                //                     year: "$_id.year"
                //                 },
                //                 connected: { $sum: { $cond: [{ $gt: ["$agentAnswer", 0] }, 1, 0] } },
                //                 totalCall: { $sum: 1 },
                //                 callDuration: { $sum: "$callDuration" },
                //                 avgCallDuration: { $avg: "$callDuration" }
                //             }
                //         });
                //         aggregate.push({
                //             $sort: {
                //                 '_id.hour': 1
                //             }
                //         });
                //         _CdrTransInfo.aggregate(aggregate, function (err, r) {
                //             cb(err, r);
                //         })
                //     })
                // },
                // result4: function (cb) {
                //     /* Hourlyusage: bao cao theo gio */
                //     return getReportRTCallType(startDate, endDate, skillGroups, 'hour', (err, result) => {
                //         console.log({ err, result });
                //         cb(err, result);
                //     });
                // },
            }, function (err, results) {
                /**
                 * 2020/11/17 hainv
                 * tính total từ result1
                 */

                if (results && results.result1) {

                    results.result1[0].forEach(item => {
                        total.totalCall += item.totalCall;
                        total.connected += item.connected;
                        total.callDuration += item.callDuration;
                    });
                }

                _.render(req, res, 'report-inbound-by-queue', {
                    title: 'Báo cáo gọi vào - Báo cáo theo queue',
                    result1: results.result1[0],
                    result2: results.result1[1], // báo cáo theo tháng
                    result3: results.result1[2], // Báo cáo theo ngày
                    result4: results.result1[3], // Báo cáo theo giờ
                    company: com,
                    total: total,
                    plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', 'highchart']
                }, true, err);
            }));
        })
    });
}

function getReportRTCallType(startDate, endDate, skillGroups, groupBy, callback) {

    let options = {
        startDate,
        endDate,
        callType: _config.cisco.apiCisco.callType,
        skillGroup: _config.cisco.apiCisco.skillGroup,
    };
    // _config.cisco.apiCisco.ip = 'http://localhost:4242'
    if (groupBy) options.groupBy = `groupBy=${groupBy}`;

    getRequestDefault(_config.cisco.apiCisco, `reportTCDGroupBy/byQueueMapping`, options, function (err, data, rowTotal, page, query, raw) {

        if (!err) {
            _async.parallel([
                (cb) => {
                    // query.groupBy = 'skillGroup';
                    getDataGroupBy({ ...raw }, query, 'skillGroup', cb)
                },
                (cb) => {
                    // query.groupBy = 'month';
                    getDataGroupBy({ ...raw }, query, 'month', cb)
                },
                (cb) => {
                    // query.groupBy = 'day';
                    getDataGroupBy({ ...raw }, query, 'day', cb)
                },
                (cb) => {
                    // query.groupBy = 'hour';
                    getDataGroupBy({ ...raw }, query, 'hour', cb)
                }
            ], function (err, rs) {
                callback(err, rs);
            })
            // callback(null, data);
        } else {
            callback({ message: err });
        }
    })
}

function getDataGroupBy(doc, query, groupBy, cb) {
    let data = [];
    switch (groupBy) {
        case "month":
            data = mappingReportByQueueByMonth(doc, query);
            break;
        case "day":
            data = mappingReportByQueueByDay(doc, query);
            break;
        case "hour":
            data = mappingReportByQueueByHour(doc, query);
            break;
        case "skillGroup":
        default:
            data = mappingReportByQueue(doc, query);
            break;
    }
    return cb(null, data);
}

function mappingReportByQueueByMonth(data, query) {
    let { recordset } = data;
    console.log("groupby month");
    // bỏ các bản tin Miss IVR
    recordset = recordset.filter((i) => i.SkillGroupSkillTargetID !== null);

    let groupBySkillGroup = _.groupBy(recordset, "EnterpriseName");

    let result = [];

    let { skillGroups } = query;
    if (skillGroups) skillGroups = skillGroups.split(",");

    Object.keys(groupBySkillGroup)
        .sort()
        .forEach((item) => {
            let element = groupBySkillGroup[item];
            let groupByKey = _.groupBy(groupBySkillGroup[item], "MonthBlock");


            Object.keys(groupByKey)
                .sort()
                .forEach((itemKey) => {
                    let eleKey = groupByKey[itemKey];

                    let temp = {};
                    let filterIVR = eleKey.filter(
                        (i) => i.CallTypeTXT == reasonToTelehub(TYPE_MISSCALL.MissIVR)
                    );

                    let filterCallHandled = eleKey.filter(
                        (i) => i.CallTypeTXT == reasonToTelehub(TYPE_CALL_HANDLE)
                    );

                    let totalDuration =
                        sumByKey(eleKey, "Duration") - sumByKey(filterIVR, "Duration");

                    // handle data mapping for report telehub
                    temp._id = {
                        name: element[0].SkillGroupSkillTargetID,
                        month: eleKey[0].MonthBlock,
                        year: eleKey[0].YearBlock,
                    };
                    temp.EnterpriseName = item;
                    temp.totalCall = eleKey.length - filterIVR.length;
                    temp.connected = filterCallHandled.length;
                    // element.missed = element.routerCallsAbandQ;
                    temp.callDuration = totalDuration * 1000;

                    result.push(temp);

                });
        });
    data.recordset = result;
    return result;
}

function mappingReportByQueueByDay(data, query) {
    let { recordset } = data;
    console.log("groupby mappingReportByQueueByDay");

    // bỏ các bản tin Miss IVR
    recordset = recordset.filter((i) => i.SkillGroupSkillTargetID !== null);

    let groupBySkillGroup = _.groupBy(recordset, "EnterpriseName");

    let result = [];

    let { skillGroups } = query;
    if (skillGroups) skillGroups = skillGroups.split(",");

    Object.keys(groupBySkillGroup)
        .sort()
        .forEach((item) => {
            let element = groupBySkillGroup[item];
            let groupByKey = _.groupBy(groupBySkillGroup[item], "DayMonthBlock");


            Object.keys(groupByKey)
                .sort()
                .forEach((itemKey) => {
                    let eleKey = groupByKey[itemKey];

                    let temp = {};
                    let filterIVR = eleKey.filter(
                        (i) => i.CallTypeTXT == reasonToTelehub(TYPE_MISSCALL.MissIVR)
                    );

                    let filterCallHandled = eleKey.filter(
                        (i) => i.CallTypeTXT == reasonToTelehub(TYPE_CALL_HANDLE)
                    );

                    let totalDuration =
                        sumByKey(eleKey, "Duration") - sumByKey(filterIVR, "Duration");

                    // handle data mapping for report telehub
                    temp._id = {
                        name: element[0].SkillGroupSkillTargetID,
                        day: eleKey[0].DayBlock,
                        month: eleKey[0].MonthBlock,
                        year: eleKey[0].YearBlock,
                    };
                    temp.EnterpriseName = item;
                    temp.totalCall = eleKey.length - filterIVR.length;
                    temp.connected = filterCallHandled.length;
                    // element.missed = element.routerCallsAbandQ;
                    temp.callDuration = totalDuration * 1000;

                    result.push(temp);

                });
        });
    data.recordset = result;
    return result;

}

function mappingReportByQueueByHour(data, query) {
    let { recordset } = data;
    console.log("groupby mappingReportByQueueByHour");

    // bỏ các bản tin Miss IVR
    recordset = recordset.filter((i) => i.SkillGroupSkillTargetID !== null);

    let groupBySkillGroup = _.groupBy(recordset, "EnterpriseName");
    let result = [];

    Object.keys(groupBySkillGroup)
        .sort()
        .forEach((item) => {
            let element = groupBySkillGroup[item];
            let groupByKey = _.groupBy(groupBySkillGroup[item], "TimeBlock");

            Object.keys(groupByKey)
                .sort()
                .forEach((itemKey) => {
                    let eleKey = groupByKey[itemKey];

                    // let eleKey = groupBySkillGroup[itemKey];

                    let temp = {};
                    let filterIVR = eleKey.filter(
                        (i) => i.CallTypeTXT == reasonToTelehub(TYPE_MISSCALL.MissIVR)
                    );

                    let filterCallHandled = eleKey.filter(
                        (i) => i.CallTypeTXT == reasonToTelehub(TYPE_CALL_HANDLE)
                    );

                    let totalDuration =
                        sumByKey(eleKey, "Duration") - sumByKey(filterIVR, "Duration");

                    // handle data mapping for report telehub
                    temp._id = {
                        name: element[0].SkillGroupSkillTargetID,
                        day: eleKey[0].DayBlock,
                        month: eleKey[0].MonthBlock,
                        year: eleKey[0].YearBlock,
                        hour: eleKey[0].HourBlock,
                    };
                    temp.EnterpriseName = itemKey;
                    temp.totalCall = eleKey.length - filterIVR.length;
                    temp.connected = filterCallHandled.length;
                    // element.missed = element.routerCallsAbandQ;
                    temp.callDuration = totalDuration * 1000;

                    result.push(temp);
                });
        });

    data.recordset = result;

    return data;
}


function mappingReportByQueue(data, query) {
    let { recordset } = data;
    console.log("groupby skillGroup");
    // bỏ các bản tin Miss IVR
    recordset = recordset.filter((i) => i.SkillGroupSkillTargetID !== null);

    let groupBySkillGroup = _.groupBy(recordset, "EnterpriseName");

    let result = [];

    let { skillGroups } = query;
    if (skillGroups) skillGroups = skillGroups.split(",");

    Object.keys(groupBySkillGroup)
        .sort()
        .forEach((item) => {
            let element = groupBySkillGroup[item];
            let temp = {};
            let filterIVR = element.filter(
                (i) => i.CallTypeTXT == reasonToTelehub(TYPE_MISSCALL.MissIVR)
            );

            let filterCallHandled = element.filter(
                (i) => i.CallTypeTXT == reasonToTelehub(TYPE_CALL_HANDLE)
            );

            let totalDuration =
                sumByKey(element, "Duration") - sumByKey(filterIVR, "Duration");

            // handle data mapping for report telehub
            temp._id = element[0].SkillGroupSkillTargetID;
            temp.EnterpriseName = item;
            temp.totalCall = element.length - filterIVR.length;
            temp.connected = filterCallHandled.length;
            // element.missed = element.routerCallsAbandQ;
            temp.callDuration = totalDuration * 1000;

            result.push(temp);
        });
    data.recordset = result;
    return result;

}