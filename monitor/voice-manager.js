

var agents = [];

/**
 * Khởi tạo các module quản lý monitor
 */
function init() {
    setInterval(monitor, 10000);
}


/**
 * Được gọi liên tục để truy vấn dữ liệu monitor
 */
function monitor() {
    services = {};
    campaigns = {};
    var _queryTime = moment().startOf('day').toDate();
    _async.waterfall([
        function (next) {
            // lấy danh sách agent service
            _Users.aggregate([
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        displayName: 1,
                        groups: { $concatArrays: ["$agentGroupMembers", "$agentGroupLeaders"] }
                    }
                },
                { $unwind: { path: '$groups', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "agentgroups", localField: "groups.group", foreignField: "_id", as: "group" } },
                { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "groupprofiles", localField: "group.idProfile", foreignField: "_id", as: "profile" } },
                { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$profile.skills', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "services", localField: "profile.skills.idSkill", foreignField: "idSkill", as: "service" } },
                { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            idAgent: "$_id",
                            idCompany: "$profile.idCompany",
                            idService: "$service._id"
                        },
                        name: { $first: "$name" },
                        displayName: { $first: "$displayName" }
                    }
                },
                { $match: { "_id.idService": { $ne: null } } }
            ], function (err, result) {
                _.each(result, function (el) {
                    var callStatus = 5;
                    var workPlace = null;
                    var status = '';
                    if (!!_socketUsers[el._id.idAgent] && !!_socketUsers[el._id.idAgent].monitor) {
                        callStatus = _socketUsers[el._id.idAgent].monitor.getCallStatus();
                        workPlace = _socketUsers[el._id.idAgent].monitor.getWorkPlace();
                        status = _socketUsers[el._id.idAgent].monitor.getStatus() + '';
                    }

                    services[`${el._id.idAgent}-${el._id.idCompany}-${el._id.idService}`] = {
                        _id: el._id.idAgent,
                        idCompany: el._id.idCompany,
                        idService: el._id.idService,
                        isOnline: status[0] == 1 ? 1 : 0,
                        isVoice: callStatus != 5 ? 1 : 0,
                        isPhucVu: !!workPlace ? 1 : 0,
                        slCuocGoi: 0,
                        slCuocGoiBiNho: 0
                    }
                });
                next(err);
            });
        },
        function (next) {
            // lấy danh sách agent campaign
            _Tickets.aggregate([
                { $match: { idCampain: { $ne: null } } },
                {
                    $group: {
                        _id: {
                            idAgent: "$idAgent",
                            idCampaign: "$idCampain"
                        }
                    }
                },
                { $lookup: { from: "campains", localField: "_id.idCampaign", foreignField: "_id", as: "campain" } },
                { $unwind: { path: '$campain', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "users", localField: "_id.idAgent", foreignField: "_id", as: "agent" } },
                { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            idAgent: "$_id.idAgent",
                            idCompany: "$campain.idCompany",
                            idCampaign: "$_id.idCampaign"
                        },
                        name: { $first: "$agent.name" },
                        displayName: { $first: "$agent.displayName" }
                    }
                }
            ], function (err, result) {
                _.each(result, function (el) {
                    var callStatus = 5;
                    var workPlace = null;
                    var status = '';
                    if (!!_socketUsers[el._id.idAgent] && !!_socketUsers[el._id.idAgent].monitor) {
                        callStatus = _socketUsers[el._id.idAgent].monitor.getCallStatus();
                        workPlace = _socketUsers[el._id.idAgent].monitor.getWorkPlace();
                        status = _socketUsers[el._id.idAgent].monitor.getStatus() + '';
                    }
                    campaigns[`${el._id.idAgent}-${el._id.idCompany}-${el._id.idCampaign}`] = {
                        _id: el._id.idAgent,
                        idCompany: el._id.idCompany,
                        idCampaign: el._id.idCampaign,
                        isOnline: status[0] == 1 ? 1 : 0,
                        isVoice: callStatus != 5 ? 1 : 0,
                        isPhucVu: !!workPlace ? 1 : 0,
                        slCuocGoi: 0,
                        slCuocGoiBiNho: 0
                    }
                });
                next(err);
            });
        },
        function (next) {
            // lấy dữ liệu call của campaign
            var arr = [];
            _.each(campaigns, function (el, k) {
                if (!campaigns[k]) {
                    log.info("campaigns[k] ----------------", campaigns[k]);
                    return;
                }
                arr.push(function (next2) {
                    _async.waterfall([
                        function (next3) {
                            _Tickets.aggregate([
                                {
                                    $match: {
                                        idAgent: el._id,
                                        idCampain: el.idCampaign
                                    }
                                },
                                { $unwind: "$callId" },
                                { $group: { _id: null, callIds: { $push: "$callId" } } }
                            ], next3);
                        },
                        function (result, next3) {
                            if (!result[0]) return next3();

                            _CdrTransInfo.count({
                                // startTime: { $gte: _queryTime.valueOf() },
                                transType: { $in: [1, 6, 7, 8] },
                                serviceType: 3,
                                callDuration: { $exists: true },
                                callId: { $in: result[0].callIds }
                            }, function (err, result) {
                                if (!!err) return next3(err);
                                if (!!campaigns[k]) campaigns[k].slCuocGoi = result;
                                next3();
                            });
                        },
                    ], function (err) {
                        next2(err);
                    })
                })
            })

            _async.waterfall(arr, next);
        },
        function (next) {
            // lấy dữ liệu call của campaign
            var arr = [];
            _.each(services, function (el, k) {
                arr.push(function (next2) {
                    _async.waterfall([
                        function (next3) {
                            _Tickets.aggregate([
                                {
                                    $match: {
                                        idAgent: el._id,
                                        idService: el.idService
                                    }
                                },
                                { $unwind: "$callId" },
                                { $group: { _id: null, callIds: { $push: "$callId" } } }
                            ], next3);
                        },
                        function (result, next3) {
                            if (!result[0]) return next3();

                            _CdrTransInfo.aggregate([
                                {
                                    $match: {
                                        // startTime: { $gte: _queryTime.valueOf() },
                                        transType: { $in: [1, 6, 7, 8] },
                                        serviceType: 3,
                                        callDuration: { $exists: true },
                                        callId: { $in: result[0].callIds }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        total: { $sum: 1 },
                                        connected: { $sum: { $cond: [{ $gt: ["$startTime", 0] }, 1, 0] } }
                                    }
                                }
                            ], function (err, result) {
                                if (!!err || !result[0]) return next3(err);
                                if (services[k] && services[k].slCuocGoi){
                                    services[k].slCuocGoi = services[k].slCuocGoi ? result[0].total : 0;
                                }
                                if (services[k] && services[k].slCuocGoiBiNho){
                                    services[k].slCuocGoiBiNho = services[k].slCuocGoiBiNho ? result[0].total - result[0].connected: 0;
                                }
                                next3();
                            });
                        },
                    ], function (err) {
                        next2(err);
                    })
                })
            })

            _async.waterfall(arr, next);
        },
    ], function (err) {
        if (!!err) log.error(err);
        _.each(sio.sockets.sockets, function (s, k) {
            s.emit("VoiceMonitor", {
                services: services,
                campaigns: campaigns
            });
        });
    });
}

/**
 * hàm lấy dữ liệu monitor agent
 */
function getAgents() {
    return agents
}

function random() {
    return Math.floor(Math.random() * 100) + 1;
}

module.exports = {
    init: init,
    getAgents: getAgents
}