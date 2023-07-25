const { RESTAURANTS_CONST } = require(path.join(_rootPath, 'helpers', 'constants', 'restaurants.const.js'))
const { TYPE_AREA } = require(path.join(_rootPath, 'helpers', 'constants', 'provinces.const.js'))
const PROVINCES = require(path.join(_rootPath, 'helpers', 'constants', 'provinces.const.js'))

exports.index = {
    json: function (req, res) {
        if (_.has(req.query, 'modal')) {
            var query = {};
            if (typeof req.query.idBrand != 'string' || typeof req.query.idProvince != 'string') {
                var idBrand = _.convertArrObjectId(req.query.idBrand);
                var idProvince = _.convertArrObjectId(req.query.idProvince);
                if (!idBrand || !idProvince) return res.json({ code: 400, message: "Thiếu " + (!idBrand ? "nhãn hiệu" : "tỉnh thành") });
                // query['idBrand.$in'] = idBrand;
                // query['idProvince.$in'] = idProvince;
                query.$and = [
                    { 'idBrand': { '$in': idBrand } },
                    { 'idProvince': { '$in': idProvince } }
                ]
            } else {
                var idBrand = _.convertObjectId(req.query.idBrand);
                var idProvince = _.convertObjectId(req.query.idProvince);
                if (!idBrand || !idProvince) return res.json({ code: 400, message: "Thiếu " + (!idBrand ? "nhãn hiệu" : "tỉnh thành") });
                query.idBrand = idBrand;
                query.idProvince = idProvince;
            }

            _Restaurants.find(query)
                .populate({
                    path: 'idBrand',
                    model: _Brands,
                    select: 'name _id',
                })
                .populate({
                    path: 'idProvince',
                    model: _Provinces,
                    select: 'typeArea name _id'
                }).exec((err, result) => {
                    if (err) res.json({ code: 500, message: "fail" });
                    else res.json({ code: 200, message: result });
                });
        } else {
            var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

            let agg = bindAgg(req, res)
            _UserRestaurant.aggregatePaginate(_UserRestaurant.aggregate(agg), { page: page, limit: rows }, function (error, results, node, count) {
                var paginator = new pagination.SearchPaginator({
                    prelink: '/user-restaurant',
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
        }
    },
    html: function (req, res) {
        _async.parallel({
            agent: function (cb) {
                _Users.find({}, { displayName: 1 }).exec(cb)
            },
            brands: function (cb) {
                _Brands.find({}).sort({ name: 1 }).exec(cb)
            },
            provinces: function (cb) {
                _Provinces.find({}).sort({ name: 1 }).exec(cb)
            },
            restaurants: function (cb) {
                _Restaurants.find({}).sort({ name: 1 }).exec(cb)
            }
        }, function (error, rs) {

            _.render(req, res, 'user-restaurant', {
                title: 'Quản lý user - nhà hàng',
                SBU: Object.keys(RESTAURANTS_CONST).map(i => RESTAURANTS_CONST[i])[0],
                areas: Object.keys(TYPE_AREA).map(i => TYPE_AREA[i]),
                areasProvinces: PROVINCES,
                agent: rs.agent,
                brands: rs.brands,
                provinces: rs.provinces,
                restaurants: rs.restaurants,
                // userId: req.session.user._id,
                plugins: [['bootstrap-select']],
            }, true, error);
        })


    }
}

exports.create = function (req, res) {
    var body = JSON.parse(req.body.data);
    _async.eachSeries(body.agent, function (el, callback) {
        _async.waterfall([
            function (cb) {
                _UserRestaurant.findOne({
                    idAgent: _.convertObjectId(el),
                    idRestaurant: _.convertObjectId(body.restaurant)
                }, function (err, rs) {
                    if (!err) cb(null, rs);
                })
            }
        ], function (err, result) {
            console.log(11111, result);
            if (!result) {
                _UserRestaurant.create({
                    idAgent: _.convertObjectId(el),
                    idRestaurant: _.convertObjectId(body.restaurant),
                    status: 1,
                }, function (err1, result1) {
                    callback();
                })
            } else {
                callback();
            }
        })
    }, function (error) {
        res.json({ code: error ? 500 : 200, message: error ? error : '' });
    })
}

exports.edit = function (req, res) {
    var _idEdit = _.convertObjectId(req.params.userrestaurant)
    var _idBrand = _.convertObjectId(req.query.idBrand)
    var _idProvince = _.convertObjectId(req.query.idProvince)
    var query = {};
    query.idBrand = _idBrand;
    query.idProvince = _idProvince;
    _async.parallel({
        restaurants: function (cb) {
            _Restaurants.find(query)
                .populate({
                    path: 'idBrand',
                    model: _Brands,
                    select: 'name _id',
                })
                .populate({
                    path: 'idProvince',
                    model: _Provinces,
                    select: 'typeArea name _id'
                }).exec((err, result) => {
                    cb(err, result)
                });
        },
        detail: function (cb) {
            _UserRestaurant.aggregate([
                { $match: { _id: _idEdit } },
                {
                    $lookup: {
                        from: "restaurants", localField: "idRestaurant", foreignField: "_id", as: "idRestaurant"
                    }
                },
                { $unwind: { path: '$idRestaurant', preserveNullAndEmptyArrays: true } },
            ], cb)
        }
    }, function (error, rs) {
        res.json({
            code: error ? 500 : 200, message: error ? error : '',
            restaurants: error ? null : rs.restaurants,
            detail: error ? null : rs.detail[0],
        });
    })
}

exports.update = function (req, res) {
    var body = JSON.parse(req.body.data);
    var idUserRestaurant = _.convertObjectId(req.params.userrestaurant);
    var dataUpdate = {}
    if (_.has(body, 'restaurant') && body['restaurant'] != '') {
        dataUpdate.idRestaurant = _.convertObjectId(body.restaurant)
    }
    dataUpdate.updated = new Date();
    _async.waterfall([
        function (cb) {
            _UserRestaurant.findOne({
                idAgent: _.convertObjectId(body.agent),
                idRestaurant: _.convertObjectId(body.restaurant)
            }, function (err, rs) {
                if (!err) cb(null, rs);
            })
        },
        function (rs, cb) {
            if (rs) {
                cb()
            } else {
                _UserRestaurant.findOne({
                    _id: idUserRestaurant
                }, cb)
            }
        }
    ], function (err, result) {
        if (result) {
            _UserRestaurant.replaceOne({ _id: idUserRestaurant }, dataUpdate, function (error, result) {
                res.json({ code: error ? 500 : 200, message: error ? error : '', });
            })
        } else {
            res.json({ code: err ? 500 : 200, message: err ? err : 'Dữ liệu đã tồn tại!', });
        }
    })
}

exports.destroy = function (req, res) {
    console.log(111111);
    var idUserRestaurant = _.convertObjectId(req.params.userrestaurant);
    _UserRestaurant.deleteOne({ _id: idUserRestaurant }, function (err, result) {
        if (err) res.json({ code: 500, message: "fail" });
        else res.json({ code: 200, message: result });
    });
}

function bindAgg(req, res) {
    let query = {}
    let match = {}
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

    if (_.has(req.query, 'idAgent') && req.query.idAgent) {
        query['idAgent'] = { $in: _.arrayObjectId(req.query.idAgent) }
    }
    if (_.has(req.query, 'idRestaurant') && req.query.idRestaurant) {
        query['idRestaurant'] = { $in: _.arrayObjectId(req.query.idRestaurant) }
    }
    if (_.has(req.query, 'idBrand') && req.query.idBrand) {
        match['idRestaurant.idBrand'] = { $in: _.arrayObjectId(req.query.idBrand) }
    }
    if (_.has(req.query, 'idProvince') && req.query.idProvince) {
        match['idRestaurant.idProvince'] = { $in: _.arrayObjectId(req.query.idProvince) }
    }

    let aggs = [
        {
            $match: query
        },
        {
            $lookup: {
                from: "users", localField: "idAgent", foreignField: "_id", as: "idAgent"
            }
        },
        { $unwind: { path: '$idAgent', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "restaurants", localField: "idRestaurant", foreignField: "_id", as: "idRestaurant"
            }
        },
        { $unwind: { path: '$idRestaurant', preserveNullAndEmptyArrays: true } },
        {
            $match: match
        },
        {
            $project: {
                idAgent: 1,
                idRestaurant: 1,
                status: 1,
                created: 1,
                updated: 1,
                createBy: 1,
                updateBy: 1,
                brand: "$idRestaurant.idBrand",
                province: "$idRestaurant.idProvince"
            }
        },
        {
            $lookup: {
                from: "brands", localField: "brand", foreignField: "_id", as: "brand"
            }
        },
        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "provinces", localField: "province", foreignField: "_id", as: "province"
            }
        },
        { $unwind: { path: '$province', preserveNullAndEmptyArrays: true } },
        { $sort: { created: -1 } }
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