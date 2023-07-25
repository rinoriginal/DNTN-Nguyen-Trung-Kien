// exports.index = function (req, res) {
//     if (!req.session || !_.has(req.session, 'user')) {
//         return res.json({total: 0, rows: []});
//     }
//     var page = (_.has(req.query, 'page') && !_.isNull(req.query.page)) ? req.query.page : 1;
//     var rows = (_.has(req.query, 'per_page') && !_.isNull(req.query.per_page)) ? req.query.per_page : 10;
//     var _sort = _.cleanSort(req.query, '');
//     var _content = (_.has(req.query, 'content') && !_.isNull(req.query.content)) ? req.query.content : "";
//     var _header =(_.has(req.query, 'header') && !_.isNull(req.query.header)) ? req.query.header : "";
//     var _file =(_.has(req.query, 'file') && !_.isNull(req.query.file)) ? req.query.file : "";
//     var _date =(_.has(req.query, 'date') && !_.isNull(req.query.date)) ? req.query.date : "";
//     var _box = (_.has(req.query, 'box') && !_.isNull(req.query.box)) ? req.query.box : "0";
//     var _query = _.cleanRequest(req.query, ['object FormData', 'type', 'page','readed', 'direction','box', 'per_page','content','header','file','date']);
//     var agg = _MailSpamId.aggregate();

//     if(_content&&_content!=""){
//         agg._pipeline.push({ $match: {"body" : {$regex : _content} } })
//     }
//     if(_header&&_header!=""){
//         agg._pipeline.push({ $match: {"subject" : {$regex : _header} } })
//     }
//     if(_date&&_date!=""){
//         var start = new Date(_date+'GMT+07:00');
//         var end = new Date(_date.split("-")[0]+"-"+_date.split("-")[1]+"-"+(parseInt(_date.split("-")[2])+1)+'GMT+07:00')
//         console.log(start,end)
//         agg._pipeline.push({ $match: {"date_time" : {$gte : start,$lt:end} } })
//     }
//     if(_sort["date_time"]){
//         agg._pipeline.push({$sort:_sort})
//     }
//     // aggregate._pipeline.push({ $sort: { status: -1, updated: -1, created: -1 } });
//     if (_.has(req.query, 'ticket')) {
//         agg._pipeline.push({ $lookup: { from: 'ticketmails', localField: '_id', foreignField: 'mailId', as: "mails" } });
//         agg._pipeline.push({ $unwind: '$mails' });
//         // aggregate._pipeline.push({ $match: { "mails.status": { $eq: parseInt(req.query.ticket) } } });
//     }


//     agg._pipeline.push({$match:{user_id:req.session.user._id}})
//     var datas =[]
//     _MailSpamId.aggregatePaginate(agg,{page: page, limit: rows}, function (err, results, pageCount, count) {
//         if (err) console.log(err);

//         res.json({total: count, rows: results});
//     })

// };

exports.index = function (req, res) {
    if (!req.session || !_.has(req.session, 'user') || !req['session']['user']) {
        return res.json({ total: 0, rows: [] });
    }

    var page = (_.has(req.query, 'page') && !_.isNull(req.query.page)) ? req.query.page : 1;
    var rows = (_.has(req.query, 'per_page') && !_.isNull(req.query.per_page)) ? req.query.per_page : 10;

    // var _sort = _.cleanSort(req.query, '');

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
                    from: { $in: result },
                    agent: new mongodb.ObjectId(String(req.session.user._id))
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
        res.json({ total: _count, rows: _results });
    });
};

exports.update = function (req, res) {
    console.log(21, "in")
    _MailSpamId.findByIdAndRemove(mongodb.ObjectId(req.body["_id"]), function (error, m) {
        res.json("")
    });


}