exports.index = {
    json: function (req, res) {
        //_Router.find({_id: {$ne: _rootMenu._id.toString()}}, '-v').exec(function (error, m) {
        //    res.json(m);
        //});
        if (req.query.hasOwnProperty('parent') && req.query.parent == 'true') {
            findParents(_rootMenu, [], function (xx) {
                res.json(xx);
            });
        } else {
            var _result = { _id: _rootMenu._id, name: _rootMenu.name, children: [], list: [{ key: 'Root', val: _rootMenu._id }] };
            findChilds(_result.list, _rootMenu, function (arr) {
                _result.children = arr;
                _result.children.sort(_.dynamicSort('weight'));
                res.json(_result);
            });
        }
    },
    html: function (req, res) {
        _Signature.find({}, function (er, result) {
            req.body['created'] = _moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
            _ServicesMail.find({}, function (err, resp) {
                _.render(req, res, 'signature', { title: 'Quản trị cấu hình chữ ký', service: resp, signatureIndex: result, plugins: ['jquery-ui', ['ckeditor'], ['bootstrap-select'], ['mrblack-table'], 'mockjax', ['bootstrap-editable']] }, true);

            })
        })

    }
}
exports.create = function (req, res) {
    console.log(31, req.params)
    _Signature.create(req.body, function (error, sig) {
        if (error) res.json("error")
        else res.json("done")
    })
};
exports.update = function (req, res) {
    if (!!req.body) req.body['active'] = (req.body['active'] == 'true' ? true : false);
    _Signature.findByIdAndUpdate(req.params.signature, req.body, { new: true, upsert: false }, function (error, m) {
        res.json({ code: error ? 500 : 200, message: error ? error : 'Ok' });
    });
}
exports.destroy = function (req, res) {
    _Signature.remove(req.params.signature, function (error, group) {
        if (error) res.json('Đã có lỗi xảy ra')
        else res.json('Xóa bỏ thành công!')

    });
}
