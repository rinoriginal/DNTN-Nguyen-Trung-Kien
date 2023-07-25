exports.index = {
    json: function (req, res) {

    },
    html: function (req, res) {
        var idFile = _.convertObjectId(req.query.idFile)
        _async.parallel({
            _url: function (cb) {
                if (idFile) {
                    _FileManager.findById(idFile).lean().exec(cb);
                } else {
                    cb()
                }
            }
        }, function (err, data) {
            let _url = 'https://' + req.headers.host + '/' + data._url.url
            _.render(req, res, 'view-upload', {
                title: 'Quản lý phiếu tư vấn',
                _url: _url,
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
            }, true, err);
        })

    }
}
