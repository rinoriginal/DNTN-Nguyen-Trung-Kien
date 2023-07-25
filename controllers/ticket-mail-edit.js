

var zoka = require(path.join(_rootPath, 'assets', 'plugins', 'zoka', 'script.js'));


exports.index = function(req, res) {

    if (_.has(req.query, 'search')) {
        searchTicket(req, res);
        return;
    }
    if (!_.has(req.query, 'ticketID')) return;
    if (_.has(req.query, 'page')) {
        getTickets(req, function(err, result) {
            return res.json({ code: err ? 500 : 200, message: err ? JSON.stringify(err) : result });
        });
        return;
    }

    _TicketsMail.findById(req.query.ticketID)
        .populate({
            path: 'idService',
            model: _ServicesMail,
            select: 'idCompany idSkill name _id',
            populate: {
                path: 'idCompany',
                model: _Company,
                select: 'companyProfile _id',
                populate: {
                    path: 'companyProfile',
                    model: _CompanyProfile,
                    select: 'fieldId _id',
                    populate: {
                        path: 'fieldId',
                        model: _CustomerFields,
                        select: 'displayName modalName status isRequired fieldValue fieldType weight _id',
                        options: { sort: { weight: 1, displayName: 1 } }
                    }
                }
            }
        })
        .populate({ path: 'updateBy', model: _Users, select: 'name displayName' })
        .lean()
        .exec(function(error, t) {

            if (!t) return res.render('404', { title: '404 | Page not found' });
            var myAgentGroup = getAgentGroup(req.session.user);
            _async.parallel(collectionTicketInfo(req, t, true), function(error, result) {

                t.note = encodeURI(t.note);

                if (!!result.ticketHistory && !!result.ticketHistory.data) {
                    var arr = [];
                    _.each(result.ticketHistory.data, function(el) {
                        if (!el.ticketObject) return;
                        el.ticketObject.note = encodeURI(el.ticketObject.note);
                        arr.push(el);
                    })
                    result.ticketHistory.data = arr;
                }



                _.render(req, res, 'ticket-mail-edit', _.extend({
                    fnInfo: dynamicCustomerInfo,
                    fields: t['idService'].idCompany.companyProfile.fieldId,
                    serviceName: 'Chiến dịch mail: ' + (t.idService ? t.idService.name : ''),
                    title: 'Thông tin khách hàng',
                    currentTicket: t,
                    zoka: zoka,
                    plugins: ['moment', 'zoka', ['bootstrap-select'],
                        ['bootstrap-datetimepicker'],
                        ['chosen']
                    ]
                }, result), true, error);
            });
        });
};

exports.create = function(req, res) {
    if (_.has(req.body, '_id')) {
        getTicketDetail(req, res);
    }
};

exports.update = function(req, res) {
    var params = req.params.ticketmailedit.split('-');

    //if (params.length < 2 || !mongodb.ObjectID.isValid(params[1]))
    //    return res.json({code: 500, message: 'Tham số truyền vào không phải ID : ' + params[1]});

    var _body = _.chain(req.body).cleanRequest().replaceMultiSpaceAndTrim().value();
    if (req.query.field_facebook){
        _body.field_facebook = req.query.field_facebook;
    }
    if (req.query.field_zalo){
        _body.field_zalo = req.query.field_zalo;
    }
    switch (params[0]) {
        case 'customer':
            _.updateCustomer(params[1], _body, function(err) {
                res.json({ code: err ? 500 : 200, message: err ? err : 'Cập nhật thông tin khách hàng thành công !' });
            });
            break;
        case 'editTicket':
            var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            updateTicket(req.session.user._id, params[1], _body, function(err) {
                if (err) return res.json({ code: 500, message: err.message });

                getTicketHistory(params[1], page, function(err, result) {
                    res.json({ code: err ? 500 : 200, message: err ? JSON.stringify(err) : result });
                });
            });
            break;
        case 'survey':
            saveSurvey(req, res);
            break;
    }
};

exports.show = function(req, res) {
    console.log("ticket-mail-edit.js 118", req.params);
    res.status(200).json({});
};

function dynamicCustomerInfo(el, v) {
    var _tag = '';
    var _attr = {};
    var _sattr = [];
    var _childs = [];
    var _val = (v && _.has(v, el.modalName) && !_.isEmpty(v[el.modalName]) && !_.isNull(v[el.modalName]) && v[el.modalName].length && _.has(v[el.modalName][0], 'value')) ? v[el.modalName][0].value : '';

    switch (el.fieldType) {
        case 1:
        case 3:
            _tag = 'input';
            _attr = {
                value: _val,
                class: 'form-control' + _.switch(el.isRequired, [0, 1], ['', ' validate[required]']),
                type: 'text',
                id: 'edit_' + el.modalName,
                name: el.modalName
            }
            break;
        case 2:
            _tag = 'input';
            _attr = {
                value: _val,
                class: 'form-control' + _.switch(el.isRequired, [0, 1], ['', ' validate[required]']),
                type: 'number',
                id: 'edit_' + el.modalName,
                name: el.modalName
            }
            break;
        case 4:
            _sattr.push('multiple');
        case 5:
            _tag = 'select';
            _attr = {
                class: 'selectpicker' + _.switch(el.isRequired, [0, 1], ['', ' validate[required]']),
                id: 'edit_' + el.modalName,
                name: el.modalName
            };
            _childs.push({
                tag: 'option',
                attr: { value: '' },
                sattr: ['selected'],
                content: '---- Chọn ----'
            });
            _.each(el.fieldValue, function(ev) {
                _childs.push({
                    tag: 'option',
                    attr: { value: ev },
                    sattr: _val >= 0 ? ['selected'] : [],
                    content: ev
                });
            });
            break;
        case 6:
            _tag = 'div';
            _attr = { class: 'input-group' };
            _childs = [{
                    tag: 'input',
                    attr: {
                        class: 'form-control date-picker' + _.switch(el.isRequired, [0, 1], ['', ' validate[required]']),
                        value: _moment(_val).format('DD/MM/YYYY'),
                        type: 'text',
                        id: 'edit_' + el.modalName,
                        name: el.modalName
                    }
                },
                {
                    tag: 'span',
                    attr: { class: 'input-group-addon p-l-10 bgm-gray c-white' },
                    childs: [{
                        tag: 'i',
                        attr: {
                            role: 'button',
                            class: 'zmdi zmdi-calendar'
                        }
                    }]
                }
            ];
            break;
        case 7:
            _tag = 'div';
            _attr = {
                class: 'input-group fg-line'
            };
            _childs.push({
                tag: 'input',
                attr: {
                    value: _val,
                    class: 'form-control 1233333 validate[custom[number]' + _.switch(el.isRequired, [0, 1], ['', ',required']) + ']',
                    type: 'text',
                    id: 'edit_' + el.modalName,
                    name: el.modalName + ':string'
                }
            }, {
                tag: 'span',
                attr: {
                    class: 'input-group-btn clickToCall',
                    'data-phone-number': _val
                },
                childs: [{
                    tag: 'button',
                    attr: {
                        class: 'btn btn-default reveal',
                        type: 'button',
                        style: 'max-height: 35px;'
                    },
                    childs: [{
                        tag: 'i',
                        attr: {
                            class: 'zmdi zmdi-phone-in-talk green f-17'
                        }
                    }]
                }]
            });
            break;
    }

    return _.htmlTags([{
        tag: _tag,
        attr: _attr,
        sattr: _sattr,
        childs: _childs.length ? _childs : []
    }]);
};

function updateTicket(userId, ticketId, obj, callback) {
    userId = new mongodb.ObjectID(userId);
    ticketId = new mongodb.ObjectID(ticketId);
    if (!_.isEqual(obj.ticketSubreason, '')) {
        var reasonId = obj.ticketSubreason.split('-');
        obj['ticketReasonCategory'] = !!reasonId[0] ? new mongodb.ObjectID(reasonId[0]) : null;
        obj['ticketReason'] = !!reasonId[1] ? new mongodb.ObjectID(reasonId[1]) : null;
        obj['ticketSubreason'] = !!reasonId[2] ? new mongodb.ObjectID(reasonId[2]) : null;
    } else if (!_.isEqual(obj.ticketReasonCategory, '')) {
        obj['ticketReasonCategory'] = new mongodb.ObjectID(obj['ticketReasonCategory']);
        delete obj.ticketSubreason;
    } else {
        delete obj.ticketSubreason;
        delete obj.ticketReasonCategory;
    }

    var assignTo = null;

    if (!_.isEmpty(obj.assignTo) && !_.isEqual(obj.assignTo, '')) {
        var assign = obj.assignTo.split('-');
        if (assign.length != 2 || !mongodb.ObjectID.isValid(assign[1])) return callback('Không đúng định dạng assign');

        if (_.isEqual(assign[0], 'g')) {
            obj['groupId'] = new mongodb.ObjectID(assign[1]);
            obj['idAgent'] = null;
            obj['assignTo'] = null;
        } else if (_.isEqual(assign[0], 'a')) {
            obj['groupId'] = null;
            obj['idAgent'] = new mongodb.ObjectID(assign[1]);
            obj['assignTo'] = new mongodb.ObjectID(assign[1]);
            assignTo = assign[1];
        }
        obj['assignBy'] = userId;
    }

    if (_.isEqual(obj.assignTo, '')) delete obj.assignTo;

    if (!_.isEqual(obj.deadline, '')) {
        obj['deadline'] = _moment(obj['deadline'], 'HH:mm DD/MM/YYYY')._d;
    } else {
        obj['deadline'] = null;
    }

    if (_.has(obj, 'customerStatisfy') && !_.isEqual(obj.customerStatisfy, '')) {
        var temp = obj.customerStatisfy.split('-');
        obj['customerStatisfy'] = _.convertObjectId(temp[0]);
        if (temp.length > 1) {
            obj['customerStatisfyStage'] = _.convertObjectId(temp[1]);
        } else {
            obj['customerStatisfyStage'] = null;
        }
    } else {
        obj['customerStatisfy'] = null;
        obj['customerStatisfyStage'] = null;
    }

    obj['updated'] = new Date();
    obj['updateBy'] = userId;
    obj['status'] = parseInt(obj['status']);

    _TicketsMail.findByIdAndUpdate(ticketId, { $set: obj }, { new: true }, function(err, result) {
        if (err) return callback(err, result);
        var obj = {};
        obj['ticketId'] = result._id;
        obj['ticketObject'] = result;
        _TicketHistory.create(obj, callback);
        if (assignTo) _.pushNotification(1, 'ticket-mail-edit?ticketID=' + result._id, assignTo);
    });
}

function getTicketReason(t, callback) {
    var agg = [];

    agg.push({ $match: { status: 1, category: 4 } }, { $project: { _id: 1, name: 1 } }, { $lookup: { from: 'ticketreasons', localField: '_id', foreignField: 'idCategory', as: 'tr' } }, { $unwind: { path: '$tr', preserveNullAndEmptyArrays: true } }, { $sort: { 'tr.priority': 1 } }, { $lookup: { from: 'ticketsubreasons', localField: 'tr._id', foreignField: 'idReason', as: 'tr.subReason' } }, { $group: { _id: '$_id', name: { $first: '$name' }, tReason: { $push: { trId: '$tr._id', name: '$tr.name', subReason: '$tr.subReason' } } } }, { $project: { _id: 1, name: 1, tReason: { trId: 1, name: 1, subReason: { _id: 1, name: 1, priority: 1 } } } });

    _TicketReasonCategory.aggregate(agg, function(err, result) {
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

function getTicketDetail(req, res) {
    _TicketsMail.findById(req.body._id)
        .populate({ path: 'idService', model: _ServicesMail, select: 'idCompany idSkill name' })
        .populate({ path: 'idCampain', model: _Campains, select: 'idCompany idCategoryReason idSurvey name' })
        .populate({ path: 'updateBy', model: _Users, select: 'name displayName' })
        .exec(function(error, t) {
            if (error) return res.json({ code: 500, message: JSON.stringify(error) });
            _async.parallel(collectionTicketInfo(req, t), function(err, result) {
                if (err) return res.json({ code: 500, message: JSON.stringify(err) });
                var temp = {
                    ticket: t,
                    info: result,
                    serviceName: (t.idService ? 'Chiến dịch gọi vào: ' + t.idService.name : 'Chiến dịch gọi ra : ' + t.idCampain.name)
                };
                res.json({ code: 200, message: temp });
            });
        });
}

function getTickets(req, callback) {
    var ticketId = _.isEmpty(req.query.ticketID) ? req.body._id : req.query.ticketID;
    _async.waterfall([
        function findTicket(callback) {
            _TicketsMail.findById(ticketId, callback);
        },
        function(t, callback) {
            if (!_.isEmpty(req.session.auth.company)) {
                var companyId = _.convertObjectId(req.session.auth.company._id);
                _async.parallel({
                    campain: function(callback) {
                        _Campains.find({ idCompany: companyId }, { _id: 1 }, function(err, result) {
                            callback(err, _.pluck(result, '_id'));
                        });
                    },
                    service: function(callback) {
                        _ServicesMail.find({ idCompany: companyId }, { _id: 1 }, function(err, result) {
                            callback(err, _.pluck(result, '_id'));
                        })
                    }
                }, function(err, result) {
                    if (err) return callback(err, null);
                    callback(err, t, result)
                });
            } else {
                callback(null, t, null);
            }
        },
        function createCondition(t, obj, callback) {
            var cond = { idCustomer: t.idCustomer, _id: { $ne: t._id } };
            if (!_.isNull(obj)) {
                if ((!_.isNull(obj.campain) && obj.campain.length > 0) &&
                    (!_.isNull(obj.service) && obj.service.length > 0)) {
                    cond['$or'] = [{ idCampain: { $in: obj.campain } }, { idService: { $in: obj.service } }];
                } else if (!_.isNull(obj.campain) && obj.campain.length > 0) {
                    cond['idCampain'] = { $in: obj.campain };
                } else if (!_.isNull(obj.service) && obj.service.length > 0) {
                    cond['idService'] = { $in: obj.service };
                }
            }

            callback(null, t, cond);
        },
        function findTickets(t, cond, callback) {
            var page = _.has(req.query, 'page') ? req.query.page : 1;
            var rows = 10;
            _TicketsMail
                .find(cond)
                .populate({ path: 'updateBy', model: _Users, select: 'name displayName' })
                .populate({ path: 'ticketSubreason', model: _TicketSubreason, select: 'name _id' })
                .populate({ path: 'ticketReasonCategory', model: _TicketReasonCategory, select: 'name _id' })
                .sort({ created: 1 })
                .lean()
                .paginate(page, rows, function(error, result, total) {
                    if (error) return callback(error, null);

                    _.each(result, function(el) {
                        el.note = encodeURI(el.note);
                    })

                    var paginator = new pagination.SearchPaginator({
                        prelink: '/ticket-mail-edit?ticketID=' + t._id,
                        current: page,
                        rowsPerPage: rows,
                        totalResult: total
                    });
                    var obj = {};
                    obj['data'] = result;
                    obj['paging'] = paginator.getPaginationData();
                    callback(error, obj);
                })
        }
    ], callback);
}

function getTicketHistory(ticketId, page, callback) {
    var rows = 20;
    _TicketHistory
        .find({ ticketId: ticketId })
        .populate({ path: 'ticketObject.updateBy', model: _Users, select: 'name displayName' })
        .populate({ path: 'ticketObject.ticketSubreason', model: _TicketSubreason, select: 'name _id' })
        .populate({ path: 'ticketObject.ticketReasonCategory', model: _TicketReasonCategory, select: 'name _id' })
        .paginate(page, rows, function(err, result, total) {
            if (err) return callback(err, null);
            var paginator = new pagination.SearchPaginator({
                prelink: '/ticket-history?ticketId=' + ticketId,
                current: page,
                rowsPerPage: rows,
                totalResult: total
            });
            var obj = {};
            obj['data'] = result;
            obj['paging'] = paginator.getPaginationData();

            callback(err, obj);
        });
}

function ticketCustomerJourney(idCustomer, page, callback) {
    var rows = 10;
    var customerId = new mongodb.ObjectID(idCustomer);

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
        }
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
                    prelink: '/customer-journey?customerId=' + idCustomer,
                    current: page,
                    rowsPerPage: rows,
                    totalResult: total
                });
                callback(error, { ticket: tickets, paging: paginator.getPaginationData() });
            });
        }
    ], callback);
}

function getAssignUsers(ticket, user, callback) {
    var agg = [];
    var companyId = null;
    var company = null;
    log.info("458 ------------- ", ticket);
    if (ticket.idService) {
        company = ticket.idService.idCompany;
        companyId = _.isEmpty(company._id) ? company : company._id;
    } else if (ticket.idCampain) {
        company = ticket.idCampain.idCompany;
        companyId = _.isEmpty(company._id) ? company : company._id;
    }

    companyId = _.isString(companyId) ? new mongodb.ObjectID(companyId) : companyId;

    agg.push({ $match: { status: 1, idParent: companyId } }, { $lookup: { from: 'companies', localField: 'idParent', foreignField: '_id', as: 'company' } }, { $unwind: '$company' });

    agg.push({ $lookup: { from: 'users', localField: '_id', foreignField: 'agentGroupMembers.group', as: 'agm' } }, { $lookup: { from: 'users', localField: '_id', foreignField: 'agentGroupLeaders.group', as: 'agl' } }, {
        $project: {
            _id: 1,
            name: 1,
            agm: {
                $filter: {
                    input: "$agm",
                    as: "agm",
                    cond: {
                        $and: [
                            { $eq: ["$$agm.status", 1] },
                            { $ne: ["$$agm._id", new mongodb.ObjectID(user._id)] }
                        ]
                    }
                }
            },
            agl: {
                $filter: {
                    input: "$agl",
                    as: "agl",
                    cond: {
                        $and: [
                            { $eq: ["$$agl.status", 1] },
                            { $ne: ["$$agl._id", new mongodb.ObjectID(user._id)] }
                        ]

                    }
                }
            }
        }
    }, {
        $project: {
            _id: 1,
            name: 1,
            agm: { _id: 1, name: 1, displayName: 1 },
            agl: { _id: 1, name: 1, displayName: 1 }
        }
    });
    _AgentGroups.aggregate(agg, function(err, result) {
        if (err) return callback(err, null);

        var pmIndex = _.chain(user.ternalLeaders)
            .pluck('ternal')
            .map(function(item) {
                return item.toString();
            })
            .indexOf(_config.app._id)
            .value();

        var clIndex = _.chain(user.companyLeaders)
            .pluck('company')
            .map(function(item) {
                return item.toString();
            })
            .indexOf(companyId)
            .value();

        if (pmIndex >= 0 || clIndex >= 0) {
            callback(err, result);
        } else {
            var memberGroup = user.agentGroupMembers ? _.pluck(user.agentGroupMembers, 'group') : [];
            var leaderGroup = user.agentGroupLeaders ? _.pluck(user.agentGroupLeaders, 'group') : [];
            var myAgentGroup = _.union(memberGroup, leaderGroup);

            var temp = _.reduce(result, function(memo, item) {
                var tmp = item;
                if (myAgentGroup.indexOf(item._id.toString()) < 0) {
                    tmp.agm = [];
                    tmp.agl = [];
                }
                memo.push(tmp);
                return memo;
            }, []);
            callback(err, temp);
        }
    })
};

function getAgentGroup(user) {
    if (_.isEmpty(user)) return [];
    var memberGroup = user.agentGroupMembers ? _.pluck(user.agentGroupMembers, 'group') : [];
    var leaderGroup = user.agentGroupLeaders ? _.pluck(user.agentGroupLeaders, 'group') : [];
    return _.map(_.union(memberGroup, leaderGroup), function(item) {
        return new mongodb.ObjectID(item);
    })
}

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
            var cond = { idCustomer: new mongodb.ObjectID(req.query.idCustomer), _id: { $ne: new mongodb.ObjectID(req.query.tId) } };
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
        }
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

        _TicketsMail
            .find(searchCondition)
            .populate({ path: 'updateBy', model: _Users, select: 'name displayName' })
            .populate({ path: 'ticketSubreason', model: _TicketSubreason, select: 'name _id' })
            .populate({ path: 'ticketReasonCategory', model: _TicketReasonCategory, select: 'name _id' })
            .sort({ created: 1 })
            .paginate(page, rows, function(error, result, total) {
                var paginator = new pagination.SearchPaginator({ prelink: prelink, current: page, rowsPerPage: rows, totalResult: total });
                var obj = {};
                obj['data'] = result;
                obj['paging'] = paginator.getPaginationData();
                res.json({ code: err ? 500 : 200, message: err ? err : obj })
            })

    });
}

function saveSurvey(req, res) {
    var params = req.params.ticketmailedit.split('-');
    var ticketId = params[1];
    var surveyId = params[2];

    var _body = cleanQuestion(req.body);

    _initDBCallBack(_dbPath, _dbName, function(err, db, client) {
        if (err) return err;
        var batch = db.collection('surveyresults').initializeUnorderedBulkOp({ useLegacyOps: true });
        _.each(_.keys(_body), function(item, index) {
            batch.find({
                idTicket: _.convertObjectId(ticketId),
                idQuestion: _.convertObjectId(item),
                idSurvey: _.convertObjectId(surveyId)
            }).upsert().replaceOne({
                $set: {
                    idTicket: _.convertObjectId(ticketId),
                    idQuestion: _.convertObjectId(item),
                    idSurvey: _.convertObjectId(surveyId),
                    answerContent: _body[item].content,
                    answerNote: _body[item].answerNote,
                    updateBy: _.convertObjectId(req.session.user._id),
                    status: 1
                }
            });
        });
        if (batch.s.currentIndex == 0) {
            client.close();
            return res.json({ code: 200, message: 'OK' });
        }
        batch.execute(function(err, result) {
            client.close();
            res.json({ code: err ? 500 : 200, message: err ? JSON.stringify(err) : 'OK' });
        });
    });

    function cleanQuestion(obj) {
        var tmp = {};
        _.each(_.keys(obj), function(key) {
            var keyArr = key.split('-');

            if (keyArr[0] == 'answerNote') {
                if (_.isEmpty(tmp[keyArr[1]])) tmp[keyArr[1]] = { content: null, answerNote: '' };

                tmp[keyArr[1]][keyArr[0]] = obj[key];
            } else {
                if (_.isEmpty(tmp[key])) tmp[key] = { content: null, answerNote: '' };

                if (Array.isArray(obj[key])) {
                    var arr = _.reduce(obj[key], function(memo, item) {
                        if (_.isEqual(item, '') || _.isEqual(item, '0')) return memo;
                        if (mongodb.ObjectID.isValid(item)) item = new mongodb.ObjectID(item);
                        memo.push(item);
                        return memo;
                    }, []);
                    if (arr.length > 0) tmp[key]['content'] = arr;
                }

                if (_.isString(obj[key])) {
                    if (!_.isEqual(obj[key], '')) {
                        if (mongodb.ObjectID.isValid(obj[key])) {
                            tmp[key]['content'] = new mongodb.ObjectID(obj[key]);
                        } else {
                            tmp[key]['content'] = obj[key];
                        }
                    } else {
                        tmp[key]['content'] = null;
                    }
                }
            }
        });
        return tmp;
    }
}

/**
 * Convert các object về string
 *
 * @param params    - Dữ liệu đầu vào
 * @returns {*}     - Dữ liệu đầu ra sau khi đã convert string ( có thể bị lỗi với các trường hợp _.isEmpty
 */
function convertToString(params) {
    if (_.isEmpty(params)) return params;
    if (_.isString(params)) return params;
    return params.toString();
}

/**
 * Kiểm tra với ticket hiện tại thì người dùng có được phép edit hay không
 *
 * @param req       - Current Request
 * @param t         - Current Ticket
 * @param callback  - Next tick
 */
function isEdit(req, t, callback) {
    if (_.isNull(req.session.auth.company)) {
        callback(null, true);
    } else if (req.session.auth.company.leader) {
        var companyId = !_.isEmpty(t.idService) ?
            t.idService.idCompany._id :
            t.idCampain.idCompany._id;

        callback(null, _.isEqual(convertToString(companyId), req.session.auth.company));
    } else if (req.session.auth.company.group.leader) {

        // group leader
        var groupId = _.convertObjectId(req.session.auth.company.group._id);

        _Users.find({
            $or: [
                { 'agentGroupMembers.group': groupId },
                { 'agentGroupLeaders.group': groupId }
            ]
        }, { _id: 1 }, function(err, result) {
            if (err) return callback(err, null);
            var userId = _.chain(result)
                .pluck('_id')
                .map(function(item) {
                    return item.toString();
                })
                .value();

            var value = (_.indexOf(userId, convertToString(t.idAgent)) >= 0) ||
                (_.isEqual(t.groupId ? t.groupId.toString() : null, req.session.auth.company.group._id));
            callback(err, value);
        });
    } else {
        // agent group
        var value = (_.isEqual(convertToString(t.idAgent), req.session.user._id)) ||
            (_.isEqual(convertToString(t.assignTo), req.session.user._id));
        callback(null, value);
    }
}


function collectionTicketInfo(req, t, getCustomerInfo) {
    var temp = {
        ticketReasonCategory: function(callback) {
            getTicketReason(t, callback);
        },
        assign: function(callback) {
            getAssignUsers(t, req.session.user, callback);
        },
        tickets: function(callback) {
            getTickets(req, callback);
        },
        survey: function(callback) {
            if (t.idCampain == null) return callback(null, null);
            var surveyId = t.idCampain.idSurvey;
            _Surveys.aggregate([
                { $match: { _id: surveyId } },
                { $lookup: { from: 'surveyquestions', localField: '_id', foreignField: 'idSurvey', as: 'sq' } },
                { $unwind: '$sq' },
                { $lookup: { from: 'surveyanswers', localField: 'sq._id', foreignField: 'idQuestion', as: 'sq.sa' } },
                { $lookup: { from: 'surveyresults', localField: 'sq._id', foreignField: 'idQuestion', as: 'sq.result' } },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        'sq._id': 1,
                        'sq.questionType': 1,
                        'sq.answerType': 1,
                        'sq.content': 1,
                        'sq.result': 1,
                        'sq.isStart': 1,
                        'sq.idNextQuestion': 1,
                        'sq.sa._id': 1,
                        'sq.sa.content': 1
                    }
                },
                { $group: { _id: '$_id', name: { $first: '$name' }, sq: { $push: '$sq' } } }
            ], function(err, result) {
                if (err) return callback(err, null);
                var temp = [];
                if (_.has(result[0], 'sq')) {
                    temp = result[0].sq;
                }
                callback(err, temp);
            });
        },
        surveyResult: function(callback) {
            if (_.isEmpty(t.idCampain)) return callback(null, null);
            _SurveyResult.find({
                idTicket: t._id,
                idSurvey: t.idCampain.idSurvey
            }, callback);
        },
        isEdit: function(callback) {
            isEdit(req, t, callback);
        },
        statisfy: function(callback) {
            _CustomerStatisfy.aggregate([
                { $match: { status: 1 } },
                { $lookup: { from: 'customerstatisfystages', localField: '_id', foreignField: 'idCustomerStatisfy', as: 'cs' } },
                { $unwind: { path: '$cs', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        cs: {
                            $cond: {
                                if: { $eq: ['$status', 1] },
                                then: '$cs',
                                else: null
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        name: { $first: '$name' },
                        cs: {
                            $push: {
                                _id: '$cs._id',
                                name: '$cs.name'
                            }
                        }
                    }
                }
            ], callback);
        },
        ticketHistory: function(callback) {
            getTicketHistory(t._id, 1, callback);
        },
        ticketCustomerJourney: function(callback) {
            ticketCustomerJourney(t.idCustomer, 1, callback);
        }
    };

    if (getCustomerInfo) {
        temp['customer'] = function(callback) {
            var _agg = [{ $match: { _id: t.idCustomer } }];
            _.each(t[(!_.isNull(t.idService) ? 'idService' : 'idCampain')].idCompany.companyProfile.fieldId, function(o) {
                _agg.push({ $lookup: { from: o.modalName, localField: '_id', foreignField: 'entityId', as: o.modalName } });
            });
            _Customer.aggregate(_agg, callback);
        };
    }

    return temp;
}