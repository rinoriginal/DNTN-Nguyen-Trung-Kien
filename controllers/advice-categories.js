exports.index = {
    json: function (req, res) {
        res.status(200).json({ "OK": "EKO" });
    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

        var query = {};
        if (_.has(req.query, 'status') && !_.isEqual(req.query.status, '')) {
            query.status = +req.query.status;
        }
        if (_.has(req.query, 'nameAdvice') && !_.isEqual(req.query.nameAdvice, '')) {
            query.nameAdvice = { $regex: new RegExp(_.stringRegex(req.query.nameAdvice), 'i') };
        }
        let agg = _AdviceCategory.aggregate()
        agg._pipeline.push({ $sort: { status: -1 } })
        if (!_.isEmpty(query)) agg._pipeline.push({ $match: { $and: [query] } });

        _AdviceCategory.aggregatePaginate(agg, { page: page, limit: rows }, function (error, results, node, count) {

            var paginator = new pagination.SearchPaginator({
                prelink: '/advice-categories',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            _.render(req, res, 'advice-categories', {
                title: 'Quản lý loại tư vấn',
                data: results,
                userId: req.session.user._id,
                paging: paginator.getPaginationData(),
                plugins: [['bootstrap-select']],
            }, true, error);
        });
    }
}

exports.create = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;

    if (!_.has(req.body, 'nameAdvice')) {
        validateErr = new Error('Vui lòng nhập loại tư vấn');
    }
    req.body['createdBy'] = req.session.user._id;

    delete req.body.adviceId;
    req.body.type = 3
    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _AdviceCategory.create(req.body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới loại tư vấn thành công!' });
    });
};


exports.edit = function (req, res) {
    _async.parallel({
        data: function (callback) {
            _AdviceCategory.findById(req.params['advicecategory']).exec(function (err, r) {
                if (_.isNull(r)) return callback(new Error("Loại tư vấn không tồn tại hoặc đã bị xóa bỏ"), r);
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
    var adviceId = req.body.adviceId;
    delete req.body['adviceId'];
    req.body['updatedBy'] = req.session.user._id;
    req.body['updatedAt'] = new Date();

    _async.waterfall([
        function (callback) {
            _AdviceCategory.findById(adviceId, callback);
        }], function (err, data) {
            _AdviceCategory.findByIdAndUpdate(adviceId, { $set: req.body }, function (error, result) {
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
