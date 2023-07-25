
var titlePage = 'Báo cáo tương tác';

exports.index = {
    json: function (req, res) {

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
            voiceServices: function (callback) {
                var cond = [];
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
                                callback(err);
                            });
                        } else {
                            callback(null);
                        }
                    },
                    function (callback) {
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
            voiceCampaigns: function (callback) {
                var cond = [];
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
                                callback(err);
                            });
                        } else {
                            callback(null);
                        }
                    },
                    function (callback) {
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
            chatServices: function (callback) {
                var cond = [];
                _async.waterfall([
                    function (callback) {
                        if (!_.isEmpty(req.session.auth.company)) {
                            var companyId = _.convertObjectId(req.session.auth.company._id);
                            _ServicesChat.aggregate([
                                { $lookup: { from: "companychannels", localField: "idChannel", foreignField: "_id", as: "channel" } },
                                { $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } },
                                { $match: { 'channel.idCompany': companyId } },
                                { $project: { _id: 1 } }
                            ], function (err, result) {
                                if (err) return callback(err, null);
                                cond.push({ $match: { _id: { $in: _.pluck(result, '_id') } } });
                                callback(err);
                            });
                        } else {
                            callback(null);
                        }
                    },
                    function (callback) {
                        cond.push({ $lookup: { from: "companychannels", localField: "idChannel", foreignField: "_id", as: "channel" } });
                        cond.push({ $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } });
                        cond.push({
                            $project: {
                                name: 1,
                                _id: 1,
                                idCompany: "$channel.idCompany"
                            }
                        });
                        _ServicesChat.aggregate(cond, callback);
                    }
                ], callback);
            },
            mailServices: function (callback) {
                var cond = [];
                _async.waterfall([
                    function (callback) {
                        if (!_.isEmpty(req.session.auth.company)) {
                            var companyId = _.convertObjectId(req.session.auth.company._id);
                            _ServicesMail.aggregate([
                                { $match: { idCompany: companyId } },
                                { $project: { _id: 1 } }
                            ], function (err, result) {
                                if (err) return callback(err, null);
                                cond.push({ $match: { _id: { $in: _.pluck(result, '_id') } } });
                                callback(err);
                            });
                        } else {
                            callback(null);
                        }
                    },
                    function (callback) {
                        cond.push({
                            $project: {
                                name: 1,
                                _id: 1,
                                idCompany: 1
                            }
                        });
                        _ServicesMail.aggregate(cond, callback);
                    }
                ], callback);
            },
            data: function (callback) {
                getData(req, callback);
            },
            dataCompany: function (callback) {
                if (!req.query['detail-company']) return callback();
                getDataCompany(req, callback);
            },
            dataService: function (callback) {
                if (!req.query['detail-service']) return callback();
                getDataService(req, callback);
            },
        }, function (err, result) {
            return _.render(req, res, 'report-customer-interactive', {
                title: titlePage,
                plugins: ['moment', 'highchart', 'jquery-mask', ['bootstrap-select'], ['bootstrap-daterangepicker']],
                companies: result.companies,
                voiceCampaigns: result.voiceCampaigns,
                voiceServices: result.voiceServices,
                chatServices: result.chatServices,
                mailServices: result.mailServices,
                data: !!result.data ? result.data : [],
                dataCompany: !!result.dataCompany ? result.dataCompany.data : [],
                pagingCompany: !!result.dataCompany ? result.dataCompany.paging : null,
                dataService: !!result.dataService ? result.dataService.data : [],
                pagingService: !!result.dataService ? result.dataService.paging : null,
            }, true, err);
        });
    }
};

function getData(req, cb) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    var _query = {
        date: { $ne: null }
    };

    if (_.has(req.query, 'voice-campaign') || _.has(req.query, 'voice-service') || _.has(req.query, 'chat-service') || _.has(req.query, 'mail-service')) _query['$or'] = [];
    if (_.has(req.query, 'company')) _query['idCompany'] = new mongodb.ObjectId(req.query['company']);
    if (_.has(req.query, 'voice-campaign')) _query['$or'].push({ idVoiceCampaign: new mongodb.ObjectId(req.query['voice-campaign']) });
    if (_.has(req.query, 'voice-service')) _query['$or'].push({ idVoiceService: new mongodb.ObjectId(req.query['voice-service']) });
    if (_.has(req.query, 'chat-service')) _query['$or'].push({ idChatService: new mongodb.ObjectId(req.query['chat-service']) });
    if (_.has(req.query, 'mail-service')) _query['$or'].push({ idMailService: new mongodb.ObjectId(req.query['mail-service']) });
    if (_.has(req.query, 'start-date')) _query['date']['$gte'] = _moment(req.query['start-date'], 'DD/MM/YYYY').format('YYYY-MM-DD');
    if (_.has(req.query, 'end-date')) _query['date']['$lte'] = _moment(req.query['end-date'], 'DD/MM/YYYY').format('YYYY-MM-DD');

    _async.waterfall([
        function (next) {
            mongoClient.collection("customerinteractive").aggregate([
                { $match: _query },
                {
                    $group: {
                        _id: "$idCompany",
                        voiceConnected: { $sum: "$voiceConnected" },
                        voiceNotConnected: { $sum: "$voiceNotConnected" },
                        chatConnected: { $sum: "$chatConnected" },
                        chatNotConnected: { $sum: "$chatNotConnected" },
                        mailConnected: { $sum: "$mailConnected" },
                        mailNotConnected: { $sum: "$mailNotConnected" },
                    }
                },
                { $lookup: { from: 'companies', localField: "_id", foreignField: '_id', as: 'company' } },
                // { $lookup: { from: 'services', localField: "idVoiceService", foreignField: '_id', as: 'voiceService' } },
                // { $lookup: { from: 'campains', localField: "idVoiceCampaign", foreignField: '_id', as: 'voiceCampaign' } },
                // { $lookup: { from: 'servicechats', localField: "idChatService", foreignField: '_id', as: 'chatService' } },
                // { $lookup: { from: 'servicemails', localField: "idMailService", foreignField: '_id', as: 'mailService' } },
                { $unwind: { path: '$company' } },
            ], { allowDiskUse: true }, null).toArray(next);
        }
    ], function (err, result) {
        cb(err, result);
    });
}

function getDataCompany(req, cb) {
    var page = _.has(req.query, 'pageCompany') ? parseInt(req.query.pageCompany) : 1;
    var rows = _.has(req.query, 'rowsCompany') ? parseInt(req.query.rowsCompany) : 10;

    var _query = {
        date: { $ne: null }
    };

    if (_.has(req.query, 'voice-campaign') || _.has(req.query, 'voice-service') || _.has(req.query, 'chat-service') || _.has(req.query, 'mail-service')) _query['$or'] = [];
    _query['idCompany'] = new mongodb.ObjectId(req.query['detail-company']);
    if (_.has(req.query, 'voice-campaign')) _query['$or'].push({ idVoiceCampaign: new mongodb.ObjectId(req.query['voice-campaign']) });
    if (_.has(req.query, 'voice-service')) _query['$or'].push({ idVoiceService: new mongodb.ObjectId(req.query['voice-service']) });
    if (_.has(req.query, 'chat-service')) _query['$or'].push({ idChatService: new mongodb.ObjectId(req.query['chat-service']) });
    if (_.has(req.query, 'mail-service')) _query['$or'].push({ idMailService: new mongodb.ObjectId(req.query['mail-service']) });
    if (_.has(req.query, 'start-date')) _query['date']['$gte'] = _moment(req.query['start-date'], 'DD/MM/YYYY').format('YYYY-MM-DD');
    if (_.has(req.query, 'end-date')) _query['date']['$lte'] = _moment(req.query['end-date'], 'DD/MM/YYYY').format('YYYY-MM-DD');

    var _data = [];
    var _paging = null;

    _async.waterfall([
        function (next) {
            mongoClient.collection("customerinteractive").aggregate([
                { $match: _query },
                {
                    $group: {
                        _id: {
                            idCompany: "$idCompany",
                            idVoiceService: "$idVoiceService",
                            idVoiceCampaign: "$idVoiceCampaign",
                            idChatService: "$idChatService",
                            idMailService: "$idMailService",
                        },
                        voiceConnected: { $sum: "$voiceConnected" },
                        voiceNotConnected: { $sum: "$voiceNotConnected" },
                        chatConnected: { $sum: "$chatConnected" },
                        chatNotConnected: { $sum: "$chatNotConnected" },
                        mailConnected: { $sum: "$mailConnected" },
                        mailNotConnected: { $sum: "$mailNotConnected" },
                    }
                },
                { $skip: (page - 1) * rows },
                { $limit: rows },
                { $lookup: { from: 'companies', localField: "_id.idCompany", foreignField: '_id', as: 'company' } },
                { $lookup: { from: 'services', localField: "_id.idVoiceService", foreignField: '_id', as: 'voiceService' } },
                { $lookup: { from: 'campains', localField: "_id.idVoiceCampaign", foreignField: '_id', as: 'voiceCampaign' } },
                { $lookup: { from: 'servicechats', localField: "_id.idChatService", foreignField: '_id', as: 'chatService' } },
                { $lookup: { from: 'servicemails', localField: "_id.idMailService", foreignField: '_id', as: 'mailService' } },
                {
                    $project: {
                        _id: 1,
                        voiceConnected: 1,
                        voiceNotConnected: 1,
                        chatConnected: 1,
                        chatNotConnected: 1,
                        mailConnected: 1,
                        mailNotConnected: 1,
                        company: { $arrayElemAt: ["$company", -1] },
                        voiceService: { $arrayElemAt: ["$voiceService", -1] },
                        voiceCampaign: { $arrayElemAt: ["$voiceCampaign", -1] },
                        chatService: { $arrayElemAt: ["$chatService", -1] },
                        mailService: { $arrayElemAt: ["$mailService", -1] },
                    }
                }
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            _data = result;

            mongoClient.collection("customerinteractive").aggregate([
                { $match: _query },
                {
                    $group: {
                        _id: {
                            idCompany: "$idCompany",
                            idVoiceService: "$idVoiceService",
                            idVoiceCampaign: "$idVoiceCampaign",
                            idChatService: "$idChatService",
                            idMailService: "$idMailService",
                        },
                        voiceConnected: { $sum: "$voiceConnected" },
                        voiceNotConnected: { $sum: "$voiceNotConnected" },
                        chatConnected: { $sum: "$chatConnected" },
                        chatNotConnected: { $sum: "$chatNotConnected" },
                        mailConnected: { $sum: "$mailConnected" },
                        mailNotConnected: { $sum: "$mailNotConnected" },
                    }
                },
                { $group: { _id: null, total: { $sum: 1 } } }
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            var paginator = new pagination.SearchPaginator({
                prelink: _.removeURLParameter(req.url, 'pageCompany'),
                current: page,
                rowsPerPage: rows,
                totalResult: !!result[0] ? result[0].total : 0
            });
            _paging = paginator.getPaginationData();
            next();
        }
    ], function (err) {
        cb(err, { data: _data, paging: _paging });
    });
}

function getDataService(req, cb) {
    var page = _.has(req.query, 'pageService') ? parseInt(req.query.pageService) : 1;
    var rows = _.has(req.query, 'rowsService') ? parseInt(req.query.rowsService) : 10;

    var _query = {
        date: { $ne: null },
        $or: []
    };

    _query['$or'].push({ idVoiceCampaign: new mongodb.ObjectId(req.query['detail-service']) });
    _query['$or'].push({ idVoiceService: new mongodb.ObjectId(req.query['detail-service']) });
    _query['$or'].push({ idChatService: new mongodb.ObjectId(req.query['detail-service']) });
    _query['$or'].push({ idMailService: new mongodb.ObjectId(req.query['detail-service']) });
    if (_.has(req.query, 'start-date')) _query['date']['$gte'] = _moment(req.query['start-date'], 'DD/MM/YYYY').format('YYYY-MM-DD');
    if (_.has(req.query, 'end-date')) _query['date']['$lte'] = _moment(req.query['end-date'], 'DD/MM/YYYY').format('YYYY-MM-DD');

    var _data = [];
    var _paging = null;

    _async.waterfall([
        function (next) {
            mongoClient.collection("customerinteractive").aggregate([
                { $match: _query },
                { $lookup: { from: 'customerindex', localField: "idCustomer", foreignField: '_id', as: 'customer' } },
                {
                    $project: {
                        _id: 1,
                        phone: 1,
                        email: 1,
                        idCompany: 1,
                        idVoiceService: 1,
                        idVoiceCampaign: 1,
                        idChatService: 1,
                        idMailService: 1,
                        idCustomer: 1,
                        voiceConnected: 1,
                        voiceNotConnected: 1,
                        chatConnected: 1,
                        chatNotConnected: 1,
                        mailConnected: 1,
                        mailNotConnected: 1,
                        customer: { $arrayElemAt: ["$customer", -1] },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        phone: { $cond: [{ $gt: ["$customer", 0] }, "$customer.field_so_dien_thoai", "$phone"] },
                        email: { $cond: [{ $gt: ["$customer", 0] }, "$customer.field_e_mail", "$email"] },
                        idCompany: 1,
                        idVoiceService: 1,
                        idVoiceCampaign: 1,
                        idChatService: 1,
                        idMailService: 1,
                        voiceConnected: 1,
                        voiceNotConnected: 1,
                        chatConnected: 1,
                        chatNotConnected: 1,
                        mailConnected: 1,
                        mailNotConnected: 1,
                        displayName: "$customer.field_ho_ten"
                    }
                },
                {
                    $group: {
                        _id: {
                            phone: "$phone",
                            email: "$email",
                            displayName: "$displayName"
                        },
                        idCompany: { $first: "$idCompany" },
                        idVoiceService: { $first: "$idVoiceService" },
                        idChatService: { $first: "$idChatService" },
                        idMailService: { $first: "$idMailService" },
                        idVoiceCampaign: { $first: "$idVoiceCampaign" },
                        voiceConnected: { $sum: "$voiceConnected" },
                        voiceNotConnected: { $sum: "$voiceNotConnected" },
                        chatConnected: { $sum: "$chatConnected" },
                        chatNotConnected: { $sum: "$chatNotConnected" },
                        mailConnected: { $sum: "$mailConnected" },
                        mailNotConnected: { $sum: "$mailNotConnected" },
                    }
                },
                { $skip: (page - 1) * rows },
                { $limit: rows },
                { $lookup: { from: 'companies', localField: "idCompany", foreignField: '_id', as: 'company' } },
                { $lookup: { from: 'services', localField: "idVoiceService", foreignField: '_id', as: 'voiceService' } },
                { $lookup: { from: 'campains', localField: "idVoiceCampaign", foreignField: '_id', as: 'voiceCampaign' } },
                { $lookup: { from: 'servicechats', localField: "idChatService", foreignField: '_id', as: 'chatService' } },
                { $lookup: { from: 'servicemails', localField: "idMailService", foreignField: '_id', as: 'mailService' } },

                {
                    $project: {
                        _id: 1,
                        phone: 1,
                        email: 1,
                        voiceConnected: 1,
                        voiceNotConnected: 1,
                        chatConnected: 1,
                        chatNotConnected: 1,
                        mailConnected: 1,
                        mailNotConnected: 1,
                        company: { $arrayElemAt: ["$company", -1] },
                        voiceService: { $arrayElemAt: ["$voiceService", -1] },
                        voiceCampaign: { $arrayElemAt: ["$voiceCampaign", -1] },
                        chatService: { $arrayElemAt: ["$chatService", -1] },
                        mailService: { $arrayElemAt: ["$mailService", -1] },
                        customer: { $arrayElemAt: ["$customer", -1] },
                    }
                },
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            _data = result;
            mongoClient.collection("customerinteractive").aggregate([
                { $match: _query },
                { $lookup: { from: 'customerindex', localField: "idCustomer", foreignField: '_id', as: 'customer' } },
                {
                    $project: {
                        _id: 1,
                        phone: 1,
                        email: 1,
                        idCompany: 1,
                        idVoiceService: 1,
                        idVoiceCampaign: 1,
                        idChatService: 1,
                        idMailService: 1,
                        idCustomer: 1,
                        voiceConnected: 1,
                        voiceNotConnected: 1,
                        chatConnected: 1,
                        chatNotConnected: 1,
                        mailConnected: 1,
                        mailNotConnected: 1,
                        customer: { $arrayElemAt: ["$customer", -1] },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        phone: { $cond: [{ $gt: ["$customer", 0] }, "$customer.field_so_dien_thoai", "$phone"] },
                        email: { $cond: [{ $gt: ["$customer", 0] }, "$customer.field_e_mail", "$email"] },
                        idCompany: 1,
                        idVoiceService: 1,
                        idVoiceCampaign: 1,
                        idChatService: 1,
                        idMailService: 1,
                        idCustomer: 1,
                        voiceConnected: 1,
                        voiceNotConnected: 1,
                        chatConnected: 1,
                        chatNotConnected: 1,
                        mailConnected: 1,
                        mailNotConnected: 1,
                        displayName: "$customer.field_ho_ten"
                    }
                },
                {
                    $group: {
                        _id: {
                            phone: "$phone",
                            email: "$email",
                            displayName: "$displayName"
                        }
                    }
                },
                { $group: { _id: null, total: { $sum: 1 } } }
            ], { allowDiskUse: true }, null).toArray(next);
        },
        function (result, next) {
            var paginator = new pagination.SearchPaginator({
                prelink: _.removeURLParameter(req.url, 'pageService'),
                current: page,
                rowsPerPage: rows,
                totalResult: !!result[0] ? result[0].total : 0
            });
            _paging = paginator.getPaginationData();
            next();
        }
    ], function (err) {
        cb(err, { data: _data, paging: _paging });
    });
}