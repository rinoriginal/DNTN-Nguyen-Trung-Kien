
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
            // trungdt - lấy danh sách địa chỉ email bị đánh dấu spam
            _MailSpam.distinct('emails_spam', { user_id: req.session.user._id }, next);
        },
        (result, next) => {
            _aggs.push({
                $match: {
                    from: { $nin: result },
                    agent: new mongodb.ObjectId(String(req.session.user._id)),
                    mail_type: 2
                }
            });
            if (_.has(req.query, 'from')) _aggs.push({ $match: { from: { $regex: new RegExp(_.stringRegex(req.query['from']), 'i') } } });
            if (_.has(req.query, 'content')) _aggs.push({ $match: { body: { $regex: new RegExp(_.stringRegex(req.query['content']), 'i') } } });
            if (_.has(req.query, 'header')) _aggs.push({ $match: { subject: { $regex: new RegExp(_.stringRegex(req.query['header']), 'i') } } });
            if (_.has(req.query, 'file')) _aggs.push({ $match: { attachments: { $regex: new RegExp(_.stringRegex(req.query['file']), 'i') } } });
            if (_.has(req.query, 'date')) _aggs.push({
                $match: {
                    created: {
                        $gte: _moment(req.query['date'], "YYYY-MM-DD").startOf('day')._d,
                        $lte: _moment(req.query['date'], "YYYY-MM-DD").endOf('day')._d,
                    }
                }
            });

            _aggs.push({ $lookup: { from: 'servicemails', localField: 'service', foreignField: '_id', as: 'service' } });

            if (_.has(req.query, 'sort')) _aggs.push({ $sort: _.cleanSort(req.query, '') });

            _aggs.push({
                $project: {
                    _id: 1,
                    from: 1,
                    subject: 1,
                    body: 1,
                    created: { $dateToString: { format: "%d-%m-%Y %H:%M:%S", date: { $add: ["$created", 7 * 60 * 60 * 1000] } } },
                    readed: 1,
                    agent: 1,
                    mail_type: 1,
                    attachments: 1,
                    mail_status: 1,
                    status: 1,
                    to: 1,
                    body_raw: 1,
                    subject_raw: 1,
                    service: { $arrayElemAt: ["$service", 0] },
                }
            });

            // trungdt - truy vấn dữ liệu với paging
            _Mail.aggregate(_aggs.concat([
                { $skip: (page - 1) * rows },
                { $limit: rows }
            ])).allowDiskUse(true).exec((err, result) => {
                _results = result;
                next(err);
            });
        },
        next => {
            // trungdt - tính tổng số bản ghi để tính số trang paging
            _Mail.aggregate(_aggs.concat([
                { $group: { _id: null, total: { $sum: 1 } } }
            ])).allowDiskUse(true).exec((err, result) => {
                if (!!result && !!result[0]) _count = result[0].total;
                next(err);
            });
        }
    ], err => {
        if (!!err) log.error(err);
        _results.forEach(e => { e["forward"] = "<button class='btn btn-primary waves-effect' onclick=" + "setValueTrueF('" + (String(e["_id"])) + "" + "')" + "><i class='fa fa-forward'></i></button>" })
        res.json({ total: _count, rows: _results });
    });
};