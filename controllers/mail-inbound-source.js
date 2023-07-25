

// GET
exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = req.query;

        var aggregate = _MailInboundSource.aggregate();
        aggregate._pipeline = [{
            $lookup: {
                from: 'mailinboundchannels',
                localField: 'idMailInboundChannel',
                foreignField: '_id',
                as: 'company'
            }
        }, {$unwind: '$company'}];

        //Điều kiện match aggregate
        //Map theo url client bắn lên
        var _query = _.chain([{name: 'company', type: 1}, {name: 'status', type: 2}, {name: 'name', type: 1}])
            .map(function (o) {
                if (_.isEqual(o.name, 'company')) {
                    return _.has(query, o.name) ? _.object(['company.name'], [_.switchAgg(o.type, query[o.name])]) : null;
                }
                else {
                    return _.has(query, o.name) ? _.object([o.name], [_.switchAgg(o.type, query[o.name])]) : null;
                }
            })
            .compact()
            .reduce(function (memo, item) {
                memo[_.keys(item)] = _.values(item)[0];
                return memo;
            }, {})
            .value();
        if (query.idCompany) _query['idCompany'] = _.convertObjectId(query.idCompany);
        if (!_.isEmpty(_query)) aggregate._pipeline.push({$match: {$and: [_query]}});

        //excute aggregate
        _MailInboundSource.aggregatePaginate(aggregate, {
            page: page,
            limit: rows
        }, function (error, channel, pageCount, count) {
            var paginator = new pagination.SearchPaginator({
                prelink: '/mail-inbound-source',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            res.json({channel: channel, paging: paginator.getPaginationData()});
        });
    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = req.query;

        var aggregate = _MailInboundSource.aggregate();
        aggregate._pipeline = [{
            $lookup: {
                from: 'mailinboundchannels',
                localField: 'idMailInboundChannel',
                foreignField: '_id',
                as: 'mailInboundChannel'
            }
        }, {$unwind: '$mailInboundChannel'}];
        //Điều kiện match aggregate
        //Map theo url client bắn lên
        var _query = _.chain([{name: 'mailInboundChannel', type: 1}, {name: 'status', type: 2}, {name: 'name', type: 1}])
            .map(function (o) {
                if (_.isEqual(o.name, 'mailInboundChannel')) {
                    return _.has(query, o.name) ? _.object(['mailInboundChannel.name'], [_.switchAgg(o.type, query[o.name])]) : null;
                }
                else {
                    return _.has(query, o.name) ? _.object([o.name], [_.switchAgg(o.type, query[o.name])]) : null;
                }
            })
            .compact()
            .reduce(function (memo, item) {
                memo[_.keys(item)] = _.values(item)[0];
                return memo;
            }, {})
            .value();
        if (!_.isEmpty(_query)) aggregate._pipeline.push({$match: {$and: [_query]}});

        //excute aggregate
        _MailInboundSource.aggregatePaginate(aggregate, {
            page: page,
            limit: rows
        }, function (error, sourceChannel, pageCount, count) {
            var paginator = new pagination.SearchPaginator({
                prelink: '/mail-inbound-source',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            //render view
            _.render(req, res, 'mail-inbound-source', {
                title: 'Quản lý mail inbound source',
                chatPort: _config['services'].chat,
                channel: sourceChannel,
                paging: paginator.getPaginationData(),
                sort: {name: req.query.name},
                plugins: [['bootstrap-select']]
            }, true, error);
        });
    }
};

//GET
exports.new = function (req, res) {
    //Chuyển trang tạo mới kênh
    _MailInboundChannel.find().exec(function (err, resp) {
        if (!err) _.render(req, res, 'mail-inbound-source-new', {
            title: 'Tạo mới mail inbound source',
            companies: resp,
            plugins: [['bootstrap-select'], ['mrblack-table']]
        }, true);
    });
};

//POST
exports.create = function (req, res) {
    if (_.has(req.body, 'status') && _.isEqual(req.body['status'], 'on')) req.body['status'] = 1;
    req.body['status'] = _.has(req.body, 'status') ? parseInt(req.body['status']) : 0;
    req.body.idMailInboundChannel = new mongodb.ObjectId(req.body.idMailInboundChannel);
    req.body['name'] = req.body['name']
    req.body['idMailCisco'] = req.body['idMailCisco']
    req.body['emailInbound'] = req.body['emailInbound']

    //Tạo mới nguồn  dựa vào body client bắn lên
    _MailInboundSource.create(req.body, function (error, r) {
        res.json({code: (error ? 500 : 200), message: error ? error : r});
    });
};

//GET
exports.edit = function (req, res) {
    //load trang chỉnh sửa thông tin nguồn
    _async.parallel({
        one: function (cb) {
            //Lây danh sách các kênh
            _MailInboundChannel.find().exec(function (err, resp) {
                cb(null, resp);
            });
        },
        two: function (cb) {
            //Lấy thông tin nguồn cần sửa
            _MailInboundSource.findById(req.params.mailinboundsource, function (err, channel) {
                cb(null, channel);
            });
        }
    }, function (err, resp) {
        if (!err) _.render(req, res, 'mail-inbound-source-edit', {
            title: 'Chỉnh sửa mail inbound source',
            companies: resp.one,
            channel: resp.two,
            plugins: [['bootstrap-select'], ['mrblack-table']]
        }, true);
    });
};

// PUT
exports.update = function (req, res) {
    if (_.has(req.body, 'status') && _.isEqual(req.body['status'], 'on')) req.body['status'] = 1;
    req.body['status'] = _.has(req.body, 'status') ? parseInt(req.body['status']) : 0;
    req.body.idMailInboundChannel = new mongodb.ObjectId(req.body.idMailInboundChannel);
    req.body['name'] = req.body['name']
    req.body['idMailCisco'] = req.body['idMailCisco']
    req.body['emailInbound'] = req.body['emailInbound']
    //Update thông tin kênh
    _MailInboundSource.findByIdAndUpdate(req.params['mailinboundsource'], req.body, {new: true}, function (error, cc) {
        _.genTree();
        res.json({code: (error ? 500 : 200), message: error ? error : cc});
    });
};

//phục vụ validate form
exports.validate = function (req, res) {
    req.query.idMailInboundChannel = new mongodb.ObjectId(req.query.idMailInboundChannel);
    if (_.has(req.query, 'name')) {
        //Validate tên kênh
        req.query['name'] = _.chain(req.query.name).trimValueNotLower().value();
        if (!_.has(req.query, 'currName') || !_.isEqual(req.query.name, req.query.currName)) {
            _MailInboundSource.findOne({idMailInboundChannel: req.query.idMailInboundChannel, name: req.query.name}).exec(function (error, ca) {
                res.json({code: _.isNull(ca)});
            });
        }
        else {
            res.json({code: true});
        }
    }
};

//DELETE
exports.destroy = function (req, res) {
    if (!_.isEqual(req.params.mailinboundsource, 'all')) {
        //Xóa 1 kênh
        _MailInboundSource._deleteAll({$in: req.params['mailinboundsource']}, function (error) {
            res.json({code: (error ? 500 : 200), message: error ? error : ""});
        });
    }
    else {
        //Xóa hàng loạt
        _MailInboundSource._deleteAll({$in: req.body.ids.split(',')}, function (error, ca) {
            res.json({code: (error ? 500 : 200), message: error ? error : ''});
        });
    }
};