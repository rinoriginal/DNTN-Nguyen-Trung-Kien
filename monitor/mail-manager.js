

var agents = [];

/**
 * Khởi tạo các module quản lý monitor
 */
function init() {
    setInterval(monitor, 10000);
    setInterval(checkEmailLength, 10000);
}
/**
 * Được gọi liên tục để tính toán số lượng ký tự trong 1 email
 */
function checkEmailLength() {
    var _queryTime = moment().startOf('day').toDate();
    _async.waterfall([
        function (next) {
            _Mail.find({
                bodyLength: { $in: [null, 0] },
                created: { $gte: _queryTime }
            }, next);
        },
        function (result, next) {
            var _bulk = mongoClient.collection('mails').initializeUnorderedBulkOp({ useLegacyOps: true });
            _.each(result, function (el) {
                _bulk.find({ _id: el._id }).update({
                    $set: { bodyLength: el.body.length }
                });
            })
            if (_bulk == null || !_bulk.s.currentBatch) return next();
            _bulk.execute(function (err) {
                if (err) logger.error(err);
                next();
            });
        }
    ], function (err) {
        if (!!err) log.error(err);
    });
}

/**
 * Được gọi liên tục để truy vấn dữ liệu monitor
 */
function monitor() {
    // console.log("------------ mail manager ", agents.length);
    //  _socketUsers.emailStatus.status = 1 -> agent online

    agents = [];
    var _allAgents = [];

    var _queryTime = moment().startOf('day').toDate();

    _async.waterfall([
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
                { $lookup: { from: "groupprofilemails", localField: "group.idProfileMail", foreignField: "_id", as: "profile" } },
                { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$profile.skills', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "servicemails", localField: "profile.skills.idSkill", foreignField: "idSkill", as: "service" } },
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
            ], next);
        },
        function (result, next) {
            _.each(result, function (el) {
                var _idAgent = !!el._id && !!el._id.idAgent ? el._id.idAgent : null;

                _allAgents.push({
                    _id: _idAgent,
                    idCompany: el._id.idCompany,
                    idService: el._id.idService,
                    isOnline: !!_socketUsers[_idAgent] && !!_socketUsers[_idAgent].emailStatus ? _socketUsers[_idAgent].emailStatus.status : 0,
                    isTuongTac: !!_socketUsers[_idAgent] ? _socketUsers[_idAgent].emailTuongTac : 0,
                    displayName: el.displayName,
                    thoiGianPhanHoiMail: 0,
                    slEMailNhan: 0,
                    slEmailGuiDi: 0,
                    slEmailChuaXuLy: 0,
                    slEmailDangXuLy: 0,
                    slEmailTraLoi: 0,
                    slKyTuTrongMail: 0
                });
            });

            _Mail.aggregate([
                {
                    $match: {
                        created: { $gte: _queryTime },
                        // _id: new mongodb.ObjectID('5b39b233e7dae00a5769dd4d')
                        // $or: [
                        //     { service: { $ne: null } },
                        //     { campaign: { $ne: null } },
                        //     { replyTo: { $ne: null } }
                        // ]
                    }
                },
                { $lookup: { from: 'mails', localField: "replyTo", foreignField: '_id', as: 'replyTo' } },
                {
                    $project: {
                        _id: 1,
                        mail_status: 1,
                        agent: 1,
                        created: 1,
                        mail_type: 1,
                        service: 1,
                        bodyLength: 1,
                        replyTo: { $arrayElemAt: ["$replyTo", 0] },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        mail_status: 1,
                        agent: 1,
                        created: 1,
                        mail_type: 1,
                        campaign: { $cond: [{ $gt: ["$replyTo", 0] }, "$replyTo.campaign", "$campaign"] },
                        service: { $cond: [{ $gt: ["$replyTo", 0] }, "$replyTo.service", "$service"] },
                        replyTo: 1,
                        bodyLength: 1
                    }
                },
                { $lookup: { from: 'mailcampaigns', localField: "campaign", foreignField: '_id', as: 'campaign' } },
                { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        mail_status: 1,
                        agent: 1,
                        created: 1,
                        mail_type: 1,
                        service: { $cond: [{ $gt: ["$campaign", 0] }, "$campaign.setting", "$service"] },
                        replyTo: 1,
                        bodyLength: 1
                    }
                },
                { $lookup: { from: 'servicemails', localField: "service", foreignField: '_id', as: 'service' } },
                { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'ticketmails', localField: "_id", foreignField: 'mailId', as: 'ticket' } },
                { $unwind: { path: "$ticket", preserveNullAndEmptyArrays: true } },
                { $sort: { 'ticket.created': -1 } },
                {
                    $group: {
                        _id: {
                            mail: "$_id",
                            agent: "$agent",
                            company: "$service.idCompany",
                            service: "$service._id"
                        },
                        mail_type: { $first: "$mail_type" },
                        created: { $first: "$created" },
                        receiveTime: { $first: "$replyTo.created" },
                        ticketStatus: { $first: "$ticket.status" },
                        bodyLength: { $max: "$bodyLength" }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        mail_type: 1,
                        ticketStatus: 1,
                        thoiGianPhanHoiMail: { $cond: [{ $gt: ["$receiveTime", 0] }, { $subtract: ["$created", "$receiveTime"] }, 0] },
                        bodyLength: 1
                    }
                },
                {
                    $group: {
                        _id: { agent: "$_id.agent", company: "$_id.company", service: "$_id.service" },
                        slEMailNhan: { $sum: { $cond: [{ $eq: ["$mail_type", 2] }, 1, 0] } },
                        slEmailGuiDi: { $sum: { $cond: [{ $eq: ["$mail_type", 1] }, 1, 0] } },
                        slEmailChuaXuLy: {
                            $sum: {
                                $cond: [{
                                    $and: [
                                        { $eq: ["$mail_type", 2] },
                                        { $ne: ["$ticketStatus", 1] },
                                        { $ne: ["$ticketStatus", 2] }
                                    ]
                                }, 1, 0]
                            }
                        },
                        slEmailDangXuLy: {
                            $sum: {
                                $cond: [{
                                    $and: [
                                        { $eq: ["$mail_type", 2] },
                                        { $eq: ["$ticketStatus", 1] }
                                    ]
                                }, 1, 0]
                            }
                        },
                        slEmailTraLoi: {
                            $sum: {
                                $cond: [{
                                    $and: [
                                        { $gt: ["$thoiGianPhanHoiMail", 0] }
                                    ]
                                }, 1, 0]
                            }
                        },
                        thoiGianPhanHoiMail: { $sum: "$thoiGianPhanHoiMail" },
                        bodyLength: {
                            $max: {
                                $cond: [{ $eq: ["$mail_type", 1] }, "$bodyLength", 0]
                            }
                        }
                    }
                },
                { $lookup: { from: 'users', localField: "_id.agent", foreignField: '_id', as: 'agentInfo' } },
                { $unwind: { path: "$agentInfo", preserveNullAndEmptyArrays: true } }
            ], next);
        },
        function (result, next) {
            _.each(result, function (el) {
                var _idAgent = !!el._id && !!el._id.agent ? el._id.agent : null;
                var _idCompany = !!el._id && !!el._id.company ? el._id.company : null;
                var _idService = !!el._id && !!el._id.service ? el._id.service : null;

                agents.push({
                    _id: _idAgent,
                    idCompany: _idCompany,
                    idService: _idService,
                    isOnline: !!_socketUsers[_idAgent] && !!_socketUsers[_idAgent].emailStatus ? _socketUsers[_idAgent].emailStatus.status : 0,
                    isTuongTac: !!_socketUsers[_idAgent] ? _socketUsers[_idAgent].emailTuongTac : 0,
                    displayName: !!el.agentInfo ? el.agentInfo.displayName : '',
                    thoiGianPhanHoiMail: el.thoiGianPhanHoiMail,
                    slEMailNhan: el.slEMailNhan,
                    slEmailGuiDi: el.slEmailGuiDi,
                    slEmailChuaXuLy: el.slEmailChuaXuLy,
                    slEmailDangXuLy: el.slEmailDangXuLy,
                    slEmailTraLoi: el.slEmailTraLoi,
                    slKyTuTrongMail: el.bodyLength
                })
            });

            _.each(_allAgents, function (el) {
                var _exist = 0;
                _.each(agents, function (el2) {
                    if (el._id + '' == el2._id + '' && el.idService + '' == el2.idService + '') _exist = 1;
                })
                if (!_exist) agents.push(el);
            });

            next();
        }
    ], function (err) {
        if (!!err) log.error(err);
        // log.info(agents);
        _.each(sio.sockets.sockets, function (s, k) {
            s.emit("MailMonitor", agents);
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