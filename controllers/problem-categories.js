exports.index = {
    json: function (req, res) {
        let query = {};
        if (!_.has(req.query, 'idComplaint') && req.query.idComplaint) return res.json({ code: 400, message: "Chọn loại khiếu nại" });
        query.idComplaint = _.convertObjectId(req.query.idComplaint);
        query.status = 1
        _ProblemCategory.find(query, function (err, result) {
            if (err) res.json({ code: 500, message: "fail" });
            else res.json({ code: 200, message: result });
        })
    }
}
exports.create = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;

    if (!_.has(req.body, 'nameProblem')) {
        validateErr = new Error('Vui lòng nhập tên vấn đề');
    }
    if (!_.has(req.body, 'slaProblem')) {
        validateErr = new Error('Vui lòng nhập SLA vấn đề');
    }
    if (_.has(req.body, 'slaProblem') && !_.isNumber(+req.body.slaProblem)) {
        validateErr = new Error('Không đúng định dạng, SLA là ký tự số ');
    }
    if (!_.has(req.body, 'idComplaint') && req.body.idComplaint) {
        validateErr = new Error('Vui lòng chọn loại khiếu nại');
    }
    req.body['createdBy'] = req.session.user._id;

    // delete req.body.productId;

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _ProblemCategory.create(req.body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới vấn đề thành công!',data:result });
    });
};


exports.edit = function (req, res) {
    req.params = _.replaceMultiSpaceAndTrim(req.params)
    _async.parallel({
        data: function (callback) {
            _ProblemCategory.findById(req.params.problemcategory).exec(function (err, r) {

                if (_.isNull(r)) return callback(new Error("Vấn đề khiếu nại không tồn tại hoặc đã bị xóa bỏ"), r);
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
    var _id = req.body.problemId;
    delete req.body['problemId'];
    req.body['updatedBy'] = req.session.user._id;
    req.body['updatedAt'] = new Date();
    if (!_.has(req.body, 'nameProblem')) {
        validateErr = new Error('Vui lòng nhập tên vấn đề');
    }
    if (!_.has(req.body, 'slaProblem')) {
        validateErr = new Error('Vui lòng nhập SLA vấn đề');
    }
    if (_.has(req.body, 'slaProblem') && !_.isNumber(+req.body.slaProblem)) {
        validateErr = new Error('Không đúng định dạng, SLA là ký tự số ');
    }
    if (!_.has(req.body, 'idComplaint') && req.body.idComplaint) {
        validateErr = new Error('Vui lòng chọn loại khiếu nại');
    }
    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        }], function (err, data) {
            _ProblemCategory.findByIdAndUpdate(_id, { $set: req.body }, function (error, result) {
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
    _ProblemCategory.find({ idComplaint: _.convertObjectId(req.params.complaintcategory) }, function (err, result) {
        res.json({ code: (err ? 500 : 200), message: err ? err.message : result })

    })
}