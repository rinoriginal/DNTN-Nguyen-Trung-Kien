
var titlePage = 'Báo cáo gọi vào - báo cáo chi tiết vấn đề';
var searchNotFoundError = new Error('Không tìm thấy kết quả với khoá tìm kiếm');
var accessDenyError = new Error('Không đủ quyền truy cập');
let titleHeadTable = [
    { key: 'congty', value: 'Công ty' },
    { key: 'nguonkhachhang', value: 'Nguồn khách hàng' },
    { key: 'trangthai', value: 'Trạng thái' },
    { key: 'nhomtinhtrang', value: 'Nhóm tình trạng' },
    { key: 'tiinhtrang', value: 'Tình trạng' },
    { key: 'lydo', value: 'Lý do' },
    { key: 'note', value: 'Chú thích' },
    { key: 'ngaycapnhat', value: 'Ngày cập nhật' },
    { key: 'nguoicapnhat', value: 'Người cập nhật' },
    { key: 'solangoi', value: 'Số lần gọi ra' }
]
var zipFolder = require('zip-folder');

exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'status')) req.query.status = parseInt(req.query.status);

        getTickets(req, res, function (err, paginator, tickets) {
            if (err && _.isString(err)) {
                var conditions = arguments[1];
                var totalResult = arguments[2];
                exportExcel(req, res, conditions, totalResult);
                return;
            }

            if (err) return res.json({ code: 500, message: err.message });
            res.json({
                code: 200,
                message: tickets,
                paging: paginator.getPaginationData(),
                formId: req.query.formId
            })
        });
    },
    html: function (req, res) {
        if (req.session.auth.company && !req.session.auth.company.leader) {
            return _.render(req, res, 'report-inbound-tickets', {
                title: titlePage,
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
                data: null
            }, true, accessDenyError);
        }
        var cond = {};
        cond.$or = [];
        if (req.session.auth.company) {
            cond.$or.push({ 'companyLeaders.company': _.convertObjectId(req.session.auth.company._id) });
        }
        _async.parallel({
            company: function (callback) {
                if (!_.isEmpty(req.session.auth.company)) {
                    var obj = [{
                        name: req.session.auth.company.name,
                        _id: _.convertObjectId(req.session.auth.company._id)
                    }];
                    callback(null, obj);
                } else {
                    _Company.find({}, { _id: 1, name: 1 }, function (err, result) {
                        if (err) return callback(err);
                        var rr = Array.isArray(result) ? result : [result];
                        callback(err, rr);
                    });
                }
            },
            user: function (callback) {
                _async.waterfall([
                    function (callback) {
                        _Company.distinct("_id", req.session.auth.company ? { _id: req.session.auth.company } : {}, function (err, com) {
                            _AgentGroups.find({ idParent: { $in: com } }, { _id: 1 }, function (err, result) {
                                if (err) return callback(err, null);
                                var ag = _.pluck(result, '_id');
                                cond.$or.push({ 'agentGroupLeaders.group': { $in: ag } }, { 'agentGroupMembers.group': { $in: ag } }, { 'companyLeaders.company': { $in: com } });
                                _Users.find(cond, callback);
                            });
                        });
                    }
                ], callback);
            },
            ticketReasonCategory: function (callback) {

                _async.waterfall([
                    function (callback) {
                        _TicketReasonCategory.find({
                            $or: [
                                { category: 0 },
                                { category: 1 }
                            ]
                        }, callback);
                    },
                    function (trc, callback) {
                        _TicketReason.find({ idCategory: { $in: _.pluck(trc, '_id') } }, function (err, result) {
                            callback(err, trc, result);
                        });
                    },
                    function (trc, tr, callback) {
                        _TicketSubreason.find({ idReason: { $in: _.pluck(tr, '_id') } }, function (err, result) {
                            callback(err, {
                                trc: trc,
                                tr: tr,
                                tsr: result
                            });
                        });
                    }
                ], callback);
            }
        }, function (err, result) {
            var temp = result.ticketReasonCategory;
            delete result.ticketReasonCategory;

            result['ticketReasonCategory'] = temp.trc;
            result['ticketReason'] = temp.tr;
            result['ticketSubreason'] = temp.tsr;

            return _.render(req, res, 'report-inbound-tickets', {
                title: titlePage,
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
                recordPath: _config.recordPath ? _config.recordPath.path : '',
                data: result
            }, true, err);
        });
    }
};

function permissionConditions(req, callback) {
    var cond = [{ $match: { idCampain: null } }];

    if (_.isEmpty(req.session.auth.company)) {
        if (_.has(req.query, 'company')) {
            _Services.aggregate([
                { $match: { idCompany: { $in: _.arrayObjectId(req.query.company) } } },
                { $project: { _id: 1 } }
            ], function (err, result) {
                if (err) return callback(err, null);
                cond.push({ $match: { idService: { $in: _.pluck(result, '_id') } } });
                callback(err, cond);
            });
        } else {
            callback(null, cond);
        }
    } else {
        var companyId = _.convertObjectId(req.session.auth.company._id);

        if (req.session.auth.company.leader) {
            _Services.aggregate([
                { $match: { idCompany: companyId } },
                { $project: { _id: 1 } }
            ], function (err, result) {
                if (err) return callback(err, null);
                cond.push({ $match: { idService: { $in: _.pluck(result, '_id') } } });
                callback(err, cond);
            });
        } else {
            var err = new Error('Không đủ quyền hạn để truy cập trang này');
            callback(err);
        }
    }
}

function getTickets(req, res, callback) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

    var sort = _.cleanSort(req.query, '');

    var _query = _.cleanRequest(req.query, ['_'
        , 'notes'
        , 'formId'
        , 'dt'
        , 'ignoreSearch'
        , 'socketId'
        , 'download'
        , 'totalResult'
        , 'company'
    ]);
    _async.waterfall([
        function (callback) {
            permissionConditions(req, callback);
        },
        function (cond, callback) {
            _async.parallel({
                customerSource: function (callback) {
                    if (!_.has(_query, 'customersources')) return callback(null, null);
                    _CustomerSource.find(
                        { name: { $regex: new RegExp(_.stringRegex(_query.customersources), 'i') } },
                        { _id: 1 },
                        function (err, result) {
                            if (err) return callback(err, null);

                            delete _query.customersources;
                            if (result == null || result.length == 0) return callback(searchNotFoundError, null);
                            callback(err, _.pluck(result, '_id'));
                        });
                },
                ticketReason: function (callback) {
                    if (!_.has(_query, 'ticketReason')) return callback(null, null);
                    _TicketReason.find(
                        { _id: _.convertObjectId(req.query.ticketReason) },
                        function (err, result) {
                            if (err) return callback(err, null);

                            delete _query.ticketReason;
                            if (result == null || result.length == 0) return callback(searchNotFoundError, null);
                            callback(err, _.pluck(result, '_id'));
                        });
                },
                ticketReasonCategory: function (callback) {
                    if (!_.has(_query, 'ticketReasonCategory')) return callback(null, null);
                    _TicketReasonCategory.find(
                        { _id: _.convertObjectId(req.query.ticketReasonCategory) },
                        function (err, result) {
                            if (err) return callback(err, null);

                            delete _query.ticketReasonCategory;
                            if (result == null || result.length == 0) return callback(searchNotFoundError, null);
                            callback(err, _.pluck(result, '_id'));
                        });
                },
                updateBy: function (callback) {
                    if (!_.has(_query, 'updateBy')) return callback(null, null);
                    _Users.find(
                        { _id: _.convertObjectId(req.query.updateBy) },
                        function (err, result) {
                            if (err) return callback(err, null);

                            delete _query.updateBy;
                            if (result == null || result.length == 0) return callback(searchNotFoundError, null);
                            callback(err, _.pluck(result, '_id'));
                        });
                },
                phoneNumber: function (callback) {
                    if (!_.has(_query, 'field_so_dien_thoai')) return callback(null, null);
                    _CCKFields['field_so_dien_thoai'].db.find(
                        { value: { $regex: new RegExp(_.stringRegex(_query.field_so_dien_thoai), 'i') } },
                        function (err, result) {
                            if (err) return callback(err, null);

                            delete _query.field_so_dien_thoai;
                            if (result == null || result.length == 0) return callback(searchNotFoundError, null);
                            callback(err, _.pluck(result, 'entityId'));
                        }
                    )
                }
            }, function (err, result) {
                if (err) return callback(err, cond, result);

                var query = {};
                if (!_.isNull(result.phoneNumber)) query['_id'] = { $in: result.phoneNumber };
                if (!_.isNull(result.customerSource)) query['sources'] = { $in: result.customerSource };
                if (!_.isNull(result.ticketReason)) query['ticketReason'] = { $in: result.ticketReason };
                if (!_.isNull(result.ticketReasonCategory)) query['ticketReasonCategory'] = { $in: result.ticketReasonCategory };
                if (!_.isNull(result.updateBy)) query['updateBy'] = { $in: result.updateBy };
                if (_.isEmpty(query)) return callback(null, cond, null);

                _Customer.find(query, { _id: 1 }, function (err, result) {
                    callback(err, cond, _.pluck(result, '_id'));
                });
            });
        },
        function (cond, customerId, callback) {
            var obj = _.chain(_query)
                .keys()
                .reduce(function (memo, item) {
                    if (_.isEqual(item, 'updated')) {
                        var _d1 = _moment(req.query.updated.split(' - ')[0], 'DD/MM/YYYY');
                        var _d2 = req.query.updated.split(' - ')[1] ? _moment(req.query.updated.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

                        var startDay = (_d1._d < _d2._d) ? _d1 : _d2;
                        var endDay = (_d1._d < _d2._d) ? _d2 : _d1;
                        startDay = startDay.startOf('day');
                        endDay = endDay.endOf('day');
                        memo[item] = { $gte: startDay._d, $lt: endDay._d };
                    } else {
                        if (item === 'callIdLength') {
                            memo[item] = req.query[item] == '0' ? { $eq: 1 } : { $gt: 1 };
                        } else {
                            memo[item] = req.query[item];
                        }
                    }
                    return memo;
                }, {})
                .value();

            if (!_.isEmpty(obj)) cond.push({ $match: obj });
            //if (req.query.startDate||req.query.endDate){
            //    var updated = {};
            //    if(req.query.startDate){
            //        updated.$gte = _moment(req.query.startDate,"DD/MM/YYYY")._d
            //    }
            //    if(req.query.endDate){
            //        updated.$lte = _moment(req.query.endDate,"DD/MM/YYYY").endOf('day')._d
            //    }
            //    cond.push({$match: {updated:updated}});
            //}
            if (!_.isEmpty(customerId)) cond.push({ $match: { idCustomer: { $in: customerId } } });

            if (_.has(req.query, 'notes')) {
                cond.push({ $match: { note: { $regex: new RegExp(_.stringRegex(req.query.notes), 'i') } } });
            }
            if (_.has(req.query, 'ticketReason')) {
                cond.push({ $match: { ticketReason: _.convertObjectId(req.query.ticketReason) } });
            }
            if (_.has(req.query, 'ticketReasonCategory')) {
                cond.push({ $match: { ticketReasonCategory: _.convertObjectId(req.query.ticketReasonCategory) } });
            }
            if (_.has(req.query, 'updateBy')) {
                cond.push({ $match: { updateBy: _.convertObjectId(req.query.updateBy) } });
            }
            callback(null, cond);
        },
        function (cond, callback) {
            if (_.has(req.query, 'download') && !_.isEqual(req.query.download, '0')) {
                return callback('download', cond, parseInt(req.query.totalResult));
            }
            var __query = cond;

            if (!_.isEmpty(sort)) cond.push({ $sort: sort });
            // cond.push({ $skip: (page - 1) * rows }, { $limit: rows });
            cond.push({ $project: { _id: 1 } });
            _Tickets.aggregate(cond, function (err, result) {
                if (err) return callback(err, null);

                // if (_.has(req.query, 'socketId')
                //     && (_.isEqual(req.query.ignoreSearch, '1') || result.length > 0)) {
                //     createPaging(req, __query, page, rows);
                // }
                callback(err, _.pluck(result, '_id'));
            });
        },
        function (ticketIds, callback) {
            var agg = _Tickets.aggregate();
            agg._pipeline.push({ $match: { _id: { $in: ticketIds } } });
            agg._pipeline.push({
                $lookup: {
                    from: 'services',
                    localField: 'idService',
                    foreignField: '_id',
                    as: 'service'
                }
            },
                { $unwind: '$service' },
                {
                    $lookup: {
                        from: 'companies',
                        localField: 'service.idCompany',
                        foreignField: '_id',
                        as: 'company'
                    }
                },
                { $unwind: '$company' },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'updateBy',
                        foreignField: '_id',
                        as: 'updateBy'
                    }
                },
                { $unwind: { path: '$updateBy', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'idAgent',
                        foreignField: '_id',
                        as: 'idAgent'
                    }
                },
                { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'customerindex',
                        localField: 'idCustomer',
                        foreignField: '_id',
                        as: 'customerIndex'
                    }
                },
                { $unwind: { path: '$customerIndex', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'customers',
                        localField: 'idCustomer',
                        foreignField: '_id',
                        as: 'customer'
                    }
                },
                { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$customer.sources', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'customersources',
                        localField: 'customer.sources',
                        foreignField: '_id',
                        as: 'customer.sources'
                    }
                },
                { $unwind: { path: '$customer.sources', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'ticketreasoncategories',
                        localField: 'ticketReasonCategory',
                        foreignField: '_id',
                        as: 'ticketReasonCategory'
                    }
                },
                { $unwind: { path: '$ticketReasonCategory', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'ticketreasons',
                        localField: 'ticketReason',
                        foreignField: '_id',
                        as: 'ticketReason'
                    }
                },
                { $unwind: { path: '$ticketReason', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'ticketsubreasons',
                        localField: 'ticketSubreason',
                        foreignField: '_id',
                        as: 'ticketSubreason'
                    }
                },
                { $unwind: { path: '$ticketSubreason', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: '$_id',
                        company: { $first: '$company.name' },
                        service: { $first: '$service.name' },
                        customerIndex: { $first: '$customerIndex' },
                        sources: { $push: '$customer.sources.name' },
                        status: { $first: '$status' },
                        ticketReasonCategory: { $first: '$ticketReasonCategory.name' },
                        ticketReason: { $first: '$ticketReason.name' },
                        ticketSubreason: { $first: '$ticketSubreason.name' },
                        note: { $first: '$note' },
                        updated: { $first: '$updated' },
                        ubName: { $first: '$updateBy.name' },
                        ubdisplayName: { $first: '$updateBy.displayName' },
                        callId: { $first: '$callId' },
                        callIdLength: { $first: '$callIdLength' }
                    }
                },
                {
                    $lookup: {
                        from: 'cdrtransinfos',
                        localField: 'callId',
                        foreignField: 'callId',
                        as: 'cdr'
                    }
                });
            if (!_.isEmpty(sort)) agg.push({ $sort: sort });
            _Tickets.aggregatePaginate(agg, { page: page, limit: rows }, function (err, result, node, count) {
                var paginator = new pagination.SearchPaginator({
                    prelink: '/report-inbound-tickets',
                    current: page,
                    rowsPerPage: rows,
                    totalResult: count
                });
                callback(err, paginator, result)
            });
        },
        function (paginator, tickets, next) {
            var agg = [{ $match: { _id: { $in: _.pluck(tickets, '_id') } } }];
            agg.push({ $unwind: '$callId' });
            agg.push({
                $lookup: {
                    from: 'cdrtransinfos',
                    localField: 'callId',
                    foreignField: 'callId',
                    as: 'trans'
                }
            });
            agg.push({ $unwind: { path: '$trans', preserveNullAndEmptyArrays: true } });
            agg.push({
                $group: {
                    _id: "$_id",
                    max: { $max: "$trans.callDuration" },
                    recordPath: { $push: { path: "$trans.recordPath", dur: "$trans.callDuration" } }
                }
            });

            _Tickets.aggregate(agg, function (err, result) {
                var _records = {};
                _.each(result, function (el) {
                    _.each(el.recordPath, function (el2) {
                        if (el2.dur == el.max && el2.path) _records[el._id.toString()] = el2.path;
                    });
                });

                _.each(tickets, function (el) {
                    el.recordPath = _records[el._id.toString()];
                });

                next(err, paginator, tickets);
            });
        }
    ], callback);
}

function collectTicketInfo() {
    return [
        {
            $lookup: {
                from: 'services',
                localField: 'idService',
                foreignField: '_id',
                as: 'service'
            }
        },
        { $unwind: '$service' },
        {
            $lookup: {
                from: 'companies',
                localField: 'service.idCompany',
                foreignField: '_id',
                as: 'company'
            }
        },
        { $unwind: '$company' },
        {
            $lookup: {
                from: 'users',
                localField: 'updateBy',
                foreignField: '_id',
                as: 'updateBy'
            }
        },
        { $unwind: { path: '$updateBy', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'users',
                localField: 'idAgent',
                foreignField: '_id',
                as: 'idAgent'
            }
        },
        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'customerindex',
                localField: 'idCustomer',
                foreignField: '_id',
                as: 'customerIndex'
            }
        },
        { $unwind: { path: '$customerIndex', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'customers',
                localField: 'idCustomer',
                foreignField: '_id',
                as: 'customer'
            }
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$customer.sources', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'customersources',
                localField: 'customer.sources',
                foreignField: '_id',
                as: 'customer.sources'
            }
        },
        { $unwind: { path: '$customer.sources', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'ticketreasoncategories',
                localField: 'ticketReasonCategory',
                foreignField: '_id',
                as: 'ticketReasonCategory'
            }
        },
        { $unwind: { path: '$ticketReasonCategory', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'ticketreasons',
                localField: 'ticketReason',
                foreignField: '_id',
                as: 'ticketReason'
            }
        },
        { $unwind: { path: '$ticketReason', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'ticketsubreasons',
                localField: 'ticketSubreason',
                foreignField: '_id',
                as: 'ticketSubreason'
            }
        },
        { $unwind: { path: '$ticketSubreason', preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: '$_id',
                company: { $first: '$company.name' },
                service: { $first: '$service.name' },
                customerIndex: { $first: '$customerIndex' },
                sources: { $push: '$customer.sources.name' },
                status: { $first: '$status' },
                ticketReasonCategory: { $first: '$ticketReasonCategory.name' },
                ticketReason: { $first: '$ticketReason.name' },
                ticketSubreason: { $first: '$ticketSubreason.name' },
                note: { $first: '$note' },
                updated: { $first: '$updated' },
                ubName: { $first: '$updateBy.name' },
                ubdisplayName: { $first: '$updateBy.displayName' },
                callId: { $first: '$callId' },
                callIdLength: { $first: '$callIdLength' }
            }
        },
        {
            $lookup: {
                from: 'cdrtransinfos',
                localField: 'callId',
                foreignField: 'callId',
                as: 'cdr'
            }
        }
    ];
}

function createPaging(req, aggregate, page, rows) {
    // aggregate._pipeline.push({
    //     $group: {
    //         _id: '$status',
    //         count: { $sum: 1 }
    //     }
    // });
    // aggregate._pipeline.push({ $skip: (page - 1) * rows }, { $limit: rows });

    _Tickets.aggregatePaginate(aggregate, { page: page, limit: rows }, function (err, result, node, count) {
        var obj = {};
        if (err) {
            obj = { code: 500, message: err.message, formId: req.query.formId, dt: req.query.dt };
        } else {
            // var total = _.chain(result)
            //     .pluck('count')
            //     .reduce(function (memo, item) {
            //         return memo + item;
            //     }, 0)
            //     .value();

            var paginator = new pagination.SearchPaginator({
                prelink: '/report-inbound-tickets',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });

            obj = { code: 200, message: paginator.getPaginationData(), formId: req.query.formId, dt: req.query.dt }
        }

        sio.to(req.query.socketId).emit('responseReportInboundTicketPagingData', obj);
    });
}

function exportExcel(req, res, conditions, totalResult) {
    var maxRecordPerFile = 65000;
    var maxParallelTask = 5;
    var waterFallTask = [];
    var currentDate = new Date();
    var folderName = req.session.user._id + "-" + currentDate.getTime();
    var fileName = titlePage + ' ' + _moment(currentDate).format('DD-MM-YYYY');

    var date = new Date().getTime();

    if (totalResult > maxRecordPerFile) {
        for (var k = 0; k < Math.ceil(totalResult / (maxRecordPerFile * maxParallelTask)); ++k) {
            var tempWaterfall = [];
            if (k == 0) {
                tempWaterfall = function (callback) {
                    _async.parallel(createParallelTask(k), callback);
                }
            } else {
                tempWaterfall = function (objectId, callback) {
                    var lastObjectId = objectId[maxParallelTask - 1];
                    _async.parallel(createParallelTask(k, lastObjectId), callback);
                }
            }

            waterFallTask.push(tempWaterfall);
        }

        var createParallelTask = function (index, objectId) {
            var tempParallelTask = [];
            var fileNames = [];
            for (var i = 0; i < maxParallelTask; i++) {
                fileNames.push(fileName + '-' + index + '-' + i);
            }
            _.each(fileNames, function (o) {
                var temp = function (callback) {
                    var agg = conditions;
                    if (_.isEmpty(objectId)) {
                        agg.push({ $limit: maxRecordPerFile });
                    } else {
                        agg.push({ $match: { _id: { $gt: objectId } } }, { $limit: maxRecordPerFile });
                    }
                    agg.push({ $sort: { updated: 1 } });
                    agg.push.apply(agg, collectTicketInfo());

                    _Tickets.aggregate(agg, function (err, result) {
                        if (err) return callback(err, null);
                        createExcelFile(req
                            , folderName
                            , o
                            , result
                            , callback);
                    });
                };
                tempParallelTask.push(temp);
            });
            return tempParallelTask;
        }
    } else {
        var temp = function (callback) {
            conditions.push.apply(conditions, collectTicketInfo());

            _Tickets.aggregate(conditions, function (err, result) {
                if (err) return callback(err, null);

                createExcelFile(req
                    , folderName
                    , fileName
                    , result
                    , callback);
            });
        };
        waterFallTask.push(temp);
    }

    waterFallTask.push(
        function (objectId, callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), callback);
        },
        function (t, callback) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'ticket', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                callback(err, folderZip.replace(_rootPath, ''));
            });
        }
    );

    _async.waterfall(waterFallTask, function (err, folderZip) {
        res.json({ code: err ? 500 : 200, message: err ? err.message : folderZip });
    });
}

function createExcelFile(req, folderName, fileName, data, callback) {
    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'ticket', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function (callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'ticket', folderName), callback);
        },
        function (t, callback) {
            _async.parallel({
                _config: function (done) {
                    fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), done);
                },
                _customerFields: function (done) {
                    _CustomerFields.find({ status: 1 }, { _id: 0, displayName: 1, modalName: 1, weight: 1 }, done);
                }
            }, callback);
        },
        function (bundle, callback) {
            // Xuất báo cáo có kèm thông tin khách hàng
            var customerColumnHeader = [];
            var checkExistCustomer = false;
            for (var i = 0; i <= data.length; i++) {
                if (data[i].customerIndex) {
                    checkExistCustomer = true
                    break;
                }
            }
            if (data.length > 0 && checkExistCustomer) {
                // Lấy các trường thông tin của khách hàng
                var fields = [];
                _.pluck(data, 'customerIndex').map(function (cus) {
                    _.each(cus, function (v, k) {
                        var has = _.find(fields, function (str) {
                            return str === k;
                        });
                        if (!has && k != '_id') {
                            fields.push(k);
                        }
                    });
                });
                if (checkExistCustomer) {
                    _.each(fields, function (k) {
                        var field = _.find(bundle._customerFields, function (f) {
                            return f.modalName == k;
                        });
                        if (field) {
                            customerColumnHeader.push({
                                value: field.displayName ? field.displayName.toUpperCase() : '',
                                key: field.modalName,
                                width: field.weight ? field.weight : 10
                            });
                        }
                    });
                }

            }
            var excelHeader = ['TXT_COMPANY'
                //, 'TXT_PHONE_NUMBER'
                , 'TXT_CUSTOMER_SOURCE'
                , 'TXT_STATUS'
                , 'TXT_TICKET_REASON_CATEGORY'
                , 'TXT_TICKET_REASON'
                , 'TXT_TICKET_SUBREASON'
                , 'TXT_NOTE'
                , 'TXT_UPDATED'
                , 'TXT_UPDATED_BY'
                , 'TXT_CALL_LENGTH'];

            var workbook = new _Excel.Workbook();
            workbook.creator = req.session.user.displayName;
            workbook.created = new Date();
            var sheet = workbook.addWorksheet(titlePage);
            var column = [];


            // if (customerColumnHeader.length) {
            //     column.push.apply(column, customerColumnHeader);
            // }

            // _.each(excelHeader, function (header) {
            //     column.push({
            //         header: bundle._config.MESSAGE.REPORT_INBOUND_TICKETS[header],
            //         key: header,
            //         width: bundle._config.MESSAGE.REPORT_INBOUND_TICKETS[header].length
            //     });
            // });
            // sheet.columns = column;
            var customerColumn = [...customerColumnHeader]
            createTitleExcel(sheet, titlePage, req.query.updated);
            createHead(sheet, customerColumnHeader);
            if (data !== null) {
                _async.eachSeries(data, function (item, cb) {
                    var reportBaseRows = [];
                    _.each(customerColumn, function (header) {
                        if (item.customerIndex && item.customerIndex[header.key] && header.key == 'field_gioi_tinh')
                        //  || header.key == 'field_tinh_thanh'
                        // || header.key == 'field_tgs' || header.key == 'field_yutang') 
                        {
                            reportBaseRows.push(item.customerIndex ? item.customerIndex[header.key].toString() : '');
                        }
                        else if (item.customerIndex && item.customerIndex[header.key] && header.key == 'field_tinh_thanh')
                        //  || header.key == ''
                        // || header.key == 'field_tgs' || header.key == 'field_yutang') 
                        {
                            reportBaseRows.push(item.customerIndex ? item.customerIndex[header.key].toString() : '');
                        }
                        else if (item.customerIndex && item.customerIndex[header.key] && header.key == 'field_tgs')
                        //  || header.key == ''
                        // || header.key == '' || header.key == 'field_yutang') 
                        {
                            reportBaseRows.push(item.customerIndex ? item.customerIndex[header.key].toString() : '');
                        }
                        else if (item.customerIndex && item.customerIndex[header.key] && header.key == 'field_yutang')
                        //  || header.key == ''
                        // || header.key == '' || header.key == '') 
                        {
                            reportBaseRows.push(item.customerIndex ? item.customerIndex[header.key].toString() : '');
                        }
                        else {
                            reportBaseRows.push(item.customerIndex ? item.customerIndex[header.key] : '');
                        }
                    });
                    reportBaseRows.push.apply(reportBaseRows, [
                        item.company
                        , item.sources.join(' ,')
                        , changeStatus(item.status)
                        , item.ticketReasonCategory ? item.ticketReasonCategory : ''
                        , item.ticketReason ? item.ticketReason : ''
                        , item.ticketSubreason ? item.ticketSubreason : ''
                        , item.note
                        , item.updated ? _moment(item.updated).format(options.dateFormat) : ''
                        , item.ubdisplayName ? item.ubdisplayName + " (" + item.ubName + ")" : ''
                        , item.callIdLength ? item.callIdLength - 1 : '0'
                    ]);
                    /*sheet.addRow([
                        item.company
                        //, item.customerIndex.field_so_dien_thoai
                        , item.sources.join(' ,')
                        , changeStatus(item.status)
                        , item.ticketReasonCategory ? item.ticketReasonCategory : ''
                        , item.ticketReason ? item.ticketReason : ''
                        , item.ticketSubreason ? item.ticketSubreason : ''
                        , item.note
                        , item.updated ? _moment(item.updated).format(options.dateFormat) : ''
                        , item.ubdisplayName ? item.ubdisplayName + " (" + item.ubName + ")" : '']);*/
                    sheet.addRow(reportBaseRows);
                    for (let i = 1; i <= customerColumnHeader.length; i++) {
                        let charNameColumn = _.columnToLetter(i);

                        sheet.lastRow.getCell(charNameColumn).border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" }
                        }
                        sheet.lastRow.getCell(charNameColumn).font = {
                            name: EXCEL_CONFIG.fontName,
                            family: 4,
                            size: 12
                        };
                    }
                    cb();
                }, function (err) {
                    workbook.xlsx.writeFile(options.filename).then(callback);
                });
            } else {
                workbook.xlsx.writeFile(options.filename).then(callback);
            }
        }
    ], function (err, result) {
        callback(err, data[data.length - 1]._id);
    });
};

function changeStatus(status) {
    switch (status) {
        case 0:
            return 'Chờ xử lý';
        case 1:
            return 'Đang xử lý';
        default:
            return 'Hoàn thành';
    }
}

function createTitleExcel(worksheet, title, updated) {
    worksheet.getCell('A1').value = 'GOLDEN GATE ';
    worksheet.getCell('A1').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 13, underline: 'true', bold: true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('A1:C1');
    worksheet.getCell('F1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM ';
    worksheet.getCell('F1').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 13, underline: 'true', bold: true };
    worksheet.getCell('F1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('F1:K1');
    worksheet.getCell('A2').value = 'PHÒNG CHĂM SÓC KHÁCH HÀNG ';
    worksheet.getCell('A2').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 13, underline: 'true', bold: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('A2:C2');
    worksheet.getCell('G2').value = 'Độc lập - Tự do - Hạnh Phúc ';
    worksheet.getCell('G2').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 13, underline: 'true', bold: true };
    worksheet.getCell('G2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('G2:J2');


    worksheet.getCell('C4').value = title;
    worksheet.getCell('C4').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 18, underline: 'true', bold: true };
    worksheet.getCell('C4').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('C4:G4');

    if (updated && updated.split('-').length == 2) {
        var str = 'Thời gian từ: ';
        str += updated.split('-')[0] + ' đến: ' + updated.split('-')[1];
        worksheet.getCell('C5').value = str;
        worksheet.mergeCells('C5:G5');
        worksheet.getCell('C5').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 13, underline: 'true', bold: true };
        worksheet.getCell('C5').alignment = { vertical: 'middle', horizontal: 'center' };

    }
    else {
        worksheet.getCell('D5').value = '(Thời gian từ ... đến ...)';
        worksheet.mergeCells('D5:F5');
        worksheet.getCell('D5').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 13, underline: 'true', bold: true };
        worksheet.getCell('D5').alignment = { vertical: 'middle', horizontal: 'center' };
    }
    worksheet.addRow([]);
}

function createHead(worksheet, customerColumnHeader) {
    customerColumnHeader.push.apply(customerColumnHeader, titleHeadTable)
    worksheet.addRow(_.pluck(customerColumnHeader, 'value'));
    for (let i = 1; i <= customerColumnHeader.length; i++) {
        let charNameColumn = _.columnToLetter(i);
        worksheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "medium" },
            left: { style: "medium" },
            bottom: { style: "medium" },
            right: { style: "medium" }
        }
        worksheet.lastRow.getCell(charNameColumn).font = {
            name: EXCEL_CONFIG.fontName,
            family: 4,
            size: 12,
            bold: true
        };
        worksheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
    }
    var dobCol1 = worksheet.getColumn(1);
    dobCol1.width = 20;
    var dobCol2 = worksheet.getColumn(2);
    dobCol2.width = 30;
    var dobCol3 = worksheet.getColumn(3);
    dobCol3.width = 20;
    var dobCol4 = worksheet.getColumn(4);
    dobCol4.width = 15;
    var dobCol5 = worksheet.getColumn(5);
    dobCol5.width = 20;
    var dobCol6 = worksheet.getColumn(6);
    dobCol6.width = 18;
    var dobCol7 = worksheet.getColumn(7);
    dobCol7.width = 23;
    var dobCol8 = worksheet.getColumn(8);
    dobCol8.width = 12;
    var dobCol9 = worksheet.getColumn(9);
    dobCol9.width = 15;
    var dobCol10 = worksheet.getColumn(10);
    dobCol10.width = 15;
    var dobCol11 = worksheet.getColumn(11);
    dobCol11.width = 23;
    var dobCol12 = worksheet.getColumn(12);
    dobCol12.width = 23;
    var dobCol13 = worksheet.getColumn(13);
    dobCol13.width = 18;
    var dobCol14 = worksheet.getColumn(14);
    dobCol14.width = 25;
    var dobCol15 = worksheet.getColumn(15);
    dobCol15.width = 25;
    var dobCol16 = worksheet.getColumn(16);
    dobCol16.width = 30;
    var dobCol17 = worksheet.getColumn(17);
    dobCol17.width = 30;
    var dobCol18 = worksheet.getColumn(18);
    dobCol18.width = 23;
    var dobCol19 = worksheet.getColumn(19);
    dobCol19.width = 23;
    var dobCol20 = worksheet.getColumn(20);
    dobCol20.width = 25;

    //row
    var row = worksheet.getRow(7);
    row.height = 23;


}