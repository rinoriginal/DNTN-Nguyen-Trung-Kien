
var parseJSONToObject = require(path.join(_rootPath, 'queue', 'common', 'parseJSONToObject.js'));
var {
    getInfoSkillGroup
} = require('../commons/functions');

var zipFolder = require('zip-folder');
let EXCEL_CONFIG = {
    title: "BÁO CÁO GỌI VÀO - BÁO CÁO 20-80",
}

exports.index = {
    json: function (req, res) {

        let { scope, startDate, endDate, skillGroups} = req.query;
        if (startDate) {
            startDate = moment(startDate, "DD/MM/YYYY").startOf('days');
        }else {
            startDate = moment().startOf('days');
        }
        if (endDate) {
            endDate = moment(endDate, "DD/MM/YYYY").endOf('days');
        }else {
            endDate = moment().endOf('days');
        }

        startDate = startDate.format("YYYY-MM-DD HH:mm:ss");
        endDate = endDate.format("YYYY-MM-DD HH:mm:ss");

        if(scope && scope == "search-skillGroup"){

            return getListSkillGroup(startDate, endDate, (err, result) => {

                if (err) res.json({ code: 500, message: err });
                else res.json({ code: 200, message: result });
            });
        }

       
        /*
         1: Khách hàng route đến agent rồi dập máy  -            serviceType:3 | reason: 0 | subreason: 1  | answerTime: 0
         2: Khách hàng dập máy trên Queue -                      serviceType:2 | reason: 0 | subreason: 1  | answerTime: 0
         3: Điện thoại viên không nhấc máy -                     serviceType:3 | reason: 0 | subreason: 4  | answerTime: 0 agentAnswer = 0
         4: Điện thoại viên từ chối cuộc gọi (ấn nút reject) -   serviceType:3 | reason: 8 | subreason: 5  | answerTime: 0
         5: Tất cả các điện thoại viện đều bận -                 serviceType:2 | reason: 0 | subreason: 15 | answerTime: 0
         */
        _async.waterfall([
            function (next) {
                permissionConditions(req, next);
            },
            function (cond, next) {

                getReport2080(startDate, endDate, skillGroups, next);
            }
        ], function (err, result) {
            
            if (err) return res.json({
                code: 500,
                message: err
            });
            if (_.has(req.query, 'download')) {
                exportExcel(req, res, result);
                return;
            } else {
                res.json({
                    code: err ? 500 : 200,
                    message: err ? err : result
                });
            }
        });

    },
    html: function (req, res) {
        let startDate = _moment().startOf("day").format("YYYY-MM-DD HH:mm:ss");
        let endDate =  _moment().endOf("day").format("YYYY-MM-DD HH:mm:ss");

        var companyId = {};
        if (req.session.auth.company) {
            companyId._id = _.convertObjectId(req.session.auth.company._id);
        }

        _async.waterfall([
            function(cb){
                return _Company.find(companyId, cb);
            }, function(companies, cb) {
                return getInfoSkillGroup(_config.cisco.apiCisco, (err, skillGroups) => {
                    if(err) return cb(err);
                    else cb(null, companies, skillGroups);
                });
            }
        ], function(err, companies, skillGroups){
            if(err)
                _.render(req, res, "500", {}, true, new Error(err));
            else if(!_config.cisco.apiCisco.callType.CT_IVR) {
                _.render(req, res, "400", {}, true, new Error("Config CallType IVR is required !"));
            }else 
                _.render(req, res, 'report-inbound-20-80', {
                    title: EXCEL_CONFIG.title,
                    plugins: ['moment', 'highchart', ['bootstrap-select'],
                        ['bootstrap-datetimepicker'], 'export-excel', ['chosen']
                    ],
                    companies: companies,
                    skillGroups: skillGroups,
                    callTypes: _config.cisco.apiCisco.callType
                }, true, err);
        });
        
    }
};

/**
 * Xuất báo cáo ra file excel, trả lại đường dẫn file excel trên server
 * @param req
 * @param data
 * @param callback
 */
function exportExcel(req, data, callback) {
    var waterFallTask = [];
    var currentDate = new Date();
    var folderName = req.session.user._id + "-" + currentDate.getTime();
    var fileName = EXCEL_CONFIG.title + ' ' + _moment(currentDate).format('DD-MM-YYYY');


    waterFallTask.push(function (next) {
        createExcelFile(req, folderName, fileName, data, next);
    });

    waterFallTask.push(
        function (objectId, next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'), next);
        },
        function (t, next) {
            var folderPath = path.join(_rootPath, 'assets', 'export', 'ticket', folderName);
            var folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
            zipFolder(folderPath, folderZip, function (err) {
                next(err, folderZip.replace(_rootPath, ''));
            });
        }
    );

    _async.waterfall(waterFallTask, callback);
}

function permissionConditions(req, callback) {
    if (!(req.session && req.session.auth)) {
        var err = new Error('session auth null');
        return callback(err);
    };
    var _company = null;
    var _group = null;
    var cond = [];
    if (req.session.auth.company && !req.session.auth.company.leader) {
        // Team lead - Agent
        _company = req.session.auth.company._id;
        if (req.session.auth.company.group.leader) {
            // Team lead
            _group = req.session.auth.company.group._id;
        } else {
            // Agent
            cond.push({
                $match: {
                    agentId: new mongodb.ObjectId(req.session.user._id.toString())
                }
            });
        }
    } else if (req.session.auth.company && req.session.auth.company.leader) {
        // Company Leader
        _company = req.session.auth.company._id;
    } else if (!req.session.auth.company) {
        // Leader
    };

    _async.waterfall([
        function (next) {
            if (_group) {
                _Users.distinct('_id', {
                    $or: [{
                        agentGroupLeaders: {
                            $elemMatch: {
                                group: _group
                            }
                        }
                    }, {
                        agentGroupMembers: {
                            $elemMatch: {
                                group: _group
                            }
                        }
                    }]
                }, function (err, result) {
                    cond.push({
                        $match: {
                            agentId: {
                                $in: result
                            }
                        }
                    });
                    next(err);
                });
            } else {
                next(null);
            };
        },
        function (next) {
            var aggs = [];
            if (_company) aggs.push({
                $match: {
                    _id: new mongodb.ObjectId(_company.toString())
                }
            });
            if (req.query.companies && req.query.companies.length > 0) aggs.push({
                $match: {
                    _id: {
                        $in: _.arrayObjectId(req.query.companies)
                    }
                }
            });
            aggs.push({
                $lookup: {
                    from: 'services',
                    localField: '_id',
                    foreignField: 'idCompany',
                    as: 'services'
                }
            });
            aggs.push({
                $unwind: "$services"
            });
            aggs.push({
                $group: {
                    _id: '$services._id'
                }
            });

            _Company.aggregate(aggs, next);
        }
    ], function (err, result) {
        cond.push({
            $match: {
                serviceId: {
                    $in: _.pluck(result, '_id')
                }
            }
        });
        callback(err, cond);
    });
};

/**
 * Tạo file excel trên hệ thống
 * @param req
 * @param folderName
 * @param fileName
 * @param data
 * @param callback
 */
function createExcelFile(req, folderName, fileName, data, callback) {
    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'ticket', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function (next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'ticket', folderName), next);
        },
        function (t, next) {
            fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), next);
        },
        function (_config, next) {
            var excelHeader = [
                'TXT_INDEX_MONITOR',
                'TXT_SKILL_GROUP',
                'TXT_TARGET',
                'TXT_RESULT',
                'TXT_RATIO'
            ];

            var workbook = new _Excel.Workbook();
            workbook.creator = req.session.user.displayName;
            workbook.created = new Date();
            var sheet = workbook.addWorksheet('Chi tiết');
            let startRow = 9;
            
            creatTitleExcel(sheet, EXCEL_CONFIG.title, req.query.startTime, req.query.endTime);

            var column = [];
//  var excelHeader = [
//                 { name: "STT", width: 10 },//"TT"
//                 { name: "NHÓM KHIẾU NẠI", width: 60 },// "Nhóm Khiếu nại",
//             ];
            var mainTitle = [];

            _.each(excelHeader, function (header) {
                mainTitle.push(_config.MESSAGE.REPORT_INBOUND_20_80[header].toUpperCase());
            });

            sheet.getRow(startRow).values = mainTitle;

            _.each(excelHeader, function (header, i) {
                let charNameColumn = _.columnToLetter(i + 1);
                let currentCell = sheet.lastRow.getCell(charNameColumn);
                currentCell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                }
                currentCell.font = {
                    name: EXCEL_CONFIG.fontName,
                    family: 4,
                    size: 13,
                    bold: true
                };
                currentCell.alignment = { vertical: 'middle', horizontal: 'center' };
            });


            if (data !== null) {
                function hms(secs) {
                    var sec = Math.ceil(secs);
                    var minutes = Math.floor(sec / 60);
                    sec = sec % 60;
                    var hours = Math.floor(minutes / 60);
                    minutes = minutes % 60;
                    return _.pad(hours, 2, '0') + ":" + _.pad(minutes, 2, '0') + ":" + _.pad(sec, 2, '0');
                }
                function getType(type, duration) {
                    switch (type) {
                        case 1:
                            return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_1'];
                        case 2:
                            return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_2'];
                        case 3:
                            if(duration < 9) return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_2']; 

                            return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_3'];
                        case 4:
                            return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_4'];
                        case 5:
                            return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_5'];
                        case 6:
                            return _config.MESSAGE.REPORT_INBOUND_MISSCALL['TXT_TYPE_OTHER'];
                        default: return '';
                    }
                }
                startRow += 1;

                _async.eachSeries(data, function (item, cb) {
   
                    item.childs.forEach(itemChild => {
                        var row = [
                            item.name ? item.name : '',
                            itemChild.name ? itemChild.name : '',
                            itemChild.target ? itemChild.target : '',
                            itemChild.result ? itemChild.result : '',
                            itemChild.ratio ? itemChild.ratio : '',
                        ];
                        sheet.addRow(row);

                        _.each(excelHeader, function (header, i) {
                            let charNameColumn = _.columnToLetter(i + 1);
                            let currentCell = sheet.lastRow.getCell(charNameColumn)
                            currentCell.border = {
                                top: { style: "thin" },
                                left: { style: "thin" },
                                bottom: { style: "thin" },
                                right: { style: "thin" }
                            }
                            currentCell.font = {
                                name: EXCEL_CONFIG.fontName,
                                family: 4,
                            };

                            if(charNameColumn == "D") {
                                currentCell.alignment = { vertical: 'middle', horizontal: 'left' };
                            }
                        });
                    });
                    let endRow = startRow + (item.childs.length - 1);
                    let merge = 'A' + startRow + ':A' + endRow;
                    console.log(merge);
                    startRow += item.childs.length;
                    sheet.mergeCells(merge);

                    // sheet.getRow(sheet._rows.length).alignment = { wrapText: true };
                    cb();
                }, function (err, result) {
                    workbook.xlsx.writeFile(options.filename)
                        .then(next);
                });
            } else {
                workbook.xlsx.writeFile(options.filename)
                    .then(next);
            }
        }
    ], function (err, result) {
        callback(err, data[data.length - 1]._id);
    });
}


function creatTitleExcel(worksheet, titleReport, startDate, endDate) {
    let phongBan = 'PHÒNG CHĂM SÓC KHÁCH HÀNG';
    let CHXHCNVN = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    worksheet.getColumn('A').width = 45;
    worksheet.getColumn('B').width = 20;
    worksheet.getColumn('C').width = 20;
    worksheet.getColumn('D').width = 20;
    worksheet.getColumn('E').width = 20;
    worksheet.getColumn('F').width = 35;
    worksheet.getColumn('G').width = CHXHCNVN.length;

    worksheet.getCell('A1').value = 'GOLDEN GATE';
    worksheet.getCell('A2').value = phongBan;

    worksheet.mergeCells('A1:B1');
    worksheet.mergeCells('A2:B2');
    worksheet.getCell('A1').font = { 'name': EXCEL_CONFIG.fontName, 'bold': true };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('A2').font = { 'name': EXCEL_CONFIG.fontName, 'bold': true };

    worksheet.getCell('F1').value = CHXHCNVN;
    worksheet.getCell('F2').value = 'Độc lập - Tự do - Hạnh phúc';
    worksheet.mergeCells('F1:I1');
    worksheet.mergeCells('F2:I2');
    worksheet.getCell('F1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('F1').font = { 'name': EXCEL_CONFIG.fontName, 'bold': true };
    worksheet.getCell('F2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getCell('F2').font = { 'name': EXCEL_CONFIG.fontName, 'bold': true };

    worksheet.getCell('A5').value = titleReport;
    worksheet.mergeCells('A5:I5');
    worksheet.getCell('A5').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 16, underline: 'true', bold: true };
    worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
    // worksheet.mergeCells('A11:A14');

    if (startDate && endDate) {
        var str = '(Thời gian từ ngày: ';
        str += startDate + ' đến ngày: ' + endDate + ')';
        worksheet.getCell('A6').value = str;
        worksheet.mergeCells('A6:I6');
        worksheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell('A6').font = { name: EXCEL_CONFIG.fontName };

    } else {
        worksheet.getCell('A6').value = '(Thời gian từ ngày ... đến ngày ...)';
        worksheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.mergeCells('A6:I6');
        worksheet.getCell('A6').font = { name: EXCEL_CONFIG.fontName };

    }

    worksheet.addRow([]);
}

var msToTime = function (s) {
    if (s == 0) return '00:00:00';
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
    return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
};

// DUONGNB: Add detail misscall report
exports.new = function (req, res) {
    let { scope, startDate, endDate, skillGroups} = req.query;

    if (startDate) {
        startDate = moment(startDate, "DD/MM/YYYY").startOf('days');
    }else {
        startDate = moment().startOf('days');
    }
    if (endDate) {
        endDate = moment(endDate, "DD/MM/YYYY").endOf('days');
    }else {
        endDate = moment().endOf('days');
    }

    startDate = startDate.format("YYYY-MM-DD HH:mm:ss");
    endDate = endDate.format("YYYY-MM-DD HH:mm:ss");

    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;


    _async.waterfall([
        function (next) {
            permissionConditions(req, next);
        },
        function (cond, next) {

            var isDownload = false;
            if (_.has(req.query, 'download') && req.query['download'] == 1) {
                isDownload = true;
            } else {
                isDownload = false;
            }
            getReport2080(startDate, endDate, skillGroups, (err, result) => {

                if (err) return next(err, null);
                if (isDownload) {
                    exportExcel(req, result, next);
                } else {
                    // if (_.has(req.query, 'socketId') &&
                    //     result.length > 0) {
                    //     createPaging(req, startDate, endDate, page, rows, skillGroups);
                    // }
                    next(err, result);
                }
            });
        }
    ], function (err, result) {
        res.json({
            code: err ? 500 : 200,
            message: err ? err.message : result
        });
    });
};

function createPaging(req, startDate, endDate, page, rows, skillGroups) {

    getTotalPaging(startDate, endDate, skillGroups, (err, total) => {

        var obj = {};
        if (err || !total[0]) {
            obj = {code: 500, message: err.message, formId: req.query.formId, dt: req.query.dt, extra: {}};
        } else {
            var _total = _.isEmpty(total[0]) ? 0 : total[0].count;
            var paginator = new pagination.SearchPaginator({
                prelink: '/report-inbound-misscall',
                current: page,
                rowsPerPage: rows,
                totalResult: _total
            });
            obj = {
                code: 200,
                message: paginator.getPaginationData(),
                formId: req.query.formId,
                dt: req.query.dt,
                extra: total[0]
            }
        }

        sio.sockets.socket(req.query.socketId).emit('responseReportInboundMissCallData', obj);

    });
}

/**
 * Click Tìm kiếm - Tổng quát
 * @param {*} startDate 
 * @param {*} endDate 
 * @param {*} skillGroups 
 * @param {*} callback 
 */
function getReport2080(startDate, endDate, skillGroups, callback) {
    let configCisco =_config.cisco.apiCisco;
    let {
        CT_IVR,
        CT_ToAgentGroup1,
        CT_ToAgentGroup2,
        CT_ToAgentGroup3,
        CT_Queue1,
        CT_Queue2,
        CT_Queue3
    } = configCisco.callType;
    let {
        SG_Voice_1,
        SG_Voice_2,
        SG_Voice_3,
    } = configCisco.skillGroup;

    let call_type_tranfer_voice = configCisco.callTypeTranfer.voice;
    let pathApi = configCisco.ip + "/api/v1/reportCustomize/report-20-80";
    let opts = {
        headers: {
            "x-access-token": configCisco.token,
        },
        json: true
    }
    let query = [];
    query.push(`startDate=${startDate}`);
    query.push(`endDate=${endDate}`);
    query.push(`CT_IVR=${CT_IVR}`);
    query.push(`CT_ToAgentGroup1=${CT_ToAgentGroup1}`);
    query.push(`CT_ToAgentGroup2=${CT_ToAgentGroup2}`);
    query.push(`CT_ToAgentGroup3=${CT_ToAgentGroup3}`);
    query.push(`CT_Queue1=${CT_Queue1}`);
    query.push(`CT_Queue2=${CT_Queue2}`);
    query.push(`CT_Queue3=${CT_Queue3}`);

    if(SG_Voice_1){
        query.push(`SG_Voice_1=${SG_Voice_1}`);
    }
    if(SG_Voice_2){
        query.push(`SG_Voice_2=${SG_Voice_2}`);
    }
    if(SG_Voice_3){
        query.push(`SG_Voice_3=${SG_Voice_3}`);
    }
    
    query.push(`CT_Tranfer=${call_type_tranfer_voice}`);
    if(skillGroups) query.push(`skillGroups=${skillGroups}`);
    // query.push(`callDisposition=19,3,60,7`);

    _request.get(pathApi + "?" + query.join("&"), opts, function(err, response, body) {
        if (!err && (response && response.statusCode == 200) ) {
			let data = body.data.recordset;
            
			// let dataMapping = mappingData(data);
            // callback(null, dataMapping);
			callback(null, data);
			
        }else {
            callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
        }
    })
}

function getReportTCDMissCallDetailAgent(startDate, endDate, pages, rows, download, skillGroups, callback) {
    let configCisco =_config.cisco.apiCisco;
    let {
        CT_IVR,
        CT_ToAgentGroup1,
        CT_ToAgentGroup2,
        CT_ToAgentGroup3,
        CT_Queue1,
        CT_Queue2,
        CT_Queue3,
    } = configCisco.callType;
    let {
        SG_Voice_1,
        SG_Voice_2,
        SG_Voice_3,
    } = configCisco.skillGroup;

    let call_type_tranfer_voice = configCisco.callTypeTranfer.voice;
    let pathApi = configCisco.ip + "/api/v1/reportTCDCallTypeAgentDetail/missCallByCustomer";
    let opts = {
        headers: {
            "x-access-token": configCisco.token,
        },
        json: true
    }
    let query = [];
    query.push(`startDate=${startDate}`);
    query.push(`endDate=${endDate}`);
    query.push(`CT_IVR=${CT_IVR}`);
    query.push(`CT_ToAgentGroup1=${CT_ToAgentGroup1}`);
    query.push(`CT_ToAgentGroup2=${CT_ToAgentGroup2}`);
    query.push(`CT_ToAgentGroup3=${CT_ToAgentGroup3}`);
    query.push(`CT_Queue1=${CT_Queue1}`);
    query.push(`CT_Queue2=${CT_Queue2}`);
    query.push(`CT_Queue3=${CT_Queue3}`);
    query.push(`CT_Tranfer=${call_type_tranfer_voice}`);

    if(SG_Voice_1){
        query.push(`SG_Voice_1=${SG_Voice_1}`);
    }
    if(SG_Voice_2){
        query.push(`SG_Voice_2=${SG_Voice_2}`);
    }
    if(SG_Voice_3){
        query.push(`SG_Voice_3=${SG_Voice_3}`);
    }

    if(skillGroups) query.push(`skillGroups=${skillGroups}`);


    if(download === "1"){
        query.push(`download=1`);
    }else {
        query.push(`pages=${pages}`);
        query.push(`rows=${rows}`);
    }

    _request.get(pathApi + "?" + query.join("&"), opts, function(err, response, body) {
        if (!err && (response && response.statusCode == 200) ) {
			let data = body.data.recordset;
            
			let dataMapping = mappingDataDetail(data);
            callback(null, dataMapping);
			// callback(null, data);
			
        }else {
            callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
        }
    })
}

function getTotalPaging(startDate, endDate, skillGroups, callback) {
    let configCisco =_config.cisco.apiCisco;
    let {
        CT_IVR,
        CT_ToAgentGroup1,
        CT_ToAgentGroup2,
        CT_ToAgentGroup3,
        CT_Queue1,
        CT_Queue2,
        CT_Queue3,
    } = configCisco.callType;
    let {
        SG_Voice_1,
        SG_Voice_2,
        SG_Voice_3,
    } = configCisco.skillGroup;
    
    let call_type_tranfer_voice = configCisco.callTypeTranfer.voice;
    let pathApi = configCisco.ip + "/api/v1/reportTCDCallTypeAgentDetail/missCallByCustomer";
    let opts = {
        headers: {
            "x-access-token": configCisco.token,
        },
        json: true
    }
    let query = [];
    query.push(`startDate=${startDate}`);
    query.push(`endDate=${endDate}`);
    query.push(`CT_IVR=${CT_IVR}`);
    query.push(`CT_ToAgentGroup1=${CT_ToAgentGroup1}`);
    query.push(`CT_ToAgentGroup2=${CT_ToAgentGroup2}`);
    query.push(`CT_ToAgentGroup3=${CT_ToAgentGroup3}`);
    query.push(`CT_Queue1=${CT_Queue1}`);
    query.push(`CT_Queue2=${CT_Queue2}`);
    query.push(`CT_Queue3=${CT_Queue3}`);
    query.push(`CT_Tranfer=${call_type_tranfer_voice}`);

    if(SG_Voice_1){
        query.push(`SG_Voice_1=${SG_Voice_1}`);
    }
    if(SG_Voice_2){
        query.push(`SG_Voice_2=${SG_Voice_2}`);
    }
    if(SG_Voice_3){
        query.push(`SG_Voice_3=${SG_Voice_3}`);
    }

    if(skillGroups) query.push(`skillGroups=${skillGroups}`);
    query.push(`paging=1`);

    _request.get(pathApi + "?" + query.join("&"), opts, function(err, response, body) {
        if (!err && (response && response.statusCode == 200) ) {
			let data = body.data.recordset;
			callback(null, data);			
        }else {
            callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
        }
    })
}

function mappingDataDetail(data) {
    let lastData = [];

    
    data.forEach(item => {
        let endTime = _moment(item.DateTime).add(item.TimeZone, "minutes").valueOf();

        var element = {
            _id: item.RecoveryKey,
            caller: item.ANI,
            endTime: endTime,
            name: EXCEL_CONFIG.congTy,
            startTime: _moment(item.StartDateTimeUTC).valueOf(),
            type: Number(item.MissReason.split("-")[1]),
            waitDuration: item.Duration * 1000,
        };

        lastData.push(element);
    });

	return lastData;
}

function getListSkillGroup(startDate, endDate, callback) {
    let configCisco =_config.cisco.apiCisco;
    let {
        CT_IVR,
        CT_ToAgentGroup1,
        CT_ToAgentGroup2,
        CT_ToAgentGroup3,
        CT_Queue1,
        CT_Queue2,
        CT_Queue3,
    } = configCisco.callType;

    let call_type_tranfer_voice = configCisco.callTypeTranfer.voice;
    let pathApi = configCisco.ip + "/api/v1/skillGroup/distinctTCD";
    let opts = {
        headers: {
            "x-access-token": configCisco.token,
        },
        json: true
    }
    let query = [];
    query.push(`startDate=${startDate}`);
    query.push(`endDate=${endDate}`);
    query.push(`CT_IVR=${CT_IVR}`);
    query.push(`CT_ToAgentGroup1=${CT_ToAgentGroup1}`);
    query.push(`CT_ToAgentGroup2=${CT_ToAgentGroup2}`);
    query.push(`CT_ToAgentGroup3=${CT_ToAgentGroup3}`);
    query.push(`CT_Queue1=${CT_Queue1}`);
    query.push(`CT_Queue2=${CT_Queue2}`);
    query.push(`CT_Queue3=${CT_Queue3}`);
    query.push(`CT_Tranfer=${call_type_tranfer_voice}`);

    _request.get(pathApi + "?" + query.join("&"), opts, function(err, response, body) {
        if (!err && (response && response.statusCode == 200) ) {
			let data = body.data.recordset;
			callback(null, data);			
        }else {
            callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
        }
    })
}


// function getInfoSkillGroup(callback) {
//     let configCisco =_config.cisco.apiCisco;
//     let {
//         SG_Voice_1,
//         SG_Voice_2,
//         SG_Voice_3,
//     } = configCisco.skillGroup;

//     let pathApi = configCisco.ip + "/api/v1/skillGroup/byIds";
//     let opts = {
//         headers: {
//             "x-access-token": configCisco.token,
//         },
//         json: true
//     }
//     let query = [];
//     let ids = [];

//     if (SG_Voice_1) ids.push(SG_Voice_1);
//     if (SG_Voice_2) ids.push(SG_Voice_2);
//     if (SG_Voice_3) ids.push(SG_Voice_3);
//     query.push(`ids=${ids}`);

//     _request.get(pathApi + "?" + query.join("&"), opts, function(err, response, body) {
//         if (!err && (response && response.statusCode == 200) ) {
// 			let data = body.data.recordset;
// 			callback(null, data);			
//         }else {
//             callback(err || (body && body.message ? body.message : "Có lỗi xảy ra"));
//         }
//     })
// }