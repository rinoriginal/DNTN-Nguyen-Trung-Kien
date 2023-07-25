const { RESTAURANTS_CONST } = require(path.join(_rootPath, 'helpers', 'constants', 'restaurants.const.js'))
const { TYPE_AREA } = require(path.join(_rootPath, 'helpers', 'constants', 'provinces.const.js'))
const PROVINCES = require(path.join(_rootPath, 'helpers', 'constants', 'provinces.const.js'))

exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

        let agg = bindAgg(req, res)
        _TicketComplaint.aggregatePaginate(_TicketComplaint.aggregate(agg), { page: page, limit: rows }, function (error, results, node, count) {

            var paginator = new pagination.SearchPaginator({
                prelink: '/report-handle-complaint',
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
    },
    html: function (req, res) {


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
            }
        }, function (error, rs) {
            _.render(req, res, 'report-handle-complaint', {
                title: 'Quản lý danh sách khiếu nại',
                complaintCategory: rs.complaintCategory,
                problemCategory: rs.problemCategory,
                SBU: Object.keys(RESTAURANTS_CONST).map(i => RESTAURANTS_CONST[i])[0],
                areas: Object.keys(TYPE_AREA).map(i => TYPE_AREA[i]),
                areasProvinces: PROVINCES,
                agent: rs.agent,
                brands: rs.brands,
                provinces: rs.provinces,
                restaurants: rs.restaurants,
                userId: req.session.user._id,
                plugins: [['bootstrap-select']],
            }, true, error);
        })


    }
}

function bindAgg(req, res) {

    let query = {}
    let matchCustomer = {}
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

        var startDay = (_d1._d < _d2._d) ? _d1 : _d2;
        var endDay = (_d1._d < _d2._d) ? _d2 : _d1;
        startDay = startDay.startOf('day')._d;
        endDay = endDay.endOf('day')._d;
        query.deadline = {
            $gte: startDay, $lt: endDay
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
        query['brand._id'] = { $in: _.arrayObjectId(req.query.brand) }
    }
    if (_.has(req.query, 'provinceId') && req.query.provinceId) {
        query.provinceId = { $in: _.arrayObjectId(req.query.provinceId) }
    }
    if (_.has(req.query, 'restaurantId') && req.query.restaurantId) {
        query.restaurantId = { $in: _.arrayObjectId(req.query.restaurantId) }
    }
    if (_.has(req.query, 'channelType') && req.query.channelType) {
        query.channelType = { $in: req.query.channelType }
    }
    if (_.has(req.query, 'tag') && req.query.tag) {
        query.tag = { $in: req.query.tag }
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
    let aggs = [
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
            $lookup: {
                from: "provinces", localField: "provinceId", foreignField: "_id", as: "provinceId"
            }
        },
        { $unwind: { path: '$provinceId', preserveNullAndEmptyArrays: true } },
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
                tag: "$restaurant.tag",
                created: 1,
                deadline: 1,
                brand: 1,
                provinceId: "$provinceId.name",
                restaurantId: 1,
                status: 1,
                channelType: 1
            }
        },
        { $sort: { created: -1 } },
        {
            $match: query
        }
    ];

    return aggs;
}

function jsonSafe(str) {
    if (typeof (str) == 'string') {
        string = str.trim().replace(/\t+/g, ' ');
        string = string.replace(/\t/g, ' ').replace(/(?:\r\n|\r|\n|-|'|"| )/g, ' ').replace(/\s\s+/g, ' ').replace(/\s+/g, ' ').replace(/	/g, ' ');
        return string;
    } else {
        return str;
    }
}