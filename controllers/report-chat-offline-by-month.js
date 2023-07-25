

exports.index={
    json:function(req, res){
        if (req.query['getDetail']){
            if (!req.query['threadId']){
                return res.json({code: 500});
            }
            var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 4;
            var threadIds = _.arrayObjectId(req.query['threadId'].split(','));
            var agg = _ChatLog.aggregate();
            agg._pipeline = [
                {$match:
                    {$and: [
                        {threadId: {$in:threadIds}},
                        {"sentFrom.from": 1}
                    ]}
                },
                {$sort: {created: 1}},
                {
                    $lookup: {from: "chatthreads", localField: "threadId", foreignField: "_id", as: "chatthreads"}
                },
                {$unwind: "$chatthreads"},
                {
                    $lookup: {from: "users", localField: "chatthreads.agentId", foreignField: "_id", as: "agent"}
                },
                {$unwind: {path: "$agent", preserveNullAndEmptyArrays: true}},
                {$project: {
                    content: 1,
                    attachment: 1,
                    clientId: "$chatthreads.clientId",
                    created: 1,
                    name: 1,
                    phone: 1,
                    agent: "$agent.displayName"
                }}
            ];
            _ChatLog.aggregatePaginate(agg, {page: page, limit: rows}, function (err, resp, pageCount, count){
                if (err){
                    return res.json({code: 500});
                }
                var paginator = new pagination.SearchPaginator({
                    prelink: '/report-chat-offline-by-month',
                    current: page,
                    rowsPerPage: rows,
                    totalResult: count
                });
                res.json({code: 200, data: resp, paging: paginator.getPaginationData()});
            });

        }else{
            var unit='month';
            var unitGroup= {month: { $month: {$add:["$created", 7*60*60*1000]}}, year:{$year: {$add:["$created", 7*60*60*1000]}}};
            var dateQuery = {};
            var minMonth = moment().startOf('year').format('M');
            var maxMonth = moment().endOf('year').format('M');
            var minYear = moment().format('Y');
            var maxYear = moment().format('Y');
            if(req.query.startDate||req.query.endDate){
                dateQuery.created = {};
                if (req.query.startDate) {
                    dateQuery.created.$gte = moment(req.query.startDate, "DD/MM/YYYY").startOf(unit)._d;
                }
                if (req.query.endDate) {
                    dateQuery.created.$lte =  moment(req.query.endDate, "DD/MM/YYYY").endOf(unit)._d;
                }
            }
            var isQueryRange = false;
            if (req.query.startDate && req.query.endDate){
                isQueryRange = true;
                minMonth = moment(req.query.startDate, "DD/MM/YYYY").format('M');
                minYear = moment(req.query.startDate, "DD/MM/YYYY").format('Y');
                maxMonth = moment(req.query.endDate, "DD/MM/YYYY").format('M');
                maxYear = moment(req.query.endDate, "DD/MM/YYYY").format('Y');
            }
            //if(!req.query.channelId){
            //    return res.json({code: 500});
            //}
            var channelQuery = {};
            if (req.query.channelId) channelQuery['_id'] = {
                $in: _.arrayObjectId(req.query.channelId)
            };
            if (req.query.idCompany) channelQuery['idCompany'] = _.convertObjectId(req.query.idCompany);

            _async.waterfall([function(cb){
                _CompanyChannel.distinct('_id', channelQuery, cb);
            }], function(err, result){
                var agg = [
                    {$match:
                        {$and: [
                            {isOffline: 1},
                            {status: {$ne: -1}, channelId:{$in:result}}
                        ]}
                    },
                    {$match: dateQuery},
                    {$unwind: {path: "$agentMessage", preserveNullAndEmptyArrays: true}},
                    {
                        $group: {
                            _id:"$_id",
                            created: {$max:"$created"},
                            agentReplyCount:{$sum:{$cond:[{$gt:['$agentMessage.send',0]},1,0]}}
                        }
                    },
                    {
                        $lookup: {from: "ticketchats", localField: "_id", foreignField: "threadId", as: "ticket"}
                    },
                    {$unwind: {path: "$ticket", preserveNullAndEmptyArrays: true}},
                    {
                        $group: {
                            _id: unitGroup,
                            threadId: {$push: '$_id'},
                            answer: {
                                $sum: {
                                    $cond: [{$gt: ["$agentReplyCount", 0]},1,0]
                                }
                            },
                            receive: {$sum: 1},
                            progressing: {$sum:{$cond:[{$eq:["$ticket.status",1]},1,0]}},
                            waiting: {$sum:{$cond:[{$eq:["$ticket.status",0]},1,0]}},
                            finish:{$sum:{$cond:[{$eq:["$ticket.status",2]},1,0]}}
                        }
                    },
                    {$sort: {'_id.year': 1,'_id.month': 1}}
                ];
                if(err) return res.json({code: 500, data: err.message});
                _ChatThread.aggregate(agg).allowDiskUse(true).exec(function (err, result) {
                    if (!isQueryRange || !result.length){
                        return res.json({code: (err) ? 500 : 200, data: result});
                    }
                    var resp = [];
                    for (var y = minYear; y <= maxYear; ++y){
                        var start = minMonth;
                        var end = 12;
                        if (y > minYear){
                            start = 1;
                        }
                        if (y == maxYear){
                            end = maxMonth;
                        }
                        for (var m = start; m <= end; ++m){
                            var r = {
                                _id: {month: m, year: y},
                                threadId: [],
                                answer: 0, receive: 0, progressing: 0, waiting: 0, finish: 0
                            }; //default
                            var f = _.find(result, function (o){
                                return o._id.month == m && o._id.year == y; //tìm tháng trong kết quả vừa query
                            });
                            f = f ? f : r; //Lấy tháng query được, hoặc default nếu không có trong db
                            resp.push(f);
                        }
                    }
                    res.json({code: (err) ? 500 : 200, data: resp});
                });
            })
        }
    },
    html:function(req, res){
        var companyIds = [];
        if (req.session.auth.company) {
            companyIds.push(new mongoose.Types.ObjectId(req.session.auth.company._id))
            if (!req.session.auth.company.leader) {


                _.render(req, res, 'report-chat-offline-by-month', {
                    title: "Báo cáo theo tháng",
                    plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', ['chosen']]

                }, true, new Error("Không đủ quyền truy cập"));
                return;
            }
        }
        //log.debug(req.session);
        _async.waterfall([
            function (next) {
                _Company.find( req.session.auth.company ? {_id: req.session.auth.company} : {}, function (err, com) {
                    next(err, com);
                });
            }
        ], function (err, com) {
            return _.render(req, res, 'report-chat-offline-by-month', {
                title: "Báo cáo theo tháng",
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], 'export-excel', ['chosen']],
                company: com
            }, true, err);
        })
    }
}