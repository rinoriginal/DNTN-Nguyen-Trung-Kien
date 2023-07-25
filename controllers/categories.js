exports.index = {
    json: function (req, res) {
        let query = {}
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 8;
        if (_.has(req.query, 'searchSubCategory') && req.query.searchSubCategory) {
            query['subCategory'] = { $regex: new RegExp(_.stringRegex(req.query.searchSubCategory), 'i') }
        }
        if (_.has(req.query, 'id') && req.query.id) {
            query['category._id'] = _.convertObjectId(req.query.id)
        }
        let agg = _Category.aggregate()
        agg._pipeline.push(
            {
                $lookup: {
                    from: "categories", localField: "idCategory", foreignField: "_id", as: "category"
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            { $match: { $and: [query] } }
        )

        _SubCategory.aggregatePaginate(agg, { page, rows }, function (error, result, pageCount, count) {
            res.json({
                code: (error ? 500 : 200),
                message: error ? error.message : result,
            })
        })



    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? Number(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? Number(req.query.rows) : 8;

        let agg = [];
        var query = {}

        if (_.has(req.query, 'category') && req.query.category) {
            query.category = { $regex: new RegExp(_.stringRegex(req.query.category), 'i') }
        }
        agg.push({ $sort: { status: -1 } })
        if (!_.isEmpty(query)) agg.push({ $match: { $and: [query] } });

        _Category.aggregate(agg, function (error, results) {

            _.render(req, res, 'categories', {
                title: 'Quản lý danh mục',
                data: results,
                userId: req.session.user._id,
                plugins: [['bootstrap-select']],
            }, true, error);
        });

    }
}

exports.create = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);

    var validateErr = null;

    if (!_.has(req.body, 'category')) {
        validateErr = new Error('Vui lòng nhập tên danh mục');
    }
    req.body['createdBy'] = req.session.user._id;

    delete req.body.categoryId;

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _Category.create(req.body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới danh mục thành công!' });
    });
};

exports.edit = function (req, res) {

    _async.parallel({
        data: function (callback) {
            _Category.findById(req.params.category).exec(function (err, r) {
                if (_.isNull(r)) return callback(new Error("Danh mục không tồn tại hoặc đã bị xóa bỏ"), r);
                return callback(err, r);
            });
        }
    },
        function (err, results) {
            res.json({ code: err ? 500 : 200, message: err ? err.message : 'OK', data: results.data });
        });

};

exports.update = function (req, res) {

    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;
    var _id = req.body.categoryId;
    delete req.body['categoryId'];
    req.body['updatedBy'] = req.session.user._id;
    req.body['updatedAt'] = new Date();
    console.log('req body', req.body);

    _async.waterfall([
        function (callback) {
            _Category.findById(_id, callback);
        }], function (err, data) {
            _Category.findByIdAndUpdate(_id, { $set: req.body }, function (error, result) {
                console.log('result', result);

                res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Cập nhật thành công!', data: result });
            });
        })
};

exports.destroy = function (req, res) {
    var productId = req.params.product;
    _Product.findByIdAndUpdate(productId, { $set: { isDeleted: 1 } }, { new: true }, function (error, data) {
        res.json({ code: (error ? 500 : 200), message: error ? error : data });
    })
};
exports.show = function (req, res) {
    _SubCategory.find({ idCategory: _.convertObjectId(req.params.category) }).sort({ status: -1 }).exec(function (err, result) {
        res.json({ code: (err ? 500 : 200), message: err ? err.message : result })

    })
}