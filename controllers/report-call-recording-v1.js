
var request = require('request');
var titlePage = 'Quản lý file ghi âm new';
var searchNotFoundError = new Error('Không tìm thấy kết quả với khoá tìm kiếm');
var accessDenyError = new Error('Không đủ quyền truy cập');
var parseJSONToObject = require(path.join(_rootPath, 'queue', 'common', 'parseJSONToObject.js'));
var {
    CALL_DIRECTION_V1
} = require(path.join(_rootPath, 'helpers', 'constants'));

var {
    getAgentDetailInfo,
} = require(path.join(_rootPath, 'commons', 'functions'));
var zipFolder = require('zip-folder');
var request = require('request');
var fs = require('fs')
var fsg = require('graceful-fs')
var url = require('url');
var http = require('http');
var matchConditions = {
    //$or: [
    //    {transType: 1},
    //    {transType: 6},
    //    {transType: 7}
    //],
    serviceType: 3, // Cuộc gọi đến agent
    //callDuration: {$gte: 0},
    //waitDuration: {$gte: 0},
    //startTime: {$gte: 0},
    //ringTime: {$gte: 0},
    //answerTime: {$gte: 0},
    //endTime: {$gte: 0},
    subReason: { "$eq": null },
    recordPath: { $ne: null }
};

exports.index = {
    json: async function (req, res) {
        let pageSize = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

        try {
            let startDate, endDate;
            let queryDate;
            if(_.has(req.query, 'date')){
                queryDate = req.query.date.split(' - ');

                if(queryDate.length > 1){
                    [startDate, endDate] = queryDate;
                    startDate = moment(startDate, 'DD/MM/YYYY');
                    endDate = moment(endDate, 'DD/MM/YYYY');
                }else {
                    startDate = moment(queryDate[0], 'DD/MM/YYYY');
                    endDate = moment(queryDate[0], 'DD/MM/YYYY');
                }
            }else {
                startDate = moment().startOf('month');
                endDate = moment()
            }
            startDate = startDate.startOf('day').format('YYYY-MM-DD HH:mm:ss');
            endDate = endDate.endOf('day').format('YYYY-MM-DD HH:mm:ss');

            let config = await _Config.findOne({});
            // lấy toàn bộ agent để mapping dữ liệu với cisco
            let agentInfoTelehub = await _Users.find({});

            if(!config || (config && !config.ipRecording)) throw new Error(`Chưa config hệ thống`);

            let optionsQuery = {startDate, endDate, pages: pageSize, limit: rows, config, agentInfoTelehub, filter: req.query};

            if(_.has(req.query, 'download') && req.query.download == 1) return exportExcel(req, res, optionsQuery);

            return getReportData(optionsQuery).then(result => {
                let {results, pageInfo} = result;
                
                var paginator = new pagination.SearchPaginator({
                    prelink: '/report-call-recording-v1',
                    current: pageSize,
                    rowsPerPage: rows,
                    totalResult: pageInfo[0] ? pageInfo[0].count: 0
                });
    
                res.json({code: 200, message: results, paging: paginator.getPaginationData()}); 
    
            }).catch(err => {
                res.json({code: 500, message: err.message || err});
            })

        } catch (err) {
            console.log(err);
            return res.json({ code: 500, message: err.message || err});
        }
        getTransInfo(req, res, function (err, result) {
            if (err && _.isString(err)) {
                var conditions = arguments[1];
                var totalResult = arguments[2];
                exportExcel(req, res, conditions, totalResult);
                return;
            }

            // result = result.map(JSON.stringify);

            // result = new Set(result);
            // result = Array.from(result).map(JSON.parse);
            // const filteredArr = result.reduce((record, current) => {
            //     const x = record.find(item => item._id.toString() == current._id.toString());
            //     if (!x) {
            //         return record.concat([current]);
            //     } else {
            //         return record;
            //     }
            // }, []);
            result = result.slice((pageSize - 1) * rows, rows * pageSize);
            res.json({ code: err ? 500 : 200, message: err ? err.message : result });
        });
    },
    html: async function (req, res) {
        // updateRecording();
        try {
            let config = await _Config.findOne({});
            let agentInfos = await getAgentDetailInfo();
            
            _.render(req, res, 'report-call-recording-v1', {
                title: titlePage,
                myUsers: agentInfos,
                ipRecording: config && config.ipRecording ? config.ipRecording : '',
                CALL_DIRECTION_V1,
                getDirection,
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], ['chosen']]
            }, true, false);
        } catch (err) {
            _.render(req, res, '500', null, null, {title: 'Có lỗi xảy ra', message: err.message || err}); 
        }
    }
};

// servicesType: 3
// transType : 1 || 6
/**
 * Truy vấn dữ liệu báo cáo
 * @param req
 * @param res
 * @param callback
 */
function getTransInfo(req, res, callback) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

    var sort = _.cleanSort(req.query, '');
    var cond = [];

    _async.waterfall([
        function (callback) {
            // Phân quyền dữ liệu
            if (!(req.session.auth && req.session.auth)) {
                var err = new Error('session auth null');
                return callback(err);
            };

            var _company = null;
            var _group = null;
            if (req.session.auth.company && !req.session.auth.company.leader) {
                _company = req.session.auth.company._id;
                if (req.session.auth.company.group.leader) {
                    // Team lead
                    _group = req.session.auth.company.group._id;
                } else {
                    // Agent
                    cond.push({ $match: { agentId: new mongodb.ObjectId(req.session.user._id.toString()) } });
                }
            } else if (req.session.auth.company && req.session.auth.company.leader) {
                // Company Leader
                _company = req.session.auth.company._id;
            } else if (!req.session.auth.company) {
                // Leader
            };

            var _cpsIds = [];
            var _svsIds = [];
            _async.waterfall([
                function (next) {
                    if (_group) {
                        _Users.distinct('_id', {
                            $or: [
                                { agentGroupLeaders: { $elemMatch: { group: _group } } },
                                { agentGroupMembers: { $elemMatch: { group: _group } } }
                            ]
                        }, next);
                    } else {
                        next(null, null);
                    };
                },
                function (userIds, next) {
                    if (userIds) cond.push({ $match: { agentId: { $in: userIds } } });
                    _Campains.distinct('_id', _company ? { idCompany: _company } : {}, next);
                },
                function (ids, next) {
                    _cpsIds = ids;
                    _Services.distinct('_id', _company ? { idCompany: _company } : {}, next);
                }
            ], function (err, ids) {
                _svsIds = ids;
                var orConds = [];
                /* 21nov2016 hoangdv Trong trường hợp gọi ra trong trường hợp [Click to call] trên
                * ticket IN_BOUND thì giá trị của trường idCampain là serviceId
                * io.js dòng 101 "acdPublish.sendMakeCallRequest(data._id, data.number ,data.sid, trunk.prefix, 1, serviceId);"*/
                _cpsIds.push.apply(_cpsIds, _svsIds);
                orConds.push({ idCampain: { $in: _cpsIds } });
                orConds.push({ serviceId: { $in: _svsIds } });
                cond.push({ $match: { $or: orConds } });

                callback(err);
            });
        },
        function (next) {
            // Lọc theo đầu số
            if (_.has(req.query, 'phone')) {
                _RecordingInfo.find({
                    $or: [
                        { callType: 6, called: { $regex: new RegExp(_.stringRegex(req.query.phone), 'i') } },
                        { callType: { $ne: 6 }, caller: { $regex: new RegExp(_.stringRegex(req.query.phone), 'i') } }
                    ]
                }, { callId: 1 }, function (err, result) {
                    cond.push({ $match: { callId: { $in: _.pluck(result, 'callId') } } });
                    next();
                });
            } else {
                next();
            }
        },
        function (callback) {
            // Truy vấn dữ liệu báo cáo
            cond.push({ $match: JSON.parse(JSON.stringify(matchConditions)) });

            if (_.has(req.query, 'transType')) {
                if (req.query.transType == 1) {
                    cond.push({ $match: { transType: { $in: [1, 7] } } });
                } else {
                    cond.push({ $match: { transType: parseInt(req.query.transType) } });
                }
            };

            if (_.has(req.query, 'agentId') && req.query.agentId.length > 0) {
                cond.push({ $match: { agentId: { $in: _.arrayObjectId(req.query.agentId) } } });
            }

            if (_.has(req.query, 'deviceId')) {
                cond.push({ $match: { deviceId: { $regex: new RegExp(_.stringRegex(req.query.deviceId), 'i') } } });
            }

            if (req.query.date) {
                var _d1 = _moment(req.query.date.split(' - ')[0], 'DD/MM/YYYY');
                var _d2 = req.query.date.split(' - ')[1] ? _moment(req.query.date.split(' - ')[1], 'DD/MM/YYYY') : _moment(_d1).endOf('day');

                var startDay = (_d1._d < _d2._d) ? _d1 : _d2;
                var endDay = (_d1._d < _d2._d) ? _d2 : _d1;
                startDay = startDay.startOf('day');
                endDay = endDay.endOf('day');

                cond.push({ $match: { startTime: { $gte: startDay._d.getTime(), $lt: endDay._d.getTime() } } });
            };

            var __query = parseJSONToObject(JSON.stringify(cond));

            if (_.has(req.query, 'download') && !_.isEqual(req.query.download, '0')) {
                return callback('download', cond, parseInt(req.query.totalResult));
            }

            cond.push({ $sort: { startTime: -1 } });
            if (!_.isEmpty(sort)) cond.push({ $sort: sort });

            // cond.push(
            //     { $skip: (page - 1) * rows },
            //     { $limit: rows }
            // );

            cond.push.apply(cond, collectCDRInfo());
            _Recording.aggregate(cond, function (err, result) {
                /* 21nov2016 hoangdv Kiểm tra nếu query không lỗi thì mới tạo paging*/
                if (!err) {
                    if (_.has(req.query, 'socketId')
                        && (_.isEqual(req.query.ignoreSearch, '1')
                            || result.length > 0)) {
                        createPaging(req, __query, page, rows);
                    }
                }

                callback(err, result);
            });
        }
    ], callback);
}

/**
 * Tạo phân trang
 * @param req
 * @param aggregate
 * @param page
 * @param rows
 */
function createPaging(req, aggregate, page, rows) {
    aggregate.push({
        $group: {
            _id: null,
            count: {
                $sum: 1
            }
        }
    });

    _Recording.aggregate(aggregate, function (err, result) {
        var obj = {};
        if (err) {
            obj = { code: 500, message: err.message, formId: req.query.formId, dt: req.query.dt };
        } else {
            var paginator = new pagination.SearchPaginator({
                prelink: '/report-call-monitor',
                current: page,
                rowsPerPage: rows,
                totalResult: _.isEmpty(result[0]) ? 0 : result[0].count
            });

            obj = { code: 200, message: paginator.getPaginationData(), formId: req.query.formId, dt: req.query.dt }
        }

        sio.to(req.query.socketId).emit('responseReportCallMonitorPagingData', obj);
    });
}
/**
 * Câu lệnh truy vấn dữ liệu liên quan của báo cáo
 * @returns {*[]}
 */
function collectCDRInfo() {
    return [
        {
            $lookup: {
                from: 'users',
                localField: 'agentId',
                foreignField: '_id',
                as: 'agentId'
            }
        },
        { $unwind: { path: '$agentId', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'recordinginfos',
                localField: 'callId',
                foreignField: 'callId',
                as: 'phone'
            }
        },
        { $unwind: { path: '$phone', preserveNullAndEmptyArrays: true } },
        // {
        //     $group: {
        //         callId: { $first: "$callId" },
        //     }
        // },
        {
            $project: {
                _id: 1,
                user: { $concat: ['$agentId.displayName', ' (', '$agentId.name', ')'] },
                transType: 1,
                startTime: 1,
                endTime: 1,
                callId: 1,
                callDuration: 1,
                recordPath: 1,
                deviceId: 1,
                phone: {
                    "$cond": {
                        "if": { $eq: ["$transType", 6] },
                        "then": "$phone.called", // Gọi ra
                        "else": "$phone.caller"  // Gọi vào
                    }
                }
            }
        }
    ];
}

/**
 * Export excel
 * @param req
 * @param res
 * @param conditions Điều kiên tìm kiếm
 * @param totalResult
 */
function exportExcel(req, res, optionsQuery) {
    var maxRecordPerFile = 2000;
    var maxParallelTask = 5;
    var waterFallTask = [];
    var currentDate = new Date();
    var folderName = req.session.user._id + "-" + currentDate.getTime();
    var fileName = titlePage + ' ' + _moment(currentDate).format('DD-MM-YYYY');

    var date = new Date().getTime();

    // if (totalResult > maxRecordPerFile) {
    //     // Tách báo cáo thành nhiều phần
    //     return res.json({code: 500, message: 'nhieu du lieu qua'})
    //     for (var k = 0; k < Math.ceil(totalResult / (maxRecordPerFile * maxParallelTask)); ++k) {
    //         var tempWaterfall = [];
    //         if (k == 0) {
    //             tempWaterfall = function (callback) {
    //                 _async.parallel(createParallelTask(index), callback);
    //             }
    //         } else {
    //             tempWaterfall = function (objectId, callback) {
    //                 var lastObjectId = objectId[maxParallelTask - 1];
    //                 _async.parallel(createParallelTask(index, lastObjectId), callback);
    //             }
    //         }

    //         waterFallTask.push(tempWaterfall);
    //     }

    //     /**
    //      * Tạo vòng lặp parallel truy vấn dữ liệu báo cáo
    //      * @param index
    //      * @param objectId
    //      * @returns {Array}
    //      */
    //     var createParallelTask = function (index, objectId) {
    //         var tempParallelTask = [];
    //         for (var i = 0; i < maxParallelTask; ++i) {
    //             var temp = function (callback) {
    //                 var agg = parseJSONToObject(JSON.stringify(conditions));
    //                 if (_.isEmpty(objectId)) {
    //                     agg.push({ $limit: maxRecordPerFile });
    //                 } else {
    //                     agg.push({ $match: { _id: { $gt: objectId } } }, { $limit: maxRecordPerFile });
    //                 }

    //                 agg.push.apply(agg, collectCDRInfo());

    //                 _Recording.aggregate(agg, function (err, result) {
    //                     if (err) return callback(err, null);
    //                     createExcelFile(req
    //                         , folderName
    //                         , fileName + '-' + index + '-' + i
    //                         , result
    //                         , callback);
    //                 });
    //             };

    //             tempParallelTask.push(temp);
    //         }
    //         return tempParallelTask;
    //     }
    // } else {
        var temp = function (callback) {
            // conditions.push.apply(conditions, collectCDRInfo());
            
            getReportData(optionsQuery, true).then(result => {
            // _Recording.aggregate(conditions, function (err, result) {
                // if (err) return callback(err, null);
                createExcelFile(req
                    , folderName
                    , fileName
                    , result.results
                    , callback);
            }).catch(err => {
                console.log(err);
                callback(err);
            });
        };
        waterFallTask.push(temp);
    // }

    // Tạo báo cáo và lưu vào thư mục
    waterFallTask.push(
        function (objectId, callback) {
            _async.parallel({
                archiver: function (callback) {
                    fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), callback);
                },
                cdr: function (callback) {
                    fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'), callback);
                }
            }, callback);
        },
        function (t, callback) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                callback(err, folderZip.replace(_rootPath, ''));
            });
        }
    );

    _async.waterfall(waterFallTask, function (err, folderZip) {
        res.json({ code: err ? 500 : 200, message: err ? err.message || err : folderZip });
    });
}

/**
 * Tạo file excel
 * @param req
 * @param folderName
 * @param fileName
 * @param data
 * @param callback
 */
function createExcelFile(req, folderName, fileName, data, callback) {
    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'cdr', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    console.log(fileName);

    _async.waterfall([
        function createFolder(callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr', folderName), callback);
        },
        function (t, callback) {
            fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), callback);
        },
        // Ghi dữ liệu ra file
        function createExcelFile(_config, callback) {
            var excelHeader = [
                'TXT_CALL_TYPE'
                , 'TXT_AGENT'
                , 'TXT_PHONE_NUMBER'
                , 'TXT_DATE'
                , 'TXT_START_TIME'
                , 'TXT_END_TIME'
                , 'TXT_SERVICED_TIME'
            ];

            var workbook = new _Excel.Workbook();
            workbook.creator = req.session.user.displayName;
            workbook.created = new Date();
            var sheet = workbook.addWorksheet(titlePage);
            var column = [];

            _.each(excelHeader, function (header) {
                column.push({
                    header: _config.MESSAGE.REPORT_CALL_MONITOR[header],
                    key: header,
                    width: _config.MESSAGE.REPORT_CALL_MONITOR[header].length
                });
            });
            sheet.columns = column;

            if (data !== null) {
                // Ghi dữ liệu
                _async.eachSeries(data, function (el, callback) {
                    sheet.addRow([
                        el.direction,
                        el.agent,
                        el.phone,
                        _moment(el.startTime).format("DD/MM/YYYY"),
                        _moment(el.startTime).format("HH:mm:ss DD/MM/YYYY"),
                        _moment(el.endTime).format("HH:mm:ss DD/MM/YYYY"),
                        _moment().startOf('day').seconds(Math.ceil(el.callDuration / 1000)).format('HH:mm:ss')
                    ]);

                    callback(null);
                }, function (err, result) {
                    workbook.xlsx.writeFile(options.filename)
                        .then(callback);
                });
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(callback);
            }
        }
    ], function (err, result) {
        callback(err, 'successsss');
    });
};

/**
 * 
 * el.transType != 6 ? 'Gọi vào' : 'Gọi ra',
                        el.user,
                        el.phone,
                        _moment(el.startTime).format("DD/MM/YYYY"),
                        _moment(el.startTime).format("HH:mm:ss DD/MM/YYYY"),
                        _moment(el.endTime).format("HH:mm:ss DD/MM/YYYY"),
                        _moment().startOf('day').seconds(Math.ceil(el.callDuration / 1000)).format('HH:mm:ss')

 * @param {*} pages 
 * @param {*} limit 
 * @param {*} config 
 * @param {*} agentInfoTelehub 
 */

function getReportData( opts, download = false) {
    let {startDate, endDate, pages, limit, config, agentInfoTelehub, filter} = opts
    
    return new Promise((resolve, reject) => {
        let pathAPI = config.ipRecording + "/api/v1/cdr/byprefix";
        let query = [];
        let opts = {
            headers: {
                "x-access-token": config.tokenDefault,
            },
            json: true
        }
        
        query.push(`startDate=${startDate}`);
        query.push(`endDate=${endDate}`);
        query.push(`prefix=${config.prefix}`);
        query.push(`pages=${pages}`); 
        query.push(`limit=${limit}`);
        query.push(`download=${download ? 1: 0}`);
        // query.push(`download=${download ? 1: 0}`);

        if(filter) {
                                               
            let {agentId, direction, phone, extension} = filter;

            if(agentId) query.push(`agentId=${agentId.join(',')}`);
            if(direction) query.push(`direction=${direction}`);
            if(phone) query.push(`phone=${phone}`);
            if(extension) query.push(`extension=${extension}`);
        }

        console.log(pathAPI + "?" + query.join("&"));
        request.get(pathAPI + "?" + query.join("&"), opts, function (err, response, body) {
            if (!err && (response && response.statusCode == 200) && body.data) {
                let data = body.data;
                let agentInfos = data.results;

                agentInfos.forEach(i => {
                    let agentFound = agentInfoTelehub.find(j => j.idAgentCisco == i.extension);

                    if(agentFound) {
                        // i._id = i.PeripheralNumber;
                        i.agent = agentFound.displayName;
                    }

                    i.direction = getDirection(i.direction);

                    i.startTime = i.connectTime;
                    i.endTime = i.disconnectTime;
                    i.callDuration = i.duration * 1000;

                });

                data.results = agentInfos;

                resolve(data);

            } else {
                reject(err ? err.message : (body && body.message ? body.message : "Có lỗi xảy ra"));
            }
        });
    });
}

function getDirection(direction) {
    let txt = '';
    switch (direction) {
        case CALL_DIRECTION_V1.IN_BOUND:
            txt = 'Gọi vào'
            break;
    
        case CALL_DIRECTION_V1.OUT_BOUND:
            txt = 'Gọi ra'
            break;
    
        default:
            txt = direction;
            break;
    }

    return txt;
}