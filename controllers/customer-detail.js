var zoka = require(path.join(_rootPath, 'assets', 'plugins', 'zoka', 'script.js'));

exports.index = {
    json: function(req, res) {
        // Query dữ liệu khách hàng
        var _agg = _.map(cfields, function(o) {
            return { $lookup: { from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName } };
        });
        var _query = _.chain(cfields).map(function(o) {
            return _.has(query, o.modalName) ? _.object([o.modalName + '.value'], [_.switch(o.fieldType, [1, 2, 3, 4, 5, 6], [_.regexAgg(query[o.modalName])])]) : null;
        }).compact().value();
        if (_query.length) _agg.push({ $match: { $or: _query } });
        _Customer.aggregatePaginate(_agg, { page: 1, limit: 2 }, function(error, customers) {
            var paginator = new pagination.SearchPaginator({ prelink: '/customer', current: page, rowsPerPage: rows, totalResult: customers.length });
            res.json({ fields: cfields, customers: customers, paging: paginator.getPaginationData() });
        });
    },
    html: function(req, res) {
        var checkTime = Date.now();
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var sort = _.cleanSort(req.query, '.value');
        var query = _.cleanRequest(req.query);
        var queryIds = null;
        var cfields = [];

        var sort2 = _.reduce(_.keys(sort), function(memo, item) {
            memo[item.replace('.value', '')] = sort[item];
            return memo;
        }, {});

        var totalCount = 0;
        var _indexQuery = [];

        _async.waterfall([
            function(callback) {
                // Lấy dữ liệu customer field
                findCustomerFields(req, function(err, result) {
                    cfields = result;
                    callback(err);
                });
            },
            function(callback) {
                // Tìm ID khách hàng
                _.each(cfields, function(field) {
                    if (_.has(query, field.modalName)) _indexQuery.push(_.object([field.modalName], [_.switchAgg(field.fieldType, query[field.modalName])]));
                });

                mongoClient.collection('customerindex').find(_indexQuery.length > 0 ? { $and: _indexQuery } : {})
                    .sort(sort2)
                    .skip((page - 1) * rows)
                    .limit(rows)
                    .toArray(function(err, result) {
                        queryIds = _.pluck(result, '_id');
                        callback(err);
                    });
            },
            function(callback) {
                // Query dữ liệu và paging
                mongoClient.collection('customerindex').count(_indexQuery.length > 0 ? { $and: _indexQuery } : {}, function(err, result) {
                    var paginator = new pagination.SearchPaginator({
                        prelink: '/customer-detail',
                        current: page,
                        rowsPerPage: rows,
                        totalResult: result
                    });
                    callback(err, paginator);
                });
            },
            function(paginator, callback) {
                var aggs = [];
                aggs.push({ $match: { _id: { $in: queryIds } } });
                _.each(cfields, function(o) {
                    aggs.push({ $lookup: { from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName } });
                });
                if (!_.isEmpty(sort)) aggs.push({ $sort: sort });
                _Customer.aggregate(aggs, function(err, result) {
                    callback(err, { fields: cfields, customers: result, paging: paginator.getPaginationData() });
                });
            }
        ], function(error, result) {
            _.render(req, res, 'customer-detail', _.extend({
                title: 'Dữ liệu khách hàng',
                plugins: ['moment', ['bootstrap-select'],
                    ['bootstrap-datetimepicker']
                ],
            }, result), true, error);
        });
    }
};

// Show
exports.show = {
    json: function(req, res) {
        // Query danh sách ticket của khách hàng
        if (!mongodb.ObjectID.isValid(req.params.customerdetail))
            return res.json({ code: 500, message: 'Không tìm thấy khách hàng với ID: ' + req.params.customerdetail });

        var customerId = new mongodb.ObjectID(req.params.customerdetail);
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

        var agg = _Tickets.aggregate();
        agg._pipeline.push({ $match: { idCustomer: customerId } }, { $lookup: { from: 'services', localField: 'idService', foreignField: '_id', as: 'idService' } }, { $lookup: { from: 'campains', localField: 'idCampain', foreignField: '_id', as: 'idCampain' } }, { $lookup: { from: 'users', localField: 'updateBy', foreignField: '_id', as: 'updateBy' } }, { $unwind: { path: '$idService', preserveNullAndEmptyArrays: true } }, { $unwind: { path: '$idCampain', preserveNullAndEmptyArrays: true } }, { $unwind: { path: '$updateBy', preserveNullAndEmptyArrays: true } });

        if (!!req.session.auth.company) {
            var companyId = new mongodb.ObjectID(req.session.auth.company._id);
            agg._pipeline.push({
                $redact: {
                    $cond: {
                        if: {
                            $or: [
                                { $eq: ["$idService.idCompany", companyId] },
                                { $eq: ["$idCampain.idCompany", companyId] }
                            ]
                        },
                        then: "$$KEEP",
                        else: "$$PRUNE"
                    }
                }
            })
        }

        agg._pipeline.push({
            $group: {
                _id: '$_id',
                updateBy: { $first: '$updateBy' },
                deadline: { $first: '$deadline' },
                updated: { $first: '$updated' },
                status: { $first: '$status' },
                idService: { $first: '$idService' },
                idCampain: { $first: '$idCampain' },
                ticketReasonCategory: { $first: '$ticketReasonCategory' },
                ticketReason: { $first: '$ticketReason' },
                ticketSubreason: { $first: '$ticketSubreason' },
                note: { $first: '$note' },
            }
        }, {
            $project: {
                _id: 1,
                'updateBy.name': 1,
                'updateBy.displayName': 1,
                deadline: 1,
                updated: 1,
                status: 1,
                idService: 1,
                idCampain: 1,
                ticketReasonCategory: 1,
                ticketReason: 1,
                ticketSubreason: 1,
                note: 1
            }
        }, { $lookup: { from: 'ticketreasoncategories', localField: 'ticketReasonCategory', foreignField: '_id', as: 'ticketReasonCategory' } }, { $lookup: { from: 'ticketsubreasons', localField: 'ticketSubreason', foreignField: '_id', as: 'ticketSubreason' } }, { $unwind: { path: '$ticketReasonCategory', preserveNullAndEmptyArrays: true } }, { $unwind: { path: '$ticketSubreason', preserveNullAndEmptyArrays: true } });

        _Tickets.aggregatePaginate(agg, { page: page, limit: rows }, function(error, tickets, pageCount, total) {
            if (error) return res.json({ code: 500, message: error.message });
            var paginator = new pagination.SearchPaginator({
                prelink: '/customer-detail/' + req.params.customerdetail,
                current: page,
                rowsPerPage: rows,
                totalResult: total
            });
            res.json({ code: 200, message: { data: tickets, paging: paginator.getPaginationData() } });
        });
    },
    html: function(req, res) {
        if (!mongodb.ObjectID.isValid(req.params.customerdetail))
            return res.render('404', { title: '404 | Không tìm thấy khách hàng với ID: ' + req.params.customerdetail });
        if (_.has(req.query, 'search')) {
            searchTicket(req, res);
            return;
        }
        _async.parallel({
            ticket: function(callback) {
                // Lấy thông tin danh sách ticket của khách hàng
                var customerId = new mongodb.ObjectID(req.params.customerdetail);
                var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
                var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

                var agg = _CustomerJourney.aggregate();
                agg._pipeline.push({
                    $match: {
                        'ticketObject.idCustomer': customerId
                    }
                }, { $unwind: "$ticketObject" }, {
                    $lookup: {
                        from: 'campains',
                        localField: 'ticketObject.idCampain', // tìm id service cho outbound
                        foreignField: '_id',
                        as: 'idCampain'
                    }
                }, {
                    $unwind: {
                        path: '$idCampain',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $lookup: {
                        from: 'companies',
                        localField: 'idCampain.idCompany', // tìm kiếm công ty cho cuộc call outbound
                        foreignField: '_id',
                        as: 'companyOutbound'
                    }
                }, {
                    $lookup: {
                        from: 'services',
                        localField: 'ticketObject.idService', // tìm id service cho inbound
                        foreignField: '_id',
                        as: 'idService'
                    }
                }, {
                    $unwind: {
                        path: '$idService',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $lookup: {
                        from: 'companies',
                        localField: 'idService.idCompany', // tìm kiếm công ty cho cuộc call inbound
                        foreignField: '_id',
                        as: 'companyInbound'
                    }
                }, {
                    $lookup: {
                        from: 'servicechats',
                        localField: 'ticketObject.idService',
                        foreignField: '_id',
                        as: 'idServiceChat'
                    }
                }, {
                    $unwind: {
                        path: '$idServiceChat',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $lookup: {
                        from: 'companychannels',
                        localField: 'idServiceChat.idChannel', // Tìm kênh chát
                        foreignField: '_id',
                        as: 'idChannel'
                    }
                }, {
                    $unwind: {
                        path: '$idChannel',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $lookup: {
                        from: 'companies',
                        localField: 'idChannel.idCompany', // Tìm công ty chat
                        foreignField: '_id',
                        as: 'companyChat'
                    }
                }, {
                    $lookup: {
                        from: 'servicemails',
                        localField: 'ticketObject.idService', // Tìm service mail
                        foreignField: '_id',
                        as: 'idServiceMail'
                    }
                }, {
                    $unwind: {
                        path: '$idServiceMail',
                        preserveNullAndEmptyArrays: true
                    }
                }, {
                    $lookup: {
                        from: 'companies',
                        localField: 'idServiceMail.idCompany', // Tìm công ty mail
                        foreignField: '_id',
                        as: 'companyMail'
                    },
                }, {
                    $lookup: {
                        from: 'ticketreasoncategories',
                        localField: 'ticketObject.ticketReasonCategory',
                        foreignField: '_id',
                        as: 'ticketReasonCategory'
                    }
                }, { $unwind: { path: '$ticketReasonCategory', preserveNullAndEmptyArrays: true } }, {
                    $lookup: {
                        from: 'ticketsubreasons',
                        localField: 'ticketObject.ticketSubreason',
                        foreignField: '_id',
                        as: 'ticketSubreason'
                    }
                }, { $unwind: { path: '$ticketSubreason', preserveNullAndEmptyArrays: true } });
                // if (!!req.session.auth.company) {
                //     var companyId = new mongodb.ObjectID(req.session.auth.company._id);
                //     agg._pipeline.push({
                //         $redact: {
                //             $cond: {
                //                 if: { $or: [{ $eq: ["$idService.idCompany", companyId] }, { $eq: ["$idCampain.idCompany", companyId] }] },
                //                 then: "$$KEEP",
                //                 else: "$$PRUNE"
                //             }
                //         }
                //     })
                // }

                agg._pipeline.push({
                    $group: {
                        _id: '$ticketId',
                        updateBy: { $first: '$updateBy' },
                        channelType: { $first: '$ticketObject.channelType' },
                        idCampain: { $first: '$ticketObject.idCampain' },
                        deadline: { $first: '$ticketObject.deadline' },
                        updated: { $first: '$ticketObject.updated' },
                        status: { $first: '$ticketObject.status' },
                        idService: { $first: '$ticketObject.idService' },
                        ticketReasonCategory: { $first: '$ticketReasonCategory' },
                        ticketReason: { $first: '$ticketReason' },
                        ticketSubreason: { $first: '$ticketSubreason' },
                        note: { $first: '$ticketObject.note' },
                        companyChat: { $first: '$companyChat.name' },
                        companyMail: { $first: '$companyMail.name' },
                        companyOutcound: { $first: '$companyOutcound.name' },
                        companyInbound: { $first: '$companyInbound.name' }
                    }
                }, {
                    $project: {
                        _id: 1,
                        'updateBy.name': 1,
                        'updateBy.displayName': 1,
                        channelType: 1,
                        deadline: 1,
                        updated: 1,
                        status: 1,
                        idService: 1,
                        idCampain: 1,
                        ticketReasonCategory: 1,
                        ticketReason: 1,
                        ticketSubreason: 1,
                        note: 1,
                        companyChat: 1,
                        companyMail: 1,
                        companyInbound: 1,
                        companyOutbound: 1
                    }
                });
                _async.waterfall([
                    function(callback) {
                        _CustomerJourney.aggregatePaginate(agg, { page: page, limit: rows }, function(error, tickets, pageCount, total) {
                            if (error) return callback(error, null);
                            var paginator = new pagination.SearchPaginator({
                                prelink: '/customer-journey?customerId=' + req.params.customerdetail,
                                current: page,
                                rowsPerPage: rows,
                                totalResult: total
                            });
                            callback(error, { ticket: tickets, paging: paginator.getPaginationData() });
                        });
                    }
                ], callback);
            },
            ticketReasonCategory: function(callback) {
                // Lấy thông tin nhóm tình trạng ticket
                getTicketReason(callback);
            },
            customer: function(callback) {
                // Lấy thông tin khách hàng
                _async.waterfall([
                    function(callback) {
                        findCustomerFields(req, callback);
                    },
                    function(cfields, callback) {
                        var aggregate = [{ $match: { _id: new mongodb.ObjectID(req.params.customerdetail) } }];
                        _.each(cfields, function(o) {
                            aggregate.push({ $lookup: { from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName } });
                        });
                        _Customer.aggregate(aggregate, function(err, result) {
                            if (err) return callback(err, null);
                            callback(null, { fields: cfields, customer: result });
                        });
                    }
                ], callback);
            }
        }, function(err, result) {
            _.render(req, res, 'customer-detail-show', {
                title: 'Chi tiết ticket của khách hàng',
                plugins: ['moment', 'zoka', ['chosen'],
                    ['bootstrap-select'],
                    ['bootstrap-datetimepicker']
                ],
                zoka: zoka,
                ticket: result.ticket.ticket,
                ticketPaging: result.ticket.paging,
                customer: !!result.customer.customer ? result.customer.customer : null,
                fields: !!result.customer.fields ? result.customer.fields : null,
            }, true, err);
        });
    }
};

function searchTicket(req, res) {
    _async.parallel({
        reasonCategory: function(callback) {
            if (!_.has(req.query, 'ticketReasonCategory')) return callback(null, null);
            _TicketReasonCategory.find({
                status: 1,
                name: { $regex: new RegExp(_.stringRegex(req.query.ticketReasonCategory), 'i') }
            }, '_id', callback);
        },
        subReason: function(callback) {
            if (!_.has(req.query, 'ticketSubreason')) return callback(null, null);
            _TicketSubreason.find({
                status: 1,
                name: { $regex: new RegExp(_.stringRegex(req.query.ticketSubreason), 'i') }
            }, '_id', callback)
        },
        updateBy: function(callback) {
            if (!_.has(req.query, 'ticketUpdateBy')) return callback(null, null);
            _Users.find({
                $or: [
                    { name: { $regex: new RegExp(_.stringRegex(req.query.ticketUpdateBy), 'i') } },
                    { displayName: { $regex: new RegExp(_.stringRegex(req.query.ticketUpdateBy), 'i') } }
                ]
            }, '_id', callback);
        },
        searchCond: function(callback) {
            var cond = {
                idCustomer: new mongodb.ObjectID(req.query.idCustomer),
                _id: { $ne: new mongodb.ObjectID(req.query.tId) }
            };
            if (_.isNull(req.session.auth.company)) { // Tenant Leader
                callback(null, cond);
            } else if (req.session.auth.company.leader || req.session.auth.company.group.leader) { // Company Leader vs Agent Group Leader
                var companyId = new mongodb.ObjectID(req.session.auth.company._id);
                _Company.aggregate([
                    { $match: { _id: companyId } },
                    { $lookup: { from: 'services', localField: '_id', foreignField: 'idCompany', as: 'service' } },
                    { $lookup: { from: 'campains', localField: '_id', foreignField: 'idCompany', as: 'campain' } },
                    { $project: { _id: 1, 'service._id': 1, 'campain._id': 1 } }
                ], function(err, result) {
                    if (err) return callback(err, null);
                    var temp = _.reduce(result, function(memo, item) {
                        var service = item.service ? _.pluck(item.service, '_id') : [];
                        var campain = item.campain ? _.pluck(item.campain, '_id') : [];
                        memo['service'] = _.union(memo['service'], _.map(service, function(item) {
                            return item.toString();
                        }));
                        memo['campain'] = _.union(memo['campain'], _.map(campain, function(item) {
                            return item.toString();
                        }));
                        return memo;
                    }, {});
                    cond['$or'] = [{ idService: { $in: temp['service'] } }, { idCampain: { $in: temp['campain'] } }];
                    callback(err, cond);
                })
            } else { // member
                var userId = new mongodb.ObjectID(req.session.user._id);
                cond['$or'] = [{ idAgent: userId }, { assignTo: userId }];
                callback(null, cond);
            }
        },
        //trungdt jira 919
        searchCompany: function(next) {
                if (!_.has(req.query, 'company')) return next(null, null);
                _Company.aggregate([
                    { $match: { name: { $regex: new RegExp(_.stringRegex(req.query.company), 'i') } } },
                    { $lookup: { from: 'services', localField: '_id', foreignField: 'idCompany', as: 'service' } },
                    { $lookup: { from: 'campains', localField: '_id', foreignField: 'idCompany', as: 'campain' } },
                    { $project: { _id: 1, 'service._id': 1, 'campain._id': 1 } }
                ], function(err, result) {
                    if (err) return callback(err, null);
                    var temp = _.reduce(result, function(memo, item) {
                        var service = item.service ? _.pluck(item.service, '_id') : [];
                        var campain = item.campain ? _.pluck(item.campain, '_id') : [];
                        memo['service'] = _.union(memo['service'], _.map(service, function(item) {
                            return item.toString();
                        }));
                        memo['campain'] = _.union(memo['campain'], _.map(campain, function(item) {
                            return item.toString();
                        }));
                        return memo;
                    }, { service: [], campain: [] });
                    var cond = {};
                    cond['$or'] = [{ idService: { $in: temp['service'] } }, { idCampain: { $in: temp['campain'] } }];
                    next(err, cond);
                })
            }
            //trungdt jira 919
    }, function(err, result) {
        if (err) return res.json({ code: 500, message: JSON.stringify(err) });

        var searchCondition = result.searchCond;
        if (_.has(req.query, 'note')) searchCondition['note'] = { $regex: new RegExp(_.stringRegex(req.query.note), 'i') };
        if (_.has(req.query, 'status')) searchCondition['status'] = parseInt(req.query.status);
        if (!_.isEmpty(result.reasonCategory)) searchCondition['ticketReasonCategory'] = { $in: _.pluck(result.reasonCategory, '_id') };
        if (!_.isEmpty(result.subReason)) searchCondition['ticketSubreason'] = { $in: _.pluck(result.subReason, '_id') };
        if (!_.isEmpty(result.updateBy)) searchCondition['updateBy'] = { $in: _.pluck(result.updateBy, '_id') };
        if (_.has(req.query, 'ticketDeadline')) {
            var searchDay = _moment(req.query.ticketDeadline, 'DD/MM/YYYY').startOf('day');
            var nextDay = _moment(searchDay).add(1, 'day');
            searchCondition['deadline'] = { $gte: searchDay._d, $lt: nextDay._d };
        }
        if (_.has(req.query, 'ticketUpdateDate')) {
            var searchDay = _moment(req.query.ticketUpdateDate, 'DD/MM/YYYY').startOf('day');
            var nextDay = _moment(searchDay).add(1, 'day');
            searchCondition['updated'] = { $gte: searchDay._d, $lt: nextDay._d };
        }

        var page = _.has(req.query, 'page') ? req.query.page : 1;
        var rows = 10;
        var prelink = '/ticket-edit?' + _.reduce(_.keys(req.query), function(memo, key) {
            if (_.isEqual(key, 'page') || key.indexOf('FormData') >= 0 || _.isEqual(key, '_')) return memo;
            if (memo != '') memo += '&';
            memo += (key + '=' + req.query[key]);
            return memo;
        }, '');

        _Tickets
        //trungdt jira 919
            .find(_.isEmpty(result.searchCompany) ? searchCondition : { $and: [searchCondition, result.searchCompany] })
            .populate({
                path: 'idService',
                model: _Services,
                select: 'idCompany name _id',
                populate: {
                    path: 'idCompany',
                    model: _Company,
                    select: 'name _id'
                }
            })
            .populate({
                path: 'idCampain',
                model: _Campains,
                select: 'idCompany name _id',
                populate: {
                    path: 'idCompany',
                    model: _Company,
                    select: 'name _id'
                }
            })
            //trungdt jira 919
            .populate({ path: 'updateBy', model: _Users, select: 'name displayName' })
            .populate({ path: 'ticketSubreason', model: _TicketSubreason, select: 'name _id' })
            .populate({ path: 'ticketReasonCategory', model: _TicketReasonCategory, select: 'name _id' })
            .sort({ created: 1 })
            .paginate(page, rows, function(error, result, total) {
                var paginator = new pagination.SearchPaginator({
                    prelink: prelink,
                    current: page,
                    rowsPerPage: rows,
                    totalResult: total
                });
                var obj = {};
                obj['data'] = result;
                obj['paging'] = paginator.getPaginationData();
                res.json({ code: err ? 500 : 200, message: err ? err : obj })
            })

    });
}

/**
 * Lấy thông tin trường dữ liệu khách hàng
 * @param req
 * @param callback
 */
function findCustomerFields(req, callback) {
    if (req.session.auth.company == null) {
        _CustomerFields.find({ status: 1 }, null, { sort: { weight: 1 } }, callback);
    } else {
        var companyId = new mongodb.ObjectID(req.session.auth.company._id);

        _Company.findOne({ _id: companyId })
            .populate({
                path: 'companyProfile',
                model: _CompanyProfile,
                select: 'fieldId',
                populate: [{
                    path: 'fieldId',
                    model: _CustomerFields
                }]
            })
            .exec(function(err, result) {
                var fields = (result && result.companyProfile && result.companyProfile.fieldId) ? result.companyProfile.fieldId : [];
                callback(err, fields);
            });
    }
}

/**
 * Lấy thông tin nhóm trạng thái ticket
 * @param callback
 */
function getTicketReason(callback) {
    _TicketReasonCategory.aggregate([
        { $match: { status: 1 } },
        { $project: { _id: 1, name: 1 } },
        { $lookup: { from: 'ticketreasons', localField: '_id', foreignField: 'idCategory', as: 'tr' } },
        { $unwind: { path: '$tr', preserveNullAndEmptyArrays: true } },
        { $sort: { 'tr.priority': 1 } },
        { $lookup: { from: 'ticketsubreasons', localField: 'tr._id', foreignField: 'idReason', as: 'tr.subReason' } },
        { $group: { _id: '$_id', name: { $first: '$name' }, tReason: { $push: { trId: '$tr._id', name: '$tr.name', subReason: '$tr.subReason' } } } },
        { $project: { _id: 1, name: 1, tReason: { trId: 1, name: 1, subReason: { _id: 1, name: 1, priority: 1, } } } }
    ], function(err, result) {
        callback(err, _.reduce(result, function(memo, item) {
            item.tReason = _.reduce(item.tReason, function(memo, item) {
                item.subReason = _.map(_.sortBy(item.subReason, 'priority'), function(item) {
                    return _.omit(item, 'priority');
                });
                memo.push(item);
                return memo;
            }, []);
            memo.push(item);
            return memo;
        }, []));
    });
}