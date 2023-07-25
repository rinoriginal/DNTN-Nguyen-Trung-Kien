const chatHelper = require('../api/helpers/chatHelper')
exports.index = {
    json: function (req, res) {
        let agentGroup = null;
        let { scope } = req.query;

        if (scope) {
            switch (scope) {

                case 'getDataChartCampaign':
                    return getDataChartCampaign(req, res)
                case 'getDataChartTotal':
                    return getDataChartTotal(req, res)
                case 'getDataChannel':
                    return getDataChannel(req, res)
                case 'getDataPopup':
                    return getDataPopup(req, res)
                case 'pushNotify':
                    return pushNotify(req, res)
                case 'getDataCountChat':
                    return getDataCountChat(req, res)
                case 'getStatusAgent':
                    return getStatusAgent(req, res)
                case 'getChatWait':
                    return getChatWait(req, res)
                default:
                    res.send({ code: 500, message: 'Có lỗi xảy ra' });
            }
        } else {
            res.send({ code: 500, message: 'scope is required' });
        }
    },
    html: function (req, res) {
        _async.parallel({
        }, function (err, result) {
            _.render(req, res, 'dash-board-chat', {
                title: 'DASHBOARD CHAT',
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
            }, true);
        })

    }
}
var getChatWait = function (req, res) {
    var listChatWait = []
    let query = {}
    let startDate = moment().startOf('days');
    let endDate = moment().endOf('days');
    query.startDate = startDate.format("YYYY-MM-DD HH:mm:ss").toString();
    query.endDate = endDate.format("YYYY-MM-DD HH:mm:ss").toString();
    query.QUEUE_ID = +req.query.idChannelCisco


    chatHelper.getDataChatWait(query, function (err, result) {

        if (!err && result.length > 0) {
            _async.eachSeries(result, function (item, cb) {

                if (item.CONTACT_POINT_DATA.indexOf('@') == -1) {
                    let typeCustomer = item.CONTACT_POINT_DATA.split('|')
                    if (typeCustomer[0] == 'facebook_messenger') {
                        mongoClient.collection('customerindex').findOne({ field_facebook: typeCustomer[1] }, function (error, dataCus) {
                            if (dataCus) {
                                listChatWait.push({
                                    nameCustomer: dataCus.field_ho_ten,
                                    created: item.WHEN_CREATED
                                })
                                cb(null, listChatWait)
                            } else {
                                listChatWait.push({
                                    nameCustomer: '',
                                    created: item.WHEN_CREATED
                                })
                                cb(null, listChatWait)
                            }
                        })
                    } else {
                        mongoClient.collection('customerindex').findOne({ field_zalo: typeCustomer[1] }, function (error, dataCus) {
                            if (dataCus) {
                                listChatWait.push({
                                    nameCustomer: dataCus.field_ho_ten,
                                    created: item.WHEN_CREATED
                                })
                                cb(null, listChatWait)
                            } else {
                                listChatWait.push({
                                    nameCustomer: '',
                                    created: item.WHEN_CREATED
                                })
                                cb(null, listChatWait)
                            }
                        })
                    }
                } else {
                    mongoClient.collection('customerindex').findOne({ field_e_mail: item.CONTACT_POINT_DATA }, function (error, dataCus) {
                        if (dataCus) {
                            listChatWait.push({
                                nameCustomer: dataCus.field_ho_ten,
                                created: item.WHEN_CREATED
                            })
                            cb(null, listChatWait)
                        } else {
                            listChatWait.push({
                                nameCustomer: '',
                                created: item.WHEN_CREATED
                            })
                            cb(null, listChatWait)
                        }
                    })
                }
            }, function (error) {
                res.json({
                    data: listChatWait,
                    code: error ? 500 : 200
                });
            })

        }
        else {
            return res.json({
                data: [],
                code: err ? 500 : 200
            });
        }
    })
}

var pushNotify = function (req, res) {
    _.pushNotification(4, '', req.query.idAgent);
    res.json({
        code: 200
    });
}

/**
 * query lên cisco lấy trạng thái của agent
 * @param {*} req 
 * @param {*} res 
 */
var getStatusAgent = function (req, res) {
    let configCisco = _config.cisco.apiCisco;
    let pathApi = configCisco.ip + "/api/v1/reportRealTime/getStatusAgent";
    // let pathApi = "http://localhost:4242/api/v1/reportRealTime/getStatusAgent";

    _async.waterfall([
        function (next) {
            _CompanyChannel.aggregate([
                { $unwind: "$idAgentGroups" },
                { $lookup: { from: "users", localField: "idAgentGroups", foreignField: "agentGroupMembers.group", as: "agent" } },
                { $unwind: "$agent" },
                { $lookup: { from: "chatthreads", localField: "agent._id", foreignField: "agentId", as: "ticketChat" } },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        displayNameAgent: "$agent.displayName",
                        nameAgent: "$agent.displayName",
                        idAgent: "$agent._id",
                        idAgentCisco: "$agent.idAgentCisco",


                    }
                }
            ], next)
        }
    ], function (error, result) {

        let body = {};
        body.MRDomainID = 5001 //domainID của chat: 5001, mail:5000
        // extension của agent hiển thị trên kênh
        body.PeripheralNumber = result.map((item) => {
            return item.idAgentCisco
        })

        _request.post({
            url: pathApi,
            method: "POST",
            rejectUnauthorized: false,
            headers: {
                "x-access-token": configCisco.token,
            },
            json: true,
            body: body
        }, function (err, response, body) {
            console.log('ERR STATUS AGENT', err);

            if (!err && (response && response.statusCode == 200)) {
                let data = body.data.recordset;
                res.json({
                    message: data,
                    code: 200
                });

            } else {
                res.json({
                    message: err || (body && body.message ? body.message : "Có lỗi xảy ra"),
                    code: 500
                });
            }
        });
    })

}
var getDataCountChat = function (req, res) {

    let dateQuery = {}
    if (_.has(req.query, 'refreshTime') && req.query.refreshTime) {
        dateQuery.$and = []
        dateQuery.$and.push({ createDate: { $gte: moment(req.query.refreshTime, 'DD/MM/YYYY').startOf('day')._d } })
        dateQuery.$and.push({ createDate: { $lte: moment(req.query.refreshTime, 'DD/MM/YYYY').endOf('day')._d } })
    }
    _ChatThread.aggregate([
        {
            $match: dateQuery
        },
        {
            $project: {
                channelId: 1,
                converOffline:
                {
                    $cond:
                        [
                            {
                                $and: [
                                    { $eq: ['$customerMessageCount', null] },
                                    { $eq: ['$chatStatus', 6] }
                                ]
                            },
                            1, 0]
                },
                converReceive:
                {
                    $cond:
                        [
                            {
                                $or: [
                                    {
                                        $and: [
                                            { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                            {
                                                $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                            }
                                        ]
                                    },
                                    {
                                        $and: [
                                            {
                                                $or: [
                                                    { $eq: ['$activitySubStatus', 5900] },
                                                    { $eq: ['$activitySubStatus', 4900] }
                                                ]
                                            },
                                            {
                                                $or: [
                                                    { $eq: ['$activityStatus', 4000] },
                                                    { $eq: ['$activityStatus', 5000] }
                                                ]
                                            }
                                        ]

                                    }
                                ]
                            }
                            ,

                            1, 0]
                },
                converWait: {
                    $cond:
                        [
                            {
                                $and: [
                                    { $eq: ['$customerMessageCount', null] },
                                    { $eq: ['$chatStatus', 1] }
                                ]
                            },
                            1, 0]
                },

            }
        },
        {
            $group: {
                _id: "$channelId",
                offline: { $push: "$converOffline" },
                receive: { $push: "$converReceive" },
                wait: { $push: "$converWait" }
            }
        }

    ], function (err, result) {
        res.json({
            data: result,
            code: err ? 500 : 200
        });
    })
}

var getDataPopup = function (req, res) {

    let matchQuery = {};
    let dateQuery = {};
    let type = req.query.type

    switch (type) {
        case 'receive':
            matchQuery.$or = []
            matchQuery.$or.push({
                $and: [
                    { 'customerMessageCount': { $ne: null } },
                    { 'chatStatus': { $ne: 6 } },
                    { 'countChatReceive': { $gt: 0 } }
                ]

            })
            matchQuery.$or.push(
                {
                    $and: [
                        {
                            $or: [
                                { 'activityStatus': { $eq: 4000 } },
                                { 'activityStatus': { $eq: 5000 } }

                            ]
                        },
                        {
                            $or: [
                                { 'activitySubStatus': { $eq: 5900 } },
                                { 'activitySubStatus': { $eq: 4900 } }
                            ]
                        }
                    ]

                }
            )
            break;
        case 'wait':
            matchQuery.$and = []
            matchQuery.$and.push({ 'customerMessageCount': { $eq: null } })
            matchQuery.$and.push({ 'chatStatus': { $eq: 1 } })
            break;
        case 'offline':
            matchQuery.$and = []
            matchQuery.$and.push({ 'customerMessageCount': { $eq: null } })
            matchQuery.$and.push({ 'chatStatus': { $eq: 6 } })
            break;
        default:
            matchQuery = {}
            break;
    }
    if (_.has(req.query, 'idAgent') && req.query.idAgent) {
        matchQuery.agentId = _.convertObjectId(req.query.idAgent)
    }

    dateQuery.createDate = {}
    dateQuery.createDate.$gte = moment(req.query.refreshTime, 'DD/MM/YYYY').startOf('day')._d
    dateQuery.createDate.$lte = moment(req.query.refreshTime, 'DD/MM/YYYY').endOf('day')._d

    matchQuery.channelId = _.convertObjectId(req.query.idChannel)

    _ChatThread.aggregate([
        { $match: { createDate: { $ne: null } } },
        {
            $lookup: {
                from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticketChat"
            }
        },
        { $unwind: { path: '$ticketChat', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                agentId: 1,
                // nameAgent: 1,
                agentResponseCount: 1,
                customerMessageCount: 1,
                chatStatus: 1,
                createDate: 1,
                whenModified: 1,
                // eventDateGMT: 1,
                timeWait: {
                    $cond: [
                        {

                            $and: [
                                { $eq: ['$customerMessageCount', null] },
                                { $eq: ['$chatStatus', 6] }
                            ]

                        },

                        { $subtract: ['$whenModified', '$createDate'] },
                        {
                            $cond: [
                                {
                                    $or: [
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        { $lte: ['$customerMessageCount', 1] },
                                                        { $eq: ['$chatStatus', 1] }
                                                    ]
                                                },
                                                {
                                                    $and: [
                                                        { $eq: ['$customerMessageCount', 0] },
                                                        { $eq: ['$chatStatus', 5] }
                                                    ]
                                                }

                                            ]
                                        },
                                        {
                                            $and: [
                                                {
                                                    $or: [
                                                        { $eq: ['$activitySubStatus', 5900] },
                                                        { $eq: ['$activitySubStatus', 4900] }
                                                    ]
                                                },
                                                {
                                                    $or: [
                                                        { $eq: ['$activityStatus', 4000] },
                                                        { $eq: ['$activityStatus', 5000] }
                                                    ]
                                                }
                                            ]

                                        }
                                    ]

                                },
                                { $subtract: ['$whenModified', '$createDate'] },
                                {
                                    $cond: [
                                        { $eq: ['$agentAnswerMessageFirstTime', ""] },
                                        0,
                                        { $subtract: [{ $add: ['$agentAnswerMessageFirstTime', 7 * 60 * 60000] }, '$createDate'] }
                                    ]
                                }

                            ]
                        }

                    ]
                },
                timeConver:
                {
                    $cond: [
                        {
                            $and: [
                                { $ne: ['$customerMessageCount', null] },
                                { $ne: ['$chatStatus', 6] }
                            ]
                        },
                        {
                            $subtract: ['$whenModified', '$createDate']
                        }, 0
                    ]
                },
                idAgent: "$ticketChat.idAgent",
                channelId: 1,
                customerId: 1,
                firstMessage: {
                    $slice: ["$messagesChat", 0, 1]
                },
                lastMessage: {
                    $slice: ["$messagesChat", -1]
                },
                activityStatus: 1,
                countChatReceive: { $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } },
                activityStatus: 1,
                activitySubStatus: 1,
                agentId: 1
            }
        },
        {
            $match: dateQuery
        },
        {
            $match: matchQuery
        },
        {
            $lookup: {
                from: "users", localField: "agentId", foreignField: "_id", as: "agent"
            }
        },
        { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "customerindex", localField: "customerId", foreignField: "_id", as: "customer" } },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "companychannels", localField: "channelId", foreignField: "_id", as: "channel" } },
        { $unwind: { path: "$channel", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$firstMessage", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                agent: "$agent.displayName",
                agentId: "$agent._id",
                customer: "$customer.field_ho_ten",
                createDate: 1,
                whenModified: 1,
                waitTime: "$timeWait",
                chatTime: "$timeConver",
                channel: "$channel.name",
                slaTimeWait: "$channel.slaTimeWait",
                slaTimeConversation: "$channel.slaTimeConversation",
                slaTimeReceive: "$channel.slaTimeReceive",
                activityStatus: 1,
                firstMessage: 1,
                lastMessage: 1
            }
        }
    ], function (err, result) {
        res.json({
            data: result,
            type: req.query.type,
            code: err ? 500 : 200
        });
    })
}
var getDataChannel = function (req, res) {

    let matchQuery = {};
    let dateQuery = {};

    if (_.has(req.query, 'refreshTime') && req.query.refreshTime) {
        dateQuery.$and = []
        dateQuery.$and.push({ $gte: ['$$item.createDate', moment(req.query.refreshTime, 'DD/MM/YYYY').startOf('day')._d] })
        dateQuery.$and.push({ $lte: ['$$item.createDate', moment(req.query.refreshTime, 'DD/MM/YYYY').endOf('day')._d] })

    }

    if (_.has(req.query, 'searchChannel') && req.query.searchChannel) {
        matchQuery['displayNameAgent'] = { $regex: new RegExp(_.stringRegex(req.query.searchChannel), 'i') }
        matchQuery['nameAgent'] = { $regex: new RegExp(_.stringRegex(req.query.searchChannel), 'i') }
    }

    _CompanyChannel.aggregate([
        { $unwind: "$idAgentGroups" },
        { $lookup: { from: "users", localField: "idAgentGroups", foreignField: "agentGroupMembers.group", as: "agent" } },
        { $unwind: "$agent" },
        { $lookup: { from: "chatthreads", localField: "agent._id", foreignField: "agentId", as: "ticketChat" } },
        {
            $project: {
                _id: 1,
                name: 1,
                idChannelCisco: 1,
                slaTimeReceive: 1,
                displayNameAgent: "$agent.displayName",
                nameAgent: "$agent.displayName",
                idAgent: "$agent._id",
                idAgentCisco: "$agent.idAgentCisco",
                channel: {
                    $filter: {
                        input: "$ticketChat",
                        as: "item",
                        cond: {
                            $eq: ['$$item.channelId', "$_id"]
                        }
                    }
                }

            }
        },

        {
            $project: {
                _id: 1,
                name: 1,
                idChannelCisco: 1,
                slaTimeReceive: 1,
                displayNameAgent: 1,
                nameAgent: 1,
                idAgent: 1,
                idAgentCisco: 1,
                createDate: {
                    $filter: {
                        input: "$channel",
                        as: "item",
                        cond: dateQuery
                    }
                }

            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                idChannelCisco: 1,
                slaTimeReceive: 1,
                displayNameAgent: 1,
                nameAgent: 1,
                idAgent: 1,
                idAgentCisco: 1,
                receive:
                {
                    $filter: {
                        input: "$createDate",
                        as: "item",
                        cond: {
                            $or: [
                                {
                                    $and: [
                                        { $ne: ['$$item.customerMessageCount', null] },
                                        { $ne: ['$$item.chatStatus', 6] },
                                        {
                                            $gt: [{ $size: { $filter: { input: "$$item.messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                        }
                                    ]
                                },
                                {
                                    $and: [
                                        {
                                            $or: [
                                                { $eq: ['$$item.activitySubStatus', 5900] },
                                                { $eq: ['$$item.activitySubStatus', 4900] }
                                            ]
                                        },
                                        {
                                            $or: [
                                                { $eq: ['$$item.activityStatus', 4000] },
                                                { $eq: ['$$item.activityStatus', 5000] }
                                            ]
                                        }
                                    ]

                                }
                            ]

                        }
                    }
                },
                wait: {
                    $filter: {
                        input: "$createDate",
                        as: "item",
                        cond: {
                            $and: [
                                { $eq: ['$$item.customerMessageCount', null] },
                                { $eq: ['$$item.chatStatus', 1] }
                            ]
                        }
                    }
                },
                offline: {

                    $filter: {
                        input: "$createDate",
                        as: "item",
                        cond: {
                            $and: [
                                { $eq: ['$$item.customerMessageCount', null] },
                                { $eq: ['$$item.chatStatus', 6] }
                            ]
                        }
                    }
                }

            }
        },
        {
            $match: matchQuery
        },
        {
            $group: {
                _id: "$_id",
                name: { $last: "$name" },
                idChannelCisco: { $last: "$idChannelCisco" },
                slaTimeReceive: { $last: "$slaTimeReceive" },
                agent: {
                    $push: {
                        displayNameAgent: "$displayNameAgent",
                        nameAgent: "$nameAgent",
                        idAgent: "$idAgent",
                        idAgentCisco: "$idAgentCisco",
                        receive: "$receive",
                        wait: "$wait",
                        offline: "$offline"
                    }
                }
            }
        }
    ], function (err, result) {
        res.json({
            data: result,
            code: err ? 500 : 200
        });
    })
}

/**
 * query dữ liệu biểu đồ total
 * @param {*} req 
 * @param {*} res 
 */
var getDataChartTotal = function (req, res) {

    let matchQuery = {};
    let type = req.query.type


    if (_.has(req.query, 'refreshTime') && req.query.refreshTime) {
        matchQuery.createDate = {}
        matchQuery.createDate.$gte = moment(req.query.refreshTime, 'DD/MM/YYYY').startOf(type)._d
        matchQuery.createDate.$lte = moment(req.query.refreshTime, 'DD/MM/YYYY').endOf(type)._d
    }

    let agg = [
        { $match: { createDate: { $ne: null } } },
        {
            $project: {
                countChat: {
                    $cond: [
                        {
                            $or: [
                                {
                                    $and: [
                                        { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                        {
                                            $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                        }
                                    ]
                                },
                                {
                                    $and: [
                                        { $eq: ['$customerMessageCount', null] },
                                        { $eq: ['$chatStatus', 6] }
                                    ]
                                },
                                {
                                    $or: [
                                        {
                                            $and: [
                                                { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                                {
                                                    $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                                }
                                            ]
                                        },
                                        {
                                            $and: [
                                                {
                                                    $or: [
                                                        { $eq: ['$activitySubStatus', 5900] },
                                                        { $eq: ['$activitySubStatus', 4900] }
                                                    ]
                                                },
                                                {
                                                    $or: [
                                                        { $eq: ['$activityStatus', 4000] },
                                                        { $eq: ['$activityStatus', 5000] }
                                                    ]
                                                }
                                            ]

                                        }
                                    ]
                                }


                            ]
                        },
                        1, 0
                    ]
                },
                createDate: 1,
                hour: { $hour: { $add: ["$createDate", 7 * 60 * 60000] } },// đang lấy giờ hiển thị trong mongo, không qua moment nên cần cộng thêm 7 tiếng
                dateOfWeek: {
                    $cond: [{
                        $eq: [{
                            $dayOfWeek: {
                                $add:
                                    ['$createDate', 7 * 60 * 60000]
                            }
                        }, 1]
                    }, 8, {
                        $dayOfWeek: {
                            $add:
                                ['$createDate', 7 * 60 * 60000]
                        }
                    }]
                },

                dateOfMonth: {
                    $dayOfMonth:
                    {
                        $add:
                            ['$createDate', 7 * 60 * 60000]
                    }
                },
            }
        },
        {
            $match: matchQuery
        }

    ]

    if (type == 'day') {
        agg.push(
            {
                $group: {
                    _id: "$hour",
                    count: { $push: "$countChat" }
                }
            }
        )
    }
    if (type == 'week') {
        agg.push(
            {
                $group: {
                    _id: "$dateOfWeek",
                    count: { $push: "$countChat" }
                }
            }
        )
    }
    if (type == 'month') {
        agg.push(
            {
                $group: {
                    _id: "$dateOfMonth",
                    count: { $push: "$countChat" }
                }
            }
        )
    }
    _ChatThread.aggregate(agg, function (err, result) {
        res.json({
            type: type,
            data: result,
            code: err ? 500 : 200
        });
    })

}

/**
 * query biểu đồ campaign
 * @param {*} req 
 * @param {*} res 
 */
function getDataChartCampaign(req, res) {
    let matchQuery = {};

    if (_.has(req.query, 'refreshTime') && req.query.refreshTime) {
        matchQuery.createDate = {}
        matchQuery.createDate.$gte = moment(req.query.refreshTime, 'DD/MM/YYYY').startOf(req.query.unit)._d
        matchQuery.createDate.$lte = moment(req.query.refreshTime, 'DD/MM/YYYY').endOf(req.query.unit)._d
    }

    _ChatThread.aggregate([
        { $match: { createDate: { $ne: null } } },
        {
            $project: {
                converMiss:
                {
                    $cond:
                        [
                            {
                                $and: [
                                    { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                    {
                                        $eq: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                    }
                                ]
                            }
                            ,
                            1, 0]
                },
                converOffline:
                {
                    $cond:
                        [
                            {
                                $and: [
                                    { $eq: ['$customerMessageCount', null] },
                                    { $eq: ['$chatStatus', 6] }
                                ]
                            },
                            1, 0]
                },
                converReceive:
                {
                    $cond:
                        [
                            {
                                $or: [
                                    {
                                        $and: [
                                            { $ne: ['$customerMessageCount', null] }, { $ne: ['$chatStatus', 6] },
                                            {
                                                $gt: [{ $size: { $filter: { input: "$messagesChat", as: "el", cond: { $eq: ["$$el.type", "agent"] } } } }, 0]
                                            }
                                        ]
                                    },
                                    {
                                        $and: [
                                            {
                                                $or: [
                                                    { $eq: ['$activitySubStatus', 5900] },
                                                    { $eq: ['$activitySubStatus', 4900] }
                                                ]
                                            },
                                            {
                                                $or: [
                                                    { $eq: ['$activityStatus', 4000] },
                                                    { $eq: ['$activityStatus', 5000] }
                                                ]
                                            }
                                        ]

                                    }
                                ]
                            },
                            1, 0]
                },
                createDate: 1,
            }
        },
        {
            $match: matchQuery
        },
        {
            $group: {
                _id: null,
                converMiss: { $push: "$converMiss" },
                converOffline: { $push: "$converOffline" },
                converReceive: { $push: "$converReceive" }
            }
        }
    ], function (err, result) {
        res.json({
            data: result,
            code: err ? 500 : 200
        });
    })
}


