
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
    // console.log("------------ mail manager ", agents.length);
    //  _socketUsers.emailStatus.status = 1 -> agent online

    agents = [];
    var _tempArr = {};
    var _queryTime = moment().startOf('day').toDate();

    _async.waterfall([
        function (next) {
            _ChatThread.find({
                idServiceChat: null
            }, next);
        },
        function (result, next) {
            var _bulk = mongoClient.collection('chatthreads').initializeUnorderedBulkOp({ useLegacyOps: true });
            _.each(result, function (el) {
                if (!el.clientId) return;
                _bulk.find({ _id: el._id }).update({
                    $set: { idServiceChat: _.convertObjectId(el.clientId.split('-')[2]) }
                });
            })

            if (_bulk == null || !_bulk.s.currentBatch) return next();
            _bulk.execute(function (err) {
                if (err) logger.error(err);
                next();
            });
        },
        function (next) {

            _ChatThread.aggregate([
                { $match: { created: { $gte: _queryTime } } },
                {
                    $project: {
                        _id: 1,
                        clientId: 1,
                        idServiceChat: 1,
                        channelId: 1,
                        created: 1,
                        updated: 1,
                        status: 1,
                        agentMessage: { $arrayElemAt: ["$agentMessage", 0] },
                        agentId: { $arrayElemAt: ["$agentId", 0] },
                        customerId: 1,
                        thoiGianChat: { $subtract: ["$lastAgentChatTime", "$created"] }
                    }
                },
                { $lookup: { from: "companychannels", localField: "channelId", foreignField: "_id", as: "channel" } },
                { $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            idCompany: "$channel.idCompany",
                            idServiceChat: "$idServiceChat",
                            idAgent: "$agentId"
                        },
                        slChatTrongHeThong: { $sum: { $cond: [{ $eq: ["$status", 1] }, 1, 0] } },
                        slChatChoPhucVu: {
                            $sum: {
                                $cond: [{
                                    $and: [
                                        { $eq: ["$agentMessage.send", 0] },
                                        { $eq: ["$status", 1] }
                                    ]
                                }, 1, 0]
                            }
                        },
                        slChatNho: {
                            $sum: {
                                $cond: [{
                                    $and: [
                                        { $eq: ["$agentMessage.send", 0] },
                                        { $eq: ["$status", 0] }
                                    ]
                                }, 1, 0]
                            }
                        },
                        slChatDangPhucVu: {
                            $sum: {
                                $cond: [{
                                    $and: [
                                        { $gt: ["$agentMessage.send", 0] },
                                        { $eq: ["$status", 1] }
                                    ]
                                }, 1, 0]
                            }
                        },
                        slChatDaPhucVu: { $sum: { $cond: [{ $gt: ["$agentMessage.send", 0] }, 1, 0] } },
                        total: { $sum: 1 },
                        thoiGianChat: { $sum: "$thoiGianChat" },
                        slMessageMotPhienChat: { $avg: "$agentMessage.send" },
                        slMessage: { $sum: "$agentMessage.send" }
                    }
                }
            ], function (err, result) {
                _.each(result, function (el) {
                    if (!el._id.idAgent) {
                        agents.push({
                            _id: el._id.idAgent,
                            idCompany: el._id.idCompany,
                            idServiceChat: el._id.idServiceChat,
                            slChatTrongHeThong: el.slChatTrongHeThong,
                            slChatChoPhucVu: el.slChatChoPhucVu,
                            slChatDangPhucVu: el.slChatDangPhucVu,
                            slChatNho: el.slChatNho,
                            slChatDaPhucVu: el.slChatDaPhucVu,
                            total: el.total,
                            thoiGianChat: el.thoiGianChat,
                            slMessageMotPhienChat: el.slMessageMotPhienChat,
                            slMessage: el.slMessage
                        });
                    };


                    _tempArr[`${el._id.idAgent}-${el._id.idCompany}-${el._id.idServiceChat}`] = {
                        _id: el._id.idAgent,
                        idCompany: el._id.idCompany,
                        idServiceChat: el._id.idServiceChat,
                        isOnline: !!_socketUsers[el._id.idAgent] ? (!!_socketUsers[el._id.idAgent].chatStatus ? _socketUsers[el._id.idAgent].chatStatus.status : 0) : 0,
                        isChatting: el.slChatDangPhucVu > 0 ? 1 : 0,
                        slChatTrongHeThong: el.slChatTrongHeThong,
                        slChatChoPhucVu: el.slChatChoPhucVu,
                        slChatDangPhucVu: el.slChatDangPhucVu,
                        slChatNho: el.slChatNho,
                        slChatDaPhucVu: el.slChatDaPhucVu,
                        total: el.total,
                        thoiGianChat: el.thoiGianChat,
                        slMessageMotPhienChat: el.slMessageMotPhienChat,
                        slMessage: el.slMessage
                    };
                });

                next(err);
            });
        },
        function (next) {
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
                { $lookup: { from: "groupprofilechats", localField: "group.idProfileChat", foreignField: "_id", as: "profile" } },
                { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$profile.skills', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "servicechats", localField: "profile.skills.idSkill", foreignField: "idSkill", as: "service" } },
                { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: {
                            idAgent: "$_id",
                            idCompany: "$profile.idCompany",
                            idServiceChat: "$service._id"
                        },
                        name: { $first: "$name" },
                        displayName: { $first: "$displayName" }
                    }
                },
                { $match: { "_id.idServiceChat": { $ne: null } } }
            ], function (err, result) {
                if (!!err) return next(err);
                _.each(result, function (el) {
                    var obj = {
                        _id: el._id.idAgent,
                        displayName: el.displayName,
                        name: el.name,
                        idCompany: el._id.idCompany,
                        idServiceChat: el._id.idServiceChat,
                        isOnline: !!_socketUsers[el._id.idAgent] ? (!!_socketUsers[el._id.idAgent].chatStatus ? _socketUsers[el._id.idAgent].chatStatus.status : 0) : 0,
                        isChatting: 0,
                        slChatTrongHeThong: 0,
                        slChatChoPhucVu: 0,
                        slChatDangPhucVu: 0,
                        slChatNho: 0,
                        slChatDaPhucVu: 0,
                        total: 0,
                        thoiGianChat: 0,
                        slMessageMotPhienChat: 0,
                        slMessage: 0
                    };

                    var obj2 = _tempArr[`${el._id.idAgent}-${el._id.idCompany}-${el._id.idServiceChat}`];
                    if (!obj2) return agents.push(obj);

                    obj.isChatting = obj2.isChatting;
                    obj.slChatTrongHeThong = obj2.slChatTrongHeThong;
                    obj.slChatChoPhucVu = obj2.slChatChoPhucVu;
                    obj.slChatDangPhucVu = obj2.slChatDangPhucVu;
                    obj.slChatNho = obj2.slChatNho;
                    obj.slChatDaPhucVu = obj2.slChatDaPhucVu;
                    obj.total = obj2.total;
                    obj.thoiGianChat = obj2.thoiGianChat;
                    obj.slMessageMotPhienChat = obj2.slMessageMotPhienChat;
                    obj.slMessage = obj2.slMessage;

                    agents.push(obj);
                });
                next();
            });
        },
    ], function (err) {
        if (!!err) log.error(err);
        // log.info(agents);
        _.each(sio.sockets.sockets, function (s, k) {
            s.emit("ChatMonitor", agents);
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