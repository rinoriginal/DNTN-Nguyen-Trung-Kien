// var _TicketAdvisory = _.convertObjectId('5f740471fe7bf17a11ae90d0')
var fs = require('fs'),
    path = require('path'),
    Handlebars = require('handlebars');
// Open template file
var root = path.dirname(require.main.filename)
var source = fs.readFileSync(path.join(root, "assets", "email-template", "email-demo", "email-advisory.html.handlebars"), 'utf8');
// Create email generator
var template = Handlebars.compile(source);

exports.index = {
    json: function (req, res) {
        console.log(1111);

        if (req.query.search && req.query.search == 'ticket') {
            var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
            var agg = _TicketAdvisory.aggregate();
            var _search = req.query;

            var query = {};
            var queryCustomer = {};

            if (_.has(req.query, 'created') && req.query.created) {
                var _d1 = _moment(req.query.created.split(' - ')[0], 'DD/MM/YYYY');
                var _d2 = req.query.created.split(' - ')[1] ? _moment(req.query.created.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

                var startDay = (_d1._d < _d2._d) ? _d1 : _d2;
                var endDay = (_d1._d < _d2._d) ? _d2 : _d1;
                startDay = startDay.startOf('day')._d;
                endDay = endDay.endOf('day')._d;
                query.created = {
                    $gte: startDay, $lt: endDay
                }
            }

            // if (_.has(_search, "startDate") || _.has(_search, "endDate")) {

            //     query.created = {};
            //     if (_search.startDate) {
            //         // console.log('ahihi1111111');
            //         query.created.$gte = moment(_search.startDate, "DD/MM/YYYY").startOf('day')._d;
            //     };
            //     if (_search.endDate) {
            //         // console.log('ahihi12222222');
            //         query.created.$lte = moment(_search.endDate, "DD/MM/YYYY").endOf('day')._d;
            //     };
            // }

            if (_.has(_search, "advisoryTypeId") && _search.advisoryTypeId.length > 0) {
                // var lst = [];
                // _.each(_search.advisoryTypeId, function (el) {
                //     lst.push(_.convertObjectId(el))
                // })
                query.advisoryTypeId = { $in: _.arrayObjectId(_search.advisoryTypeId) };
            }

            if (_.has(_search, 'phoneNumber')) {
                queryCustomer = { "idCustomer.field_so_dien_thoai": _search['phoneNumber'] };
            }


            if (_.has(_search, 'customerName')) {
                queryCustomer = { "idCustomer.field_ho_ten": { $regex: new RegExp(_.stringRegex(_search['customerName']), 'gi') } };
            }

            //Nội dung tư vấn
            if (_.has(_search, 'content')) {
                query.content = { $regex: new RegExp(_.stringRegex(_search['content']), 'gi') };
            }


            if (_.has(_search, "idAgent") && _search.idAgent.length > 0) {
                var lst = [];
                _.each(_search.idAgent, function (el) {
                    lst.push(_.convertObjectId(el))
                })
                query.createBy = { $in: _.arrayObjectId(_search.idAgent) };
            }

            if (_.has(_search, 'idCustomer')) {
                queryCustomer = { "idCustomer._id": _.convertObjectId(_search.idCustomer) };
            }


            agg._pipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'advicecategories',
                        localField: 'advisoryTypeId',
                        foreignField: '_id',
                        as: 'advisoryTypeId'
                    }
                },
                { $unwind: { path: '$advisoryTypeId', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'customerindex',
                        localField: 'idCustomer',
                        foreignField: '_id',
                        as: 'idCustomer'
                    }
                },
                { $unwind: { path: '$idCustomer', preserveNullAndEmptyArrays: true } },
                { $match: queryCustomer },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'createBy',
                        foreignField: '_id',
                        as: 'createBy'
                    }
                },
                { $unwind: { path: '$createBy', preserveNullAndEmptyArrays: true } },
                { $sort: { created: -1 } }
            ]
            _TicketAdvisory.aggregatePaginate(agg, { page: page, limit: rows }, function (err, resp, pageCount, count) {
                if (err) {
                    return res.json({ code: 500 });
                }
                var paginator = new pagination.SearchPaginator({
                    prelink: '/ticket-advisory',
                    current: page,
                    rowsPerPage: rows,
                    totalResult: count
                });
                res.json({ code: 200, data: resp, paging: paginator.getPaginationData() });
            });
        } else if (req.query.search && req.query.search == 'phone') {
            var _idCompany;
            _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107')

            _async.parallel({
                cusInfo: function (cb) {
                    _Company.findById(_idCompany)
                        .populate({
                            path: 'companyProfile',
                            model: _CompanyProfile,
                            select: 'fieldId _id',
                            populate: {
                                path: 'fieldId',
                                model: _CustomerFields,
                                select: 'displayName modalName status isRequired fieldValue fieldType weight _id',
                                options: { sort: { weight: 1, displayName: 1 } }
                            }
                        }).exec(cb)
                },
                customer: function (cb) {

                    _async.waterfall([
                        function (next) {
                            _Customerindex.find({ field_so_dien_thoai: req.query.phoneNumber }).exec(function (err, data) {
                                next(null, data[0])
                            });
                        },
                        function (cus, next) {
                            if (cus) {
                                next(null, cus)
                            } else {
                                createNewCustomerByPhone(req.query.phoneNumber, next)
                            }
                        }
                    ], cb)
                },
            }, function (err, result) {
                let fields = result.cusInfo.companyProfile.fieldId;
                let customer = result.customer;
                let str = ''

                if (customer) {
                    for (var i = 0; i < fields.length; i++) {
                        str += '<div class="row m-20 flex-box">' +
                            '<label class="control-label col-md-3 text-left ">' + fields[i].displayName +
                            // _switch(fields[i].isRequired, [0, 1], ['', '<span class="c-red">*</span>']) +
                            '</label>' +
                            '<div class="col-md-9 text-left">' +
                            dynamicCustomerInfo(fields[i], JSON.parse(JSON.stringify(customer))) +
                            '</div>' +
                            '</div>'
                    }
                    console.log(99999999, str);
                }

                res.json({
                    code: (err ? 500 : 200),
                    message: err ? err.message : '',
                    data: err ? [] : str,
                    customer: customer
                })
            })
        }
    },
    html: function (req, res) {
        var checkMailChat = _.has(req.query, checkMailChat)
        var _idCustomer;
        _idCustomer = _.convertObjectId(req.query.idCustomer)

        _async.parallel({
            advisoryCategory: function (cb) {
                _AdviceCategory.find({}, { _id: 1, nameAdvice: 1 }, cb)
            },
            agent: function (cb) {
                _Users.find({}, { _id: 1, displayName: 1 }, cb)
            },
        }, function (err, result) {
            _.render(req, res, 'ticket-advisory', {
                title: 'Quản lý phiếu tư vấn',
                advisoryCategory: result.advisoryCategory,
                agent: result.agent,
                _idCustomer: _idCustomer,
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
            }, true);
        })

    }
}


exports.new = function (req, res) {
    var _idCompany;
    var _idCustomer;
    var checkVoice = _.has(req.query, 'checkVoice')

    _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107')
    _idCustomer = _.convertObjectId(req.query.idCustomer)

    _async.parallel({
        cusInfo: function (cb) {
            _Company.findById(_idCompany)
                .populate({
                    path: 'companyProfile',
                    model: _CompanyProfile,
                    select: 'fieldId _id',
                    populate: {
                        path: 'fieldId',
                        model: _CustomerFields,
                        select: 'displayName modalName status isRequired fieldValue fieldType weight _id',
                        options: { sort: { weight: 1, displayName: 1 } }
                    }
                }).exec(cb)
        },
        customer: function (cb) {
            if (_idCustomer) {
                _Customerindex.findById(_idCustomer).lean().exec(cb);
            } else {
                cb()
            }
        },
        advice: function (cb) {
            _AdviceCategory.find({ status: 1 }).exec(cb)
        },
        email: function (cb) {
            _MailAdvisory.find().exec(cb)
        },
        // adviceticket: function (cb) {
        //     _TicketAdvisory.find(_TicketAdvisory).lean().exec(cb);
        // },
    }, function (err, result) {
        console.log(111, result);
        // console.log(111, customer);
        _.render(req, res, 'ticket-advisory-new', {
            fnInfo: dynamicCustomerInfo,
            fields: result.cusInfo.companyProfile.fieldId,
            checkVoice: checkVoice, //biến check load trang từ popup voice hay trang quản lý
            customer: result.customer,
            advice: result.advice,
            email: result.email[0].emails,
            // adviceticket:result.adviceticket[0],
            _url: 'https://' + req.headers.host + '/',
            title: 'Chi tiết phiếu tư vấn',
            plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
        }, true);
    })
}

exports.create = function (req, res) {
    // console.log(222, req.body);
    let _body = req.body
    var dataInsert = {}
    if (_.has(_body, 'advisoryTypeId') && _body['advisoryTypeId'] != '') {
        dataInsert.advisoryTypeId = _.convertObjectId(_body.advisoryTypeId)
    }
    if (_.has(_body, 'emailTo') && _body['emailTo'] != '') {
        dataInsert.emailTo = _body.emailTo
    }
    if (_.has(_body, 'idCustomer') && _body['idCustomer'] != '') {
        dataInsert.idCustomer = _.convertObjectId(_body.idCustomer)
    }
    if (_.has(_body, 'content') && _body['content'] != '') {
        dataInsert.content = _body.content
    }
    if (_.has(_body, 'fileUpload') && _body['fileUpload'] != []) {
        dataInsert.files = JSON.parse(_body.fileUpload)
    }
    dataInsert.createBy = _.convertObjectId(req.session.user._id)
    _TicketAdvisory.create(dataInsert, function (error, result) {
        //if(!error) manager.addGroup();
        console.log(9999999, error);
        if (!error) {
            var mailBody = '';

            _async.parallel({
                customer: function (cb) {
                    _async.waterfall([
                        function (next) {
                            _Customerindex.findById(_.convertObjectId(_body.idCustomer), next)
                        },
                        function (customerdata, next) {

                            if (JSON.parse(JSON.stringify(customerdata)).field_tinh_thanh && JSON.parse(JSON.stringify(customerdata)).field_tinh_thanh[0] != '') {
                                let x = JSON.parse(JSON.stringify(customerdata)).field_tinh_thanh[0]
                                _Provinces.findOne({ name: x }, function (err, data) {
                                    next(null, customerdata, data)
                                })
                            } else {
                                next(null, customerdata, null)
                            }
                        }
                    ], cb)
                },
                advisoryCategory: function (cb) {
                    _AdviceCategory.find({}, { _id: 1, nameAdvice: 1 }, cb)
                },
                ticketadvisory: function (cb) {
                    _TicketAdvisory.aggregate([
                        { $match: { _id: result._id } },
                    ], (cb));
                }
            }, function (err, data) {
                console.log(111111);
                var _advisoryType = _.filter(data.advisoryCategory, item => item._id == _body.advisoryTypeId)[0].nameAdvice
                var files = []
                if (_.has(data.ticketadvisory[0], 'files') && data.ticketadvisory[0].files.length > 0) {
                    data.ticketadvisory[0].files.forEach(function (item) {
                        files.push({
                            path: item.urlUpload,
                            filename: item.nameUpload
                        })
                    })
                }
                mailBody = template(
                    {
                        emailTitle: "Thông báo tư vấn",
                        customer: {
                            name: JSON.parse(JSON.stringify(data.customer[0])).field_ho_ten ? JSON.parse(JSON.stringify(data.customer[0])).field_ho_ten : '',
                            phone: data.customer[0].field_so_dien_thoai,
                            email: JSON.parse(JSON.stringify(data.customer[0])).field_e_mail ? JSON.parse(JSON.stringify(data.customer[0])).field_e_mail : '',
                            province: data.customer[1] ? data.customer[1].name : '',
                        },
                        advice: {
                            type: _advisoryType,
                            content: _body.content ? _body.content : '',
                            file: files
                        }
                    }
                )
                var sendMail = '';
                var ccMail = '';
                var arrMail = _body.emailTo.split(',');
                sendMail = arrMail[0]
                if (arrMail.length > 1) {
                    ccMail = arrMail.slice(1).toString()
                }
                _MailService.send(sendMail, ccMail, 'Thông báo tư vấn', mailBody, files, function (e, r) {
                    console.log(e, r);
                })
            })
        }
        res.json({ code: (error ? 500 : 200), message: error ? error : '' });
    });
}


exports.edit = function (req, res) {
    var _idTicket = _.convertObjectId(req.params.ticketadvisory);
    var _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107');
    var checkVoice = _.has(req.query, 'checkVoice')

    _async.parallel({
        cusInfo: function (cb) {
            _Company.findById(_idCompany)
                .populate({
                    path: 'companyProfile',
                    model: _CompanyProfile,
                    select: 'fieldId _id',
                    populate: {
                        path: 'fieldId',
                        model: _CustomerFields,
                        select: 'displayName modalName status isRequired fieldValue fieldType weight _id',
                        options: { sort: { weight: 1, displayName: 1 } }
                    }
                }).exec(cb)
        },
        ticket: function (cb) {
            _TicketAdvisory.aggregate([
                { $match: { _id: _idTicket } },
                {
                    $lookup: {
                        from: 'customerindex',
                        localField: 'idCustomer',
                        foreignField: '_id',
                        as: 'idCustomer'
                    }
                },
                { $unwind: { path: '$idCustomer', preserveNullAndEmptyArrays: true } },

            ], (cb));
        },
        advice: function (cb) {
            _AdviceCategory.find({ status: 1 }).exec(cb)
        },
        email: function (cb) {
            _MailAdvisory.find().exec(cb)
        },
    }, function (err, result) {
        console.log(111, result);
        _.render(req, res, 'ticket-advisory-edit', {
            fnInfo: dynamicCustomerInfo,
            fields: result.cusInfo.companyProfile.fieldId,
            checkVoice: checkVoice, //biến check load trang từ popup voice hay trang quản lý
            ticket: result.ticket,
            advice: result.advice,
            _url: 'https://' + req.headers.host + '/',
            email: result.email[0].emails,
            title: 'Chi tiết phiếu tư vấn',
            plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
        }, true);
    })
}

exports.update = function (req, res) {
    console.log(111111111);
    var idTicketAdvisory = _.convertObjectId(req.params.ticketadvisory)
    let _body = req.body
    var dataInsert = {}
    if (_.has(_body, 'advisoryTypeId') && _body['advisoryTypeId'] != '') {
        dataInsert.advisoryTypeId = _.convertObjectId(_body.advisoryTypeId)
    }
    if (_.has(_body, 'emailTo') && _body['emailTo'] != '') {
        dataInsert.emailTo = _.convertObjectId(_body.emailTo)
    }
    // if (_.has(_body, 'idCustomer') && _body['idCustomer'] != '') {
    //     dataInsert.idCustomer = _.convertObjectId(_body.idCustomer)
    // }
    if (_.has(_body, 'content')) {
        dataInsert.content = _body.content
    }
    if (_.has(_body, 'fileUpload') && _body['fileUpload'] != []) {
        dataInsert.files = JSON.parse(_body.fileUpload)
    }
    dataInsert.updateBy = _.convertObjectId(req.session.user._id)
    dataInsert.updated = new Date();
    _TicketAdvisory.replaceOne({ _id: idTicketAdvisory }, dataInsert, function (error, result) {
        console.log(9999999, error);
        if (!error) {
            var mailBody = '';

            _async.parallel({
                customer: function (cb) {
                    _async.waterfall([
                        function (next) {
                            _Customerindex.findById(_.convertObjectId(_body.idCustomer), next)
                        },
                        function (customerdata, next) {

                            if (JSON.parse(JSON.stringify(customerdata)).field_tinh_thanh && JSON.parse(JSON.stringify(customerdata)).field_tinh_thanh[0] != '') {
                                let x = JSON.parse(JSON.stringify(customerdata)).field_tinh_thanh[0]
                                _Provinces.findOne({ name: x }, function (err, data) {
                                    next(null, customerdata, data)
                                })
                            } else {
                                next(null, customerdata, null)
                            }
                        }
                    ], cb)
                },
                advisoryCategory: function (cb) {
                    _AdviceCategory.find({}, { _id: 1, nameAdvice: 1 }, cb)
                },
                ticketadvisory: function (cb) {
                    _TicketAdvisory.aggregate([
                        { $match: { _id: idTicketAdvisory } },
                    ], (cb));
                }
            }, function (err, data) {
                console.log(111111);
                var _advisoryType = _.filter(data.advisoryCategory, item => item._id == _body.advisoryTypeId)[0].nameAdvice
                var files = []
                if (_.has(data.ticketadvisory[0], 'files') && data.ticketadvisory[0].files.length > 0) {
                    data.ticketadvisory[0].files.forEach(function (item) {
                        files.push({
                            path: item.urlUpload,
                            filename: item.nameUpload
                        })
                    })
                }
                mailBody = template(
                    {
                        emailTitle: "Thông báo cập nhật tư vấn",
                        customer: {
                            name: JSON.parse(JSON.stringify(data.customer[0])).field_ho_ten ? JSON.parse(JSON.stringify(data.customer[0])).field_ho_ten : '',
                            phone: data.customer[0].field_so_dien_thoai,
                            email: JSON.parse(JSON.stringify(data.customer[0])).field_e_mail ? JSON.parse(JSON.stringify(data.customer[0])).field_e_mail : '',
                            province: data.customer[1] ? data.customer[1].name : '',
                        },
                        advice: {
                            type: _advisoryType,
                            content: _body.content ? _body.content : '',
                            file: files
                        }
                    }
                )
                var sendMail = '';
                var ccMail = '';
                var arrMail = _body.emailTo.split(',');
                sendMail = arrMail[0].toString();
                if (arrMail.length > 1) {
                    ccMail = arrMail.slice(1).toString()
                }
                _MailService.send(sendMail, ccMail, 'Thông báo cập nhật tư vấn', mailBody, files, function (e, r) {
                    console.log(e, r);
                })
            })
        }
        res.json({ code: (error ? 500 : 200), message: error ? error : '' });
    });
}

function createNewCustomerByPhone(phone, callback) {
    _async.waterfall([
        function (next) {
            _Customer.create({}, next);
        },
        function (newCus, next) {
            mongoClient.collection('customerindex').insert({
                _id: newCus._id,
                field_so_dien_thoai: phone
            }, function (err, result) {
                if (err || result.result.n != 1) {
                    log.info('ERROR TICKET-IMPORT-BY-PHONE CREATE CUSTOMER', err)
                    return next(err || 'Tạo customerindex xảy ra lỗi.');
                }
                next(null, newCus);
            });
        },
        function (newCus, next) {
            _CCKFields['field_so_dien_thoai'].db.create({
                entityId: newCus._id,
                value: phone
            }, next);
        },
        function (ckfield, next) {
            _Customerindex.findById(ckfield.entityId).exec(next);
        }

    ], callback);
}



/**
 * Vẽ giao diện input thông tin khách hàng
 * @param el Dữ liệu customer field
 * @param v Dữ liệu đầu vào khách hàng
 * @returns {*}
 */
function dynamicCustomerInfo(el, v) {
    var _tag = '';
    var _attr = {};
    var _sattr = [];
    var _childs = [];
    var _val = (v &&
        _.has(v, el.modalName) &&
        !_.isEmpty(v[el.modalName]) &&
        !_.isNull(v[el.modalName]) &&
        v[el.modalName].length
        // && _.has(v[el.modalName][0], 'value')
    )
        ?
        v[el.modalName]
        :
        '';

    // console.log(44444, v[el.modalName]);
    // console.log(33333, el.modalName);
    // console.log(55555, _val);



    switch (el.fieldType) {
        case 1:
        case 3:
            _tag = 'input';
            _attr = {
                disabled: true,
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
                disabled: true,
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
                disabled: true,
                class: 'selectpicker' + _.switch(el.isRequired, [0, 1], ['', ' validate[required]']),
                id: 'edit_' + el.modalName,
                'data-live-search': true,
                name: el.modalName + '[]'
            };
            _childs.push({
                tag: 'option',
                attr: { value: '' },
                sattr: ['selected'],
                content: '---- Chọn ----'
            });
            _.each(el.fieldValue, function (ev) {
                _childs.push({
                    tag: 'option',
                    attr: { value: ev },
                    sattr: _.indexOf(_val, ev) >= 0 ? ['selected'] : [],
                    content: ev
                });
            });
            break;
        case 6:
            _tag = 'div';
            _attr = { class: 'input-group' };
            _childs = [
                {
                    tag: 'input',
                    attr: {
                        disabled: true,
                        class: 'form-control date-picker' + _.switch(el.isRequired, [0, 1], ['', ' validate[required]']),
                        value: _moment(_val).format('DD/MM/YYYY'),
                        type: 'text',
                        id: 'edit_' + el.modalName,
                        name: el.modalName
                    }
                },
                {
                    tag: 'span',
                    attr: {
                        disabled: true,
                        class: 'input-group-addon p-l-10 bgm-gray c-white'
                    },
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
            _tag = 'input';
            _attr = {
                disabled: true,
                value: _val,
                class: 'form-control validate[custom[number]' + _.switch(el.isRequired, [0, 1], ['', ',required'] + ']'),
                type: 'text',
                id: 'edit_' + el.modalName,
                name: el.modalName + ':string'
            }

            break;
    }

    return _.htmlTags([{
        tag: _tag,
        attr: _attr,
        sattr: _sattr,
        childs: _childs.length ? _childs : []
    }]);
};
