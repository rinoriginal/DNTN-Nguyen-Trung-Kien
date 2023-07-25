
var zipFolder = require('zip-folder');

exports.index= {
    json: function(req,res){
        log.debug(6);
        if (_.has(req.query, 'download-excel')) {
            _async.waterfall([
                function (next) {
                    var role = req.session.auth.role;

                    _async.waterfall([
                            function(callback){
                                var _query= {};
                                if (_.has(req.query, 'start-date')) {
                                    var startTime = req.query['start-date'] + ' ' + (!!req.query['start-hour'] ? req.query['start-hour'] : '00:00');
                                    startTime = _moment(startTime, 'DD/MM/YYYY HH:mm')._d;
                                    if(!_query['created']) _query['created']={};
                                    _query['created']['$gte'] = startTime;
                                }

                                if (_.has(req.query, 'end-date')) {
                                    var endTime = req.query['end-date'] + ' ' + (!!req.query['end-hour'] ? req.query['end-hour'] : '23:00');
                                    endTime = _moment(endTime, 'DD/MM/YYYY HH:mm').endOf('hour')._d;
                                    if(!_query['created']) _query['created']={};
                                    _query['created']['$lte'] = endTime;
                                }

                                if (_.has(req.query, 'company')) {
                                    _query['idCompany'] = _.convertObjectId(req.query['company']);
                                }

                                if (_.has(req.query, 'campaign')) {
                                    var queryValue = req.query['campaign'];
                                    var key = queryValue.indexOf('campaign_') >= 0 ? 'idCampain' : 'idService';
                                    _query[key] = _.convertObjectId(queryValue.replace(queryValue.indexOf('campaign_') >= 0 ? 'campaign_' : 'service_', ''));;
                                }

                                if (_.has(req.query, 'agent')) _query['idAgent'] = _.convertObjectId(req.query['agent']);

                                callback(null, _query);
                            }
                        ], function(err, result){
                            var query= [];
                            query.push({$match: result});
                            query.push({$group: {_id: "$idQuestion", count: {$sum:1}}},
                                {$lookup: {
                                        from: "surveychatquestions",
                                        localField: "_id",
                                        foreignField: "_id",
                                        as: "question"
                                    }},
                                {$unwind: {path: "$question", preserveNullAndEmptyArrays:true}});
                            _SurveyChatAnswer.aggregate(query, function(err, answers){
                                var r= {};
                                r.answers= answers;
                                next(err, r);
                            });
                    });


                },
                function(result, next){
                    _SurveyChatAnswer.count({}, function(err, count){
                        result.totalAnswer= count;
                        next(err, result);
                    });
                },
                function(result, next){
                    _ChatThread.count({isSurvey:1}, function(err, count){
                        result.totalThread= count;
                        next(err, result);
                    });
                },
                function (result, next) {
                    if (!result) next({ message: "No data" });
                    createExcelFile(result, next);
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err.message : result });
            });
        }

        if (_.has(req.query, 'download-excel-detail')) {
            // if (!_.has(req.query, 'is-detail')) return res.json({ code: 500, message: "No data" });

            _async.waterfall([
                function (next) {
                    var role = req.session.auth.role;

                    _async.waterfall([
                        function(callback){

                            var _query= {};
                            if (_.has(req.query, 'start-date')) {
                                var startTime = req.query['start-date'] + ' ' + (!!req.query['start-hour'] ? req.query['start-hour'] : '00:00');
                                startTime = _moment(startTime, 'DD/MM/YYYY HH:mm')._d;
                                if(!_query['created']) _query['created']={};
                                _query['created']['$gte'] = startTime;
                            }

                            if (_.has(req.query, 'end-date')) {
                                var endTime = req.query['end-date'] + ' ' + (!!req.query['end-hour'] ? req.query['end-hour'] : '23:00');
                                endTime = _moment(endTime, 'DD/MM/YYYY HH:mm').endOf('hour')._d;
                                if(!_query['created']) _query['created']={};
                                _query['created']['$lte'] = endTime;
                            }

                            if (_.has(req.query, 'company')) {
                                _query['idCompany'] = _.convertObjectId(req.query['company']);
                            }

                            if (_.has(req.query, 'campaign')) {
                                var queryValue = req.query['campaign'];
                                var key = queryValue.indexOf('campaign_') >= 0 ? 'idCampain' : 'idService';
                                _query[key] = _.convertObjectId(queryValue.replace(queryValue.indexOf('campaign_') >= 0 ? 'campaign_' : 'service_', ''));;
                            }

                            if (_.has(req.query, 'agent')) _query['idAgent'] = _.convertObjectId(req.query['agent']);

                            callback(null, _query);
                        }
                    ], function(err, result){
                        var query=result;
                        var skip= ((_.has(req.query, 'detail-page') ? parseInt(req.query["detail-page"]) : 1)-1) * 10;
                        _SurveyChatAnswer
                            .find(query)
                            .skip(skip)
                            .limit(10)
                            .populate('idQuestion')
                            .populate('idAgent')
                            .populate('idService')
                            .populate('idCompany')
                            .populate('idCompanyChannel')
                            .exec(next);
                    });
                },
                function (result, next) {
                    if (!result) next({ message: "No data" });
                    createExcelFileDetail(result, next);
                }
            ], function (err, result) {
                res.json({ code: err ? 500 : 200, message: err ? err.message : result });
            });
        }
    },
    html: function(req, res){
        var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        var role = req.session.auth.role;

        _async.waterfall([
            function(callback){
                var _query= {};
                if (_.has(req.query, 'start-date')) {
                    var startTime = req.query['start-date'] + ' ' + (!!req.query['start-hour'] ? req.query['start-hour'] : '00:00');
                    startTime = _moment(startTime, 'DD/MM/YYYY HH:mm')._d;
                    if(!_query['created']) _query['created']={};
                    _query['created']['$gte'] = startTime;
                }

                if (_.has(req.query, 'end-date')) {
                    var endTime = req.query['end-date'] + ' ' + (!!req.query['end-hour'] ? req.query['end-hour'] : '23:00');
                    endTime = _moment(endTime, 'DD/MM/YYYY HH:mm').endOf('hour')._d;
                    if(!_query['created']) _query['created']={};
                    _query['created']['$lte'] = endTime;
                }

                if (_.has(req.query, 'company')) {
                    _query['idCompany'] = _.convertObjectId(req.query['company']);
                }

                if (_.has(req.query, 'campaign')) {
                    var queryValue = req.query['campaign'];
                    var key = queryValue.indexOf('campaign_') >= 0 ? 'idCampain' : 'idService';
                    _query[key] = _.convertObjectId(queryValue.replace(queryValue.indexOf('campaign_') >= 0 ? 'campaign_' : 'service_', ''));;
                }

                if (_.has(req.query, 'agent')) _query['idAgent'] = _.convertObjectId(req.query['agent']);

                callback(null, _query);
            }
        ], function(err, result){
            log.debug(err, result);
            _async.parallel({
                company: function(callback){
                    if (!_.isEmpty(req.session.auth.company)) {
                        var obj = [{
                            name: req.session.auth.company.name,
                            _id: _.convertObjectId(req.session.auth.company._id)
                        }];
                        callback(null, obj);
                    } else {
                        _Company.aggregate([{ $project: { _id: 1, name: 1 } }], callback);
                    }
                },
                service: function(callback){
                    _async.waterfall([
                        function(callback){
                            if (!_.isEmpty(req.session.auth.company)) {
                                _CompanyChannel.find({idCompany:  _.convertObjectId(req.session.auth.company._id)}, function(err, companyChannels){
                                    var ids= _.pluck(companyChannels, '_id');
                                    callback(err, ids);
                                })
                            }else{
                                callback(null, []);
                            }

                        },
                        function (companychannels, callback) {
                            if (!_.isEmpty(companychannels)) {
                                _ServicesChat.find({idChannel: {$in: companychannels}}).populate('idChannel').exec(callback);
                            }
                            else {
                                _ServicesChat.find({}).populate('idChannel').exec(callback);
                            }
                        }
                    ], callback);


                },
                agents: function (callback) {
                    _async.waterfall([
                        function (callback) {
                            _Company.distinct("_id", req.session.auth.company ? { _id: req.session.auth.company } : {}, function (err, com) {
                                _AgentGroups.distinct("_id", { idParent: { $in: com } }, function (err, result) {
                                    if (err) return callback(err, null);
                                    _Users.aggregate([{
                                        $match: {
                                            $or: [
                                                { 'agentGroupLeaders.group': { $in: result } },
                                                { 'agentGroupMembers.group': { $in: result } },
                                                { 'companyLeaders.company': { $in: com } }
                                            ]
                                        }
                                    }], callback);
                                });
                            })
                        }
                    ], callback);
                },
                data: function(callback){
                    var query= [];
                    query.push({$match: result});
                    query.push({$group: {_id: "$idQuestion", count: {$sum:1}}},
                        {$lookup: {
                                from: "surveychatquestions",
                                localField: "_id",
                                foreignField: "_id",
                                as: "question"
                            }},
                        {$unwind: {path: "$question", preserveNullAndEmptyArrays:true}});
                    _SurveyChatAnswer.aggregate(query, callback);
                },
                totalAnswer: function(callback){
                    _SurveyChatAnswer.count(result, callback);
                },
                totalThread: function(callback){
                    var query= {};
                    query.isSurvey=1;
                    if(_.has(result, 'idCompany')){
                        query.companyId= result.idCompany;
                    }
                    if(_.has(result, 'created')){
                        query.created= result.created;
                    }
                    if(_.has(result, 'idService')){
                        // _ServicesChat.findById(result.idService, function (err, sc){
                        //
                        //     query.channelId= sc.idChannel;
                        //     _ChatThread.count(query, callback);
                        // })
                        query.idServiceChat= ""+result.idService;

                    }

                    if(_.has(result, 'idAgent')){
                        query.agentId= result.idAgent;
                    }

                    _ChatThread.count(query, callback);


                },
                detailData: function(callback){
                    var pageDetail = _.has(req.query, 'detail-page') ? parseInt(req.query["detail-page"]) : 1;
                    log.debug(pageDetail);
                    var query=result;
                    // _SurveyChatAnswer
                    //     .find(query)
                    //     .populate('idQuestion')
                    //     .populate('idAgent')
                    //     .populate('idService')
                    //     .populate('idCompany')
                    //     .populate('idCompanyChannel')
                    //     .paginate(page, rows, function (error, items, total) {
                    //
                    //         if(error) return callback(error);
                    //
                    //         var paginator = new pagination.SearchPaginator({prelink: '/report-survey-chat', current: page, rowsPerPage: rows, totalResult: total});
                    //         var returnVal= {};
                    //         returnVal.items= items;
                    //         returnVal.paginator= paginator;
                    //         callback(null, returnVal);
                    //     });

                    var agg= _SurveyChatAnswer.aggregate();
                    agg._pipeline=[];
                    agg._pipeline.push({$match: query});
                    agg._pipeline.push({$lookup: {
                                from: "users",
                                localField: "idAgent",
                                foreignField: "_id",
                                as: "idAgent"
                            }},
                        {$unwind: {path: "$idAgent", preserveNullAndEmptyArrays:true}},
                        {$lookup: {
                                from: "surveychatquestions",
                                localField: "idQuestion",
                                foreignField: "_id",
                                as: "idQuestion"
                            }},
                        {$unwind: {path: "$idQuestion", preserveNullAndEmptyArrays:true}},
                        {$lookup: {
                                from: "servicechats",
                                localField: "idService",
                                foreignField: "_id",
                                as: "idService"
                            }},
                        {$unwind: {path: "$idService", preserveNullAndEmptyArrays:true}},
                        {$lookup: {
                                from: "companies",
                                localField: "idCompany",
                                foreignField: "_id",
                                as: "idCompany"
                            }},
                        {$unwind: {path: "$idCompany", preserveNullAndEmptyArrays:true}},
                        {$lookup: {
                                from: "companychannels",
                                localField: "idCompanyChannel",
                                foreignField: "_id",
                                as: "idCompanyChannel"
                            }},
                        {$unwind: {path: "$idCompanyChannel", preserveNullAndEmptyArrays:true}},
                        {$lookup: {
                                from: "field_so_dien_thoai",
                                localField: "customerPhone",
                                foreignField: "value",
                                as: "fsdt"

                            }},
                        {$unwind: {path: "$fsdt", preserveNullAndEmptyArrays:true}},

                        {$lookup: {
                                from: "field_ho_ten",
                                localField: "fsdt.entityId",
                                foreignField: "entityId",
                                as: "fhoten"

                            }},
                        {$unwind: {path: "$fhoten", preserveNullAndEmptyArrays:true}},
                        {$lookup: {
                                from: "field_e_mail",
                                localField: "fsdt.entityId",
                                foreignField: "entityId",
                                as: "femail"

                            }},
                        {$unwind: {path: "$femail", preserveNullAndEmptyArrays:true}});

                    _SurveyChatAnswer.aggregatePaginate(agg, {page: pageDetail, limit: rows}, function (error, items, pageCount, count) {
                        if(error) return callback(error);

                        var paginator = new pagination.SearchPaginator({prelink: _.removeURLParameter(req.url, 'detail-page'), current: pageDetail, rowsPerPage: rows, totalResult: count});
                        var returnVal= {};
                        returnVal.items= items;
                        returnVal.paginator= paginator.getPaginationData();
                        callback(null, returnVal);
                    });

                }

            }, function(err, result){
                _.render(req,res, 'report-survey-chat', {
                    title: "Báo cáo đánh giá phiên chat",
                    plugins: ['moment', 'jquery-mask', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
                    companies: result.company,
                    services: result.service,
                    campaigns: [],
                    agents: result.agents,
                    data: result.data,
                    totalThread: result.totalThread,
                    totalAnswer: result.totalAnswer,
                    paging: null,
                    dataDetail: result.detailData.items,
                    pagingDetail: result.detailData.paginator
                }, true, null);
            });
        })



    }
}


function createExcelFile(data, callback) {
    var currentDate = new Date();
    var folderName = currentDate.getTime() + "";
    var fileName = 'ReportSurveyChat-' + _moment(currentDate).format('DD-MM-YYYY');

    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'csv', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function (callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'csv', folderName), callback);
        },
        // Ghi dữ liệu ra file
        function (t, next) {


            var workbook = new _Excel.Workbook();
            workbook.creator = "admin";
            workbook.created = new Date();
            var sheet = workbook.addWorksheet('ReportSurveyChat');
            var column = [];



            if (data !== null) {
                _.each(data.answers, function (header) {
                    column.push({
                        header: header.question.content,
                        key: header.question.content,
                        width: header.question.content.length + 10
                    });
                });
                var kdg= "Không đánh giá";
                var ts= "Tổng số";
                column.push({
                    header: kdg,
                    key: kdg,
                    width: kdg.length + 10
                });
                column.push({
                    header: ts,
                    key: ts,
                    width: ts.length + 10
                });
                sheet.columns = column;

                var rows=[];

                _.each(data.answers, function (el) {
                    rows.push(el.count)

                });
                rows.push(data.totalThread-data.totalAnswer);
                rows.push(data.totalThread);
                sheet.addRow(rows);
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            }
        },
        function (next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), next);
        },
        function (t, callback) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'csv', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                callback(err, folderZip.replace(_rootPath, ''));
            });
        }
    ], callback);
};

function createExcelFileDetail(data, callback) {
    var currentDate = new Date();
    var folderName = currentDate.getTime() + "";
    var fileName = 'ReportSurveyChat-detail-' + _moment(currentDate).format('DD-MM-YYYY');

    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'csv', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function (callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'csv', folderName), callback);
        },
        // Ghi dữ liệu ra file
        function (t, next) {
            var excelHeader = [
                'Dự án'
                , 'Chiến dịch'
                , 'Điện thoại viên'
                , 'Số điện thoại'
                , 'Tên khách hàng'
                , 'Email'
                , 'Đánh giá'
                , 'Lý do đánh giá'

            ];

            var workbook = new _Excel.Workbook();
            workbook.creator = "admin";
            workbook.created = new Date();
            var sheet = workbook.addWorksheet("ReportSurveyChat");
            var column = [];

            _.each(excelHeader, function (header) {
                column.push({
                    header: header,
                    key: header,
                    width: header.length
                });
            });
            sheet.columns = column;

            if (data !== null) {
                // Ghi dữ liệu
                _.each(data, function (el) {
                    sheet.addRow([
                        el.idCompany.name,
                        !el.idService? "": el.idService.name,
                        el.idAgent.name,
                        el.customerPhone,
                        el.fhoten?el.fhoten.value: '',
                        el.customerEmail.length==0?(el.femail?el.femail.value:''):el.customerEmail,
                        el.idQuestion.content,
                        el.reason
                    ]);
                });
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            }
        },
        function (next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), next);
        },
        function (t, callback) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'csv', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                callback(err, folderZip.replace(_rootPath, ''));
            });
        }
    ], callback);
};