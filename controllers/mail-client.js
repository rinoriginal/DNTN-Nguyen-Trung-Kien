

var mkdirp = require('mkdirp');
var request = require('request');
var fs = require('fs');

exports.index = function (req, res) {
    if (!req.session || !_.has(req.session, 'user')) {
        return res.json({ total: 0, rows: [] });
    }

    var page = (_.has(req.query, 'page') && !_.isNull(req.query.page)) ? req.query.page : 1;
    var rows = (_.has(req.query, 'per_page') && !_.isNull(req.query.per_page)) ? req.query.per_page : 10;
    var _sort = _.cleanSort(req.query, '');
    var _content = (_.has(req.query, 'content') && !_.isNull(req.query.content)) ? req.query.content : "";
    var _header = (_.has(req.query, 'header') && !_.isNull(req.query.header)) ? req.query.header : "";
    var _from = (_.has(req.query, 'from') && !_.isNull(req.query.from)) ? req.query.from : "";
    var _file = (_.has(req.query, 'file') && !_.isNull(req.query.file)) ? req.query.file : "";
    var _date = (_.has(req.query, 'date') && !_.isNull(req.query.date)) ? req.query.date : "";
    var _box = (_.has(req.query, 'box') && !_.isNull(req.query.box)) ? req.query.box : "0";
    var _query = _.cleanRequest(req.query, ['object FormData', 'from', 'type', 'page', 'readed', 'direction', 'box', 'mail_type', 'per_page', 'content', 'header', 'file', 'date']);

    _query["agent"] = new mongodb.ObjectId(String(req.session.user._id));
    var _forward = {};
    _forward["forward"] = String(req.session.user._id);
    if (_query.keyword && _query.keyword.length >= 3) {
        _query["subject"] = { $regex: new RegExp(_.stringRegex(_query.keyword)), $options: '-i' };
    }

    delete _query.keyword;
    delete _query.ticket;

    var aggregate = _Mail.aggregate();
    aggregate._pipeline.push({ $match: { $or: [_query, _forward] } });

    if (_.has(req.query, 'content')) aggregate._pipeline.push({ $match: { content: { $regex: new RegExp(_.stringRegex(req.query['content']), 'i') } } });
    if (_.has(req.query, 'header')) aggregate._pipeline.push({ $match: { subject: { $regex: new RegExp(_.stringRegex(req.query['header']), 'i') } } });
    if (_.has(req.query, 'file')) aggregate._pipeline.push({ $match: { attachments: { $regex: new RegExp(_.stringRegex(req.query['file']), 'i') } } });
    if (_.has(req.query, 'from')) aggregate._pipeline.push({ $match: { attachments: { $regex: new RegExp(_.stringRegex(req.query['from']), 'i') } } });
    if (_.has(req.query, 'date')) aggregate._pipeline.push({
        $match: {
            created: {
                $gte: _moment(req.query['date'], "YYYY-MM-DD").startOf('day')._d,
                $lte: _moment(req.query['date'], "YYYY-MM-DD").endOf('day')._d,
            }
        }
    });

    // aggregate._pipeline.push({ $sort: { status: -1, updated: -1, created: -1 } });
    if (_.has(req.query, 'ticket')) {
        aggregate._pipeline.push({ $lookup: { from: 'ticketmails', localField: '_id', foreignField: 'mailId', as: "mails" } });
        aggregate._pipeline.push({ $unwind: '$mails' });
        // aggregate._pipeline.push({ $match: { "mails.status": { $eq: parseInt(req.query.ticket) } } });
    }

    aggregate._pipeline.push({ $lookup: { from: 'servicemails', localField: 'to', foreignField: 'send_user', as: 'service' } });

    aggregate._pipeline.push({ $unwind: '$service' });

    if (_.has(req.query, 'ticket')) {
        aggregate._pipeline.push({
            $group: {
                _id: '$_id',
                unprogressing: { $sum: { $cond: { if: { $eq: ['$mails.status', 0] }, then: 1, else: 0 } } },
                progressing: { $sum: { $cond: { if: { $eq: ['$mails.status', 1] }, then: 1, else: 0 } } },
                progressed: { $sum: { $cond: { if: { $eq: ['$mails.status', 2] }, then: 1, else: 0 } } },
                from: { '$last': '$from' }, status: { '$last': '$mails.status' },
                service: { '$last': '$service' }, readed: { '$first': '$readed' },
                agent: { '$last': '$agent' }, mail_type: { '$first': '$mail_type' },
                attachments: { '$last': '$attachments' }, body_raw: { '$first': '$body_raw' },
                body: { '$last': '$body' }, subject_raw: { '$first': '$subject_raw' },
                subject: { '$last': '$subject' }, to: { '$last': '$to' }
            }
        });
        switch (parseInt(req.query.ticket)) {
            case 0:
                aggregate._pipeline.push({ $match: { $or: [{ progressing: 0, progressed: 0 }, { status: 0 }] } });
                break;
            case 1:
                aggregate._pipeline.push({ $match: { status: 1, progressing: { $gt: 0 } } });
                break;
            case 2:
                aggregate._pipeline.push({ $match: { status: 2, progressed: { $gt: 0 } } });
                break;
        }
    }
    _MailSpamId.find({ user_id: String(req.session.user._id) }, function (err, data) {
        _MailSpam.find({ user_id: String(req.session.user._id) }, function (er, dataM) {
            if (dataM.length > 0) {
                dataM.forEach(e => {
                    aggregate._pipeline.push({ $match: { "from": { $nin: [e["emails_spam"]] } } })
                })
            }
            switch (_box) {
                case "0":
                    data.forEach(e => {
                        aggregate._pipeline.push({ $match: { "_id": { $nin: [new mongodb.ObjectId(e["emails_spam_id"])] } } })
                    })
                    break;
                case "1":
                    aggregate._pipeline.push({ $match: { "mail_type": 2 } })
                    data.forEach(e => {
                        aggregate._pipeline.push({ $match: { "_id": { $nin: [new mongodb.ObjectId(e["emails_spam_id"])] } } })
                    })

                    break;
                case "2":
                    aggregate._pipeline.push({ $match: { "from": req.session.user.email } });
                    break;
                case "3":

                    if (data.length > 0) {
                        data.forEach(e => {

                            aggregate._pipeline.push({ $match: { "_id": new mongodb.ObjectId(e["emails_spam_id"]) } })
                        })
                    }
                    else {
                        aggregate._pipeline.push({ $match: { "_id": "not_found_record" } })
                    }

                    break;
                default:

                    break;
            }
            if (_sort["created"]) {
                aggregate._pipeline.push({ $sort: _sort })
            }

            _Mail.aggregatePaginate(aggregate, { page: page, limit: rows }, function (err, results, pageCount, count) {
                if (err) console.log(err);
                results.forEach(e => { e["forward"] = "<button class='btn btn-primary waves-effect' onclick=" + "setValueTrueF('" + (String(e["_id"])) + "" + "')" + "><i class='fa fa-forward'></i></button>" })
                res.json({ total: count, rows: results });
            });
        })


    })


};

exports.create = function (req, res) {
    req.body['agent'] = req.session.user._id;
    req.body['status'] = 2;
    req.body['mail_type'] = 1;
    req.body["attachments"] = [];
    req.body["attachments_orginal"] = [];
    req.body["files"] = [];
    req.body["_id"] = new mongoose.Types.ObjectId();
    _async.waterfall([
        function (next) {
            if (!req.files || _.isEmpty(req.files)) return next(null);
            var fFolder = req.body["_id"].toString();
            fsx.mkdirs(path.join(_rootPath, "assets", "uploads", "attachments", fFolder), function (error) {
                if (error) return next(error);
                _async.eachSeries(req.files, function (f, _next) {
                    var fUrl = path.join(_rootPath, "assets", "uploads", "attachments", fFolder, f.originalname);
                    fsx.move(f.path, fUrl, function (error) {
                        req.body.attachments_orginal.push(fs.createReadStream(fUrl));
                        req.body.files.push(fUrl);
                        req.body.attachments.push("/assets/uploads/attachments/" + fFolder + "/" + f.originalname);
                        _next(error);
                    });
                }, function (error) {
                    if (error) return next(error);
                    request.post({
                        url: 'https://' + _config['database-core'].ip + ':8000/attachment',
                        rejectUnauthorized: false, agent: false, requestCert: true, formData: { attachments: req.body.attachments_orginal }
                    }, function optionalCallback(err, httpResponse, body) {
                        if (err) return next(err);
                        req.body.attachments_orginal = JSON.parse(body);
                        next(err);
                    });
                });
            });
        },
        function (next) {
            _CustomerFields.find({ status: 1 }, 'modalName displayName fieldType fieldValue isRequired -_id').sort({ weight: 1, displayName: 1 }).exec(next);
        },
        function (fields, next) {
            next(null, fields, _.chain(_.keys(_.chain(fields)
                .groupBy('modalName')
                .mapObject(function (i) {
                    return i[0];
                }).value()))
                .map(function (t) {
                    return { $lookup: { from: t, localField: '_id', foreignField: 'entityId', as: t } };
                }).value()
            );
        },
        function (fields, lookup, next) {
            _CCKFields['field_e_mail'].db.findOne({ value: req.body.to }, 'entityId', function (err, c) {
                if (_.isNull(c)) return next('Tài khoản email này không tìm thấy', null);
                next(null, fields, lookup, c.entityId);
            });
        },
        function (fields, lookup, cid, next) {
            _Customer.aggregate([
                { $match: { '_id': cid } }].concat(lookup),
                function (error, customers) {
                    if (customers.length <= 0) return next('Không có khách hàng nào trong nhóm có email');
                    _async.each(customers, function (cus, callback) {
                        var _cus = _.chain(cus).pick(function (value, key, object) {
                            return _.isArray(value) && !_.isEmpty(value);
                        }).mapObject(function (v) {
                            return v[0].value;
                        }).value();
                        var _body = req.body['body_raw'];
                        if (_body) { req.body["body_raw"] = _.unescapeHTML(rePlaceholder(_body, _cus)); }
                        if (_.has(req.body, 'mailId')) req.body.replyTo = req.body.mailId;
                        req.body.created = new Date();
                        console.log(241, req.body)
                        _Signature.aggregate([{ $sort: { created: -1 } }, { $match: { active: true, mail_name: req.body['from'] } }], function (err, resp) {

                            _Mail.create(req.body, function (error, mail) {
                                if (error) return res.json({ code: 500, message: error });
                                var m = mail.toObject();

                                m.created = _moment(m.created).format('YYYY-MM-DD HH:mm:ss');
                                if (resp.length > 0) {
                                    m.body_raw += '<br><br>';
                                    m.body_raw += resp[0].body_raw
                                }
                                m.body_raw += _.htmlTags([{ tag: 'span', attr: { style: 'font-size:0px' }, content: 'dft-start-config' + [_config.app._id, req.session.user._id, mail._id].join('-') + 'dft-end-config' }]);
                                m.attachments = req.body.attachments;
                                console.log(256, [m])
                                _ActiveMQ.publish('/queue/SendMail', JSON.stringify({ mails: [m], sentNow: 0 }));
                                callback(null);
                            });
                        })
                        try {
                            _SentMail.create(req.body, function (error, mail) {

                                var m = mail.toObject();
                                m.created = _moment(m.created).format('YYYY-MM-DD HH:mm:ss');
                                m.body_raw += _.htmlTags([{ tag: 'span', attr: { style: 'font-size:0px' }, content: 'dft-start-config' + [_config.app._id, req.session.user._id, mail._id].join('-') + 'dft-end-config' }]);
                                m.attachments = req.body.attachments;
                            });
                        } catch (e) {
                            console.log(e)
                        }
                    }, next);
                });
        }
    ], function (error, result) {
        if (error) return res.json({ code: 500, message: error });
        if (_.has(req.body, 'mailId')) {
            _Mail.findByIdAndUpdate(req.body.mailId, { readed: 1, mail_status: ((_.has(req.body, 'mail_status') && _.isEqual(req.body.mail_status, '2')) ? 2 : 1) }, function (error, m) {
                res.json({ code: 200, message: 'sss' });
            });
        } else {
            res.json({ code: 500, message: 'Mail not update' });
        }
    });

};

exports.show = function (req, res) {
    _async.waterfall([
        function (callback) {
            _Mail.findById(req.params.mailclient, callback);
        },
        function (mail, callback) {
            _async.parallel({
                services: function (cb) {
                    _ServicesMail.aggregate([
                        { $match: { send_user: mail.to } },
                        { $lookup: { from: 'mailtemplatecategories', localField: 'idCompany', foreignField: 'companyId', as: 'categories' } },
                        {
                            $unwind: {
                                path: '$categories',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        { $lookup: { from: 'mailtemplates', localField: 'categories._id', foreignField: 'categoryId', as: 'categories.templates' } },
                        { $project: { 'categories._id': 1, 'categories.name': 1, 'categories.templates._id': 1, 'categories.templates.name': 1, 'categories.templates.body': 1 } }
                    ], cb);
                },
                tickets: function (cb) {
                    cb(null, []);
                }
            }, function (error, result) {
                mail.update({ status: 3 }, { new: true }, function (error, m) {//readed: 1,
                    result['mail'] = mail;
                    callback(error, result);
                });
            });
        }
    ], function (error, m) {
        res.json({ code: error ? 500 : 200, data: error ? error : m });
    });
};

exports.update = function (req, res) {
    if (_.has(req.body, 'readed') && _.isEqual(req.body.readed, '1')) req.body.readedDate = _moment()._d;
    _Mail.findByIdAndUpdate(req.params.mailclient, req.body, { new: true, upsert: false }, function (error, m) {
        res.json({ code: error ? 500 : 200, message: error ? error : 'Ok' });
    });
}

var rePlaceholder = function (str, obj) {
    return str.replace(/\<span class="m-t" style="background-color:#ff0">%(.*?)%\<\/span>/g, function (i, match) {
        return _.has(obj, ('field_' + match).toLowerCase()) ? obj[('field_' + match).toLowerCase()] : '';
    }).replace(/[\r\n]/g, '');
};