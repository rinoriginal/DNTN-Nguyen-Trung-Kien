
var campaigns = {};
var groups = {};
var services = {};
var ticket = require(path.join(_rootPath, 'monitor', 'ticket-monitor.js'))();

/**
 * Khởi tạo các module quản lý monitor
 */
function init() {
    // Khai báo module quản lý campaign
    _Campains.find({ status: { $ne: 0 }, type: { $ne: 1 }, autoDialingStatus: { $nin: [2, 3] } }).populate('trunk').exec(function (err, cps) {
        _.each(cps, function (cp) {
            campaigns[cp._id.toString()] = require(path.join(_rootPath, 'monitor', 'campaign-monitor.js'))(cp);
        });
        setInterval(dialing, 1000);
    });

    // Khai báo module quản lý service và group
    _async.parallel({
        groups: function (next) {
            _AgentGroups.find({ status: { $ne: 0 } }, next);
        },
        services: function (next) {
            _Services.find({ status: { $ne: 0 } }, next);
        },
        //campaigns: function(next){
        //    _Campains.find({status: {$ne: 0}}, next);
        //}
    }, function (err, result) {
        _.each(result.groups, function (gp) {
            groups[gp._id.toString()] = require(path.join(_rootPath, 'monitor', 'group-monitor.js'))(gp);
        });

        _.each(result.services, function (gp) {
            services[gp._id.toString()] = require(path.join(_rootPath, 'monitor', 'service-monitor.js'))(gp);
        });

        setInterval(alert, 1000);
    });

    setInterval(cleanTicket, 86400000);

    validateFirstCall();
    setInterval(validateFirstCall, 60 * 60 * 1000);
    setInterval(customerInteractiveVoice, 10 * 1000);
    setInterval(customerInteractiveChat, 10 * 1000);
    setInterval(customerInteractiveMail, 10 * 1000);
}

/*
    trungdt: báo cáo tương tác khách hàng - mail
*/
function customerInteractiveMail() {
    var _dateStr = _moment().format('YYYY-MM-DD');
    var _date = _moment().startOf('day').toDate();
    _async.waterfall([
        function (next) {
            mongoClient.collection("mails").aggregate([
                {
                    $match: {
                        created: { $gte: _date },
                        mail_type: 2,
                        service: { $ne: null }
                    }
                },
                { $lookup: { from: 'mails', localField: "_id", foreignField: 'replyTo', as: 'response' } },
                { $lookup: { from: 'servicemails', localField: "service", foreignField: '_id', as: 'service' } },

                {
                    $project: {
                        _id: 1,
                        response: { $cond: [{ $gt: [{ $size: "$response" }, 0] }, 1, 0] },
                        email: "$from",
                        service: { $arrayElemAt: ["$service", -1] }
                    }
                },
                {
                    $group: {
                        _id: {
                            idCompany: "$service.idCompany",
                            idMailService: "$service._id",
                            email: "$email"
                        },
                        connected: { $sum: { $cond: [{ $eq: ["$response", 1] }, 1, 0] } },
                        total: { $sum: 1 }
                    }
                },
                { $lookup: { from: 'customerindex', localField: '_id.email', foreignField: 'field_e_mail', as: 'customer' } },
                {
                    $project: {
                        _id: 1,
                        idCompany: "$_id.idCompany",
                        idMailService: "$_id.idMailService",
                        customer: { $arrayElemAt: ["$customer", -1] },
                        email: "$_id.email",
                        connected: "$connected",
                        notConnected: { $subtract: ["$total", "$connected"] }
                    }
                }
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            var _bulk = mongoClient.collection('customerinteractive').initializeUnorderedBulkOp({ useLegacyOps: true });

            result.forEach(function (el) {
                _bulk.find({
                    idCompany: el.idCompany,
                    idMailService: el.idMailService,
                    idCustomer: !!el.customer ? el.customer._id : null,
                    email: el.email,
                    date: _dateStr
                }).upsert().replaceOne({
                    idCompany: el.idCompany,
                    idMailService: el.idMailService,
                    idCustomer: !!el.customer ? el.customer._id : null,
                    email: el.email,
                    date: _dateStr,
                    mailConnected: el.connected,
                    mailNotConnected: el.notConnected
                });
            });

            if (_bulk == null || !_bulk.s.currentBatch) return next();
            _bulk.execute(function (err) {
                next(err);
            });
        }
    ], function (err) {
        if (!!err) log.error(err);
    });
}


/*
    trungdt: báo cáo tương tác khách hàng - chat
*/

function customerInteractiveChat() {
    var _dateStr = _moment().format('YYYY-MM-DD');
    var _date = _moment().startOf('day').toDate();
    _async.waterfall([
        function (next) {
            mongoClient.collection("customerinteractive").remove({
                idChatService: { $ne: null },
                date: _dateStr
            }, function (err) {
                next(err);
            })
        },
        function (next) {
            mongoClient.collection("chatthreads").aggregate([
                { $match: { created: { $gte: _date }, idServiceChat: { $ne: null } } },
                { $lookup: { from: "companychannels", localField: "channelId", foreignField: "_id", as: "channel" } },
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
                        phone: 1,
                        email: 1,
                        channel: { $arrayElemAt: ["$channel", -1] }
                    }
                },
                {
                    $group: {
                        _id: {
                            idCompany: "$channel.idCompany",
                            idChatService: "$idServiceChat",
                            phone: "$phone",
                            email: "$email"
                        },
                        slChatDaPhucVu: { $sum: { $cond: [{ $gt: ["$agentMessage.send", 0] }, 1, 0] } },
                        slChat: { $sum: 1 }
                    }
                },
                { $lookup: { from: 'customerindex', localField: '_id.phone', foreignField: 'field_so_dien_thoai', as: 'customer' } },
                {
                    $project: {
                        _id: 1,
                        idCompany: "$_id.idCompany",
                        idChatService: "$_id.idChatService",
                        customer: { $arrayElemAt: ["$customer", -1] },
                        phone: "$_id.phone",
                        email: "$_id.email",
                        connected: "$slChatDaPhucVu",
                        notConnected: { $subtract: ["$slChat", "$slChatDaPhucVu"] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        idCompany: 1,
                        idChatService: 1,
                        customer: 1,
                        idCustomer: "$customer._id",
                        phone: 1,
                        email: { $cond: [{ $gt: ["$customer", 0] }, "$customer.field_e_mail", "$email"] },
                        connected: 1,
                        notConnected: 1
                    }
                },
                {
                    $group: {
                        _id: {
                            idCompany: "$idCompany",
                            idChatService: "$idChatService",
                            phone: "$phone",
                            email: "$email",
                            idCustomer: "$idCustomer"
                        },
                        connected: { $sum: "$connected" },
                        notConnected: { $sum: "$notConnected" },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        idCompany: "$_id.idCompany",
                        idChatService: "$_id.idChatService",
                        idCustomer: "$_id.idCustomer",
                        phone: "$_id.phone",
                        email: "$_id.email",
                        connected: 1,
                        notConnected: 1
                    }
                },
            ], { allowDiskUse: true }, null).toArray(next);

        },
        function (result, next) {
            var _bulk = mongoClient.collection('customerinteractive').initializeUnorderedBulkOp({ useLegacyOps: true });

            result.forEach(function (el) {
                _bulk.find({
                    idCompany: el.idCompany,
                    idChatService: !!el.idChatService ? new mongodb.ObjectId(el.idChatService) : null,
                    idCustomer: el.idCustomer,
                    phone: el.phone,
                    email: el.email,
                    date: _dateStr
                }).upsert().replaceOne({
                    idCompany: el.idCompany,
                    idChatService: !!el.idChatService ? new mongodb.ObjectId(el.idChatService) : null,
                    idCustomer: el.idCustomer,
                    phone: el.phone,
                    email: el.email,
                    date: _dateStr,
                    chatConnected: el.connected,
                    chatNotConnected: el.notConnected
                });
            });

            if (_bulk == null || !_bulk.s.currentBatch) return next();
            _bulk.execute(function (err) {
                next(err);
            });
        }
    ], function (err) {
        if (!!err) log.error(err);
    });
}

/*
    trungdt: báo cáo tương tác khách hàng - voice
*/
function customerInteractiveVoice() {

    var _dateStr = _moment().format('YYYY-MM-DD');
    var _date = _moment().startOf('day').valueOf();
    // var _date = _moment('2023-01-01', 'YYYY-MM-DD').startOf('day').valueOf();
    _async.waterfall([
        function (next) {
            mongoClient.collection("cdrtransinfos").aggregate([
                {
                    $match: {
                        idCampain: { $ne: null },
                        transType: { $in: [1, 6, 7, 8] },
                        startTime: { $gte: _date }
                    }
                },
                {
                    $group: {
                        _id: "$callId",
                        agentAnswer: { $sum: { $cond: [{ $eq: ["$serviceType", 3] }, "$answerTime", 0] } },
                        idVoiceCampaign: { $first: "$idCampain" }
                    }
                },
                { $lookup: { from: 'tickets', localField: '_id', foreignField: 'callId', as: 'ticket' } },
                {
                    $project: {
                        _id: 1,
                        agentAnswer: 1,
                        ticket: { $arrayElemAt: ["$ticket", -1] },
                        idVoiceCampaign: 1
                    }
                },
                {
                    $group: {
                        _id: {
                            idCustomer: "$ticket.idCustomer",
                            idVoiceCampaign: "$idVoiceCampaign"
                        },
                        total: { $sum: 1 },
                        connected: { $sum: { $cond: [{ $gt: ["$agentAnswer", 0] }, 1, 0] } }
                    }
                },
                { $lookup: { from: 'campains', localField: '_id.idVoiceCampaign', foreignField: '_id', as: 'campaign' } },
                { $unwind: { path: '$campaign' } },
                {
                    $project: {
                        _id: 1,
                        idCompany: "$campaign.idCompany",
                        idVoiceCampaign: "$_id.idVoiceCampaign",
                        idCustomer: "$_id.idCustomer",
                        connected: 1,
                        notConnected: { $subtract: ["$total", "$connected"] }
                    }
                }
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            var _bulk = mongoClient.collection('customerinteractive').initializeUnorderedBulkOp({ useLegacyOps: true });

            result.forEach(function (el) {
                _bulk.find({
                    idCompany: el.idCompany,
                    idVoiceCampaign: el.idVoiceCampaign,
                    idCustomer: el.idCustomer,
                    date: _dateStr
                }).upsert().replaceOne({
                    idCompany: el.idCompany,
                    idVoiceCampaign: el.idVoiceCampaign,
                    idCustomer: el.idCustomer,
                    date: _dateStr,
                    voiceConnected: el.connected,
                    voiceNotConnected: el.notConnected
                });
            });

            if (_bulk == null || !_bulk.s.currentBatch) return next();
            _bulk.execute(function (err) {
                next(err);
            });
        },
        function (next) {
            mongoClient.collection("cdrtransinfos").aggregate([
                { $match: { serviceId: { $ne: null } } },
                {
                    $match: {
                        transType: { $in: [1, 6, 7, 8] },
                        startTime: { $gte: _date }
                    }
                },
                {
                    $group: {
                        _id: "$callId",
                        agentAnswer: { $sum: { $cond: [{ $eq: ["$serviceType", 3] }, "$answerTime", 0] } },
                        caller: { $push: "$caller" },
                        idVoiceService: { $first: "$serviceId" }
                    }
                },
                { $lookup: { from: 'tickets', localField: '_id', foreignField: 'callId', as: 'ticket' } },
                {
                    $project: {
                        _id: 1,
                        agentAnswer: 1,
                        ticket: { $arrayElemAt: ["$ticket", -1] },
                        phone: { $arrayElemAt: ["$caller", -1] },
                        idVoiceService: 1
                    }
                },
                {
                    $group: {
                        _id: {
                            idCustomer: "$ticket.idCustomer",
                            idVoiceService: "$idVoiceService",
                            phone: "$phone"
                        },
                        total: { $sum: 1 },
                        connected: { $sum: { $cond: [{ $gt: ["$agentAnswer", 0] }, 1, 0] } }
                    }
                },
                { $lookup: { from: 'services', localField: '_id.idVoiceService', foreignField: '_id', as: 'service' } },
                { $unwind: { path: '$service' } },
                {
                    $project: {
                        _id: 1,
                        idCompany: "$service.idCompany",
                        idVoiceService: "$_id.idVoiceService",
                        idCustomer: "$_id.idCustomer",
                        phone: "$_id.phone",
                        connected: 1,
                        notConnected: { $subtract: ["$total", "$connected"] }
                    }
                }
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            var _bulk = mongoClient.collection("customerinteractive").initializeUnorderedBulkOp({ useLegacyOps: true });

            result.forEach(function (el) {
                _bulk.find({
                    idCompany: el.idCompany,
                    idVoiceService: el.idVoiceService,
                    idCustomer: el.idCustomer,
                    phone: el.phone,
                    date: _dateStr
                }).upsert().replaceOne({
                    idCompany: el.idCompany,
                    idVoiceService: el.idVoiceService,
                    idCustomer: el.idCustomer,
                    phone: el.phone,
                    date: _dateStr,
                    voiceConnected: el.connected,
                    voiceNotConnected: el.notConnected
                });
            });

            if (_bulk == null || !_bulk.s.currentBatch) return next();
            _bulk.execute(function (err) {
                next(err);
            });
        },
    ], function (err) {
        if (!!err) log.error(err);
    });
}

/**
 * trungdt - Được gọi hàng giờ để kiểm tra trạng thái ticket first call resolution
 */
function validateFirstCall() {

    var updateTicket = function (t, fcr, cb) {
        log.info('update ticket ', t._id, 'with fcr status -------------------- ', fcr);
        _Tickets.findByIdAndUpdate(t._id, { $set: { fcr: fcr } }, function (err) {
            if (err) log.error('update first call resolution fail ticket = ----------------- ', t, err);
            cb();
        });
    }

    _async.waterfall([
        function (next) {
            _Tickets.find({ fcrTime: { $gte: _moment().startOf('day')._d }, fcr: { $in: [null, 0] } }, next);
        },
        function (result, next) {
            _async.eachSeries(result, function (t, cb) {
                log.info('check ticket -------------------- ', t);
                _CdrTransInfo.find({
                    callId: { $in: t.callId },
                    serviceType: 3,
                    answerTime: { $gt: 0 }
                }, function (err, trans) {
                    log.info('trans -------------------- ', trans);
                    var fcr = !!err || trans.length != 1 ? 2 : 1;
                    updateTicket(t, fcr, cb);
                });
            }, next);
        }
    ], function (err) {
        if (err) log.error('validateFirstCall error -------------- ', err);
    });
}

/**
 * Được gọi hàng ngày để xóa dữ liệu ticket ảo không cần thiết của chat và email
 */
function cleanTicket() {
    var daysBefore = 7;
    var curDate = new Date();
    curDate.setHours(0, 0, 0, 0);
    var lastDate = new Date(curDate.getTime() - (daysBefore * 24 * 60 * 60 * 1000));

    _TicketsChat.remove({ status: -1, created: { $lt: lastDate } }, function (err, result) {

    });

    _TicketsMail.remove({ status: -1, created: { $lt: lastDate } }, function (err, result) {

    });
}

/**
 * hàm interval tự động gọi ra của campaign
 */
function dialing() {
    _.each(_.keys(campaigns), function (key) {
        campaigns[key].dialing();
    });
}

/**
 * hàm interval cảnh báo của service và group
 */
function alert() {
    _.each(_.keys(groups), function (key) {
        groups[key].alert();
    });

    _.each(_.keys(services), function (key) {
        services[key].alert();
    });

    ticket.alert();
}

/**
 * xóa module quản lý campaign
 * @param id ID campaign
 */
function removeCampaign(id) {
    if (campaigns[id]) {
        delete campaigns[id];
    }
}

/**
 * thêm module quản lý campaign
 * @param cp Dữ liệu của campaign
 */
function addCampaign(cp) {
    campaigns[cp._id.toString()] = require(path.join(_rootPath, 'monitor', 'campaign-monitor.js'))(cp);
}

/**
 * lấy dữ liệu module quản lý campaign
 * @param id ID campaign
 * @returns {*} module quản lý
 */
function getCampaign(id) {
    return campaigns[id];
}

/**
 * xóa module quản lý group
 * @param id ID group
 */
function removeGroup(id) {
    if (groups[id]) {
        groups[id].destroy();
        delete groups[id];
    }
}

/**
 * thêm module quản lý group
 * @param gp Dữ liệu của group
 */
function addGroup(gp) {
    if (gp.status) {
        groups[gp._id.toString()] = require(path.join(_rootPath, 'monitor', 'group-monitor.js'))(gp);
    }
}

/**
 * Cập nhật dữ liệu của group
 * @param gp dữ liệu của group
 */
function updateGroup(gp) {
    if (!gp.status) {
        removeGroup(gp._id.toString());
    } else {
        if (groups[gp._id]) {
            groups[gp._id].updateData(gp);
        } else {
            addGroup(gp);
        }
    }
}

/**
 * Lấy dữ liệu module quản lý group
 * @param id ID group
 * @returns {*} module quản lý group
 */
function getGroup(id) {
    return groups[id];
}

/**
 * xóa module quản lý service
 * @param id ID service
 */
function removeService(id) {
    if (services[id]) {
        services[id].destroy();
        delete services[id];
    }
}

/**
 * thêm mới module quản lý service
 * @param sv Dữ liệu service
 */
function addService(sv) {
    if (sv.status) services[sv._id.toString()] = require(path.join(_rootPath, 'monitor', 'service-monitor.js'))(sv);
}

/**
 * lấy dữ liệu quản lý service
 * @param id ID service
 * @returns {*} module quản lý service
 */
function getService(id) {
    return services[id];
}

/**
 * cập nhật dữ liệu của service
 * @param sv Dữ liệu của service
 */
function updateService(sv) {
    if (!sv.status) {
        removeService(sv._id.toString());
    } else {
        if (services[sv._id]) {
            services[sv._id].updateData(sv);
        } else {
            addService(sv);
        }
    }
}

/**
 * xóa user khỏi danh sách được monitor
 * @param user ID user
 */
function removeManager(user) {
    _.each(_.keys(groups), function (key) {
        groups[key].removeManager(user);
    });
    _.each(_.keys(services), function (key) {
        services[key].removeManager(user);
    });
}

module.exports = {
    init: init,
    removeCampaign: removeCampaign,
    addCampaign: addCampaign,
    getCampaign: getCampaign,
    removeGroup: removeGroup,
    addGroup: addGroup,
    getGroup: getGroup,
    removeService: removeService,
    addService: addService,
    getService: getService,
    removeManager: removeManager,
    updateGroup: updateGroup,
    updateService: updateService
}