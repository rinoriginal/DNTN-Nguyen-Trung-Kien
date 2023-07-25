// var _TicketAdvisory = _.convertObjectId('5f740471fe7bf17a11ae90d0')
exports.index = {
    json: function (req, res) {

    },
    html: function (req, res) {
        let idRestaurant;
        idRestaurant = _.convertObjectId(req.query.idRestaurant)
        _async.parallel({
            mailcomplaint: function (cb) {
                if (idRestaurant) {
                    _MailComplaint.find({ idRestaurant: idRestaurant }).lean().exec(cb);
                } else {
                    cb()
                }
            },
        }, function (err, result) {
            _.render(req, res, 'mail-complaint', {
                mailcomplaint: result.mailcomplaint ? result.mailcomplaint[0] : null,
                idRestaurant: idRestaurant,
                title: 'Thông tin liên hệ nhà hàng',
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
            }, true);


        })
    }
}

exports.create = function (req, res) {
    // console.log(222, req.body);
    let _body = JSON.parse(req.body.data)
    // let idMailAdvisory = {};

    if (_.has(_body, 'idRestaurant') && _body['idRestaurant'] != '') {
        _body.idRestaurant = _.convertObjectId(_body.idRestaurant)
    }

    _MailComplaint.findOne({ idRestaurant: _body.idRestaurant }, {}, function (err, data) {
        if (data) {
            _body.updateBy = _.convertObjectId(req.session.user._id)
            _body.updated = new Date();
            _MailComplaint.replaceOne({ _id: data._id }, _body, function (error, result) {
                console.log(9999999, error);
                res.json({ code: (error ? 500 : 200), message: error ? error : '' });
            });
        } else {
            _body.createBy = _.convertObjectId(req.session.user._id)
            _MailComplaint.create(_body, function (error, result) {
                console.log(9999999, error);
                res.json({ code: (error ? 500 : 200), message: error ? error : '' });
            });
        }
    });
}

