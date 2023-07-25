exports.index = {
    json: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        let agg =_Document.aggregate();
        let _query = {}
        if(_.has(req.query,'title') && req.query.title){
            _query.title = { $regex: new RegExp(req.query.title, 'i') };
        }
        agg._pipeline.push({ $match: { type: 1 } }) //tài liệu quy trình
        if (!_.isEmpty(_query)) agg._pipeline.push({$match: _query});

        _Document.aggregatePaginate(agg, { page: page, limit: rows }, function (error, results, node, count) {
            let role = req.session.auth.role._id;
            let isRoleAgent = role == STATIC_ROLE.Agent;

            var paginator = new pagination.SearchPaginator({
                prelink: '/manage-procedure-document',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });

            res.json({
                code : error ? 500 : 200,
                data:results,
                isRoleAgent:isRoleAgent,
                paging: paginator.getPaginationData(),
            })
            
        });
    },
    html: function (req, res) {
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

        let agg = _Document.aggregate()
        // agg._pipeline.push({ $sort: { status: -1 } })

        _Document.aggregatePaginate(agg, { page: page, limit: rows }, function (error, results, node, count) {
            let role = req.session.auth.role._id;
            let isRoleAgent = role == STATIC_ROLE.Agent;

            var paginator = new pagination.SearchPaginator({
                prelink: '/manage-procedure-document',
                current: page,
                rowsPerPage: rows,
                totalResult: count
            });
            _.render(req, res, 'manage-procedure-document', {
                title: 'Quản lý tài liệu quy trình',
                data: results,
                isRoleAgent,
                userId: req.session.user._id,
                paging: paginator.getPaginationData(),
                _url: 'https://' + req.headers.host + '/',
                plugins: [['bootstrap-select']],
            }, true, error);
        });
    }
}

exports.new = function (req, res) {
    _.render(req, res, 'procedure-document-new', {
        title: 'Thêm mới tài liệu',
        _url: 'https://' + req.headers.host + '/',
    }, true)
}

exports.create = function (req, res) {
    
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;
    var _body = {}

    if (_.has(req.body, 'title') && !req.body.title ) {
        validateErr = new Error('Vui lòng nhập tiêu đề');
    }

    if (_.has(req.body, 'title') && req.body.title) {
        _body.title = req.body['title'];
    }
    if (_.has(req.body, 'content') && req.body.content) {
        _body.content = req.body['content'].replace(/\"/g, '\'');
    }
    if (_.has(req.body, 'files') && req.body['files'] != []) {
        _body.files = JSON.parse(req.body.files)
    }
    _body['createdBy'] = req.session && req.session.user ? new mongodb.ObjectId(req.session.user._id) : null;

    _body.type = 1//tài liệu quy trình

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            console.log('body',_body);
            
            _Document.create(_body, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Tạo mới tài liệu quy trình thành công!' });
    });
};


exports.edit = function (req, res) {
    _Document.findById(req.params['manageproceduredocument'], function (err, results) {
        _.render(req, res, 'procedure-document-edit', {
            title: "Chỉnh sửa tài liệu",
            data: results,
            _url: 'https://' + req.headers.host + '/',
            plugins: [['bootstrap-select'], ['bootstrap-datetimepicker']],
        }, true, null);
    });
};

exports.update = function (req, res) {
    req.body = _.replaceMultiSpaceAndTrim(req.body);
    var validateErr = null;
    var _body = {}

    if (!_.has(req.body, 'title')) {
        validateErr = new Error('Vui lòng nhập tiêu đề');
    }

    if (_.has(req.body, 'title') && req.body.title) {
        _body.title = req.body['title'];
    }
    if (_.has(req.body, 'content') && req.body.content) {
        _body.content = req.body['content'].replace(/\"/g, '\'');
    }
    if (_.has(req.body, 'files') && req.body['files'] != []) {
        _body.files = JSON.parse(req.body.files)
    }
    _body['updatedBy'] = req.session && req.session.user ? new mongodb.ObjectId(req.session.user._id) : null;

    _body.type = 1

    _async.waterfall([
        function (callback) {
            validateErr ? callback(validateErr, null) : callback(null, null);
        },
        function (r, callback) {
            _Document.findByIdAndUpdate(req.params.manageproceduredocument, { $set: _body }, callback);
        }
    ], function (error, result) {
        res.json({ code: (error ? 500 : 200), message: error ? error.message : 'Cập nhật thành công!' });
    });
};

exports.destroy = function (req, res) {
    var id = req.params.manageproceduredocument;
    _Document.findOneAndRemove(id, function (error, data) {
        res.json({ code: (error ? 500 : 200), message: error ? error : data });
    })
};

exports.show = function (req, res) {
    _Document.findById(_.convertObjectId(req.params.manageproceduredocument), (err, results) => {
        _.render(req, res, 'procedure-document-show', {
            title: "Chi tiết tài liệu",
            data: results,
            _urlUpload: 'https://' + req.headers.host + '/',
            plugins: [['bootstrap-select'], ['bootstrap-datetimepicker']],
        }, true, null);
    });
}
