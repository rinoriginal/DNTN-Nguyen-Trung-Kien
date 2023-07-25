exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') && !_.isNaN(parseInt(req.query.page)) ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        _async.waterfall([
            function (cb) {
                bindAgg(req, cb)
            }
        ], function (err, rs) {
            _TicketComplaint.aggregatePaginate(_TicketComplaint.aggregate(rs), { page: page, limit: rows }, function (error, results, node, count) {

                var paginator = new pagination.SearchPaginator({
                    prelink: '/manage-ticket-complaint',
                    current: page,
                    rowsPerPage: rows,
                    totalResult: count
                });
                res.json({
                    code: error ? 500 : 200,
                    data: results,
                    paging: paginator.getPaginationData()
                });
            })
        })



    },
    html: function (req, res) {
        let idCustomer;
        if (_.has(req.query, 'idCustomer') && req.query.idCustomer) {
            idCustomer = req.query.idCustomer
        }

        _async.parallel({
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

            _.render(req, res, 'manage-ticket-complaint', {
                title: 'Quản lý danh sách khiếu nại',
                complaintCategory: rs.complaintCategory,
                problemCategory: rs.problemCategory,
                agent: rs.agent,
                brands: rs.brands,
                provinces: rs.provinces,
                idCustomer: idCustomer,
                restaurants: rs.restaurants,
                userId: req.session.user._id,
                isEdit: rs.isEdit,
                plugins: [['bootstrap-select']],
            }, true, error);
        })


    }
}


exports.edit = function (req, res) {


    let _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107')
    let _idTicket = _.convertObjectId(req.params.manageticketcomplaint)

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
                        updatedBy: "$user.displayName",
                        created: 1

                    }
                },
                { $sort: { created: -1 } }
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

        _.render(req, res, 'complaint-edit', {
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
            _url: 'https://' + req.headers.host + '/',
            isEdit: rs.isEdit,
            plugins: [['bootstrap-select']],
        }, true, error);
    })


}

exports.new = function (req, res) {
    var _idCompany;
    var _idCustomer;

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
        _.render(req, res, 'complaint', {
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
            plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
        }, true);
    })
};

exports.update = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);

    var attachment = [];
    var list = [];
    var body = _.compact(req.body.feedback)

    var feedback = jsonSafe(body);
    if (feedback === '') {
        feedback = undefined;
    }
    if (_.has(req.body, 'files') && req.body.files.length > 0) {

        const newList = JSON.parse(req.body.files).map(el => {
            return el.urlUpload;
        })
        _TicketComplaint.findByIdAndUpdate(
            req.params['manageticketcomplaint'],
            {
                $push: {
                    feedbacks: {
                        author: new mongodb.ObjectId(req.session.user._id),
                        content: feedback,
                        time: _moment().toISOString(),
                        attachments: newList
                    }
                }
            }, { new: true }, function (err, r) {
                res.json({ code: (err ? 500 : 200), message: err ? err.message : "OK" });
            })
    } else {
        _TicketComplaint.findByIdAndUpdate(req.params['manageticketcomplaint']
            , {
                $push: {
                    feedbacks: {
                        author: new mongodb.ObjectId(req.session.user._id),
                        content: feedback,
                        time: _moment().toISOString(),
                    }
                }
            }
            , { new: true }
            , function (err, r) {
                res.json({ code: (err ? 500 : 200), message: err ? err.message : "OK" });
            })
    }
};

exports.destroy = function (req, res) {
    var productId = req.params.product;
    _Product.findByIdAndUpdate(productId, { $set: { isDeleted: 1 } }, { new: true }, function (error, data) {
        res.json({ code: (error ? 500 : 200), message: error ? error : data });
    })
};
exports.show = function (req, res) {
    let _idCompany = _.convertObjectId('5f69d368cb817d0c097e9107')
    let _idTicket = _.convertObjectId(req.params.manageticketcomplaint)
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
                {
                    $project: {
                        complaintType: "$complaintcategories.nameComplaint",
                        problem: "$problem.nameProblem",
                        content: 1,
                        agentId: "$createdBy",
                        restaurant: "$restaurant.name",
                        deadline: 1,
                        brand: "$brand.name",
                        province: "$province.name",
                        channelType: 1,
                        status: 1,
                        files: 1,
                        customer: 1,
                        category: "$category.category",
                        subCategories: "$subCategory.subCategory"
                    }
                }
            ], (cb))
        }
    }, function (err, result) {
        _.render(req, res, 'complaint-detail', {
            fnInfo: dynamicCustomerInfo,
            fields: result.cusInfo.companyProfile.fieldId,
            data: result.ticket[0],
            title: 'Chi tiết phiếu khiếu nại',
            plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['bootstrap-datetimepicker'], 'fileinput']
        }, true);
    })

}

function bindAgg(req, callback) {

    let query = {}
    let matchCustomer = {}
    var aggs = []
    // if(_.has(req.query,'idCustomer') && req.query.idCustomer){
    //     query.customerId = _.convertObjectId(req.query.idCustomer)
    // }
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
    if (_.has(req.query, 'deadline') && req.query.deadline) {
        var _d1 = _moment(req.query.deadline.split(' - ')[0], 'DD/MM/YYYY');
        var _d2 = req.query.deadline.split(' - ')[1] ? _moment(req.query.deadline.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

        var startDayDeadline = (_d1._d < _d2._d) ? _d1 : _d2;
        var endDayDeadline = (_d1._d < _d2._d) ? _d2 : _d1;
        startDayDeadline = startDayDeadline.startOf('day')._d;
        endDayDeadline = endDayDeadline.endOf('day')._d;
        query.deadline = {
            $gte: startDayDeadline, $lt: endDayDeadline
        }
    }
    if (_.has(req.query, 'complaintTypeId') && req.query.complaintTypeId) {
        query.complaintTypeId = { $in: _.arrayObjectId(req.query.complaintTypeId) }
    }
    if (_.has(req.query, 'problemId') && req.query.problemId) {
        query.problemId = { $in: _.arrayObjectId(req.query.problemId) }
    }
    if (_.has(req.query, 'agentId') && req.query.agentId) {
        query.agentId = { $in: _.arrayObjectId(req.query.agentId) }
    }
    if (_.has(req.query, 'status') && req.query.status) {
        let arrStatus = req.query.status.map(function (item) {
            return +item
        })
        query.status = { $in: arrStatus }
    }
    if (_.has(req.query, 'brand') && req.query.brand) {
        query.brand = { $in: _.arrayObjectId(req.query.brand) }
    }
    if (_.has(req.query, 'provinceId') && req.query.provinceId) {
        query.provinceId = { $in: _.arrayObjectId(req.query.provinceId) }
    }
    if (_.has(req.query, 'restaurantId') && req.query.restaurantId) {
        query.restaurantId = { $in: _.arrayObjectId(req.query.restaurantId) }
    }
    if (_.has(req.query, 'customerPhone') && req.query.customerPhone) {
        query.customerPhone = { $regex: new RegExp(_.stringRegex(req.query.customerPhone), 'i') }
    }
    if (_.has(req.query, 'customerName') && req.query.customerName) {
        query.customerName = { $regex: new RegExp(_.stringRegex(req.query.customerName), 'i') }
    }
    if (_.has(req.query, 'content') && req.query.content) {
        query.content = { $regex: new RegExp(_.stringRegex(req.query.content), 'i') }
    }
    if (_.has(req.query, 'customerId') && req.query.customerId) {
        matchCustomer.customerId = _.convertObjectId(req.query.customerId)
    }
    _async.waterfall([
        function (cb) {
            checkPermission(req, aggs, cb)
        }
    ], function (error, aggs) {

        aggs.push(
            { $match: matchCustomer },
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
                    from: "users", localField: "createdBy", foreignField: "_id", as: "agent"
                }
            },
            { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
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
            {
                $project: {
                    complaintType: "$complaintcategories.nameComplaint",
                    complaintTypeId: "$complaintcategories._id",
                    problem: "$problem.nameProblem",
                    problemId: "$problem._id",
                    content: 1,
                    customerName: "$customer.field_ho_ten",
                    customerPhone: "$customer.field_so_dien_thoai",
                    agent: "$agent.displayName",
                    agentId: "$createdBy",
                    restaurant: "$restaurant.name",
                    created: 1,
                    deadline: 1,
                    brand: "$brand._id",
                    provinceId: 1,
                    restaurantId: 1,
                    status: 1,
                    slaComplaint: "$complaintcategories.slaComplaint",
                    slaProblem: "$problem.slaProblem"
                }
            },
            { $sort: { created: -1 } },
            {
                $match: query
            }
        )

        callback(null, aggs);

    })



}

function checkPermission(req, aggs, callback) {
    if (req.session.auth.company && req.session.auth.company.leader) {
        callback(null, aggs)
    }
    else if (req.session.user.accountCode && req.session.user.idAgentCisco) {
        callback(null, aggs)
    }
    else {
        _UserRestaurant.find({ idAgent: req.session.user._id }, function (err, result) {
            if (result) {
                let listRestaurant = result.map(function (item) {
                    return item.idRestaurant
                })
                aggs.push({ $match: { restaurantId: { $in: _.convertArrObjectId(listRestaurant) } } })
                callback(null, aggs)
            }
            else {
                callback(null, aggs)
            }
        })
    }

}
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

function jsonSafe(str) {
    if (typeof (str) == 'string') {
        string = str.trim().replace(/\t+/g, ' ');
        string = string.replace(/\t/g, ' ').replace(/(?:\r\n|\r|\n|-|'|"| )/g, ' ').replace(/\s\s+/g, ' ').replace(/\s+/g, ' ').replace(/	/g, ' ');
        return string;
    } else {
        return str;
    }
}
