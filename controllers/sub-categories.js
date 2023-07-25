exports.index = {
    json: function (req, res) {
        let query = {};
        if (!_.has(req.query, 'idCategory') && req.query.idCategory) return res.json({ code: 400, message: "Chọn loại khiếu nại" });
        query.idCategory = _.convertObjectId(req.query.idCategory);
        query.status = 1
        _SubCategory.find(query, function (err, result) {
            if (err) res.json({ code: 500, message: "fail" });
            else res.json({ code: 200, message: result });
        })
    }
}
exports.create = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;

    if (!_.has(req.body, 'subCategory')) {
        validateErr = new Error('Vui lòng nhập tên danh mục con');
    }
    if (!_.has(req.body, 'idCategory') && req.body.idCategory) {
        validateErr = new Error('Vui lòng chọn danh mục');
    }
    req.body['createdBy'] = req.session.user._id;

    delete req.body.subCategoryId;

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _SubCategory.create(req.body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới danh mục con thành công!',data: result  });
    });
};


exports.edit = function (req, res) {

    req.params = _.replaceMultiSpaceAndTrim(req.params)
    _async.parallel({
        data: function (callback) {
            _SubCategory.findById(req.params.subcategory).exec(function (err, r) {

                if (_.isNull(r)) return callback(new Error("Danh mục con không tồn tại hoặc đã bị xóa bỏ"), r);
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
    var _id = req.body.subCategoryId;
    delete req.body['subCategoryId'];
    req.body['updatedBy'] = req.session.user._id;
    req.body['updatedAt'] = new Date();

    _async.waterfall([
        function (callback) {
            _SubCategory.findById(_id, callback);
        }], function (err, data) {
            _SubCategory.findByIdAndUpdate(_id, { $set: req.body }, function (error, result) {
                res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Cập nhật thành công!', data: result });
            });
        })
};
exports.show = function (req, res) {
    _SubCategory.find({ idCategory: _.convertObjectId(req.params.complaintcategory) }, function (err, result) {
        res.json({ code: (err ? 500 : 200), message: err ? err.message : result })

    })
}