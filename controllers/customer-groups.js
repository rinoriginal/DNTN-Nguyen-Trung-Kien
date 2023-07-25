exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = _.cleanRequest(req.query);
        var aggregate = _CustomerGroups.aggregate();
        aggregate._pipeline = binAgg();
        if (!_.isEmpty(query)) aggregate._pipeline.push({ $match: query });
        aggregate._pipeline.push({ $sort: { _id: 1 } });
        _CustomerGroups.aggregatePaginate(aggregate, { page: page, limit: rows }, function (error, groups, pageCount, count) {
            var x = _.chain(groups)
                .each(function (g) {
                    g.sources = _.sortBy(g.sources, 'amount').reverse();
                    g.total = _.reduce(g.sources, function (memo, num) {
                        return memo + num.amount;
                    }, 0);
                })
                .value();
            return res.json(x);
        });
    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = _.cleanRequest(req.query);
        var aggregate = _CustomerGroups.aggregate();
        aggregate._pipeline = binAgg();
        if (!_.isEmpty(query)) aggregate._pipeline.push({ $match: query });
        aggregate._pipeline.push({ $sort: { _id: 1 } });
        _CustomerGroups.aggregatePaginate(aggregate, { page: page, limit: rows }, function (error, groups, pageCount, count) {
            var paginator = new pagination.SearchPaginator({ prelink: '/customer-groups', current: page, rowsPerPage: rows, totalResult: count });
            _.render(req, res, 'customer-groups', {
                title: 'Nhóm khách hàng',
                paging: paginator.getPaginationData(),
                groups: _.chain(groups)
                    .each(function (g) {
                        g.sources = _.sortBy(g.sources, 'amount').reverse();
                        g.totals = _.reduce(g.sources, function (memo, i) {
                            return memo + i.amount;
                        }, 0);
                    })
                    .value(),
            }, true, error);
        });
    }
}

function binAgg() {
    let agg = [
        {
            $lookup: {
                from: 'customersources',
                localField: '_id',
                foreignField: 'group',
                as: 'sources'
            }
        },
        { $unwind: { path: "$sources", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "customerindex",
                let: { "sourceId": "$sources._id" },
                pipeline: [
                    { $unwind: { path: "$sources", preserveNullAndEmptyArrays: false } },
                    { $match: { $expr: { $eq: ["$$sourceId", "$sources"] } } },
                ],
                as: "customer"
            }
        },
        {
            $addFields: {
                _id: '$_id',
                status: '$status',
                name: '$name',
                sources: {
                    _id: '$sources._id',
                    amount: { $size: "$customer" },
                    status: '$sources.status',
                    name: '$sources.name',
                    group: '$sources.group',

                }
            }
        },
        {
            $group: {
                _id: {
                    _id: '$_id',
                    status: '$status',
                    name: '$name'
                },
                sources: { $push: '$sources' }
            }
        },
        {
            $project: {
                _id: '$_id._id',
                status: '$_id.status',
                name: '$_id.name',
                sources: 1
            }
        },
        { $sort: { name: -1 } }
    ];

    return agg;
}


exports.create = function (req, res) {
    _CustomerGroups.create(_.chain(req.body).cleanRequest().mapObject(_.trimValue).value(), function (error, group) {
        if (error) {
            return res.json({ code: 500, message: error.message ? error.message : error });
        }
        return res.json({ code: 200, message: `Tạo nhóm <b>${group.name}</b> thành công!` });
    });
};

exports.update = function (req, res) {
    _CustomerGroups.update({ _id: req.params['customergroup'] }, _.chain(req.body).cleanRequest().mapObject(_.trimValue).value(), { new: true }, function (error, group) {
        if (error) {
            return res.json({ code: 500, message: error.message ? error.message : error });
        }
        return res.json({ code: 200, message: 'Cập nhật thành công!' });
    });
};

exports.edit = function (req, res) {
    _CustomerGroups.findById(req.params['customergroup'], function (error, group) {
        if (error) {
            return res.json({ code: 500, message: error.message ? error.message : error });
        }
        return res.json({ code: 200, message: group });
    });
};

exports.validate = function (req, res) {
    var _query = _.chain(req.query).cleanRequest(['_', 'fieldId', 'fieldValue']).mapObject(_.trimValue).value();
    if (_.has(_query, 'x-' + _.cleanValidateKey(req.query.fieldId)) && _.isEqual(_query[_.cleanValidateKey(req.query.fieldId)], _query['x-' + _.cleanValidateKey(req.query.fieldId)])) {
        res.json([req.query.fieldId, true]);
    } else {
        delete _query['x-' + _.cleanValidateKey(req.query.fieldId)];
        _CustomerGroups.findOne(_query).exec(function (error, f) {
            res.json([req.query.fieldId, _.isNull(f)]);
        });
    }
};

exports.destroy = function (req, res) {
    _CustomerGroups._remove(req.params['customergroup'], function (error, group) {
        if (error) {
            return res.json({ code: 500, message: error.message ? error.message : error });
        }
        return res.json({ code: 200, message: `Xoá nhóm <b>${group.removed.name}</b> thành công!` });
    });
};
