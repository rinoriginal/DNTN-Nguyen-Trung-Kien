exports.index = {
    json: function (req, res) {
        
        let query = {}
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 8;
        if (_.has(req.query, 'problem') && req.query.problem) {
            query['nameProblem'] = { $regex: new RegExp(_.stringRegex(req.query.problem), 'i') }
        }
        if (_.has(req.query, 'id') && req.query.id) {
            query['complaint._id'] = _.convertObjectId(req.query.id)
        }
        let agg = _ComplaintCategory.aggregate()
        agg._pipeline.push(
            {
                $lookup: {
                    from: "complaintcategories", localField: "idComplaint", foreignField: "_id", as: "complaint"
                }
            },
            { $unwind: { path: '$complaint', preserveNullAndEmptyArrays: true } },
            { $match: { $and: [query] } }
        )

        _ProblemCategory.aggregatePaginate(agg, { page, rows }, function (error, result, pageCount, count) {
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
        if (_.has(req.query, 'complaint') && req.query.complaint) {
            query.nameComplaint = { $regex: new RegExp(_.stringRegex(req.query.complaint), 'i') }
        }
        agg.push({ $sort: { status: -1 } })
        if (!_.isEmpty(query)) agg.push({ $match: { $and: [query] } });

        _ComplaintCategory.aggregate(agg, function (error, results) {
       
            _.render(req, res, 'complaint-categories', {
                title: 'Quản lý khiếu nại',
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

    if (!_.has(req.body, 'nameComplaint')) {
        validateErr = new Error('Vui lòng nhập tên thể loại');
    }
    if (_.has(req.body, 'slaComplaint') && !_.isNumber(+req.body.slaComplaint)) {
        validateErr = new Error('Không đúng định dạng, SLA là ký tự số ');
    }
    req.body['createdBy'] = req.session.user._id;

    delete req.body.complaintId;

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _ComplaintCategory.create(req.body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Thêm mới loại khiếu nại thành công!' });
    });
};

exports.edit = function (req, res) {
    _async.parallel({
        data: function (callback) {
            _ComplaintCategory.findById(req.params.complaintcategory).exec(function (err, r) {
                if (_.isNull(r)) return callback(new Error("Thể loại khiếu nại không tồn tại hoặc đã bị xóa bỏ"), r);
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
    var _id = req.body.complaintId;
    delete req.body['complaintId'];
    req.body['updatedBy'] = req.session.user._id;
    req.body['updatedAt'] = new Date();
    if (!_.has(req.body, 'nameComplaint')) {
        validateErr = new Error('Vui lòng nhập tên thể loại');
    }
    if (_.has(req.body, 'slaComplaint') && !_.isNumber(+req.body.slaComplaint)) {
        validateErr = new Error('Không đúng định dạng, SLA là ký tự số ');
    }

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        }], function (err, data) {
            _ComplaintCategory.findByIdAndUpdate(_id, { $set: req.body }, function (error, result) {
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
    _ProblemCategory.find({ idComplaint: _.convertObjectId(req.params.complaintcategory) }).sort({ status: -1 }).exec(function (err, result) {
        res.json({ code: (err ? 500 : 200), message: err ? err.message : result })

    })
}