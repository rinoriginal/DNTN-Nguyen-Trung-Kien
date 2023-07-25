var _TicketMails = require('../modals/tickets-mail')
exports.index = {
    json: function (req, res) {
        let { scope } = req.query;

        if (scope) {
            switch (scope) {
                case 'donut':
                    return getDataDonutChart(req, res);
                case 'bar':
                    return getDataBarChart(req, res);
                case 'channel':
                    return getDataChannel(req, res);
                case 'status':
                    return getDataByStatus(req, res);
                case 'agent':
                    return getDataByStatus(req, res);
                case 'search-ticket-mail':
                    return getDataTicket(req, res);
                case 'getAgentStatus':
                    return getAgentStatus(req, res)
            }
        } else {
            res.send({ code: 500, message: 'scope is required' });
        }
    },
    html: function (req, res) {
        _async.parallel({
            agent: function (next) {
                _MailInboundChannel.aggregate([
                    { $unwind: "$idAgentGroups" },
                    { $lookup: { from: "users", localField: "idAgentGroups", foreignField: "agentGroupMembers.group", as: "agent" } },
                    { $unwind: "$agent" },
                    {
                        $group: {
                            _id: '$agent._id',
                            agent: { $first: '$agent' }
                        }
                    },
                    { $sort: { _id: -1 } }
                ], next)
            }
        }, function (err, result) {
            _.render(req, res, 'dash-board-mail', {
                title: 'DashBoard Mail',
                agent: result.agent,
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
            }, true);
        })

    }
}

var getDataDonutChart = function (req, res) {
    _async.parallel({
        day: function (cb) {
            _TicketMails.aggregate(bindAggsDonutChart('day'), cb);
        },
        week: function (cb) {
            _TicketMails.aggregate(bindAggsDonutChart('week'), cb);
        },
        month: function (cb) {
            _TicketMails.aggregate(bindAggsDonutChart('month'), cb);
        }
    }, function (err, result) {
        if (err) {
            return res.json({ code: 500, message: err.errmsg });
        }
        return res.json({ code: 200, data: result });
    })
}

var bindAggsDonutChart = function (typeTime) {
    let matchQuery = {};
    let query = {}
    if (typeTime == 'day') {
        query['$gte'] = moment().startOf('day')._d;
        query['$lte'] = moment().endOf('day')._d;
        matchQuery = { created: query };
    }
    if (typeTime == 'week') {
        query['$gte'] = moment().startOf('week')._d;
        query['$lte'] = moment().endOf('week')._d;
        matchQuery = { created: query };
    }
    if (typeTime == 'month') {
        query['$gte'] = moment().startOf('month')._d;
        query['$lte'] = moment().endOf('month')._d;
        matchQuery = { created: query };
    }

    let agg = [
        { $match: { typeMail: 1 } },
        {
            $match: { idAgent: { $ne: null } }
        },
        { $match: matchQuery },

        //bắt theo mail đầu
        {
            $lookup: {
                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
            }
        },
        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },

        { $sort: { 'caseId.whenCreated': 1 } },
        {
            $group: {
                _id: "$_id",
                caseId: {
                    $push: '$caseId'
                },
                created: { $first: '$created' },
                status: { $first: '$status' }
            }
        },
        {
            $project: {
                // caseId: 1,
                firstCaseId: { $arrayElemAt: ["$caseId.whenCreated", 0] },
                created: { $add: ['$created', 1000 * 60 * 60 * 7] },
                status: 1
            }
        },
        // {
        //     $project: {//dữ liệu show group trực tiếp để show ra biểu đồ k qua convert moment nên cộng 7h
        //         created: { $add: ['$created', 1000 * 60 * 60 * 6] },
        //         status: 1
        //     }
        // },
        {
            $project: {//dữ liệu show group trực tiếp để show ra biểu đồ k qua convert moment nên cộng 7h
                firstCaseId: { $add: ['$firstCaseId', 1000 * 60 * 60 * 7] },
                created: 1,
                status: 1
            }
        },

        {
            $group: {
                _id: null,
                sumComplete: { $sum: { $cond: [{ $eq: ['$status', 2] }, 1, 0] } },
                sumInprogress: { $sum: { $cond: [{ $ne: ['$status', 2] }, 1, 0] } },
            }
        }
    ]
    return agg;
}


var getDataBarChart = function (req, res) {
    _async.parallel({
        day: function (cb) {
            _TicketMails.aggregate(bindAggsBarChart('day'), cb);
        },
        week: function (cb) {
            _TicketMails.aggregate(bindAggsBarChart('week'), cb);
        },
        month: function (cb) {
            _TicketMails.aggregate(bindAggsBarChart('month'), cb);
        }
    }, function (err, result) {
        if (err) {
            return res.json({ code: 500, message: err.errmsg });
        }
        return res.json({ code: 200, data: result });
    })
}

var bindAggsBarChart = function (typeTime) {
    let matchQuery = {};
    let query = {}
    if (typeTime == 'day') {
        query['$gte'] = moment().startOf('day')._d;
        query['$lte'] = moment().endOf('day')._d;
        matchQuery = { created: query };
    }
    if (typeTime == 'week') {
        query['$gte'] = moment().startOf('week')._d;
        query['$lte'] = moment().endOf('week')._d;
        matchQuery = { created: query };
    }
    if (typeTime == 'month') {
        query['$gte'] = moment().startOf('month')._d;
        query['$lte'] = moment().endOf('month')._d;
        matchQuery = { created: query };
    }

    let agg = [
        { $match: matchQuery },
        { $match: { typeMail: 1 } },
        {
            $match: { idAgent: { $ne: null } }
        },
        //bắt theo mail đầu
        {
            $lookup: {
                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
            }
        },
        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },
        // {
        //     $lookup: {
        //         from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
        //     }
        // },
        // { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: false } },

        { $sort: { 'caseId.whenCreated': 1 } },
        {
            $group: {
                _id: "$_id",
                caseId: {
                    $push: '$caseId'
                },
                created: { $first: '$created' }
            }
        },
        {
            $project: {
                // caseId: 1,
                firstCaseId: { $arrayElemAt: ["$caseId.whenCreated", 0] },
                created: 1
            }
        },
        {
            $project: {//dữ liệu show group trực tiếp để show ra biểu đồ k qua convert moment nên cộng 7h
                firstCaseId: { $add: ['$firstCaseId', 1000 * 60 * 60 * 7] },
                created: { $add: ['$created', 1000 * 60 * 60 * 7] }
            }
        },
        {
            $project: {
                hour: { $hour: '$created' },
                dateWeek: { $cond: [{ $eq: [{ $dayOfWeek: '$created' }, 1] }, 8, { $dayOfWeek: '$created' }] }, //1 là chủ nhật, còn lại tương ứng với thứ trong tuần
                dateMonth: { $dayOfMonth: '$created' },
                created: 1
            }
        }
    ]
    if (typeTime == 'day') {
        agg.push(
            {
                $group: {
                    _id: '$hour',
                    sum: { $sum: 1 },
                }
            }
        )
    }
    if (typeTime == 'week') {
        agg.push(
            {
                $group: {
                    _id: '$dateWeek',
                    sum: { $sum: 1 },
                }
            }
        )
    }
    if (typeTime == 'month') {
        agg.push(
            {
                $group: {
                    _id: '$dateMonth',
                    sum: { $sum: 1 },
                }
            }
        )
    }

    return agg;
}

var getDataChannel = function (req, res) {
    _async.parallel({

        channel: function (cb) {
            _MailInboundChannel.aggregate(bindAggsChannel(req, res), cb);
        }
    }, function (err, result) {
        if (err) {
            return res.json({ code: 500, message: err.errmsg });
        }
        return res.json({ code: 200, data: result });
    })
}

var bindAggsChannel = function (req, res) {

    let matchQuery = {};
    let dateQuery = {};

    dateQuery.$and = []
    // dateQuery.$and.push({ 'ticketmails.created': {$gte: moment().startOf('day')._d} })
    // dateQuery.$and.push({ 'ticketmails.created': {$lte: moment().endOf('day')._d} })
    dateQuery.$and.push({ $gte: ['$ticketmails.created', moment().startOf('day')._d] })
    dateQuery.$and.push({ $lte: ['$ticketmails.created', moment().endOf('day')._d] })


    if (_.has(req.query, 'agent') && req.query.agent) {
        matchQuery['agent._id'] = { $in: _.arrayObjectId(req.query.agent) }
    }
    let agg = [
        { $unwind: "$idAgentGroups" },
        { $lookup: { from: "users", localField: "idAgentGroups", foreignField: "agentGroupMembers.group", as: "agent" } },
        { $unwind: { path: '$agent', preserveNullAndEmptyArrays: false } },
        {
            $group: {
                _id: {
                    idChannel: '$_id',
                    idAgent: '$agent._id'
                },
                idChannel: { $first: '$_id' },
                idAgent: { $first: '$agent._id' },
                name: { $first: '$name' },
                agent: { $first: '$agent' },
            }
        },
        { $lookup: { from: "ticketmails", localField: "agent._id", foreignField: "idAgent", as: "ticketmails" } },
        { $unwind: { path: '$ticketmails', preserveNullAndEmptyArrays: true } },
        { $match: matchQuery },
        {
            $group: {
                _id: {
                    idChannel: '$idChannel',
                    idAgent: '$idAgent'
                },
                channelName: { $first: '$name' },
                agentName: { $first: '$agent.displayName' },
                agentAcc: { $first: '$agent.name' },
                idAgent: { $first: '$agent._id' },
                idAgentCisco: { $first: '$agent.idAgentCisco' },
                sumComplete: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $eq: ['$ticketmails.status', 2] },
                                { $eq: ['$ticketmails.typeMail', 1] },
                                dateQuery]
                        }, 1, 0]
                    }
                },
                sumUnComplete: {
                    $sum: {
                        $cond: [{
                            $and: [
                                { $ne: ['$ticketmails.status', 2] },
                                { $eq: ['$ticketmails.typeMail', 1] },
                                dateQuery]
                        }, 1, 0]
                    }
                }
            }
        },
        { $sort: { idAgent: -1 } },
        {
            $group: {
                _id: '$_id.idChannel',
                channelName: { $first: '$channelName' },
                agent: {
                    $push: {
                        agentName: '$agentName',
                        agentAcc: '$agentAcc',
                        idAgent: '$idAgent',
                        idAgentCisco: '$idAgentCisco',
                        sumComplete: '$sumComplete',
                        sumUnComplete: '$sumUnComplete'
                    }
                }

            }
        }

    ]


    return agg;
}
var getDataByStatus = function (req, res) {
    _async.parallel({

        mail: function (cb) {
            _TicketMails.aggregate(bindAggsStatus(req, res), cb);
        }
    }, function (err, result) {
        if (err) {
            return res.json({ code: 500, message: err.errmsg });
        }
        return res.json({ code: 200, data: result.mail });
    })
}

var bindAggsStatus = function (req, res) {
    let matchQuery = {};

    let query = {};
    query['$gte'] = moment().startOf('day')._d;
    query['$lte'] = moment().endOf('day')._d;
    matchQuery.created = query;

    if (_.has(req.query, 'idChannel') && req.query.idChannel) {
        matchQuery['idMailInboundChannel'] = _.convertObjectId(req.query.idChannel)
    }
    if (_.has(req.query, 'status') && req.query.status) {
        switch (req.query.status) {
            case 'complete':
                matchQuery['status'] = 2;
                break;
            case 'unComplete':
                matchQuery['status'] = { $ne: 2 };
                break;
        }
    }
    if (_.has(req.query, 'idAgent') && req.query.idAgent) {
        matchQuery['idAgent'] = _.convertObjectId(req.query.idAgent);
        // matchQuery['status'] = { $in: [-1, 0, 1, 2] };
    }
    let agg = [
        { $match: { typeMail: 1 } },
        { $match: matchQuery },
        {
            $lookup: {
                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
            }
        },
        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },
        { $sort: { 'caseId.whenCreated': 1 } },
        {
            $group: {
                _id: "$_id",
                caseId: {
                    $push: '$caseId'
                },
                aliasId: { $first: '$aliasId' },
                channelType: { $first: '$channelType' },
                created: { $first: '$created' },
                idAgent: { $first: '$idAgent' },
                idCustomer: { $first: '$idCustomer' },
                idMailInbound: { $first: '$idMailInbound' },
                idMailInboundChannel: { $first: '$idMailInboundChannel' },
                ticketReason: { $first: '$ticketReason' },
                ticketReasonCategory: { $first: '$ticketReasonCategory' },
                deadline: { $first: '$deadline' },
                note: { $first: '$note' },
                typeMail: { $first: '$typeMail' },
                status: { $first: '$status' }

            }
        },
        {
            $project: {
                // caseId: 1,
                firstCaseId: { $arrayElemAt: ["$caseId.whenCreated", 0] },
                totalMail: { $size: '$caseId' },
                aliasId: 1,
                channelType: 1,
                created: 1,
                idAgent: 1,
                idCustomer: 1,
                idMailInbound: 1,
                idMailInboundChannel: 1,
                ticketReason: 1,
                ticketReasonCategory: 1,
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: { $arrayElemAt: ["$caseId.subject", 0] },
                status: 1,
                mailOut: {
                    $filter:
                    {
                        input: "$caseId",
                        as: "el",
                        cond: { $and: [{ $eq: ["$$el.activitySubType", 6] }] }
                    }
                },
                mailIn: {
                    $filter:
                    {
                        input: "$caseId",
                        as: "el",
                        cond: { $and: [{ $eq: ["$$el.activitySubType", 1] }] }
                    }
                },
            }
        },
        {
            $lookup: {
                from: "customerindex", localField: "idCustomer", foreignField: "_id", as: "idCustomer"
            }
        },
        { $unwind: { path: '$idCustomer', preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
            }
        },
        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: false } },
        {
            $lookup: {
                from: "mailinboundsources", localField: "aliasId", foreignField: "idMailCisco", as: "aliasId"
            }
        },
        { $unwind: { path: '$aliasId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "ticketreasoncategories", localField: "reasonCategory", foreignField: "_id", as: "reasonCategory"
            }
        },
        { $unwind: { path: '$reasonCategory', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "ticketreasons", localField: "reason", foreignField: "_id", as: "reason"
            }
        },
        { $unwind: { path: '$reason', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "mailinboundchannels", localField: "idMailInboundChannel", foreignField: "_id", as: "mailInboundChannel"
            }
        },
        { $unwind: { path: '$mailInboundChannel', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                caseId: 1,
                firstCaseId: { $arrayElemAt: ["$caseId.whenCreated", 0] },
                totalMail: 1,
                aliasName: '$aliasId.name',
                channelType: 1,
                created: 1,
                agentName: '$idAgent.displayName',
                customerName: '$idCustomer.field_ho_ten',
                customerPhone: '$idCustomer.field_so_dien_thoai',
                customerEmail: '$idCustomer.field_e_mail',
                idMailInbound: 1,
                idMailInboundChannel: 1,
                reasonCategory: '$reasonCategory.name',
                reason: '$reason.name',
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: 1,
                status: 1,
                // firstTimeIn: { $arrayElemAt: ["$mailIn.whenCreated", 0] },
                firstTimeIn: '$created',
                mailSLA: '$mailInboundChannel.slaTimeConversation',
                //trường hợp chỉ có 1 mail vào thì lấy thời gian tạo ticket, nếu nhiều hơn 1 mail vào thì lấy thời gian mail
                lastTimeIn: {
                    $cond: [
                        { $gt: [{ $size: '$mailIn' }, 1] }, { $arrayElemAt: ["$mailIn.whenCreated", -1] }, '$created'
                    ]
                },
                firstTimeOut: { $arrayElemAt: ["$mailOut.whenCreated", 0] },
                lastTimeOut: { $arrayElemAt: ["$mailOut.whenCreated", -1] },
                checkFirstReply: {
                    $subtract: [
                        { $arrayElemAt: ["$mailOut.whenCreated", 0] },
                        '$created'
                    ]
                },
                checkLastReply: {
                    $subtract: [
                        { $arrayElemAt: ["$mailOut.whenCreated", -1] }, {
                            $cond: [
                                { $gt: [{ $size: '$mailIn' }, 1] }, { $arrayElemAt: ["$mailIn.whenCreated", -1] }, '$created'
                            ]
                        }
                    ]
                }
            }
        },
        {
            $sort: { created: -1 }
        }
    ]
    return agg;
}


var getDataTicket = function (req, res) {
    if (!req.query.idTicket) return res.json({ code: 500 });
    _TicketMails.aggregate([
        {
            $match: {
                _id: _.convertObjectId(req.query.idTicket)
            }
        },
        {
            $lookup: {
                from: "mailinbounds", localField: "caseId", foreignField: "caseId", as: "caseId"
            }
        },
        { $unwind: { path: '$caseId', preserveNullAndEmptyArrays: true } },
        { $sort: { 'caseId.whenCreated': -1 } },
        {
            $group: {
                _id: "$_id",
                caseId: {
                    $push: '$caseId'
                },
                aliasId: { $first: '$aliasId' },
                channelType: { $first: '$channelType' },
                created: { $first: '$created' },
                idAgent: { $first: '$idAgent' },
                idCustomer: { $first: '$idCustomer' },
                idMailInbound: { $first: '$idMailInbound' },
                idMailInboundChannel: { $first: '$idMailInboundChannel' },
                ticketReason: { $first: '$ticketReason' },
                ticketReasonCategory: { $first: '$ticketReasonCategory' },
                deadline: { $first: '$deadline' },
                note: { $first: '$note' },
                typeMail: { $first: '$typeMail' },
                status: { $first: '$status' }

            }
        },
        {
            $lookup: {
                from: "mailinboundsources", localField: "aliasId", foreignField: "idMailCisco", as: "aliasId"
            }
        },
        { $unwind: { path: '$aliasId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
            }
        },
        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                caseId: 1,
                aliasId: 1,
                channelType: 1,
                created: 1,
                idAgent: 1,
                idCustomer: 1,
                idMailInbound: 1,
                idMailInboundChannel: 1,
                ticketReason: 1,
                ticketReasonCategory: 1,
                deadline: 1,
                note: 1,
                typeMail: 1,
                subject: { $arrayElemAt: ["$caseId.subject", -1] },
                from: { $arrayElemAt: ["$caseId.formEmailAddress", -1] },
                status: 1
            }
        },

    ], function (err, result) {
        console.log(err);
        if (err) return res.json({ code: 500 })
        _async.parallel({
            cusInfo: function (cb) {
                _Company.findById(_.convertObjectId(req.session.user.companyLeaders[0].company))
                    .populate({
                        path: 'companyProfile',
                        model: _CompanyProfile,
                        select: 'fieldId _id',
                        populate: {
                            path: 'fieldId',
                            model: _CustomerFields,
                            select: 'displayName modalName status isRequired fieldValue fieldType weight _id',
                            options: { sort: { weight: 1, displayName: 1 } }
                        }
                    }).exec(cb)
            },
            customer: function (cb) {
                _async.waterfall([
                    function (next) {
                        if (!result[0].idCustomer || (result[0].idCustomer && result[0].idCustomer == '')) return next();
                        _Customerindex.findById(result[0].idCustomer).exec(function (err, data) {
                            next(err, data)
                        });
                    }
                ], cb)
            },
        }, function (err, rs) {
            if (err) return res.json({ code: 500 })
            let fields = rs.cusInfo.companyProfile.fieldId;
            let customer = rs.customer;
            let str = ''

            if (customer) {
                for (var i = 0; i < fields.length; i++) {

                    str +=
                        `<div class="col-md-6 m-t-10">` +
                        `   <div class="col-md-4 ` + (i % 2 == 0 ? `text-left` : `text-right`) + `">` +
                        `       <label for="name" class="control-label p-0"><strong>` + fields[i].displayName + ` :</strong></label>` +
                        `   </div>` +
                        `   <div class="col-md-8">` +
                        // `<input value="" class="form-control " type="text" id="edit_field_ho_ten" name="field_ho_ten:string">` +
                        dynamicCustomerInfo(fields[i], JSON.parse(JSON.stringify(customer))) +
                        `   </div>` +
                        `</div>`
                }
            }
            res.json({
                code: err ? 500 : 200,
                data: result[0],
                str: str
            });
        })


    })
}


/**
 * query lên cisco lấy trạng thái của agent
 * @param {*} req 
 * @param {*} res 
 */
var getAgentStatus = function (req, res) {
    let configCisco = _config.cisco.apiCisco;
    let pathApi = configCisco.ip + "/api/v1/reportRealTime/getStatusAgent";
    // let pathApi = "http://localhost:4242/api/v1/reportRealTime/getStatusAgent";

    _async.waterfall([
        function (next) {
            _MailInboundChannel.aggregate([
                { $unwind: "$idAgentGroups" },
                { $lookup: { from: "users", localField: "idAgentGroups", foreignField: "agentGroupMembers.group", as: "agent" } },
                { $unwind: "$agent" },
                {
                    $group: {
                        _id: '$agent._id',
                        agent: { $first: '$agent' }
                    }
                },
                {
                    $project: {
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
        body.MRDomainID = 5000 //domainID của chat: 5001, mail:5000
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

/**
 * Vẽ giao diện input thông tin khách hàng
 * @param el Dữ liệu customer field
 * @param v Dữ liệu đầu vào khách hàng
 * @returns {*}
 */
function dynamicCustomerInfo(el, v) {
    var _val = (v &&
        _.has(v, el.modalName) &&
        !_.isEmpty(v[el.modalName]) &&
        !_.isNull(v[el.modalName]) &&
        v[el.modalName].length
        // && _.has(v[el.modalName][0], 'value')
    ) ? v[el.modalName] : '';
    return _val;
};

