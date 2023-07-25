
exports.index = {
    json: function(req, res) {
        _async.parallel({
            findChannel: function(next) {
                _CompanyChannel.find({ idCompany: _.convertObjectId(req.query['idParent']) }, "_id name", next);
            },
            findAgent: function(next) {
                _AgentGroups.distinct("_id", req.query, function(err, r) {
                    _Users.find({ $or: [{ 'agentGroupLeaders.group': { $in: r } }, { 'agentGroupMembers.group': { $in: r } }, { 'companyLeaders.company': { $in: [_.convertObjectId(req.query.idParent)] } }] }, function(err, r2) {
                        //res.status(200).json(r2);
                        next(err, r2);
                    })
                })
            }
        }, function(err, resp) {
            res.status(200).json({ agents: resp['findAgent'], channels: resp['findChannel'] });
        })

    },
    html: function(req, res) {
        var companyQuery = {};
        var channel = {};
        var coms = [];
        var agents = [];
        var channels = [];
        if (req.session.auth.company) {
            companyQuery._id = _.convertObjectId(req.session.auth.company._id);
            channel.idCompany = _.convertObjectId(req.session.auth.company._id);
            if (!req.session.auth.company.leader) {
                _.render(req, res, 'report-chat-by-time', {
                    title: "Báo cáo chat - Báo cáo theo khung giờ",
                    plugins: ['moment', ['bootstrap-select'],
                        ['bootstrap-datetimepicker'], 'export-excel', ['chosen']
                    ],
                    agents: agents,
                    company: coms,
                    data: []
                }, true, new Error("Không đủ quyền truy cập"));
                return;

            }
        }
        _async.waterfall([
            function(next) {
                _ChatThread.find({}, function(error, result) {
                    next(error, result)
                })
            },
            function(data, next) {
                _requestMssql.query('select * from [eGActiveDB].[dbo].[EGLV_SESSION_CHAT_EVENT]', function(err, recordset) {
                    if (err) {
                        next(err)
                    }
                    let chatThreadCisco = (recordset && recordset.recordset)
                    let chatThreadUpdate = []
                    if (chatThreadCisco.length > 0 && data.length > 0) {
                        for (let itemCisco of chatThreadCisco) {
                            for (let item of data) {
                                if (itemCisco.ACTIVITY_ID == item.activityId) {
                                    if (itemCisco.AGENT_RESPONSE_COUNT == 1) {
                                        item.agentResponseAcount = 0
                                    } else {
                                        item.agentResponseAcount = itemCisco.AGENT_RESPONSE_COUNT
                                    }
                                    item.customerMessageCount = itemCisco.CUSTOMER_MESSAGE_COUNT
                                    item.agentTotalResponseTime = itemCisco.AGENT_TOTAL_RESPONSE_TIME
                                    item.agentLastResponseTime = itemCisco.AGENT_LAST_RESPONSE_TIME
                                    chatThreadUpdate.push(item)
                                }
                            }
                        }
                    }
                    var _bulk = mongoClient.collection('chatthreads').initializeUnorderedBulkOp({ useLegacyOps: true });
                    _.each(chatThreadUpdate, function(el) {
                        if (!el.clientId) return;
                        _bulk.find({ _id: el._id }).update({
                            $set: {
                                lastAgentChatTime: el.agentLastResponseTime,
                                updated: el.agentLastResponseTime,
                                status: 0,
                                agentMessage: [{
                                    id: _.convertObjectId(el.agentId[0]),
                                    send: el.agentResponseAcount,
                                    receive: el.customerMessageCount,
                                    response: Number(el.agentTotalResponseTime)
                                }]
                            }
                        });
                    })

                    if (_bulk == null || !_bulk.s.currentBatch) return next();
                    _bulk.execute(function(err) {
                        if (err) logger.error(err);
                        next();
                    });

                });
            },
            function(next) {
                _Company.find(companyQuery, function(err, com) {
                    coms = com;
                    _AgentGroups.find({ idParent: { $in: _.pluck(com, "_id") } }, { _id: 1 }, function(err, result) {
                        if (err) return callback(err, null);
                        var ag = _.pluck(result, '_id');
                        _Users.find({ $or: [{ 'agentGroupLeaders.group': { $in: ag } }, { 'agentGroupMembers.group': { $in: ag } }, { 'companyLeaders.company': { $in: com } }] }, function(err, agent) {
                            agents = agent;
                            next(err);
                        });
                    });
                });
            },
            function(next) {
                if (req.query.idCompany) channel.idCompany = _.convertObjectId(req.query.idCompany);
                if (req.query.idChannel) channel._id = _.convertObjectId(req.query.idChannel);
                _async.parallel({
                    channels: function(fn) {
                        _CompanyChannel.find(channel, "_id name", fn);
                    },
                    conds: function(fn) {
                        _CompanyChannel.distinct("_id", channel, fn);
                    }
                }, function(err, resp) {
                    channels = resp['channels'] ? resp['channels'] : [];
                    next(err, resp['conds']);
                });
            },
            function(a, next) {
                var query = {};
                // query.status = 0; //Cuộc chat đã đóng
                var query2 = {};
                query.channelId = { $in: a };
                if (req.query.startDate || req.query.endDate) {
                    query.created = {};
                    if (req.query.startDate) {
                        query.created.$gte = moment(req.query.startDate, "DD/MM/YYYY").startOf('day')._d;
                    }
                    if (req.query.endDate) {
                        query.created.$lte = moment(req.query.endDate, "DD/MM/YYYY").endOf('day')._d;
                    }
                }
                if (req.query.agentId) query2['agentId.id'] = { $in: _.arrayObjectId(req.query.agentId) };
                var agg = [
                    { $match: query },
                    { $project: { _id: 0, hours: { $hour: { $add: ["$created", 7 * 60 * 60 * 1000] } }, agentId: "$agentMessage" } },
                    { $unwind: "$agentId" },
                    { $match: query2 },
                    { $group: { _id: { id: "$agentId.id", hour: "$hours" }, total: { $sum: 1 }, missed: { $sum: { $cond: [{ $gt: ["$agentId.send", 0] }, 0, 1] } }, accept: { $sum: { $cond: [{ $gt: ["$agentId.send", 0] }, 1, 0] } } } },
                    { $lookup: { from: 'users', localField: '_id.id', foreignField: "_id", as: "agent" } },
                    { $unwind: "$agent" },
                    { $group: { _id: "$agent.displayName", hours: { $push: { block: "$_id.hour", total: "$total", missed: "$missed", accept: "$accept" } } } }
                ];

                if (!_.isEmpty(req.query)) {
                    _ChatThread.aggregate(agg).allowDiskUse(true).exec(function(err, r) {
                        next(err, r)
                    });
                } else {
                    next(null, [])
                }
            }
        ], function(err, data) {
            return _.render(req, res, 'report-chat-by-time', {
                title: "Báo cáo chat - Báo cáo theo khung giờ",
                plugins: ['moment', ['bootstrap-select'], 'export-excel', ['chosen']],
                company: coms,
                agents: agents,
                channels: channels,
                data: data
            }, true, err);
        })
    }
};