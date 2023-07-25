
var titlePage = 'Báo cáo yêu cầu gọi lại';
var titleHeadTable = [
    { key: 'STT', value: 'STT', },
    { key: 'SĐT', value: 'Số điện thoại', },
    { key: 'time_call', value: 'Thời gian bắt đầu', },
    { key: 'time_end', value: 'Thời gian kết thúc', },
    { key: 'queue', value: 'Chọn Queue', },
    { key: 'status', value: 'Trạng thái gọi lại', }
]
var {
    getRequestDefault
} = require(path.join(_rootPath, 'commons', 'functions', 'index.js'));

var zipFolder = require('zip-folder');

exports.index = {
    json: function (req, res) {
        getCdr(req, res, function (err, result, page) {
            if (err && _.isString(err)) {
                var conditions = arguments[1];
                var totalResult = arguments[2];
                exportExcel(req, res, conditions, totalResult);
                return;
            }
            res.json({
                code: err ? 500 : 200,
                message: err ? err.message : result,
                page: page
            });
        });
    },
    html: function (req, res) {
        _.render(req, res, 'report-request-recall', {
            title: titlePage,
            queueG1: _config.cisco.apiCisco.skillGroup.SG_Voice_1,
            queueG2: _config.cisco.apiCisco.skillGroup.SG_Voice_2,
            queueG3: _config.cisco.apiCisco.skillGroup.SG_Voice_3,
            plugins: ['moment', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
        }, true);
    }
};


function getCdr(req, res, callback) {
    var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
    _async.waterfall([
        function (callback) {
            getServicesId(req, res, callback);
        },
        function (serviceId, callback) {
            var agg = {};
            let queue = "";
            let status = "";
            if (!_.isNull(serviceId)) agg['serviceId'] = { $in: serviceId };

            if (!req.query.startDate && req.query.endDate || !req.query.endDate && req.query.startDate) {
                return res.json({ code: 500, message: "Vui lòng nhập đầy đủ cả Ngày bắt đầu và Ngày kết thúc !" });
            }

            if (_.has(req.query, 'startDate') && _.has(req.query, 'endDate')) {
                startDate = _moment(req.query.startDate, "DD/MM/YYYY HH:mm:ss").startOf("day").format("YYYY-MM-DD HH:mm:ss");
                endDate = _moment(req.query.endDate, "DD/MM/YYYY HH:mm:ss").endOf("day").format("YYYY-MM-DD HH:mm:ss");
            } else {
                startDate = _moment().startOf("day").format("YYYY-MM-DD HH:mm:ss");
                endDate = _moment().endOf("day").format("YYYY-MM-DD HH:mm:ss");
            }

            if (_.has(req.query, 'status')) {
                status = req.query.status
            }

            if (_.has(req.query, 'queue')) {
                queue = req.query.queue
            }

            agg.startDate = startDate;
            agg.endDate = endDate;
            agg.queue = queue;
            agg.status = status;

            if (_.has(req.query, 'download') && !_.isEqual(req.query.download, '0')) {
                return callback('download', agg, parseInt(req.query.totalResult));
            }

            getReportRequestRecall(status, queue, startDate, endDate, page, rows, req.query.download, (err, result, page) => {
                if (err) return console.log(err, null);

                createPaging(req, startDate, endDate, queue, status, page, rows);
                callback(err, result, page);
            });
        }
    ], callback);
}

function getServicesId(req, res, callback) {
    if (_.isNull(req.session.auth.company)) {
        if (_.has(req.query, 'company')) {
            _Services.find({ idCompany: { $in: _.arrayObjectId(req.query.company) } },
                { _id: 1 },
                function (err, result) {
                    callback(err, _.pluck(result, '_id'));
                });
        } else {
            callback(null, null);
        }
    } else {
        _Services.find({ idCompany: { $in: _.arrayObjectId(req.query.company) } },
            { _id: 1 },
            function (err, result) {
                callback(err, _.pluck(result, '_id'));
            });
    }
}

function createPaging(req, startDate, endDate, queue, status, page, rows) {
    getTotalPaging(status, queue, startDate, endDate, (err, total) => {
        var obj = {};
        if (err) {
            obj = { code: 500, message: err.message, formId: req.query.formId, dt: req.query.dt, extra: total ? total[0] : 0 };
        } else {
            var paginator = new pagination.SearchPaginator({
                prelink: '/report-request-recall',
                current: page,
                rowsPerPage: rows,
                totalResult: total.length
            });
            obj = {
                code: 200,
                message: paginator.getPaginationData(),
                formId: req.query.formId,
                dt: req.query.dt,
                extra: total[0]
            }
        }
        sio.to(req.query.socketId).emit('responseReportRequestRecallPagingData', obj);
    });
}

function exportExcel(req, res, conditions, totalResult) {
    var maxRecordPerFile = 5000;
    var maxParallelTask = 5;
    var waterFallTask = [];
    var currentDate = new Date();
    var folderName = req.session.user._id + "-" + currentDate.getTime();
    var fileName = titlePage + ' ' + _moment(currentDate).format('DD-MM-YYYY');

    if (totalResult > maxRecordPerFile) {
        let tempWaterfall = function (cb) {
            cb({ message: "Dữ liệu vượt quá kích cỡ cho phép" });
        }
        waterFallTask.push(tempWaterfall);

    } else {
        var temp = function (callback) {
            getReportRequestRecall(conditions.status, conditions.queue, conditions.startDate, conditions.endDate, null, null, req.query.download, (err, result) => {
                if (err) return callback(err, null);
                createExcelFile(
                    conditions.startDate
                    , conditions.endDate
                    , req
                    , folderName
                    , fileName
                    , result
                    , callback);
            });
        };
        waterFallTask.push(temp);
    }

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
        res.json({ code: err ? 500 : 200, message: err ? err.message : folderZip });
    });
}

function createExcelFile(startDate, endDate, req, folderName, fileName, data, callback) {
    var options = {
        filename: path.join(_rootPath, 'assets', 'export', 'cdr', folderName, fileName + '.xlsx'),
        useStyles: true,
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };

    _async.waterfall([
        function createFolder(callback) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr', folderName), callback);
        },
        function (t, callback) {
            fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), callback);
        },
        function createExcelFile(_config, callback) {
            var workbook = new _Excel.Workbook();
            workbook.creator = req.session.user.displayName;
            workbook.created = new Date();
            var sheet = workbook.addWorksheet(titlePage);
            setWeightColumn(sheet);
            createTitleExcel(sheet, startDate, endDate);
            createHead(sheet);
            if (data !== null) {
                let index = 1;
                _async.eachSeries(data, function (item, callback) {
                    sheet.addRow([
                        index,
                        item.ANI,
                        _moment(item.startTime).subtract(7, 'hours').format("HH:mm:ss DD/MM/YYYY"), //giờ từ ciso trả về là chuẩn rồi lên khi dùng moment thì trừ đi 7h
                        _moment(item.DateTime).subtract(7, 'hours').format("HH:mm:ss DD/MM/YYYY"),
                        genQueue(item.SkillGroupSkillTargetID),
                        genStatus(item.DIRECTION),
                    ]);
                    index++;
                    sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
                    sheet.lastRow.font = { name: 'Times New Roman', size: 12 };
                    for (let i = 1; i <= titleHeadTable.length; i++) {
                        let charNameColumn = _.columnToLetter(i);
                        sheet.lastRow.getCell(charNameColumn).border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" }
                        }
                    }
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
        callback(err, data[data.length - 1]._id);
    });
};

function getReportRequestRecall(status, queue, startDate, endDate, pages, rows, download, callback) {

    let options = {
        status,
        queue,
        startDate,
        endDate,
        download,
        callType: _config.cisco.apiCisco.callType,
        skillGroup: _config.cisco.apiCisco.skillGroup
    };

    if (download === "1") {
        options.download = "1";
    } else {
        options.pages = pages;
        options.rows = rows;
    }

    getRequestDefault(_config.cisco.apiCisco, `reportRequestRecall`, options, function (err, data, rowTotal, page) {
        if (!err) {
            callback(null, data, page);
        } else {
            callback(err);
        }
    })
}

function getTotalPaging(status, queue, startDate, endDate, callback) {
    let options = {
        status,
        queue,
        startDate,
        endDate,
        download: 1,
        callType: _config.cisco.apiCisco.callType,
        skillGroup: _config.cisco.apiCisco.skillGroup
    };

    getRequestDefault(_config.cisco.apiCisco, `reportRequestRecall`, options, function (err, data) {
        if (!err) {
            callback(null, data);
        } else {
            callback(err);
        }
    })
}
function createTitleExcel(worksheet, startDate, endDate) {
    worksheet.mergeCells('C1:D1');
    worksheet.getCell('C1').value = "GOLDENT GATE";
    worksheet.getCell('C1').alignment = { horizontal: 'center' };
    worksheet.getCell('C1').font = {
        name: 'Times New Roman',
        family: 4,
        size: 12,
        bold: true
    };
    worksheet.mergeCells('C2:D2');
    worksheet.getCell('C2').value = "PHÒNG CHĂM SÓC KHÁCH HÀNG";
    worksheet.getCell('C2').alignment = { horizontal: 'center' };
    worksheet.getCell('C2').font = {
        name: 'Times New Roman',
        family: 4,
        bold: true
    };
    worksheet.getCell('G1').value = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
    worksheet.getCell('G1').alignment = { horizontal: 'center' };
    worksheet.getCell('G1').font = {
        name: 'Times New Roman',
        family: 4,
        size: 12,
        bold: true
    };
    worksheet.mergeCells('F2:I2');
    worksheet.getCell('F2').value = "Độc lập - Tự do - Hạnh phúc";
    worksheet.getCell('F2').alignment = { horizontal: 'center' };
    worksheet.getCell('F2').font = {
        name: 'Times New Roman',
        family: 4,
        bold: true
    };

    worksheet.mergeCells('A5:I5');
    worksheet.getCell('A5').value = "BÁO CÁO GỌI VÀO - BÁO CÁO YÊU CẦU GỌI LẠI";
    worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle', };
    worksheet.getCell('A5').font = {
        name: 'Times New Roman',
        family: 4,
        size: 16,
        bold: true
    };

    worksheet.mergeCells('A6:I6');
    worksheet.getCell('A6').value = "Thời gian: Từ ngày: " + startDate + " - Đến ngày: " + endDate + "";
    worksheet.getCell('A6').alignment = { horizontal: 'center' };
    worksheet.getCell('A6').font = {
        name: 'Times New Roman',
        family: 4,
        bold: true
    };
    worksheet.addRow([]);
}
function createHead(worksheet) {
    worksheet.addRow(_.pluck(titleHeadTable, 'value'));
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: 'Times New Roman', family: 4, size: 12, bold: true };
    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = _.columnToLetter(i);
        worksheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        }
    }
}
function setWeightColumn(worksheet) {
    let valueWidthColumn = [
        10, 20, 30, 30, 20, 20
    ]
    _.each(valueWidthColumn, function (item, index) {
        worksheet.getColumn(++index).width = item;
    })

}
function genStatus(el) {
    let string = "";
    if (el == 0) {
        string += "Đã gọi lại"
    } else {
        string += "Yêu cầu gọi lại"
    }
    return string;
}
function genQueue(el) {
    let string = "";
    if (el == _config.cisco.apiCisco.skillGroup.SG_Voice_1) {
        string = "GGG_VOICE_G1";
    } else if (el == _config.cisco.apiCisco.skillGroup.SG_Voice_2) {
        string = "GGG_VOICE_G2";
    } else if (el == _config.cisco.apiCisco.skillGroup.SG_Voice_3) {
        string = "GGG_VOICE_G3";
    } else {
        string = "";
    }
    return string;
}