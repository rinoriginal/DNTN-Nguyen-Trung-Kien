// var _TicketAdvisory = _.convertObjectId('5f740471fe7bf17a11ae90d0')
exports.index = {
    json: function (req, res) {

    },
    html: function (req, res) {


        _async.parallel({

            mailadvisory: function (cb) {
                _MailAdvisory.find({}).lean().exec(cb);
            },

        }, function (err, result) {
            _.render(req, res, 'mail-advisory', {
                mailadvisory: result.mailadvisory[0],
                title: 'Email tiếp nhận tư vấn',
                plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], 'fileinput']
            }, true);


        })
    }
}

exports.create = function (req, res) {
    // console.log(222, req.body);
    let _body = JSON.parse(req.body.data)
    // let idMailAdvisory = {};
    // if (_.has(req.body, idMailAdvisory)) idMailAdvisory = { _id: _.convertObjectId(JSON.parse(req.body.idMailAdvisory)) }
    var dataInsert = {}
    if (_.has(_body, 'emails') ) {
        dataInsert.emails = _body.emails
    }
    if (_.has(_body, 'note') ) {
        dataInsert.note = _body.note
    }

    _MailAdvisory.findOne( {} , { _id: 1 }, function (err, data) {
        if (data) {
            dataInsert.updateBy = _.convertObjectId(req.session.user._id)
            dataInsert.updated = new Date();
            _MailAdvisory.replaceOne({ _id: data._id }, dataInsert, function (error, result) {
                console.log(9999999, error);
                res.json({ code: (error ? 500 : 200), message: error ? error : '' });
            });
        } else {
            dataInsert.createBy = _.convertObjectId(req.session.user._id)
            _MailAdvisory.create(dataInsert, function (error, result) {
                console.log(9999999, error);
                res.json({ code: (error ? 500 : 200), message: error ? error : '' });
            });
        }
    });
}

