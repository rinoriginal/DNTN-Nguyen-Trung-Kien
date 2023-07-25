
// Đang code
exports.index = function (req, res) {
    if (!req.session || !_.has(req.session, 'user') || !req['session']['user']) {
        return res.json({ total: 0, rows: [] });
    }

    var page = (_.has(req.query, 'page') && !_.isNull(req.query.page)) ? req.query.page : 1;
    var rows = (_.has(req.query, 'per_page') && !_.isNull(req.query.per_page)) ? req.query.per_page : 10;

    var _aggs = [];
    var _results = [];
    var _count = 0;

    _async.waterfall([
        next => {
            _aggs.push({ $match: { user_id: req.session.user._id, } });
            if (_.has(req.query, 'from')) _aggs.push({ $match: { emails_spam: { $regex: new RegExp(_.stringRegex(req.query['from']), 'i') } } });
            if (_.has(req.query, 'sort')) _aggs.push({ $sort: _.cleanSort(req.query, '') });

            _aggs.push({
                $project: {
                    _id: 1,
                    emails_spam: 1,
                    user_id: 1,
                    date_time: { $dateToString: { format: "%d-%m-%Y %H:%M:%S", date: { $add: ["$date_time", 7 * 60 * 60 * 1000] } } }
                }
            });

            // trungdt - truy vấn dữ liệu với paging
            _MailSpam.aggregate(_aggs.concat([
                { $skip: (page - 1) * rows },
                { $limit: rows }
            ])).allowDiskUse(true).exec((err, result) => {
                _results = result;
                next(err);
            });
        },
        next => {
            // trungdt - tính tổng số bản ghi để tính số trang paging
            _MailSpam.aggregate(_aggs.concat([
                { $group: { _id: null, total: { $sum: 1 } } }
            ])).allowDiskUse(true).exec((err, result) => {
                if (!!result && !!result[0]) _count = result[0].total;
                next(err);
            });
        }
    ], err => {
        if (!!err) log.error(err);
        _results.forEach(e => {
            e["task"] = "<div style='text-align: center;color: red;font-size:16px'><button class='btn btn-light waves-effect' onclick=" + "deleteSpamMail('" + (String(e["_id"])) + "" + "')" + "><i class='fa fa-trash'></i></button></div>"
        })
        res.json({ total: _count, rows: _results });
    });
};
exports.update = function (req, res) {
    _MailSpam.findByIdAndRemove(new mongodb.ObjectId(req.params.mailspam), function (error, m) {
        if (error) res.json(error)
        else res.json(m)
    });
}

exports.create = function (req, res) {
    if (!!req.body["add"]) {
        var _arr = [];
        var _ids = !!req.body["add"] ? req.body["add"].split(',') : [];
        _async.waterfall([
            function (next) {
                _Mail.find({ _id: { $in: _ids } }, function (err, result) {
                    _arr = _.pluck(result, 'from');
                    _arr = _.uniq(_arr);
                    next(err);
                })
            },
            function (next) {
                _MailSpam.distinct('emails_spam', {
                    emails_spam: { $in: _arr },
                    user_id: String(req.session.user._id)
                }, function (err, result) {
                    _arr = _.difference(_arr, result);
                    next(err);
                })
            },
            function (next) {
                _async.eachSeries(_arr, function (el, cb) {
                    _MailSpam.create({
                        emails_spam: el,
                        date_time: new Date(),
                        user_id: String(req.session.user._id),
                    }, function (err) {
                        cb(err);
                    });
                }, function (err) {
                    next(err);
                });
            },
        ], function (err) {
            if (!!err) log.error(err);
            res.json("Ok");
        });
        return;
    }

    if (!!req.body["remove"]) {
        var _arr = [];
        var _ids = !!req.body["remove"] ? req.body["remove"].split(',') : [];
        _async.waterfall([
            function (next) {
                _Mail.find({ _id: { $in: _ids } }, function (err, result) {
                    _arr = _.pluck(result, 'from');
                    _arr = _.uniq(_arr);
                    next(err);
                })
            },
            function (next) {
                _MailSpam.remove({
                    emails_spam: { $in: _arr },
                }, function (err) {
                    next(err);
                });
            },
        ], function (err) {
            if (!!err) log.error(err);
            res.json("Ok");
        });
        return;
    }

    if (!!req.body['emails']) {
        var spam_mail = {
            emails_spam: String(req.body['emails']),
            date_time: Date.now(),
            user_id: String(req.session.user._id),
            _id: new mongodb.ObjectId()
        };
        _MailSpam.create(spam_mail);
        res.json("");
        return;
    }
};