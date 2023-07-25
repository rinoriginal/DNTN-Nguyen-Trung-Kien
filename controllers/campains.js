var camManager = require(path.join(_rootPath, 'monitor', 'manager.js'));
var _config = require(path.join(_rootPath, 'config', 'conf.json'));
var request = require('request');
const { enabled } = require('debug');
var parseString = require('xml2js').parseString;
exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

        if (_.isEqual(req.query['type'], 'getCustomergroup')) {
            // Lấy dữ liệu customer group
            var aggregate = _CustomerGroups.aggregate();
            aggregate._pipeline = [];
            aggregate._pipeline.push({ $lookup: { from: 'customersources', localField: '_id', foreignField: 'group', as: 'sources' } });
            _CustomerGroups.aggregate(aggregate._pipeline, function (err, items) {
                res.json({ data: items });
            });
        } else if (_.isEqual(req.query['type'], 'getCustomerFields')) {
            // Lấy dữ liệu customer fields
            var aggregate = _CustomerGroups.aggregate();
            aggregate._pipeline = [];
            _CustomerFields.find({ status: 1 }, function (err, ccFields) {
                res.json({ code: (err ? 500 : 200), message: err ? err : ccFields });
            });
        } else if (_.isEqual(req.query['type'], 'getAgent')) {
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
                    _Users.find({ _id: { $in: _.pluck(result, '_id') }, status: 1 }, next);
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err : result });
            });
        }
    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        if (_.has(req.query, 'addnumber')) {
            // Lấy dữ liệu khách hàng được đưa vào chiến dịch
            _async.parallel({
                groups: function (next) {
                    // Lấy dữ liệu customer group
                    var aggregate = _CustomerGroups.aggregate();
                    aggregate._pipeline = [];
                    aggregate._pipeline.push({ $lookup: { from: 'customersources', localField: '_id', foreignField: 'group', as: 'sources' } });
                    _CustomerGroups.aggregate(aggregate._pipeline, next);
                },
                fields: function (next) {
                    // Lấy dữ liệu customer field của công ty
                    _async.waterfall([
                        function (next2) {
                            _Campains.findById(req.query['addnumber']).select('idCompany').populate('idCompany').exec(next2);
                        },
                        function (result, next2) {
                            _CompanyProfile.findById(result.idCompany.companyProfile).select('fieldId').populate('fieldId').exec(next2);
                        }
                    ], next);
                },
                campains: function (next) {
                    // Lấy dữ liệu campaign của công ty
                    var aggregate = [];
                    var _query = { _id: new mongodb.ObjectId(req.query['addnumber']) };
                    aggregate.push({ $match: _query });
                    aggregate.push({ $lookup: { from: 'campains', localField: 'idCompany', foreignField: 'idCompany', as: 'same' } });

                    _Campains.aggregate(aggregate, function (err, campains) {
                        next(err, campains[0] ? _.chain(campains[0].same).map(function (campain) { return _.isEqual(campain._id.toString(), req.query['addnumber']) ? null : campain }).compact().value() : []);
                    });
                }
            }, function (err, result) {
                _.render(req, res, 'campains-add-number', {
                    title: 'Thêm khách hàng vào chiến dịch',
                    fields: result.fields ? result.fields.fieldId : [],
                    campains: result.campains,
                    groups: result.groups,
                    plugins: [
                        ['bootstrap-duallistbox'],
                        ['chosen'], 'moment', ['bootstrap-datetimepicker'],
                        ['bootstrap-select']
                    ],
                }, true);
            });
        } else {
            // Lấy dữ liệu danh sách campaign ở màn hình list /campains
            var sort = _.cleanSort(req.query, '');
            var query = _.cleanRequest(req.query);

            _async.parallel({
                mainData: function (next) {
                    var _pageCount = 0;
                    var _total = 0;

                    _async.waterfall([
                        function (next2) {
                            var aggregate = _Campains.aggregate();
                            aggregate._pipeline = [];

                            var _query = {};
                            var _authQuery = req.session.auth.company ? (req.session.auth.company.group ? { status: 9999 } : { idCompany: new mongodb.ObjectId(req.session.auth.company._id) }) : {};

                            if (query['name']) _query['name'] = { $regex: new RegExp(_.stringRegex(query['name']), 'i') };
                            if (query['idCompany']) _query['idCompany'] = new mongodb.ObjectId(query['idCompany']);

                            if (!_.isEmpty(_authQuery)) aggregate._pipeline.push({ $match: _authQuery });
                            if (!_.isEmpty(_query)) aggregate._pipeline.push({ $match: _query });
                            if (!_.isEmpty(sort)) aggregate._pipeline.push({ $sort: sort });

                            //aggregate._pipeline.push({$lookup: {from: 'campaincustomers', localField: '_id', foreignField: 'idCampain', as: 'add'}});
                            //aggregate._pipeline.push({$lookup: {from: 'tickets', localField: '_id', foreignField: 'idCampain', as: 'added'}});

                            _Campains.aggregatePaginate(aggregate, {
                                page: page,
                                limit: rows
                            }, function (err, items, pageCount, total) {
                                _pageCount = pageCount;
                                _total = total;
                                next2(err, items);
                            });
                        },
                        function (result, next2) {
                            // Lấy thông tin người tạo
                            _Users.populate(result, { path: 'createBy', select: 'displayName' }, next2);
                        },
                        function (result, next2) {
                            // Lấy tên công ty
                            _Company.populate(result, { path: 'idCompany', select: 'name' }, next2);
                        },
                        function (result, next2) {
                            // Lấy tên nhóm trạng thái ticket của chiến dịch
                            _TicketReasonCategory.populate(result, { path: 'idCategoryReason', select: 'name' }, next2);
                        },
                        function (result, next2) {
                            // Lấy dữ liệu trunk
                            _Trunk.populate(result, { path: 'trunk', select: 'name prefix' }, next2);
                        },
                        function (result, next2) {
                            // Lấy dữ liệu số khách hàng thuộc chiến dịch
                            _CampainCustomer.aggregate([
                                { $match: { idCampain: { $in: _.pluck(result, '_id') } } },
                                {
                                    $group: {
                                        _id: '$idCampain',
                                        count: { $sum: 1 }
                                    }
                                }
                            ], function (err, ccs) {
                                next2(err, result, ccs);
                            });
                        },
                        function (result, toAdd, next2) {
                            // Lấy dữ liệu khách hàng đã được phân của chiến dịch
                            _Tickets.aggregate([
                                { $match: { idCampain: { $in: _.pluck(result, '_id') } } },
                                {
                                    $group: {
                                        _id: '$idCampain',
                                        count: { $sum: 1 }
                                    }
                                }
                            ], function (err, tickets) {
                                next2(err, result, toAdd, tickets);
                            });
                        },
                        function (result, toAdd, added, next2) {
                            next2(null, {
                                data: _.chain(result)
                                    .map(function (item) {
                                        item.added = 0;
                                        
                                        _.each(toAdd, function (item2) {
                                            if (_.isEqual(item._id.toString(), item2._id.toString())) {
                                                item.add = item2.count;
                                            }
                                        });

                                        _.each(added, function (item2) {
                                            if (_.isEqual(item._id.toString(), item2._id.toString())) {
                                                item.added = item2.count;
                                            }
                                        });
                                        return item;
                                    }, [])
                                    .value(),
                                pageCount: _pageCount,
                                total: _total
                            });
                        }
                    ], function (err, result) {
                        next(err, result);
                    });
                },
                orgFind: function (next) {
                    // Lấy dữ liệu filter theo công ty
                    var _authQuery = req.session.auth.company ? { _id: new mongodb.ObjectId(req.session.auth.company._id) } : {};
                    _Company.find({ $and: [_authQuery, { status: 1 }] }, next);
                },
                campainFind: function (next) {
                    // Lấy dữ liệu filter theo chiến dịch
                    _Campains.find({}, next);
                },
                surveyFind: function (next) {
                    // Lấy dữ liệu câu hỏi khảo sát
                    _Surveys.find({ status: 1 }, next);
                },
                reasonFind: function (next) {
                    // Lấy dữ liệu filter theo nhóm tình trạng ticket
                    _TicketReasonCategory.find({ status: 1, category: { $in: [0, 2] } }, next);
                },
                trunks: function (next) {
                    // Lấy dữ liệu trunk
                    _Trunk.find({ status: 1 }, next);
                },
                agents: function (next) {
                    // Lấy dữ liệu agent
                    _Users.find({ status: 1 }, next);
                }
            }, function (err, result) {
                var paginator = new pagination.SearchPaginator({
                    prelink: '/campains',
                    current: page,
                    rowsPerPage: rows,
                    totalResult: result.mainData.total
                });

                _.render(req, res, 'campains', {
                    title: 'Danh sách chiến dịch gọi ra',
                    paging: paginator.getPaginationData(),
                    plugins: ['moment', ['bootstrap-datetimepicker'],
                        ['bootstrap-duallistbox'],
                        ['bootstrap-select']
                    ],
                    searchData: query,
                    categories: result.mainData.data,
                    orgs: result.orgFind,
                    campains: result.campainFind,
                    surveys: result.surveyFind,
                    reasons: result.reasonFind,
                    trunks: result.trunks,
                    agents: result.agents
                }, true);
            });
        }
    }
};

// NEW
exports.new = function(req, res) {
    _async.parallel({
        orgFind: function(next) {
            // Lấy dữ liệu công ty
            var _authQuery = req.session.auth.company ? { _id: new mongodb.ObjectId(req.session.auth.company._id) } : {};
            _Company.find({ $and: [_authQuery, { status: 1 }] }, next);
        },
        campainFind: function(next) {
            // Lấy dữ liệu chiến dịch
            _Campains.find({}, next);
        },
        surveyFind: function(next) {
            // Lấy dữ liệu câu hỏi khảo sát
            _Surveys.find({ status: 1 }, next);
        },
        reasonFind: function(next) {
            // Lấy dữ liệu nhóm tình trạng ticket
            _TicketReasonCategory.find({ status: 1, category: { $in: [0, 2] } }, next);
        },
        agents: function(next) {
            // Lấy dữ liệu agent
            _Users.find({}, next);
        },
        skillsGroup: function(next) {
            // get list skillGroup
            _async.waterfall([
                function(next) {
                    // get list skill group form cisco 
                    getListSkillGroupFromCisco(next)
                },
                function(dataNext, next) {
                    // get list campain from cisco 
                    getListCampaign(dataNext, next)
                },
                function(dataNext, next) {
                    // get list skillGroup last
                    selectSkillGroupCreateCampaign(dataNext, next)
                },
            ], next)
        },
    }, function(err, result) {
        var user = result.agents
        _.render(req, res, 'campains-new', {
            plugins: ['jquery-ui', ['bootstrap-select'],
                ['bootstrap-duallistbox']
            ],
            title: 'Tạo mới chiến dịch',
            orgs: result.orgFind,
            campains: result.campainFind,
            surveys: result.surveyFind,
            reasons: result.reasonFind,
            agents: result.agents,
            skillsGroup: result.skillsGroup ? result.skillsGroup : []
                //companies: result.companies
        }, true);
    });

};
// POST
exports.create = function(req, res) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    if (_.has(req.body, 'startDate')) {
        // tạo mới chiến dịch
        req.body['createBy'] = req.session.user._id;
        req.body['created'] = new Date();
        req.body['startDate'] = _moment(req.body['startDate'], 'MM/DD/YYYY h:mm a')._d;
        req.body['endDate'] = _moment(req.body['endDate'], 'MM/DD/YYYY h:mm a')._d;
        req.body['idCampainParent'] = _.isEqual(req.body['idCampainParent'], '') ? undefined : req.body['idCampainParent'];
        req.body['idSurvey'] = _.isEqual(req.body['idSurvey'], '') ? undefined : req.body['idSurvey'];
        if (_.isEqual(req.body['type'], "2")) {
            req.body['campaignPrefix'] = req.body['campaignPrefix'];
            req.body['dialedNumber'] = Number(req.body['dialedNumber'])
            req.body['autoDialingMode'] = req.body['autoDialingMode']
            req.body['idSkillGroup'] = req.body['idSkillGroup']
            req.body['startTime'] = req.body['startTime']
            req.body['endTime'] = req.body['endTime']
        } else {
            req.body['campaignPrefix'] = '';
            req.body['dialedNumber'] = 0
            req.body['autoDialingMode'] = ''
            req.body['idSkillGroup'] = '',
                req.body['startTime'] = ''
            req.body['endTime'] = ''
        }
        var agents = req.body['agents'];
        var _campaign = null;
        _async.waterfall([
            function(next) {
                // Kiểm tra tên chiến dịch có bị trùng không
                _Campains.count({ name: req.body.name, idCompany: req.body.idCompany }, next);
            },
            function(count, next) {
                var body = _.cleanRequest(req.body, ['agents']);
                (count == 0) ? _Campains.create(body, next): next("Tên chiến dịch cùng công ty đã được sử dụng.", null);
            },
            function(cp, next) {
                // Đưa agent vào danh sách phục vụ chiến dịch
                _campaign = cp;
                var batch = mongoClient.collection('campaignagents').initializeUnorderedBulkOp({ useLegacyOps: true });
                _.each(agents, function(ag) {
                    var _item = new _CampaignAgent({
                        idAgent: ag,
                        idCampaign: cp._id
                    });
                    batch.insert(_item.toObject());
                });

                if (batch.s.currentInsertBatch) {
                    batch.execute(next(null, cp))
                } else {
                    next(null, cp);
                }
            },
            function(cp, next) {
                if (cp.type == 2) {
                    _async.waterfall([
                        function(next) {
                            getSkillGroup(cp, next)
                        },
                        function(data, next) {
                            // insert idCompaignCreatedByCisco
                            let skillGroupToCreate = data.skillGroup
                            let campaignCreatedTelehub = data.campaignTelehub
                            _Campains.findByIdAndUpdate(
                                campaignCreatedTelehub._id.toString(), {
                                    $set: {
                                        nameSkillGroup: skillGroupToCreate.name[0],
                                    }
                                }, { new: true },
                                function(err, result) {
                                    let dataNext = {
                                        campaignTelehub: data.campaignTelehub,
                                        skillGroup: data.skillGroup
                                    }
                                    next(null, dataNext)
                                });
                        },
                        function(data, next) {
                            createCampaignToCisco(data, next)
                        },
                        function(dataNext, next) {
                            updateIdCampaignCisco(dataNext, next)
                        },
                        function(data, next) {
                            getListAgent(data, next)
                        },
                        function(data, next) {
                            getListAgentLinkSkillGroup(data, agents, next)
                        },
                        function(data, next) {
                            getSkillGroupForUpdate(data, next)
                        },
                        function(data, next) {
                            updateSkillGroup(data, next)
                        },
                    ], next)
                } else {
                    next(null, null)
                }

            },
        ], function(err, result) {
            if (!err && req.body.type != 1) {
                // Cập nhật dữ liệu mới tới module quản lý campaign
                _Trunk.findOne({ _id: req.body.trunk }, function(err, trunk) {
                    _campaign.trunk = trunk;
                    camManager.addCampaign(_campaign);
                });
            };
            _.genTree();
            res.json({ code: (err ? 500 : 200), message: err ? err : 'Tạo chiến dịch thành công' });

        });
    } else if (_.has(req.body, 'removecustomers')) {
        // Loại khách hàng khỏi chiến dịch
        var _idCampain = req.body.campain;
        var _customerIds = _.isEqual(req.body.removecustomers, 'all') ? null : req.body.removecustomers.split(',');
        var query = _customerIds ? { status: { $ne: 0 }, idCustomer: { $in: _.arrayObjectId(_customerIds) }, idCampain: new mongodb.ObjectId(_idCampain) } : { status: { $ne: 0 }, idCampain: new mongodb.ObjectId(_idCampain) };
        var limit = req.body.count && !_.isEqual(req.body.count, 'all') ? { limit: Number(req.body.count) } : {};

        _async.waterfall([
            function(next) {
                // Lấy danh sách ticket của khách hàng và trạng thái khác chưa xử lý
                mongoClient.collection('tickets').find(query).toArray(next);
            },
            function(tickets, next) {
                delete query['status'];
                var notInCus = _.pluck(tickets, 'idCustomer');

                mongoClient.collection('campaincustomers').find({ $and: [query, { idCustomer: { $nin: notInCus } }] }, limit).toArray(next);
            },
            function(customers, next) {
                // Loại id khách hàng khỏi bảng danh sách
                query['idCustomer'] = { $in: _.pluck(customers, 'idCustomer') }
                mongoClient.collection('campaincustomers').remove(query, next(null, customers));
            },
            function(customers, next) {
                _Campains.findById(_idCampain, function(err, campaign) {
                    if (!err) {
                        let data = {
                            customers: customers,
                            campaign: campaign
                        }
                        next(null, data)
                    } else {
                        next(err, null)
                    }
                });
            },
            function(data, next) {
                let campaignTelehub = data.campaign
                if (campaignTelehub && campaignTelehub.idCompaignCreatedByCisco) {
                    deleteCustomersToCampaignCisco(data, next)
                } else {
                    next(null, data)
                }
            },
            function(result, next) {
                mongoClient.collection('tickets').remove(query, next);
            },

        ], function(err, data) {
            res.json({ code: err ? 500 : 200, message: err ? err.message : '' });
        });
    } else if (_.has(req.body, 'searchData')) {
        // Tìm kiểm khách hàng và đưa khách hàng vào chiến dịch
        var _idCampain = req.query['addnumber'];
        var query = _.cleanRequest(JSON.parse(req.body['searchData']), ['notInSources', 'inSources']);
        var _inSources = JSON.parse(req.body['searchData'])['inSources'] ? JSON.parse(req.body['searchData'])['inSources'] : [];
        var _ninCampaigns = query['notInCampains'] ? query['notInCampains'] : [];
        _ninCampaigns.push(req.query['addnumber']);
        var _ninCustomers = [];
        var _inCustomers = null;
        var cfields = [];
        var _query = [];
        var count = 0;

        var numAdd = req.body['count'] ? req.body['count'] : null;
        var addCus = req.body['addCus'] ? _.chain(JSON.parse(req.body['addCus'])).compact().value() : null;

        _async.waterfall([
            function(next) {
                if (!addCus) {
                    _async.parallel({
                        customerFields: function(next2) {
                            // Lấy dữ liệu customer field
                            _CustomerFields.find({ status: 1 }, function(err, result) {
                                cfields = result;
                                next2();
                            });
                        },
                        notInCustomer: function(next2) {
                            // Lọc khách hàng nằm ngoài campaign
                            _CampainCustomer.find({ idCampain: { $in: _ninCampaigns } }, function(err, result) {
                                _ninCustomers = _.pluck(result, 'idCustomer');
                                next2();
                            });
                        },
                        inCustomer: function(next2) {
                            // Lọc dữ liệu khách hàng nằm trong campaign
                            if (query['inCampains']) {
                                _CampainCustomer.find({ idCampain: { $in: query['inCampains'] } }, function(err, result) {
                                    _inCustomers = _.pluck(result, 'idCustomer');
                                    next2();
                                });
                            } else {
                                next2();
                            }
                        }
                    }, function(err, result) {
                        next(err, result);
                    });
                } else {
                    next(null, null);
                }
            },
            function(result, callback) {
                // Tính toán số lượng kết quả tìm kiếm
                if (!addCus) {
                    _.each(cfields, function(field) {
                        if (_.has(query, field.modalName)) {
                            if (field.fieldType == 2) {
                                var agg = _.switchAgg2(field.fieldType, query[field.modalName]);
                                if (!_.isEmpty(agg)) _query.push(_.object([field.modalName], [agg]));
                            } else {
                                _query.push(_.object([field.modalName], [_.switchAgg(field.fieldType, query[field.modalName])]));
                            }
                        }
                    });
                    if (_inCustomers) _query.push({ _id: { $in: _inCustomers } });
                    _query.push({ _id: { $nin: _ninCustomers } });
                    if (_inSources.length > 0) _query.push({ sources: { $elemMatch: { $in: _.arrayObjectId(_inSources) } } });
                }
                if (!(numAdd || addCus)) {
                    mongoClient.collection('customerindex').count(_.isEmpty(_query) ? {} : { $and: _query }, callback);
                } else {
                    callback(null, null);
                }
            },
            function(result, callback) {
                // Tìm kiếm khách hàng
                if (numAdd) {
                    var limit = _.isEqual(numAdd, 'all') ? result : Number(numAdd);
                    mongoClient.collection('customerindex').find(_.isEmpty(_query) ? {} : { $and: _query })
                        .limit(Number(limit))
                        .toArray(callback);
                } else if (addCus) {
                    _query.push({ _id: { $in: _.arrayObjectId(addCus) } });
                    mongoClient.collection('customerindex').find(_.isEmpty(_query) ? {} : { $and: _query })
                        .toArray(callback);
                } else {
                    count = result;
                    mongoClient.collection('customerindex').find(_.isEmpty(_query) ? {} : { $and: _query })
                        .skip((page - 1) * rows)
                        .limit(rows)
                        .toArray(callback);
                }
            },
            function(customers, callback) {
                if (numAdd || addCus) {
                    // Insert bản ghi khách hàng vào bảng
                    var batch = mongoClient.collection('campaincustomers').initializeUnorderedBulkOp({ useLegacyOps: true });
                    _.each(_.pluck(customers, '_id'), function(_cId) {
                        if (!_.isEqual(_cId, '')) {
                            var newItem = new _CampainCustomer({
                                idCustomer: _cId,
                                idCampain: _idCampain,
                                createBy: req.session.user._id
                            });
                            batch.insert(newItem.toObject());
                        }
                    });

                    if (!batch.s.currentInsertBatch) return callback('Không có kết quả', null);
                    else batch.execute(callback(null, customers));
                } else {
                    // Paging và lấy thông tin khách hàng
                    var ids = _.pluck(customers, '_id');
                    var aggs = [];
                    aggs.push({ $match: { _id: { $in: ids } } });
                    _.each(cfields, function(o) {
                        aggs.push({ $lookup: { from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName } });
                    });
                    _Customer.aggregate(aggs, function(err, result) {
                        var paginator = new pagination.SearchPaginator({
                            prelink: '/customer',
                            current: page,
                            rowsPerPage: rows,
                            totalResult: count
                        });
                        callback(err, { fields: cfields, customers: result, paging: paginator.getPaginationData() });
                    });
                }
            },
            function(customers, next) {
                if (numAdd || addCus) {
                    _Campains.findById(_idCampain, function(err, campaign) {
                        if (!err) {
                            let data = {
                                customers: customers,
                                campaign: campaign
                            }
                            next(null, data)
                        } else {
                            next(err, null)
                        }
                    });
                } else {
                    next(null, customers)
                }

            },
            function(data, next) {
                let campaignTelehub = data.campaign
                if (campaignTelehub && campaignTelehub.idCompaignCreatedByCisco) {
                    if (numAdd || addCus) {
                        addCustomersToCampaignCisco(data, next)
                    } else {
                        next(null, data)
                    }
                } else {
                    next(null, data)
                }

            }
        ], function(error, result) {
            if (numAdd || addCus) {
                res.json({ code: (error ? 500 : 200) });
            } else {
                res.json({ code: (error ? 500 : 200), result: error ? error : result });
            }
        });
    } else if (_.has(req.body, 'searchAddedData')) {
        // Tìm kiếm và loại khách hàng khỏi chiến dịch
        var checkTime = Date.now();
        var query = _.cleanRequest(JSON.parse(req.body['searchAddedData']), ['notInSources', 'inSources']);
        var _inSources = JSON.parse(req.body['searchAddedData'])['inSources'] ? JSON.parse(req.body['searchAddedData'])['inSources'] : [];
        var _ninCustomers = null
        var _inCustomers = null;
        var _curCustomers = null;
        var campainCustomers = [];
        var cfields = [];
        var _query = [];
        var count = 0;
        var isDelete = req.query['isDelete']
        let _idCampain = req.query['addnumber']

        _async.waterfall([
            function(next) {
                _async.parallel({
                    customerFields: function(next2) {
                        // Lấy thông tin customer field
                        _CustomerFields.find({ status: 1 }, function(err, result) {
                            cfields = result;
                            next2();
                        });
                    },
                    curCustomers: function(next2) {
                        // Lấy thông tin khách hàng trong chiến dịch
                        _CampainCustomer.find({ idCampain: req.query['addnumber'] }).sort({ created: -1 }).exec(function(err, result) {
                            _curCustomers = _.pluck(result, 'idCustomer');
                            next2();
                        });
                    },
                    inCustomers: function(next2) {
                        // Lọc danh sách khách hàng nằm trong chiến dịch cụ thể
                        if (query['inCampains']) {
                            _CampainCustomer.find({ idCampain: { $in: query['inCampains'] } }, function(err, result) {
                                _inCustomers = _.pluck(result, 'idCustomer');
                                next2();
                            });
                        } else {
                            next2();
                        }
                    },
                    ninCustomer: function(next2) {
                        // Lọc khách hàng không nằm trong chiến dịch cụ thể
                        if (query['notInCampains']) {
                            _CampainCustomer.find({ idCampain: { $in: query['notInCampains'] } }, function(err, result) {
                                _ninCustomers = _.pluck(result, 'idCustomer');
                                next2();
                            });
                        } else {
                            next2();
                        }
                    }
                }, next);
            },
            function(result, callback) {
                // Tính số lượng bản ghi xử lý
                _.each(cfields, function(field) {
                    if (_.has(query, field.modalName)) {
                        if (field.fieldType == 2) {
                            var agg = _.switchAgg2(field.fieldType, query[field.modalName]);
                            if (!_.isEmpty(agg)) _query.push(_.object([field.modalName], [agg]));
                        } else {
                            _query.push(_.object([field.modalName], [_.switchAgg(field.fieldType, query[field.modalName])]));
                        }
                    }
                });
                if (_inCustomers) _query.push({ _id: { $in: _inCustomers } });
                if (_ninCustomers) _query.push({ _id: { $nin: _ninCustomers } });
                _query.push({ _id: { $in: _curCustomers } });
                if (_inSources.length > 0) _query.push({ sources: { $elemMatch: { $in: _.arrayObjectId(_inSources) } } });
                mongoClient.collection('customerindex').count(_.isEmpty(_query) ? {} : { $and: _query }, callback);
            },
            function(result, callback) {
                // Query khách hàng
                count = result;
                mongoClient.collection('customerindex').find(_.isEmpty(_query) ? {} : { $and: _query })
                    .skip((page - 1) * rows)
                    .limit(rows)
                    .toArray(callback);
            },
            function(customers, callback) {
                // Paging và query thông tin khách hàng
                var ids = _.pluck(customers, '_id');
                var aggs = [];
                aggs.push({ $match: { _id: { $in: ids } } });
                _.each(cfields, function(o) {
                    aggs.push({ $lookup: { from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName } });
                });
                _Customer.aggregate(aggs, function(err, result) {
                    var paginator = new pagination.SearchPaginator({
                        prelink: '/customer',
                        current: page,
                        rowsPerPage: rows,
                        totalResult: count
                    });
                    callback(err, { fields: cfields, customers: result, paging: paginator.getPaginationData() });
                });
            },
            function(data, next) {
                if (isDelete === 'true') {
                    _Campains.findById(_idCampain, function(err, campaign) {
                        if (!err) {
                            let dataNext = {
                                fields: data.fields,
                                customers: data.customers,
                                paging: data.paging,
                                campaign: campaign
                            }
                            next(null, dataNext)
                        } else {
                            next(err, null)
                        }
                    });
                } else {
                    next(null, data)
                }
            },
            function(data, next) {
                if (isDelete === 'true') {
                    if (data.customers.length > 0) {
                        let campaignTelehub = data.campaign
                        if (campaignTelehub && campaignTelehub.idCompaignCreatedByCisco) {
                            addCustomersAfterDeleteToCampaignCisco(data, next)
                        } else {
                            next(null, data)
                        }
                    } else {
                        next(null, data)
                    }
                } else {
                    next(null, data)
                }
            },
            //function (result, callback) {
            //    _async.eachSeries(cfields, function(field, cb2){
            //        if(_.has(query, field.modalName)) {
            //            var _oValue = query[field.modalName];
            //            if(_.isEqual(field.fieldType.toString(), '1') || _.isEqual(field.fieldType.toString(), '7')) _oValue = query[field.modalName].toString();
            //            var field_query = [];
            //            field_query.push({entityId: {$in:campainCustomers}});
            //            if(!_.isNull(queryIds)) field_query.push({entityId: {$in: queryIds}});
            //            field_query.push(_.object(['value'], [_.switchAgg(field.fieldType, _oValue)]));
            //            _CCKFields[field.modalName].db.find({$and: field_query}, function (err, result) {
            //                queryIds = _.pluck(result, 'entityId');
            //                cb2();
            //            });
            //        }else {
            //            cb2();
            //        }
            //    }, function(err){
            //        callback(err);
            //    });
            //},
            //function (callback) {
            //    var aggregate = _Customer.aggregate();
            //    aggregate._pipeline = [];
            //
            //    if(!_.isNull(queryIds)) aggregate._pipeline.push({$match: {_id: {$in: queryIds}}});
            //    aggregate._pipeline.push({$match: {_id: {$in: campainCustomers}}});
            //    if(_inSources.length > 0) aggregate._pipeline.push({$match: {sources: { $elemMatch: {$in: _.arrayObjectId(_inSources)}}}});
            //
            //    _Customer.aggregatePaginate(aggregate, {page: page, limit: rows}, function (error, customers, pageCount, count) {
            //        var paginator = new pagination.SearchPaginator({prelink: '/customer', current: page, rowsPerPage: rows, totalResult: count});
            //        callback(error, paginator, customers);
            //    });
            //},
            //function (paginator, customers, callback) {
            //    var ids = _.pluck(customers, '_id');
            //    var aggs = [];
            //    aggs.push({$match: {_id: {$in: ids}}});
            //    _.each(cfields, function (o) {
            //        aggs.push({$lookup: {from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName}});
            //    });
            //    aggs.push({$lookup: {from: 'campaincustomers', localField: '_id', foreignField: 'idCustomer', as: 'campainCustomer'}});
            //    _Customer.aggregate(aggs, function(err, result){
            //        callback(err, {fields: cfields, customers: result, paging: paginator.getPaginationData()});
            //    });
            //}
        ], function(error, result) {
            res.json({ code: (error ? 500 : 200), result: error ? error : result });
        });
    }
};
// EDIT
exports.edit = function(req, res) {
    _async.parallel({
        cur: function(next) {
            // Lấy thông tin chiến dich
            _Campains.findById(req.params['campain'], next);
        },
        agents: function(next) {
            // Lấy thông tin agent phục vụ chiến dịch
            _CampaignAgent.find({ idCampaign: req.params['campain'] }).exec(next);
        },
        canEdit: function(next) {
            // Kiểm tra chiến dịch có phát sinh ticket hay chưa
            _Tickets.findOne({ idCampain: req.params['campain'] }, function(err, result) {
                next(err, result ? 0 : 1);
            });
        },
        orgFind: function(next) {
            // Lấy thông tin danh sách công ty
            var _authQuery = req.session.auth.company ? { _id: new mongodb.ObjectId(req.session.auth.company._id) } : {};
            _Company.find({ $and: [_authQuery, { status: 1 }] }, next);
        },
        campainFind: function(next) {
            // Lấy thông tin danh sách chiến dịch
            _Campains.find({}, next);
        },
        surveyFind: function(next) {
            // Lấy thông tin câu hỏi khảo sát
            _Surveys.find({ status: 1 }, next);
        },
        reasonFind: function(next) {
            // Lấy thông tin nhóm tình trạng ticket
            _TicketReasonCategory.find({ status: 1, category: { $in: [0, 2] } }, next);
        },
        skillsGroup: function(next) {
            // get list skillGroup
            _async.waterfall([
                function(next) {
                    // get list skill group form cisco 
                    getListSkillGroupFromCisco(next)
                },
                function(dataNext, next) {
                    // get list campain from cisco 
                    getListCampaign(dataNext, next)
                },
                function(dataNext, next) {
                    // get list skillGroup last
                    selectSkillGroupCreateCampaign(dataNext, next)
                },
            ], next)
        },
    }, function(err, result) {
        _.render(req, res, 'campains-edit', {
            plugins: ['jquery-ui', ['bootstrap-select'],
                ['bootstrap-duallistbox']
            ],
            title: 'Tạo mới chiến dịch',
            orgs: result.orgFind,
            campains: result.campainFind,
            surveys: result.surveyFind,
            reasons: result.reasonFind,
            agents: _.pluck(result.agents, 'idAgent'),
            cur: result.cur,
            canEdit: result.canEdit,
            skillsGroup: result.skillsGroup ? result.skillsGroup : []
        }, true);
    });

    //_async.waterfall([
    //    function(next){
    //        _Campains.findById(req.params['campain'], next);
    //    },
    //    function(campain, next){
    //        _Tickets.findOne({idCampain: campain._id}, function(err, result){
    //            next(err, campain, result ? 0 : 1)
    //        });
    //    }
    //], function(err, campain, edit){
    //    res.json({code: (err ? 500 : 200), message: err ? 'Đã có lỗi xảy ra' : campain, canEdit: edit});
    //});
};

// PUT
exports.update = function(req, res) {
    req.body['updateBy'] = req.session.user._id;
    req.body['updated'] = Date.now();

    req.body['startDate'] = _moment(req.body['startDate'], 'MM/DD/YYYY h:mm a')._d;
    req.body['endDate'] = _moment(req.body['endDate'], 'MM/DD/YYYY h:mm a')._d;

    req.body['idCampainParent'] = _.isEqual(req.body['idCampainParent'], '') ? null : req.body['idCampainParent'];
    req.body['idSurvey'] = _.isEqual(req.body['idSurvey'], '') ? null : req.body['idSurvey'];
    req.body['type'] = req.body['typeUpdate']


    var agents = req.body['agents'];
    if (_.isEqual(req.body['type'], "2")) {
        req.body['campaignPrefix'] = Number(req.body['campaignPrefix']);
        req.body['dialedNumber'] = Number(req.body['dialedNumber'])
        req.body['autoDialingMode'] = req.body['autoDialingMode']
        req.body['idSkillGroup'] = req.body['idSkillGroup']
        req.body['startTime'] = req.body['startTime']
        req.body['endTime'] = req.body['endTime']
    } else {
        req.body['campaignPrefix'] = '';
        req.body['dialedNumber'] = 0
        req.body['autoDialingMode'] = ''
        req.body['idSkillGroup'] = ''
        req.body['startTime'] = ''
        req.body['endTime'] = ''
    }
    var _campaign = null;
    _async.waterfall([
        function(next) {
            // Cập nhật dữ liệu chiến dịch
            var body = _.cleanRequest(req.body, ['agents']);
            _Campains.findByIdAndUpdate(req.params.campain, { $set: body }, { new: true }, next);
        },
        function(cp, next) {
            // Query danh sách agent phục vụ chiến dịch
            _campaign = cp;
            _CampaignAgent.find({ idCampaign: req.params.campain }, next(null, _campaign));
        },
        function(campaign, next) {
            // Clear danh sách agent phục vụ chiến dịch
            _CampaignAgent.remove({ idCampaign: req.params.campain }, function(error, result) {
                next(null, campaign)
            });
        },
        function(campaign, next) {
            // Cập nhật lại danh sách agent phục vụ chiến dịch
            var batch = mongoClient.collection('campaignagents').initializeUnorderedBulkOp({ useLegacyOps: true });
            _.each(agents, function(ag) {
                var _item = new _CampaignAgent({
                    idAgent: ag,
                    idCampaign: req.params.campain
                });
                batch.insert(_item.toObject());
            });

            if (batch.s.currentInsertBatch) {
                batch.execute(next(null, campaign));
            } else {
                next(null, campaign)
            }
        },
        function(campaign, next) {
            if (campaign.type == 2) {
                _async.waterfall([
                    function(next) {
                        getSkillGroup(campaign, next)
                    },
                    function(data, next) {
                        // insert idCompaignCreatedByCisco
                        let skillGroupToCreate = data.skillGroup
                        let campaignCreatedTelehub = data.campaignTelehub
                        _Campains.findByIdAndUpdate(
                            campaignCreatedTelehub._id.toString(), {
                                $set: {
                                    nameSkillGroup: skillGroupToCreate.name[0],
                                }
                            }, { new: true },
                            function(err, result) {
                                let dataNext = {
                                    campaignTelehub: data.campaignTelehub,
                                    skillGroup: data.skillGroup
                                }
                                next(null, dataNext)
                            });
                    },
                    function(data, next) {
                        getCampaignFromCisco(data, next)
                    },
                    function(data, next) {
                        updateCampaignCisco(data, next)
                    },
                    function(data, next) {
                        getListAgent(data, next)
                    },
                    function(data, next) {
                        getListAgentLinkSkillGroup(data, agents, next)
                    },
                    function(data, next) {
                        getSkillGroupForUpdate(data, next)
                    },
                    function(data, next) {
                        updateSkillGroup(data, next)
                    },
                ], next)
            } else {
                next(null, next)
            }

        },
    ], function(err, result) {
        if (!err && _campaign.type != 1) {
            _Trunk.findOne({ _id: _campaign.trunk }, function(err, trunk) {
                // Cập nhật lại dữ liệu tới module quản lý campain
                _campaign.trunk = trunk;
                var curCam = camManager.getCampaign(_campaign._id.toString());
                if (curCam) {
                    curCam.setData(_campaign);
                } else {
                    camManager.addCampaign(_campaign);
                }
            });
        }
        // Cập nhật dữ liệu với CORE
        _.genTree();
        res.json({ code: (err ? 500 : 200), message: err ? err.message : 'Cập nhật thành công' });
    });

    //_Campains.findByIdAndUpdate(req.params.campain, {$set:req.body}, {new: true}, function (error, result) {
    //    if(!error && result.type != 1) {
    //        _Trunk.findOne({_id: result.trunk}, function(err, trunk){
    //            result.trunk = trunk;
    //            var curCam = camManager.getCampaign(result._id.toString());
    //            if(curCam) {
    //                curCam.setData(result);
    //            }else {
    //                camManager.addCampaign(result);
    //            }
    //        });
    //    }
    //
    //    _.genTree();
    //    res.json({code: (error ? 500 : 200), message: error ? error : 'Cập nhật thành công'});
    //});
};
// Validation engine
exports.validate = function(req, res) {
    if (req.query.updateId) {
        var _query1 = { _id: { $ne: req.query.updateId } };
        var _query2 = _.cleanRequest(req.query, ['_', 'fieldId', 'fieldValue', 'updateId']);
        var _query = { $and: [_query1, _query2] };
        _Campains.findOne(_query).exec(function(error, sv) {
            res.json([req.query.fieldId, _.isNull(sv)]);
        });
    } else {
        if (req.query.idCompany != '') {
            var _query = _.cleanRequest(req.query, ['_', 'fieldId', 'fieldValue']);
            _Campains.findOne(_query).exec(function(error, sv) {
                res.json([req.query.fieldId, _.isNull(sv)]);
            });
        } else {
            res.json([req.query.fieldId, true]);
        }
    }
};

// DELETE
exports.destroy = function(req, res) {
    if (!_.isEqual(req.params.campain, 'all')) {
        _async.waterfall([
            function(next) {
                _CampaignAgent.remove({ idCampaign: req.params.campain }, next);
            },
            function(result, next) {
                _CampainCustomer.remove({ idCampain: req.params.campain }, next);
            },
            function(result, next) {
                _Campains._deleteAll({ $in: [req.params.campain] }, next);
            }
        ], function(err, result) {
            var listCampaign = result
            for (campaign of listCampaign) {
                if (campaign.idCompaignCreatedByCisco) {
                    var idCampaign = campaign.idCompaignCreatedByCisco
                    var pathApiDeleteCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + idCampaign
                    request.delete({
                        url: pathApiDeleteCampaign,
                        method: "DELETE",
                        'auth': _config.cisco.auth,
                        rejectUnauthorized: false,
                    }, function(err1, response, body) {
                        var test = body
                    });
                }

            }
            res.json({ code: (err ? 500 : 200), message: err ? err.message : "" });

        });
    } else {
        _async.waterfall([
            function(next) {
                _CampaignAgent.remove({ idCampaign: { $in: req.body.ids.split(',') } }, next);
            },
            function(result, next) {
                _CampainCustomer.remove({ idCampain: { $in: req.body.ids.split(',') } }, next);
            },
            function(result, next) {
                _Campains._deleteAll({ $in: req.body.ids.split(',') }, next);
            }
        ], function(err, result) {

            if (!err) {
                var listCampaign = result
                for (campaign of listCampaign) {
                    if (campaign.idCompaignCreatedByCisco) {
                        var idCampaign = campaign.idCompaignCreatedByCisco
                        var pathApiDeleteCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + idCampaign
                        request.delete({
                            url: pathApiDeleteCampaign,
                            method: "DELETE",
                            'auth': _config.cisco.auth,
                            rejectUnauthorized: false,
                        }, function(err1, response, body) {
                            var test = body
                        });
                    }
                }
            }
            _.genTree();
            res.json({ code: (err ? 500 : 200), message: err ? err.message : "" });
        });
    }
};
// get a campaign from the cisco
var getCampaignFromCisco = function(data, callback) {
        let idCampaign = data.campaignTelehub.idCompaignCreatedByCisco
        var pathApiGetListCompaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + idCampaign
        var option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiGetListCompaign, option, function(err, response, body) {
            if (!err) {
                parseString(body, function(err, result) {
                    if (result) {
                        let campaignCiscoJson = JSON.stringify(result);
                        let campaignObject = JSON.parse(campaignCiscoJson);
                        if (campaignObject && campaignObject.campaign) {
                            campaignObject = campaignObject.campaign
                            let dataNext = {
                                campaignFromCisco: campaignObject,
                                campaignTelehub: data.campaignTelehub,
                                skillGroup: data.skillGroup
                            }
                            callback(null, dataNext)
                        }
                    }
                });
            }
        });
    }
    // update campaign form the cisco
var updateCampaignCisco = function(data, callback) {
        let campaignTelehub = data.campaignTelehub
        let skillGroupSelected = data.skillGroup;
        let startDate = ""
        let endDate = ""
        if (campaignTelehub.startDate) {
            startDate = _moment(campaignTelehub.startDate).format('YYYY-MM-DD')
        }
        if (campaignTelehub.endDate) {
            endDate = _moment(campaignTelehub.endDate).format('YYYY-MM-DD')
        }
        let status = false
        if (campaignTelehub.status) {
            status = true
        }
        var dataCampaign = `
        <campaign>
            <dialingMode>PREVIEWONLY</dialingMode>
            <changeStamp>${data.campaignFromCisco.changeStamp[0]}</changeStamp>
            <startDate>${startDate}</startDate>
            <startTime>${campaignTelehub.startTime}</startTime>
            <endTime>${campaignTelehub.endTime}</endTime>
            <endDate>${endDate}</endDate>
            <enabled>${status}</enabled>
            <campaignPrefix>0${campaignTelehub.campaignPrefix}</campaignPrefix>
            <dialingMode>${campaignTelehub.autoDialingMode}</dialingMode>
            <linesPerAgent>1.0</linesPerAgent>
            <maxAttempts>3</maxAttempts>
            <maximumLinesPerAgent>1.0</maximumLinesPerAgent>
            <noAnswerRingLimit>4</noAnswerRingLimit>
            <retries>
                <answeringMachineDelay>1</answeringMachineDelay>
                <busySignalDelay>1</busySignalDelay>
                <customerAbandonedDelay>1</customerAbandonedDelay>
                <customerNotHomeDelay>1</customerNotHomeDelay>
                <dialerAbandonedDelay>1</dialerAbandonedDelay>
                <noAnswerDelay>1</noAnswerDelay>
           </retries>
            <skillGroupInfos>
                <skillGroupInfo>
                    <ivrPorts>0</ivrPorts>
                    <overflowAgents>0</overflowAgents>
                    <recordsToCache>10</recordsToCache>
                    <dialedNumber>${campaignTelehub.dialedNumber}</dialedNumber>
                    <skillGroup>
                        <refURL>${skillGroupSelected.refURL[0]}</refURL>
                        <name>${skillGroupSelected.name[0]}</name>
                    </skillGroup>
                </skillGroupInfo>
            </skillGroupInfos>
            <timeZone>
                <refURL>/unifiedconfig/config/timezone/SE%20Asia%20Standard%20Time</refURL>
                <name>SE Asia Standard Time</name>
                <displayName>(UTC+07:00) Bangkok, Hanoi, Jakarta</displayName>
                <stdName>SE Asia Standard Time</stdName>
                <dstName>SE Asia Daylight Time</dstName>
                <bias>-420</bias>
                <dstObserved>false</dstObserved>
            </timeZone>
            <callProgressAnalysis>
                <enabled>false</enabled>
                <record>false</record>
                <minSilencePeriod>608</minSilencePeriod>
                <analysisPeriod>2500</analysisPeriod>
                <minimumValidSpeech>112</minimumValidSpeech>
                <maxTimeAnalysis>3000</maxTimeAnalysis>
                <maxTermToneAnalysis>30000</maxTermToneAnalysis>
            </callProgressAnalysis>
        </campaign>`
        var pathApiUpdateCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + campaignTelehub.idCompaignCreatedByCisco
        request.put({
            url: pathApiUpdateCampaign,
            method: "PUT",
            'auth': _config.cisco.auth,
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'application/xml',
                "Accept": "application/xml",
                "Accept-Charset": "utf-8"
            },
            body: dataCampaign
        }, function(error, response, body) {
            if (!error) {
                let dataNext = {
                    skillGroup: data.skillGroup,
                    campaignTelehub: data.campaignTelehub
                }
                callback(null, dataNext)
            }
        });
    }
    // get list again
var getListAgent = function(data, callback) {
        var pathApiGetListAgent = _config.cisco.ipApi + "/unifiedconfig/config/agent"
        var option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiGetListAgent, option, function(err, response, body) {
            if (!err) {
                // parse xml to object
                parseString(body, function(err, resultParse) {
                    if (resultParse) {
                        var listAgentJson = JSON.stringify(resultParse);
                        var listAgentObject = JSON.parse(listAgentJson);
                        if (listAgentObject && listAgentObject.results.agents && listAgentObject.results.agents[0]) {
                            let listAgentFromCisco = listAgentObject.results.agents[0].agent
                            let dataNext = {
                                campaignTelehub: data.campaignTelehub,
                                listAgentFromCisco: listAgentFromCisco,
                                skillGroup: data.skillGroup
                            }
                            callback(null, dataNext)
                        }
                    }
                });
            }
        });
    }
    // get list agent link with skillGroup
var getListAgentLinkSkillGroup = function(data, agents, callback) {
        // get list agent from telehub
        _Users.find({ _id: agents }, function(error, users) {
            let agentsCampaign = users
            if (!error) {
                if (data.listAgentFromCisco.length > 0 && agentsCampaign.length > 0) {
                    let listAgent = data.listAgentFromCisco.filter(agent => {
                        let isCheckAgent = false
                        let agentFromCisco = agent.agentId[0]
                        for (let item of agentsCampaign) {
                            let agentFromTelehub = item.idAgentCisco
                            if (agentFromCisco == agentFromTelehub) {
                                isCheckAgent = true;
                                break;
                            }
                        }
                        if (isCheckAgent) {
                            return agent
                        }
                    })
                    let dataNext = {
                        campaignTelehub: data.campaignTelehub,
                        listAgentForSkillGroup: listAgent
                    }
                    callback(null, dataNext)
                } else {
                    let dataNext = {
                        campaignTelehub: data.campaignTelehub,
                        listAgentForSkillGroup: []
                    }
                    callback(null, dataNext)
                }
            }
        })
    }
    // update skillGroup
var updateSkillGroup = function(data, callback) {
        var pathApiUpdateSkillGroupCampaign = _config.cisco.ipApi + data.campaignTelehub.idSkillGroup
        let listAgentMap = data.listAgentForSkillGroup;
        let stringListAgentXml = ''
        if (listAgentMap.length > 0) {
            for (let item of listAgentMap) {
                let agentXml = `
                <agent>
                    <refURL>${item.refURL[0]}</refURL>
                    <agentId>${item.agentId[0]}</agentId>
                    <firstName>${item.person[0].firstName[0]}</firstName>
                    <lastName>${item.person[0].lastName[0]}</lastName>
                    <userName>${item.person[0].userName[0]}</userName>
                    <agentTeam>
                        <refURL>${item.agentTeam[0].refURL[0]}</refURL>
                        <name>${item.agentTeam[0].name[0]}</name>
                    </agentTeam>
                    <canRemove>false</canRemove>
                </agent>
                `
                stringListAgentXml = stringListAgentXml + agentXml;
            }
        }
        let dataSkillGroupUpdate = `
        <skillGroup>
            <changeStamp>${data.skillGroup.changeStamp[0]}</changeStamp>
            <agents>
                ${stringListAgentXml}
            </agents>
        </skillGroup>
        `
        request.put({
            url: pathApiUpdateSkillGroupCampaign,
            method: "PUT",
            'auth': _config.cisco.auth,
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'application/xml',
                "Accept": "application/xml"
            },
            body: dataSkillGroupUpdate
        }, function(error, response, body) {
            if (!error) {
                callback(null, data)
            }
        })
    }
    //  get a skillgroup
var getSkillGroupForUpdate = function(data, callback) {
        let pathApiGetSkillGroup = _config.cisco.ipApi + data.campaignTelehub.idSkillGroup
        var option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiGetSkillGroup, option, function(err, response, body) {
            if (!err) {
                // parse xml to object
                parseString(body, function(err, resultParse) {
                    if (resultParse) {
                        var skillGroupJson = JSON.stringify(resultParse);
                        var skillGroupObject = JSON.parse(skillGroupJson);
                        if (skillGroupObject && skillGroupObject.skillGroup) {
                            let skillGroupToCreate = skillGroupObject.skillGroup
                            let dataNext = {
                                campaignTelehub: data.campaignTelehub,
                                listAgentForSkillGroup: data.listAgentForSkillGroup,
                                skillGroup: skillGroupToCreate
                            }
                            callback(null, dataNext)
                        }
                    }
                });
            }
        });
    }
    //  get a skillgroup
var getSkillGroup = function(data, callback) {
        let pathApiGetSkillGroup = _config.cisco.ipApi + data.idSkillGroup
        var option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiGetSkillGroup, option, function(err, response, body) {
            if (!err) {
                // parse xml to object
                parseString(body, function(err, resultParse) {
                    if (resultParse) {
                        var skillGroupJson = JSON.stringify(resultParse);
                        var skillGroupObject = JSON.parse(skillGroupJson);
                        if (skillGroupObject && skillGroupObject.skillGroup) {
                            let skillGroupToCreate = skillGroupObject.skillGroup
                            let dataNext = {
                                campaignTelehub: data,
                                skillGroup: skillGroupToCreate
                            }
                            callback(null, dataNext)
                        }
                    }
                });
            }
        });
    }
    // get list skill group
var getListSkillGroupFromCisco = function(callback) {
        let pathApiSkillGroup = _config.cisco.ipApi + "/unifiedconfig/config/skillgroup?selectedAgentCount=60001"
        let codeCompany = _config.app.codeCompany
        let option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiSkillGroup, option, function(err, response, body) {
            // select a skillgroup and update on the campaign table
            var listSkillGroupXml = body
            if (!err) {
                // parse xml to object
                parseString(listSkillGroupXml, function(errParse, resultParse) {
                    if (resultParse) {
                        listSkillGroupXml = resultParse;
                        var listSkillGroupsJson = JSON.stringify(listSkillGroupXml);
                        var listSkillGroupsObject = JSON.parse(listSkillGroupsJson);
                        if (listSkillGroupsObject && listSkillGroupsObject.results.skillGroups && listSkillGroupsObject.results.skillGroups[0]) {
                            let skillGroupsFromCisco = listSkillGroupsObject.results.skillGroups[0].skillGroup
                            skillGroupsFromCisco = skillGroupsFromCisco.filter(item => {
                                if (item.name[0] && item.name[0].includes("VOICE")){
                                    if (item.peripheralNumber[0] && item.peripheralNumber[0].slice(0, 6) == codeCompany.slice(0, 6)) {
                                        return item
                                    }
                                }
                               
                            })
                            callback(null, skillGroupsFromCisco)
                        }
                    }
                });
            }
        })
    }
    // get list campaign
var getListCampaign = function(data, callBack) {
        let pathApiGetListCompaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign"
        let option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiGetListCompaign, option, function(err, response, body) {
            if (!err) {
                // parse xml to object
                parseString(body, function(err, resultParse) {
                    if (resultParse) {
                        var listCampaignJson = JSON.stringify(resultParse);
                        var listCompaignObject = JSON.parse(listCampaignJson);
                        if (listCompaignObject && listCompaignObject.results.campaigns && listCompaignObject.results.campaigns[0]) {
                            let campaignsFromCisco = listCompaignObject.results.campaigns[0].campaign
                            let dataNext = {
                                skillGroupsFromCisco: data,
                                campaignsFromCisco: campaignsFromCisco
                            }
                            callBack(null, dataNext)
                        }
                    }
                });
            }
        });
    }
    // get list skillGroup to create campaign
var selectSkillGroupCreateCampaign = function(data, callback) {
        let skillGroupsFromCisco = data.skillGroupsFromCisco;
        let campaignsFromCisco = data.campaignsFromCisco;
        // get a skillGroup that is not associate with the campaign
        if (skillGroupsFromCisco.length > 0) {
            let listSkillNotAssociateCampaign = skillGroupsFromCisco.filter(skillGroup => {
                let refURLSkillGroup = skillGroup.refURL[0]
                let checkSkillSlected = false
                if (campaignsFromCisco.length > 0) {
                    for (let item of campaignsFromCisco) {
                        let refURLSkillGroupOnCampaign = item.skillGroupInfos[0].skillGroupInfo[0].skillGroup[0].refURL[0]
                        if (refURLSkillGroup == refURLSkillGroupOnCampaign) {
                            checkSkillSlected = true;
                            break;
                        }
                    }
                }
                if (!checkSkillSlected) {
                    return skillGroup
                }
            })
            callback(null, listSkillNotAssociateCampaign)
        } else {
            callback(null, null)
        }
    }
    // create campaign
var createCampaignToCisco = function(data, callback) {
        let campaignTelehub = data.campaignTelehub
        let skillGroupSelected = data.skillGroup;
        let startDate = ""
        let endDate = ""
        if (campaignTelehub.startDate) {
            startDate = _moment(campaignTelehub.startDate).format('YYYY-MM-DD')
        }
        if (campaignTelehub.endDate) {
            endDate = _moment(campaignTelehub.endDate).format('YYYY-MM-DD')
        }
        let status = false
        if (campaignTelehub.status) {
            status = true
        }
        if (skillGroupSelected) {
            var dataCampaign = `
        <campaign>
            <name>${campaignTelehub._id}</name>
            <description>test</description>
            <startDate>${startDate}</startDate>
            <endDate>${endDate}</endDate>
            <startTime>${campaignTelehub.startTime}</startTime>
            <endTime>${campaignTelehub.endTime}</endTime>
            <enabled>${status}</enabled>
            <campaignPrefix>0${campaignTelehub.campaignPrefix}</campaignPrefix>
            <dialingMode>${campaignTelehub.autoDialingMode}</dialingMode>
            <linesPerAgent>1.0</linesPerAgent>
            <maxAttempts>3</maxAttempts>
            <maximumLinesPerAgent>1.0</maximumLinesPerAgent>
            <noAnswerRingLimit>4</noAnswerRingLimit>
            <retries>
                <answeringMachineDelay>1</answeringMachineDelay>
                <busySignalDelay>1</busySignalDelay>
                <customerAbandonedDelay>1</customerAbandonedDelay>
                <customerNotHomeDelay>1</customerNotHomeDelay>
                <dialerAbandonedDelay>1</dialerAbandonedDelay>
                <noAnswerDelay>1</noAnswerDelay>
            </retries>
            <skillGroupInfos>
                <skillGroupInfo>
                    <ivrPorts>0</ivrPorts>
                    <overflowAgents>0</overflowAgents>
                    <recordsToCache>10</recordsToCache>
                    <dialedNumber>${campaignTelehub.dialedNumber}</dialedNumber>
                    <skillGroup>
                        <refURL>${skillGroupSelected.refURL[0]}</refURL>
                        <name>${skillGroupSelected.name[0]}</name>
                    </skillGroup>
                </skillGroupInfo>
            </skillGroupInfos>
            <timeZone>
                <refURL>/unifiedconfig/config/timezone/SE%20Asia%20Standard%20Time</refURL>
                <name>SE Asia Standard Time</name>
                <displayName>(UTC+07:00) Bangkok, Hanoi, Jakarta</displayName>
                <stdName>SE Asia Standard Time</stdName>
                <dstName>SE Asia Daylight Time</dstName>
                <bias>-420</bias>
                <dstObserved>false</dstObserved>
            </timeZone>
            <callProgressAnalysis>
                <enabled>false</enabled>
                <record>false</record>
                <minSilencePeriod>608</minSilencePeriod>
                <analysisPeriod>2500</analysisPeriod>
                <minimumValidSpeech>112</minimumValidSpeech>
                <maxTimeAnalysis>3000</maxTimeAnalysis>
                <maxTermToneAnalysis>30000</maxTermToneAnalysis>
            </callProgressAnalysis>
        </campaign>`
            var pathApiCreateCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign"
            request.post({
                url: pathApiCreateCampaign,
                method: "POST",
                'auth': _config.cisco.auth,
                rejectUnauthorized: false,
                headers: {
                    'Content-Type': 'application/xml',
                    "Accept": "application/xml"
                },
                body: dataCampaign
            }, function(error, response, body) {
                if (!error) {
                    let dataNext = {
                        campaignTelehub: data.campaignTelehub,
                        skillGroup: data.skillGroup
                    }
                    callback(null, dataNext)
                }
            });
        }
    }
    // update idCampaign cisco to the campaign table
var updateIdCampaignCisco = function(data, callBack) {
        let campaignCreatedTelehub = data.campaignTelehub
        let campaignCreated = null;
        let pathApiGetListCompaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign"
        let option = {
            'auth': _config.cisco.auth,
            rejectUnauthorized: false
        }
        request.get(pathApiGetListCompaign, option, function(err, response, body) {
            if (!err) {
                // parse xml to object
                parseString(body, function(err, resultParse) {
                    if (resultParse) {
                        let listCampaignJson = JSON.stringify(resultParse);
                        let listCompaignObject = JSON.parse(listCampaignJson);
                        if (listCompaignObject && listCompaignObject.results.campaigns && listCompaignObject.results.campaigns[0]) {
                            let campaignsFromCisco = listCompaignObject.results.campaigns[0].campaign
                            if (campaignsFromCisco.length > 0) {
                                for (let item of campaignsFromCisco) {
                                    if (item.name[0] === campaignCreatedTelehub._id.toString()) {
                                        campaignCreated = item
                                        break;
                                    }
                                }
                                // get id campain from cisco
                                if (campaignCreated) {
                                    let refURL = campaignCreated.refURL[0]
                                    let idCompaignCisco = refURL.replace("/unifiedconfig/config/campaign/", '')
                                        // insert idCompaignCreatedByCisco
                                    _Campains.findByIdAndUpdate(
                                        campaignCreatedTelehub._id.toString(), {
                                            $set: {
                                                idCompaignCreatedByCisco: Number(idCompaignCisco.trim()),
                                            }
                                        }, { new: true },
                                        function(err, result) {
                                            let dataNext = {
                                                campaignTelehub: data.campaignTelehub,
                                                skillGroup: data.skillGroup
                                            }
                                            callBack(null, dataNext)
                                        });
                                }
                            }
                        }
                    }
                });
            }
        });
    }
    // add cusctomers to the campaign
var addCustomersToCampaignCisco = function(data, callback) {
    let campaignTelehub = data.campaign
    let cusctomers = data.customers
    let rowCustomer = ""
    let ternalId = _config.app._id
    for (let item of cusctomers) {
        let rowItem = `${item._id},${campaignTelehub._id.toString()},${ternalId},${item.field_so_dien_thoai},720,false \n`
        rowCustomer = rowCustomer + rowItem
    }

    let dataCustomer = `
    <import>
        <fileContent>
            <![CDATA[
            AccountNumber,FirstName,LastName,Phone01,TimeZoneBias,DstObserved
            ${rowCustomer}
            ]]>
        </fileContent>
        <delimiter>,</delimiter>
    </import>
    `
    var pathApiImportCustomerToCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + campaignTelehub.idCompaignCreatedByCisco + "/import"
    request.post({
        url: pathApiImportCustomerToCampaign,
        method: "POST",
        'auth': _config.cisco.auth,
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'application/xml',
            "Accept": "application/xml"
        },
        body: dataCustomer
    }, function(error, response, body) {
        if (response && response.statusCode == 200) {
            let dataNext = {
                customers: data.customers,
                campaign: data.campaign,
            }
            callback(null, dataNext)
        } else {
            callback(null, null)
        }
    });
}
var deleteCustomersToCampaignCisco = function(data, callback) {
        let campaignTelehub = data.campaign
        var pathApiDeleteCustomerToCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + campaignTelehub.idCompaignCreatedByCisco + "/import"
        request.delete({
            url: pathApiDeleteCustomerToCampaign,
            method: "DELETE",
            'auth': _config.cisco.auth,
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                "Accept": "application/xml"
            },
        }, function(error, response, body) {
            if (response && response.statusCode == 200) {
                callback(null, data.cusctomers)
            } else {
                callback(null, null)
            }
        });
    }
    // add cusctomers to the campaign
var addCustomersAfterDeleteToCampaignCisco = function(data, callback) {
    let campaignTelehub = data.campaign
    let cusctomers = data.customers
    let rowCustomer = ""
    let ternalId = _config.app._id
    for (let item of cusctomers) {
        let rowItem = `${item._id.toString()},${campaignTelehub._id.toString()},${ternalId},${item.field_so_dien_thoai[0].value},720,false \n`
        rowCustomer = rowCustomer + rowItem
    }

    let dataCustomer = `
    <import>
        <fileContent>
            <![CDATA[
            AccountNumber,FirstName,LastName,Phone01,TimeZoneBias,DstObserved
            ${rowCustomer}
            ]]>
        </fileContent>
        <delimiter>,</delimiter>
    </import>
    `
    var pathApiImportCustomerToCampaign = _config.cisco.ipApi + "/unifiedconfig/config/campaign/" + campaignTelehub.idCompaignCreatedByCisco + "/import"
    request.post({
        url: pathApiImportCustomerToCampaign,
        method: "POST",
        'auth': _config.cisco.auth,
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'application/xml',
            "Accept": "application/xml"
        },
        body: dataCustomer
    }, function(error, response, body) {
        if (response && response.statusCode == 200) {
            callback(null, data)
        } else {
            callback(null, null)
        }
    });
}
var convertVietnamese = function(str) {
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g, "-");
    str = str.replace(/-+-/g, "-");
    str = str.replace(/^\-+|\-+$/g, "");

    return str;
}