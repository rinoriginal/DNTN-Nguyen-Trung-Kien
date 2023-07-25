//created by haivh 30/09/2020
const os = require('os')
var fs = require('fs'),
    path = require('path'),
    Handlebars = require('handlebars');
// Open template file
var root = path.dirname(require.main.filename)
var sourceCreate = fs.readFileSync(path.join(root, "assets", "email-template", "email-demo", "email-complaint.html.handlebars"), 'utf8');
var sourceUpdate = fs.readFileSync(path.join(root, "assets", "email-template", "email-demo", "email-update-complaint.html.handlebars"), 'utf8');
// Create email generator
var templateCreate = Handlebars.compile(sourceCreate);
var templateUpdate = Handlebars.compile(sourceUpdate);

exports.index = {
    json: function (req, res) {
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
            }

            res.json({
                code: (err ? 500 : 200),
                message: err ? err.message : '',
                data: err ? [] : str,
                customer: customer
            })
        })


    },
    html: function (req, res) {
        // let _idCompay = _.convertObjectId(req.query._idCompay)
        // let _idCustomer = _.convertObjectId(req.query._idCustomer)
        let _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107')
        let _idCustomer = _.convertObjectId(req.query.customerId)

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
                _Customerindex.findById(_idCustomer).lean().exec(cb);
            },
            brands: function (cb) {
                _Brands.find({}).sort({ name: 1 }).exec(cb)
            },
            provinces: function (cb) {
                _Provinces.find({}).sort({ name: 1 }).exec(cb)
            },
            restaurants: function (cb) {
                _Restaurants.find({}).sort({ name: 1 }).exec(cb)
            },
            complaintCategory: function (cb) {
                _ComplaintCategory.find({ status: 1 }, cb)
            },
            category: function (cb) {
                _Category.find({ status: 1 }, cb)
            },
            inforRecord: function (callback) {
                if (_.isNull(req.session.auth.company)) {
                    _Users.find({}, { _id: 1, name: 1, displayName: 1 }, callback);
                } else {
                    var companyId = _.convertObjectId(req.session.auth.company._id);
                    _AgentGroups.find({ idParent: companyId }, { _id: 1 }, function (err, result) {
                        if (err) return callback(err, null);
                        var ag = _.pluck(result, '_id');
                        var cond = [
                            {
                                $match: {
                                    $or: [
                                        { 'agentGroupLeaders.group': { $in: ag } },
                                        { 'agentGroupMembers.group': { $in: ag } },
                                        { 'companyLeaders.company': companyId }
                                    ]
                                }
                            },
                            {
                                $project: {
                                    _id: 1,
                                    name: 1,
                                    displayName: 1
                                }
                            }
                        ];

                        _Users.aggregate(cond, callback);
                    });
                }
            }
        }, function (err, result) {

            _.render(req, res, 'complaint-popup', {
                fnInfo: dynamicCustomerInfo,
                fields: result.cusInfo.companyProfile.fieldId,
                customer: result.customer,
                brands: result.brands,
                provinces: result.provinces,
                complaintCategory: result.complaintCategory,
                category: result.category,
                myUsers: result.inforRecord,
                recordPath: _config.recordPath ? _config.recordPath.path : '',
                _url: 'https://' + req.headers.host + '/',
                title: 'Tạo mới phiếu khiếu nại',
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['bootstrap-datetimepicker'], 'fileinput']
            }, true);
        })
    }
}

exports.create = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);

    var validateErr = null;
    var _body = {}


    if (!_.has(req.body, 'brandId') || !req.body.brandId) {
        validateErr = new Error('Vui lòng chọn nhãn hiệu');
    }
    if (!_.has(req.body, 'provinceId') || !req.body.provinceId) {
        validateErr = new Error('Vui lòng chọn Tỉnh thành');
    }
    if (!_.has(req.body, 'restaurantId') || !req.body.restaurantId) {
        validateErr = new Error('Vui lòng chọn nhà hàng');
    }
    if (!_.has(req.body, 'channelType') || !req.body.channelType) {
        validateErr = new Error('Vui lòng chọn source');
    }
    if (!_.has(req.body, 'typeComplaintId') || !req.body.typeComplaintId) {
        validateErr = new Error('Vui lòng chọn loại khiếu nại');
    }
    if (!_.has(req.body, 'content') || !req.body.content) {
        validateErr = new Error('Vui lòng nhập nội dung khiếu nại');
    }


    _body['createdBy'] = req.session.user._id;
    _body.status = 0//đang xử lý
    if (_.has(req.body, 'brandId') && req.body.brandId) {
        _body.brandId = _.convertObjectId(req.body.brandId)
    }
    if (_.has(req.body, 'provinceId') && req.body.provinceId) {
        _body.provinceId = _.convertObjectId(req.body.provinceId)
    }
    if (_.has(req.body, 'restaurantId') && req.body.restaurantId) {
        _body.restaurantId = _.convertObjectId(req.body.restaurantId)
    }
    if (_.has(req.body, 'channelType') && req.body.channelType) {
        _body.channelType = +req.body.channelType
    }
    if (_.has(req.body, 'typeComplaintId') && req.body.typeComplaintId) {
        _body.typeComplaintId = _.convertObjectId(req.body.typeComplaintId)
    }
    if (_.has(req.body, 'problemId') && req.body.problemId) {
        _body.problemId = _.convertObjectId(req.body.problemId)
    }
    if (_.has(req.body, 'categoryComplaintId') && req.body.categoryComplaintId) {
        _body.categoryComplaintId = _.convertObjectId(req.body.categoryComplaintId)
    }
    if (_.has(req.body, 'subCategoryComplaintId') && req.body.subCategoryComplaintId) {
        _body.subCategoryComplaintId = _.convertObjectId(req.body.subCategoryComplaintId)
    }
    if (_.has(req.body, 'content') && req.body.content) {
        _body.content = req.body.content
    }
    if (_.has(req.body, 'deadline') && req.body.deadline) {
        _body.deadline = _moment(req.body.deadline, 'DD/MM/YYYY HH:mm')
    }
    if (_.has(req.body, 'files') && req.body['files'] != []) {
        _body.files = JSON.parse(req.body.files)
    }
    if (_.has(req.body, 'filesRecord') && req.body['filesRecord'] != []) {
        _body.filesRecord = JSON.parse(req.body.filesRecord)
    }
    if (_.has(req.body, 'customerId') && req.body.customerId) {
        _body.customerId = _.convertObjectId(req.body.customerId)
    }

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _TicketComplaint.create(_body, callback);
        }
    ], function (error, result) {
        if (result) {
            var mailBody = '';
            _async.parallel({
                customer: function (cb) {
                    _async.waterfall([
                        function (next) {
                            _Customerindex.findById(_.convertObjectId(_body.customerId)).lean().exec(next)
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
                }, ticketComplaint: function (cb) {
                    _TicketComplaint.aggregate([
                        { $match: { _id: _.convertObjectId(result._id) } },
                        { $lookup: { from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "restaurant" } },
                        { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "brands", localField: "brandId", foreignField: "_id", as: "brand" } },
                        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "provinces", localField: "provinceId", foreignField: "_id", as: "province" } },
                        { $unwind: { path: '$province', preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "complaintcategories", localField: "typeComplaintId", foreignField: "_id", as: "complaint" } },
                        { $unwind: { path: '$complaint', preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "problemcategories", localField: "problemId", foreignField: "_id", as: "problem" } },
                        { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } },
                        { $lookup: { from: "mailcomplaints", localField: "restaurantId", foreignField: "idRestaurant", as: "mailRestaurant" } },
                        { $unwind: { path: '$mailRestaurant', preserveNullAndEmptyArrays: true } },
                        {
                            $project: {
                                restaurant: "$restaurant.name",
                                brand: "$brand.name",
                                province: "$province.name",
                                complaint: "$complaint.nameComplaint",
                                problem: "$problem.nameProblem",
                                slaComplaint: "$complaint.slaComplaint",
                                slaProblem: "$problem.slaProblem",
                                channelType: 1,
                                content: 1,
                                files: 1,
                                filesRecord: 1,
                                mailRestaurant: 1
                            }
                        }
                    ], (cb))
                }

            }, function (err, data) {

                if (!err) {
                    var sla;
                    var source;
                    var files = []
                    var listMail = []
                    var sendMail = '';
                    var ccMail = ''

                    if (data.ticketComplaint[0].mailRestaurant) {
                        let mail = data.ticketComplaint[0].mailRestaurant
                        listMail.push.apply(listMail, [mail.email1, mail.email2, mail.email3, mail.email4])
                        var listMailSend = _.compact(listMail)
                        if (listMailSend.length > 0) {
                            sendMail = listMailSend[0]
                            ccMail = listMailSend.slice(1).toString()
                        }
                    }



                    if (data.ticketComplaint[0].slaComplaint && data.ticketComplaint[0].slaProblem) {
                        sla = data.ticketComplaint[0].slaProblem
                    }
                    if (!data.ticketComplaint[0].slaComplaint && data.ticketComplaint[0].slaProblem) {
                        sla = data.ticketComplaint[0].slaProblem
                    }
                    if (data.ticketComplaint[0].slaComplaint && !data.ticketComplaint[0].slaProblem) {
                        sla = data.ticketComplaint[0].slaComplaint
                    }
                    if (data.ticketComplaint[0].channelType == 1) {
                        source = 'Social Listening'
                    }
                    if (data.ticketComplaint[0].channelType == 2) {
                        source = 'Social Comment'
                    }
                    if (data.ticketComplaint[0].channelType == 3) {
                        source = 'Email survey'
                    }
                    if (data.ticketComplaint[0].channelType == 4) {
                        source = 'Email support'
                    }
                    if (data.ticketComplaint[0].channelType == 5) {
                        source = 'Hotline 19006622'
                    }
                    if (data.ticketComplaint[0].channelType == 6) {
                        source = 'Others'
                    }

                    if (_.has(data.ticketComplaint[0], 'files') && data.ticketComplaint[0].files.length > 0) {
                        data.ticketComplaint[0].files.forEach(function (item) {
                            files.push({
                                urlUpload: 'https://' + req.headers.host + '/' + item.urlUpload,
                                nameUpload: item.nameUpload
                            })
                        })
                    }
                    if (_.has(data.ticketComplaint[0], 'filesRecord') && data.ticketComplaint[0].filesRecord.length > 0) {
                        var fileRecord = data.ticketComplaint[0].filesRecord.map(function (item) {
                            return item.source
                        })
                    }

                    mailBody = templateCreate(
                        {
                            emailTitle: "Thông báo khiếu nại",
                            customer: {
                                name: data.customer[0].field_ho_ten ? data.customer[0].field_ho_ten : '',
                                phone: data.customer[0].field_so_dien_thoai,
                                email: data.customer[0].field_e_mail ? data.customer[0].field_e_mail : '',
                                province: data.customer[1] ? data.customer[1].name : '',
                            },
                            complaint: {
                                restaurant: data.ticketComplaint[0].restaurant ? data.ticketComplaint[0].restaurant : '',
                                brand: data.ticketComplaint[0].brand ? data.ticketComplaint[0].brand : '',
                                province: data.ticketComplaint[0].province ? data.ticketComplaint[0].province : '',
                                complaint: data.ticketComplaint[0].complaint ? data.ticketComplaint[0].complaint : '',
                                problem: data.ticketComplaint[0].problem ? data.ticketComplaint[0].problem : '',
                                sla: sla,
                                source: source,
                                content: data.ticketComplaint[0].content ? data.ticketComplaint[0].content : '',
                                file: files,
                                fileRecord: fileRecord,
                            }
                        }
                    )
                    _MailService.send(sendMail, ccMail, 'Thông báo khiếu nại', mailBody, [], function (e, r) {
                        console.log(e, r);
                    })
                }

            })

        }
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới khiếu nại thành công!' });
    });
}
exports.edit = function (req, res) {


    let _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107')
    let _idTicket = _.convertObjectId(req.params.complaint)

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
            _TicketComplaint.aggregate([
                {
                    $match: {
                        _id: _idTicket
                    }
                },
                {
                    $lookup: {
                        from: "complaintcategories", localField: "typeComplaintId", foreignField: "_id", as: "complaintcategories"
                    }
                },
                { $unwind: { path: '$complaintcategories', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "problemcategories", localField: "problemId", foreignField: "_id", as: "problem"
                    }
                },
                { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "customerindex", localField: "customerId", foreignField: "_id", as: "customer"
                    }
                },
                { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },

                {
                    $lookup: {
                        from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "restaurant"
                    }
                },
                { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "brands", localField: "brandId", foreignField: "_id", as: "brand"
                    }
                },
                { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "provinces", localField: "provinceId", foreignField: "_id", as: "province" } },
                { $unwind: { path: '$province', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "categories", localField: "categoryComplaintId", foreignField: "_id", as: "category" } },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "subcategories", localField: "subCategoryComplaintId", foreignField: "_id", as: "subCategory" } },
                { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "agent" } },
                { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$feedbacks', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'users',
                        localField: "feedbacks.author",
                        foreignField: "_id",
                        as: 'feedbacks.author'
                    }
                },
                {
                    $group: {
                        "_id": "$_id",
                        complaintType: { $first: "$complaintcategories.nameComplaint" },
                        problem: { $first: "$problem.nameProblem" },
                        content: { $first: "$content" },
                        agentId: { $first: "$createdBy" },
                        agentName: { $first: "$agent.displayName" },
                        restaurant: { $first: "$restaurant.name" },
                        deadline: { $first: "$deadline" },
                        brand: { $first: "$brand.name" },
                        province: { $first: "$province.name" },
                        channelType: { $first: "$channelType" },
                        status: { $first: "$status" },
                        files: { $first: "$files" },
                        filesRecord: { $first: "$filesRecord" },
                        customer: { $first: "$customer" },
                        category: { $first: "$category.category" },
                        subCategories: { $first: "$subCategory.subCategory" },
                        "feedbacks": { $push: "$feedbacks" }
                    }
                }
            ], (cb))
        },
        brands: function (cb) {
            _Brands.find({}).sort({ name: 1 }).exec(cb)
        },
        provinces: function (cb) {
            _Provinces.find({}).sort({ name: 1 }).exec(cb)
        },
        restaurants: function (cb) {
            _Restaurants.find({}).sort({ name: 1 }).exec(cb)
        },
        complaintCategory: function (cb) {
            _ComplaintCategory.find({ status: 1 }, cb)
        },
        problemCategory: function (cb) {
            _ProblemCategory.find({ status: 1 }, cb)
        },
        category: function (cb) {
            _Category.find({ status: 1 }, cb)
        },
        agent: function (cb) {
            _Users.find({}).sort({ displayName: 1 }).exec(cb)
        },
        data: function (cb) {
            _TicketComplaint.findById(_idTicket, cb)
        },
        history: function (cb) {
            _ComplaintHistory.aggregate([
                { $match: { complaintId: _idTicket } },
                {
                    $lookup: {
                        from: "brands", localField: "brandId", foreignField: "_id", as: "brand"
                    }
                },
                { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "provinces", localField: "provinceId", foreignField: "_id", as: "province" } },
                { $unwind: { path: '$province', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "restaurant"
                    }
                },
                { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "complaintcategories", localField: "typeComplaintId", foreignField: "_id", as: "complaintcategories"
                    }
                },
                { $unwind: { path: '$complaintcategories', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "problemcategories", localField: "problemId", foreignField: "_id", as: "problem"
                    }
                },
                { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "customerindex", localField: "customerId", foreignField: "_id", as: "customer"
                    }
                },
                { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "categories", localField: "categoryComplaintId", foreignField: "_id", as: "category" } },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "subcategories", localField: "subCategoryComplaintId", foreignField: "_id", as: "subCategory" } },
                { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "user" } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        brand: "$brand.name",
                        province: "$province.name",
                        restaurant: "$restaurant.name",
                        channelType: 1,
                        complaintCategory: "$complaintcategories.nameComplaint",
                        problem: "$problem.nameProblem",
                        category: "$category.category",
                        subCategory: "$subCategory.subCategory",
                        content: 1,
                        files: 1,
                        status: 1,
                        updatedBy: "$user.displayName"

                    }
                }
            ], (cb))
        },
        inforRecord: function (callback) {
            if (_.isNull(req.session.auth.company)) {
                _Users.find({}, { _id: 1, name: 1, displayName: 1 }, callback);
            } else {
                var companyId = _.convertObjectId(req.session.auth.company._id);
                _AgentGroups.find({ idParent: companyId }, { _id: 1 }, function (err, result) {
                    if (err) return callback(err, null);
                    var ag = _.pluck(result, '_id');
                    var cond = [
                        {
                            $match: {
                                $or: [
                                    { 'agentGroupLeaders.group': { $in: ag } },
                                    { 'agentGroupMembers.group': { $in: ag } },
                                    { 'companyLeaders.company': companyId }
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                displayName: 1
                            }
                        }
                    ];

                    _Users.aggregate(cond, callback);
                });
            }
        },
        isEdit: function (cb) {
            if (req.session.auth.company && req.session.auth.company.leader) {
                cb(null, true)
            }
            else if (req.session.user.accountCode && req.session.user.idAgentCisco) {
                cb(null, true)
            }
            else {
                cb(null, false)
                // _UserRestaurant.find({ idAgent: req.session.user._id }, function (err, result) {
                //     if (result.length > 0) {
                //         cb(null, false)
                //     }
                //     else {
                //         cb(null, true)
                //     }
                // })
            }

        }
    }, function (error, rs) {

        _.render(req, res, 'complaint-popup-edit', {
            title: 'Chỉnh sửa khiếu nại',
            fnInfo: dynamicCustomerInfo,
            fields: rs.cusInfo.companyProfile.fieldId,
            data: rs.data,
            ticket: rs.ticket[0],
            customer: rs.ticket[0].customer,
            complaintCategory: rs.complaintCategory,
            problemCategory: rs.problemCategory,
            category: rs.category,
            agent: rs.agent,
            brands: rs.brands,
            provinces: rs.provinces,
            restaurants: rs.restaurants,
            userId: req.session.user._id,
            history: rs.history,
            myUsers: rs.inforRecord,
            currentUser: req.session.user._id,
            isEdit: rs.isEdit,
            _url: 'https://' + req.headers.host + '/',
            plugins: [['bootstrap-select']],
        }, true, error);
    })


}

exports.update = function (req, res) {

    req.body = _.replaceMultiSpaceAndTrim(req.body);

    var validateErr = null;
    var _body = {}


    if (!_.has(req.body, 'brandId') || !req.body.brandId) {
        validateErr = new Error('Vui lòng chọn nhãn hiệu');
    }
    if (!_.has(req.body, 'provinceId') || !req.body.provinceId) {
        validateErr = new Error('Vui lòng chọn Tỉnh thành');
    }
    if (!_.has(req.body, 'restaurantId') || !req.body.restaurantId) {
        validateErr = new Error('Vui lòng chọn nhà hàng');
    }
    if (!_.has(req.body, 'channelType') || !req.body.channelType) {
        validateErr = new Error('Vui lòng chọn source');
    }
    if (!_.has(req.body, 'typeComplaintId') || !req.body.typeComplaintId) {
        validateErr = new Error('Vui lòng chọn loại khiếu nại');
    }
    if (!_.has(req.body, 'content') || !req.body.content) {
        validateErr = new Error('Vui lòng nhập nội dung khiếu nại');
    }


    _body['updatedBy'] = req.session.user._id;
    _body['updatedAt'] = new Date();

    if (_.has(req.body, 'brandId') && req.body.brandId) {
        _body.brandId = _.convertObjectId(req.body.brandId)
    }
    if (_.has(req.body, 'provinceId') && req.body.provinceId) {
        _body.provinceId = _.convertObjectId(req.body.provinceId)
    }
    if (_.has(req.body, 'restaurantId') && req.body.restaurantId) {
        _body.restaurantId = _.convertObjectId(req.body.restaurantId)
    }
    if (_.has(req.body, 'channelType') && req.body.channelType) {
        _body.channelType = req.body.channelType
    }
    if (_.has(req.body, 'typeComplaintId') && req.body.typeComplaintId) {
        _body.typeComplaintId = _.convertObjectId(req.body.typeComplaintId)
    }
    if (_.has(req.body, 'problemId') && req.body.problemId) {
        _body.problemId = _.convertObjectId(req.body.problemId)
    }
    if (_.has(req.body, 'categoryComplaintId') && req.body.categoryComplaintId) {
        _body.categoryComplaintId = _.convertObjectId(req.body.categoryComplaintId)
    }
    if (_.has(req.body, 'subCategoryComplaintId') && req.body.subCategoryComplaintId) {
        _body.subCategoryComplaintId = _.convertObjectId(req.body.subCategoryComplaintId)
    }
    if (_.has(req.body, 'content') && req.body.content) {
        _body.content = req.body.content
    }
    if (_.has(req.body, 'deadline') && req.body.deadline) {
        _body.deadline = _moment(req.body.deadline, 'DD/MM/YYYY HH:mm')
    }
    if (_.has(req.body, 'status') && req.body.status) {
        _body.status = req.body.status
    }
    if (_.has(req.body, 'files') && req.body['files'] != []) {
        _body.files = JSON.parse(req.body.files)
    }
    if (_.has(req.body, 'filesRecord') && req.body['filesRecord'] != []) {
        _body.filesRecord = JSON.parse(req.body.filesRecord)
    }


    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _TicketComplaint.findById(req.params.complaint, callback);
        },
    ], function (error, result) {
        if (result) {
            _TicketComplaint.findByIdAndUpdate(req.params.complaint, _body, function (error2, rs) {

                if (!error2) {
                    _async.parallel({
                        checkDiff: function (cb) {
                            let _hisObj = diff(JSON.parse(JSON.stringify(result)), JSON.parse(JSON.stringify(_body)))
                            cleanObject(_hisObj)
                            _hisObj.complaintId = rs._id
                            _hisObj.agentId = rs.customerId
                            _hisObj.createdBy = req.session.user._id
                            _ComplaintHistory.create(_hisObj, cb)
                        },
                        customer: function (cb) {
                            _async.waterfall([
                                function (next) {
                                    _Customerindex.findById(_.convertObjectId(rs.customerId)).lean().exec(next)
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
                        }, ticketComplaint: function (cb) {
                            _TicketComplaint.aggregate([
                                { $match: { _id: _.convertObjectId(rs._id) } },
                                { $lookup: { from: "restaurants", localField: "restaurantId", foreignField: "_id", as: "restaurant" } },
                                { $unwind: { path: '$restaurant', preserveNullAndEmptyArrays: true } },
                                { $lookup: { from: "brands", localField: "brandId", foreignField: "_id", as: "brand" } },
                                { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                                { $lookup: { from: "provinces", localField: "provinceId", foreignField: "_id", as: "province" } },
                                { $unwind: { path: '$province', preserveNullAndEmptyArrays: true } },
                                { $lookup: { from: "complaintcategories", localField: "typeComplaintId", foreignField: "_id", as: "complaint" } },
                                { $unwind: { path: '$complaint', preserveNullAndEmptyArrays: true } },
                                { $lookup: { from: "problemcategories", localField: "problemId", foreignField: "_id", as: "problem" } },
                                { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } },
                                { $lookup: { from: "mailcomplaints", localField: "restaurantId", foreignField: "idRestaurant", as: "mailRestaurant" } },
                                { $unwind: { path: '$mailRestaurant', preserveNullAndEmptyArrays: true } },
                                {
                                    $project: {
                                        restaurant: "$restaurant.name",
                                        brand: "$brand.name",
                                        province: "$province.name",
                                        complaint: "$complaint.nameComplaint",
                                        problem: "$problem.nameProblem",
                                        slaComplaint: "$complaint.slaComplaint",
                                        slaProblem: "$problem.slaProblem",
                                        channelType: 1,
                                        content: 1,
                                        files: 1,
                                        filesRecord: 1,
                                        mailRestaurant: 1
                                    }
                                }
                            ], (cb))
                        }
                    }, function (err, data) {

                        if (!err) {
                            var sla;
                            var source;
                            var files = []
                            var listMail = []

                            var sendMail = '';
                            var ccMail = ''

                            if (_.has(data.ticketComplaint[0], 'mailRestaurant') && data.ticketComplaint[0].mailRestaurant) {
                                let mail = data.ticketComplaint[0].mailRestaurant
                                listMail.push.apply(listMail, [mail.email1, mail.email2, mail.email3, mail.email4])
                                var listMailSend = _.compact(listMail)
                                if (listMailSend && listMailSend.length > 0) {
                                    sendMail = listMailSend[0]
                                    ccMail = listMailSend.slice(1).toString()
                                }
                            }


                            if (data.ticketComplaint[0].slaComplaint && data.ticketComplaint[0].slaProblem) {
                                sla = data.ticketComplaint[0].slaProblem
                            }
                            if (!data.ticketComplaint[0].slaComplaint && data.ticketComplaint[0].slaProblem) {
                                sla = data.ticketComplaint[0].slaProblem
                            }
                            if (data.ticketComplaint[0].slaComplaint && !data.ticketComplaint[0].slaProblem) {
                                sla = data.ticketComplaint[0].slaComplaint
                            }
                            if (data.ticketComplaint[0].channelType == 1) {
                                source = 'Social Listening'
                            }
                            if (data.ticketComplaint[0].channelType == 2) {
                                source = 'Social Comment'
                            }
                            if (data.ticketComplaint[0].channelType == 3) {
                                source = 'Email survey'
                            }
                            if (data.ticketComplaint[0].channelType == 4) {
                                source = 'Email support'
                            }
                            if (data.ticketComplaint[0].channelType == 5) {
                                source = 'Hotline 19006622'
                            }
                            if (data.ticketComplaint[0].channelType == 6) {
                                source = 'Others'
                            }

                            if (_.has(data.ticketComplaint[0], 'files') && data.ticketComplaint[0].files.length > 0) {
                                data.ticketComplaint[0].files.forEach(function (item) {
                                    files.push({
                                        urlUpload: 'https://' + req.headers.host + '/' + item.urlUpload,
                                        nameUpload: item.nameUpload
                                    })
                                })
                            }
                            if (_.has(data.ticketComplaint[0], 'filesRecord') && data.ticketComplaint[0].filesRecord.length > 0) {
                                var fileRecord = data.ticketComplaint[0].filesRecord.map(function (item) {
                                    return item.source
                                })
                            }

                            mailBody = templateUpdate(
                                {
                                    emailTitle: "Thông báo cập nhật khiếu nại",
                                    customer: {
                                        name: data.customer[0].field_ho_ten ? data.customer[0].field_ho_ten : '',
                                        phone: data.customer[0].field_so_dien_thoai,
                                        email: data.customer[0].field_e_mail ? data.customer[0].field_e_mail : '',
                                        province: data.customer[1] ? data.customer[1].name : '',
                                    },
                                    complaint: {
                                        restaurant: data.ticketComplaint[0].restaurant ? data.ticketComplaint[0].restaurant : '',
                                        brand: data.ticketComplaint[0].brand ? data.ticketComplaint[0].brand : '',
                                        province: data.ticketComplaint[0].province ? data.ticketComplaint[0].province : '',
                                        complaint: data.ticketComplaint[0].complaint ? data.ticketComplaint[0].complaint : '',
                                        problem: data.ticketComplaint[0].problem ? data.ticketComplaint[0].problem : '',
                                        sla: sla,
                                        source: source,
                                        content: data.ticketComplaint[0].content ? data.ticketComplaint[0].content : '',
                                        file: files,
                                        fileRecord: fileRecord,
                                    }
                                }
                            )
                            _MailService.send(sendMail, ccMail, 'Thông báo cập nhật khiếu nại', mailBody, [], function (e, r) {
                                console.log(e, r);
                            })
                        }

                    })

                }

                res.json({ code: (error2 ? 500 : 200), message: error2 ? error2.message : 'Cập nhật khiếu nại thành công!' });

            });
        }
        else {
            res.json({ code: 500, message: error.message });
        }



    });
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
            _sattr = ['readonly']
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
            _sattr = ['readonly']
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
            _sattr = ['readonly']
            break;
        case 6:
            _tag = 'div';
            _attr = { class: 'input-group' };
            _childs = [
                {
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
            _tag = 'input';
            _attr = {
                value: _val,
                class: 'form-control validate[custom[number]' + _.switch(el.isRequired, [0, 1], ['', ',required'] + ']'),
                type: 'text',
                id: 'edit_' + el.modalName,
                name: el.modalName + ':string'
            }
            _sattr = ['readonly']
            break;
    }

    return _.htmlTags([{
        tag: _tag,
        attr: _attr,
        sattr: _sattr,
        childs: _childs.length ? _childs : []
    }]);
};

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

/*!
 * Find the differences between two objects and push to a new object
 * @param  {Object} obj1 The original object
 * @param  {Object} obj2 The object to compare against it
 * @return {Object}      An object of differences between the two
 */
var diff = function (obj1, obj2) {

    // Make sure an object to compare is provided
    if (!obj2 || Object.prototype.toString.call(obj2) !== '[object Object]') {
        return obj1;
    }

    //
    // Variables
    //

    var diffs = {};
    var key;

    //
    // Methods
    //

    /**
     * Check if two arrays are equal
     * @param  {Array}   arr1 The first array
     * @param  {Array}   arr2 The second array
     * @return {Boolean}      If true, both arrays are equal
     */
    var arraysMatch = function (arr1, arr2) {

        // Check if the arrays are the same length
        if (arr1.length !== arr2.length) return false;

        // Check if all items exist and are in the same order
        for (var i = 0; i < arr1.length; i++) {
            console.log('arr1 nay', arr1[i]);
            delete arr1[i]._id
            delete arr2[i]._id
            if (!_.isEqual(arr1[i], arr2[i])) return false;
        }

        // Otherwise, return true
        return true;

    };

    /**
     * Compare two items and push non-matches to object
     * @param  {*}      item1 The first item
     * @param  {*}      item2 The second item
     * @param  {String} key   The key in our object
     */
    var compare = function (item1, item2, key) {

        // Get the object type
        var type1 = Object.prototype.toString.call(item1);
        var type2 = Object.prototype.toString.call(item2);

        // If type2 is undefined it has been removed
        if (type2 === '[object Undefined]') {
            diffs[key] = null;
            return;
        }

        // If items are different types
        if (type1 !== type2) {
            diffs[key] = item2;
            return;
        }

        // If an object, compare recursively
        if (type1 === '[object Object]') {
            var objDiff = diff(item1, item2);
            if (Object.keys(objDiff).length > 1) {
                diffs[key] = objDiff;
            }
            return;
        }

        // If an array, compare
        if (type1 === '[object Array]') {
            if (!arraysMatch(item1, item2)) {
                diffs[key] = item2;
            }
            return;
        }

        // Else if it's a function, convert to a string and compare
        // Otherwise, just compare
        if (type1 === '[object Function]') {
            if (item1.toString() !== item2.toString()) {
                diffs[key] = item2;
            }
        } else {
            if (item1 !== item2) {
                diffs[key] = item2;
            }
        }

    };


    //
    // Compare our objects
    //

    // Loop through the first object
    for (key in obj1) {
        if (obj1.hasOwnProperty(key)) {
            compare(obj1[key], obj2[key], key);
        }
    }

    // Loop through the second object and find missing items
    for (key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            if (!obj1[key] && obj1[key] !== obj2[key]) {
                diffs[key] = obj2[key];
            }
        }
    }

    // Return the object of differences
    return diffs;

};


// clean element null in object
function cleanObject(obj) {
    for (var propName in obj) {
        if (obj[propName] === null || obj[propName] === undefined) {
            delete obj[propName];
        }
    }
}

