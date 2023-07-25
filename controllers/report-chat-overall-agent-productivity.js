
exports.index = {
    json: function(req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        if (_.has(req.query, 'queryChannel')) {
            if (_.has(req.query, 'idCompany')) {
                _CompanyChannel.find({ idCompany: _.convertObjectId(req.query.idCompany), status: 1 }, function(err, channels) {
                    res.json({ code: err ? 500 : 200, channels: channels });
                });
            } else {
                res.status(404).json({});
            }
        } else {
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
                function(cb) {
                    _Company.find(req.query.idCompany ? { _id: _.convertObjectId(req.query.idCompany) } : req.session.auth.company ? { _id: req.session.auth.company } : {}, function(err, com) {
                        _CompanyChannel.distinct("_id", { idCompany: { $in: com } }, function(err, r) {
                            _ServicesChat.distinct("_id", { idChannel: { $in: r } }, function(err, r2) {
                                _TicketsChat.distinct('threadId', { idService: { $in: r2 }, status: { $ne: -1 } }, function(err, r3) {
                                    cb(err, r3)
                                })
                            })
                        });
                    });
                }
            ], function(err, resp) {
                var threadQuery = { _id: { $in: resp }, status: 0 };
                if (req.query.agentId) {
                    threadQuery.agentId = { $in: _.arrayObjectId(req.query.agents) };
                }
                if (_.has(req.query, 'startTime') && _.has(req.query, 'endTime')) {
                    threadQuery['created'] = {
                        $gte: _moment(req.query['startTime'], 'DD/MM/YYYY').startOf('day')._d,
                        $lte: _moment(req.query['endTime'], 'DD/MM/YYYY').endOf('day')._d
                    }
                } else {
                    if (_.has(req.query, 'startTime')) {
                        threadQuery['created'] = {
                            $gte: _moment(req.query['startTime'], 'DD/MM/YYYY').startOf('day')._d,
                        }
                    }
                    if (_.has(req.query, 'endTime')) {
                        threadQuery['created'] = {
                            $lte: _moment(req.query['endTime'], 'DD/MM/YYYY').endOf('day')._d
                        }
                    }
                }

                //Todo: aggregate, nhóm threads + logs theo agent id
                var agg = [
                    { $match: threadQuery },
                    {
                        $project: {
                            _id: 1,
                            agentCount: { $size: "$agentId" },
                            agentMessage: 1,
                            diffDate: { $subtract: ["$updated", "$created"] }
                        }
                    },
                    //{$group:{_id:null, count:{$sum:1}, set:{$addToSet:"$agentMessage.id"}}}
                    { $unwind: { path: '$agentMessage', preserveNullAndEmptyArrays: true } },
                    {
                        $group: {
                            _id: '$agentMessage.id',
                            threadCount: { $sum: 1 },
                            connected: { $sum: { $cond: [{ $gt: ['$agentMessage.send', 0] }, 1, 0] } },
                            totalTime: { $sum: { $divide: ['$diffDate', '$agentCount'] } },
                            averageTime: { $avg: { $divide: ['$diffDate', '$agentCount'] } }
                        }
                    },
                    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'agent' } },
                    { $unwind: '$agent' }
                ];
                _ChatThread.aggregate(agg).allowDiskUse(true).exec(function(error, users) {
                    res.json({ code: _.isNull(error) ? 200 : 500, users: users });
                });
            });
        }
    },
    html: function(req, res) {
        var companyIds = [];
        if (req.session.auth.company) {
            companyIds.push(new mongoose.Types.ObjectId(req.session.auth.company._id))
            if (!req.session.auth.company.leader) {
                _.render(req, res, 'report-chat-overall-agent-productivity', {
                    title: "Báo cáo tổng thời gian chat",
                    plugins: ['moment', ['bootstrap-select'],
                        ['bootstrap-datetimepicker'], 'export-excel', ['chosen']
                    ],
                    company: [],
                    users: []
                }, true, new Error("Không đủ quyền truy cập"));
                return;
            }
        }

        _async.parallel({
            getUser: function(next) {
                _Users.find({ status: 1 }, next);
            },
            getCompany: function(next) {
                _Company.find(req.session.auth.company ? { _id: req.session.auth.company, status: 1 } : { status: 1 }, next);
            }
        }, function(err, resp) {
            if (!err) {
                return _.render(req, res, 'report-chat-overall-agent-productivity', {
                    title: "Báo cáo tổng thời gian chat",
                    plugins: ['moment', ['bootstrap-select'],
                        ['bootstrap-datetimepicker'], 'export-excel', ['chosen']
                    ],
                    users: resp.getUser,
                    company: resp.getCompany
                }, true, err);
            }
        });
    }
}