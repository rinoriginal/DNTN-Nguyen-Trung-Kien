
const {
    getListSkillGroupFromCisco,
    getListAgent,
    updateSkillGroup
} = require('../commons/CiscoAPI');
var _config = require(path.join(_rootPath, 'config', 'conf.json'));
// GET
exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = req.query;

        if (_.isEqual(req.query['type'], 'getAgent')) {
            // Lấy dữ liệu agent thuộc công ty của campaign
            var idCompany = req.query['idCompany'];
            _async.waterfall([
                function (next) {
                    var aggregate = [];
                    var _query = { idParent: new mongodb.ObjectId(idCompany) };
                    aggregate.push({ $match: _query });
                    aggregate.push({ $lookup: { from: 'users', localField: '_id', foreignField: 'agentGroupMembers.group', as: 'members' } });
                    aggregate.push({ $lookup: { from: 'users', localField: '_id', foreignField: 'agentGroupLeaders.group', as: 'leaders' } });

                    _AgentGroups.aggregate(aggregate, function (err, groups) {
                        var agents = _.chain(groups)
                            .reduce(function (memo, group) {
                                return _.union(memo, group.members, group.leaders);
                            }, 0)
                            .compact()
                            .value();
                        next(err, agents);
                    });
                },
                function (result, next) {
                    _Users.find({ _id: { $in: _.pluck(result, '_id') } }, next);
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err : result });
            });
            return;
        }

        var aggregate = _MailInboundChannel.aggregate();
        aggregate._pipeline = [{
            $lookup: {
                from: 'companies',
                localField: 'idCompany',
                foreignField: '_id',
                as: 'company'
            }
        }, { $unwind: '$company' }];

        //Điều kiện match aggregate
        //Map theo url client bắn lên
        var _query = _.chain([{ name: 'company', type: 1 }, { name: 'status', type: 2 }, { name: 'name', type: 1 }])
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
        if (!_.isEmpty(_query)) aggregate._pipeline.push({ $match: { $and: [_query] } });

        //excute aggregate
        _MailInboundChannel.aggregatePaginate(aggregate, {
            page: page,
            limit: rows
        }, function (error, channel, pageCount, count) {
            var paginator = new pagination.SearchPaginator({
                prelink: '/mail-inbound-channel',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            res.json({ channel: channel, paging: paginator.getPaginationData() });
        });
    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var query = req.query;

        var aggregate = _MailInboundChannel.aggregate();
        aggregate._pipeline = [{
            $lookup: {
                from: 'companies',
                localField: 'idCompany',
                foreignField: '_id',
                as: 'company'
            }
        }, { $unwind: '$company' }];
        //Điều kiện match aggregate
        //Map theo url client bắn lên
        var _query = _.chain([{ name: 'company', type: 1 }, { name: 'status', type: 2 }, { name: 'name', type: 1 }])
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
        if (!_.isEmpty(_query)) aggregate._pipeline.push({ $match: { $and: [_query] } });

        //excute aggregate
        _MailInboundChannel.aggregatePaginate(aggregate, {
            page: page,
            limit: rows
        }, function (error, channel, pageCount, count) {
            var paginator = new pagination.SearchPaginator({
                prelink: '/mail-inbound-channel',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            //render view
            _.render(req, res, 'mail-inbound-channel', {
                title: 'Quản lý mail inbound channel',
                chatPort: _config['services'].chat,
                channel: channel,
                paging: paginator.getPaginationData(),
                sort: { name: req.query.name },
                plugins: [['bootstrap-select']]
            }, true, error);
        });
    }
};

//GET
exports.new = function (req, res) {
    _async.parallel({
        companiesFind: function (next) {
            _Company.find().exec(next);
        },
        agentGroups: function (next) {
            _AgentGroups.find().exec(next);
        },
    }, function (err, result) {
        _.render(req, res, 'mail-inbound-channel-new', {
            title: 'Tạo mới mail inbound channel',
            companies: result.companiesFind,
            skillsGroup: result.skillsGroup ? result.skillsGroup : [],
            agentGroups: result.agentGroups ? result.agentGroups : [],
            plugins: [
                'moment',
                ['bootstrap-select'],
                ['bootstrap-duallistbox'],
                ['chosen'],
                ['bootstrap-datetimepicker'],
                ['mrblack-table']
            ]
        }, true);

    });
};

//POST
exports.create = function (req, res) {
    if (_.has(req.body, 'status') && _.isEqual(req.body['status'], 'on')) req.body['status'] = 1;
    req.body['status'] = _.has(req.body, 'status') ? parseInt(req.body['status']) : 0;
    req.body.idCompany = new mongodb.ObjectId(req.body.idCompany);
    req.body['name'] = _.chain(req.body.name).trimValueNotLower().value();
    req.body['idQueue'] = req.body.idQueue;
    req.body.idAgentGroups = _.arrayObjectId(req.body.agentGroups);
    _async.waterfall([
        function (next) {
            _MailInboundChannel.create(req.body, next);
        }
    ], function (err, result) {
        _.genTree();
        res.json({ code: (err ? 500 : 200), message: err ? err : result });
    });

    //Tạo mới kênh dựa vào body client bắn lên
    // _MailInboundChannel.create(req.body, function (error, r) {
    //     _.genTree(); //gen tenant tree
    //     res.json({ code: (error ? 500 : 200), message: error ? error : r });
    // });
};

//GET
exports.edit = function (req, res) {
    _async.parallel({
        companies: function (cb) {
            //Lây danh sách công ty
            _Company.find().exec(function (err, resp) {
                cb(null, resp);
            });
        },
        channel: function (cb) {
            //Lấy thông tin kênh cần sửa
            _MailInboundChannel.findById(req.params.mailinboundchannel, function (err, channel) {
                cb(null, channel);
            });
        },
        agentGroups: function (next) {
            _AgentGroups.find().exec(next);
        },
    }, function (err, resp) {
        if (!err) _.render(req, res, 'mail-inbound-channel-edit', {
            title: 'Chỉnh sửa channel',
            companies: resp.companies,
            channel: resp.channel,
            idAgentS: resp.channel.idAgents,
            skillsGroup: resp.skillsGroup ? resp.skillsGroup : [],
            agentGroups: resp.agentGroups ? resp.agentGroups : [],
            plugins: [
                'moment',
                ['bootstrap-select'],
                ['bootstrap-duallistbox'],
                ['chosen'],
                ['bootstrap-datetimepicker'],
                ['mrblack-table'],

            ]
        }, true);
    });
    //load trang chỉnh sửa thông tin kênh
    // _async.parallel({
    //     one: function (cb) {
    //         //Lây danh sách công ty
    //         _Company.find().exec(function (err, resp) {
    //             cb(null, resp);
    //         });
    //     },
    //     two: function (cb) {
    //         //Lấy thông tin kênh cần sửa
    //         _MailInboundChannel.findById(req.params.mailinboundchannel, function (err, channel) {
    //             cb(null, channel);
    //         });
    //     }
    // }, function (err, resp) {
    //     if (!err) _.render(req, res, 'mail-inbound-channel-edit', {
    //         title: 'Chỉnh sửa mail inbound channel',
    //         companies: resp.one,
    //         channel: resp.two,
    //         plugins: [['bootstrap-select'], ['mrblack-table']]
    //     }, true);
    // });
};

// PUT
exports.update = function (req, res) {
    if (_.has(req.body, 'status') && _.isEqual(req.body['status'], 'on')) req.body['status'] = 1;
    req.body['status'] = _.has(req.body, 'status') ? parseInt(req.body['status']) : 0;
    req.body.idCompany = new mongodb.ObjectId(req.body.idCompany);
    req.body['name'] = _.chain(req.body.name).trimValueNotLower().value();
    req.body['idQueue'] = req.body.idQueue;
    req.body.idAgentGroups = _.arrayObjectId(req.body.agentGroups);
    _async.waterfall([
        function (next) {
            _MailInboundChannel.findByIdAndUpdate(req.params['mailinboundchannel'], req.body, { new: true }, next);
        }
    ], function (err, result) {
        console.log('check cảnh báo', err);
        _.genTree();
        res.json({ code: (err ? 500 : 200), message: err ? err : result });
    });
};

//phục vụ validate form
exports.validate = function (req, res) {
    req.query.idCompany = new mongodb.ObjectId(req.query.idCompany);
    if (_.has(req.query, 'name')) {
        //Validate tên kênh
        req.query['name'] = _.chain(req.query.name).trimValueNotLower().value();
        if (!_.has(req.query, 'currName') || !_.isEqual(req.query.name, req.query.currName)) {
            _MailInboundChannel.findOne({ idCompany: req.query.idCompany, name: req.query.name }).exec(function (error, ca) {
                res.json({ code: _.isNull(ca) });
            });
        }
        else {
            res.json({ code: true });
        }
    }
    else {
        //Validate website
        req.query['website'] = _.chain(req.query.website).trimValueNotLower().value();
        if (!_.has(req.query, 'currWebsite') || !_.isEqual(req.query.website, req.query.currWebsite)) {
            _MailInboundChannel.findOne({
                idCompany: req.query.idCompany,
                website: req.query.website
            }).exec(function (error, ca) {
                res.json({ code: _.isNull(ca) });
            });
        }
        else {
            res.json({ code: true });
        }
    }
};

//DELETE
exports.destroy = function (req, res) {
    if (!_.isEqual(req.params.mailinboundchannel, 'all')) {
        //Xóa 1 kênh
        _MailInboundChannel._deleteAll({ $in: req.params['mailinboundchannel'] }, function (error) {
            _.genTree();
            res.json({ code: (error ? 500 : 200), message: error ? error : "" });
        });
    }
    else {
        //Xóa hàng loạt
        _CompanyChannel._deleteAll({ $in: req.body.ids.split(',') }, function (error, ca) {
            _.genTree();
            res.json({ code: (error ? 500 : 200), message: error ? error : '' });
        });
    }
};

var getListAgentLinkSkillGroup = function (data, agents, callback) {
    // get list agent from telehub
    _Users.find({ _id: agents }, function (error, users) {
        let agentsCampaign = users;
        let listAgentFromTelehub = [];

        if (!error) {
            if (data.listAgentFromCisco.length > 0 && agentsCampaign.length > 0) {
                let listAgent = data.listAgentFromCisco.filter(agent => {
                    let isCheckAgent = false
                    let agentFromCisco = agent.agentId[0]
                    for (let item of agentsCampaign) {
                        let agentFromTelehub = item.idAgentCisco
                        if (agentFromCisco == agentFromTelehub) {
                            listAgentFromTelehub.push(item._id)
                            isCheckAgent = true;
                            break;
                        }
                    }
                    if (isCheckAgent) {
                        return agent
                    }
                })

                let dataNext = {
                    listAgentFromTelehub: _.arrayObjectId(listAgentFromTelehub),
                    listAgentForSkillGroup: listAgent,
                }
                callback(null, dataNext)
            } else {
                let dataNext = {
                    listAgentForSkillGroup: []
                }
                callback(null, dataNext)
            }
        }
    })
}