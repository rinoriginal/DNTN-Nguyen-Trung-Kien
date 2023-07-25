const { Logger } = require("mongodb");
const { NText } = require("mssql");
const { TYPE_REVIEWS } = require(path.join(_rootPath, 'helpers', 'constants', 'number.const.js'))
var titleHeadTable = [
    { key: 'KH', value: 'Khách hàng', },
    { key: 'SĐT', value: 'Số điện thoại', },
    { key: 'time_call', value: 'Thời gian gọi', },
    { key: 'agent_called', value: 'Agent nghe máy', },
    { key: 'time_called', value: 'Thời gian nhấc máy', },
    { key: 'time_duaration', value: 'Thời gian đàm thoại', },
    { key: 'status_call', value: 'Tình trạng cuộc gọi', },
    { key: 'note', value: 'Ghi chú', },
    { key: 'customer_reiviews', value: 'Đánh giá của KH', }
]
var titleReport = "BÁO CÁO ĐÁNH GIÁ CHẤT LƯỢNG DỊCH VỤ";
exports.index = {
    json: function (req, res) {
        _async.waterfall([
            function (cb) {
                let query = []
                // số điện thoại
                if (req.query.field_so_dien_thoai) {
                    query.push(`ANI=${req.query.field_so_dien_thoai}`);
                }

                // thời gian gọi
                if (req.query.time_call) {
                    let tempDate = req.query.time_call.split("/")
                    if (tempDate.length == 1) {
                        let startDate = _moment(tempDate[0], "YYYY-MM-DD").startOf("d").format("YYYY-MM-DD HH:mm:ss")
                        let endDate = _moment(tempDate[0], "YYYY-MM-DD").endOf("d").format("YYYY-MM-DD HH:mm:ss")
                        query.push(`startDate=${startDate}`);
                        query.push(`endDate=${endDate}`);
                    }
                    if (tempDate.length == 2) {
                        let startDate = _moment(tempDate[0], "YYYY-MM-DD").startOf("d").format("YYYY-MM-DD HH:mm:ss")
                        let endDate = _moment(tempDate[1], "YYYY-MM-DD").endOf("d").format("YYYY-MM-DD HH:mm:ss")
                        query.push(`startDate=${startDate}`);
                        query.push(`endDate=${endDate}`);
                    }
                    return cb(null, query)
                } else {
                    // nếu không truyền vào giá trị ngày thì sẽ lấy data của ngày hiện tại
                    let startDate = _moment(new Date(), "YYYY-MM-DD").startOf("d").format("YYYY-MM-DD HH:mm:ss")
                    let endDate = _moment(new Date(), "YYYY-MM-DD").endOf("d").format("YYYY-MM-DD HH:mm:ss")
                    query.push(`startDate=${startDate}`);
                    query.push(`endDate=${endDate}`);
                }
                cb(null, query)
            },
            function (query, cb) {
                _Config.find({ "survey": { $exists: true } }, function (e, s) {
                    if (e) {
                        cb(e, null, query)
                    } else {
                        cb(null, s[0].survey.code, query)
                    }
                })
            }
        ], function (err, survey, query) {
            if (!err) {
                let configCisco = _config.cisco.apiCisco;
                let call_type_tranfer_voice = configCisco.callTypeTranfer.voice;
                let page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
                let rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 15;
                let download = req.query.isDownload ? 1 : 0
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
                    SG_Voice_3
                } = configCisco.skillGroup;

                query.push(`ternalID=${survey}`);
                query.push(`rows=${rows}`);
                query.push(`paging=${page}`);
                query.push(`download=${download}`);
                query.push(`url=/handleByAgent`); // chỉ dùng cho báo cáo này thôi

                query.push(`CT_IVR=${CT_IVR}`);
                query.push(`CT_ToAgentGroup1=${CT_ToAgentGroup1}`);
                query.push(`CT_ToAgentGroup2=${CT_ToAgentGroup2}`);
                query.push(`CT_ToAgentGroup3=${CT_ToAgentGroup3}`);
                query.push(`CT_Queue1=${CT_Queue1}`);
                query.push(`CT_Queue2=${CT_Queue2}`);
                query.push(`CT_Queue3=${CT_Queue3}`);

                query.push(`CT_Tranfer=${call_type_tranfer_voice}`);

                if (SG_Voice_1) {
                    query.push(`SG_Voice_1=${SG_Voice_1}`);
                }
                if (SG_Voice_2) {
                    query.push(`SG_Voice_2=${SG_Voice_2}`);
                }
                if (SG_Voice_3) {
                    query.push(`SG_Voice_3=${SG_Voice_3}`);
                }

                let pathApi = _config.cisco.apiCisco.ip + "/api/v1/callDetail/handleByAgent";

                if (download == 0) {
                    query.splice(query.indexOf('download=0'), 1, 'download=1')
                }

                let optsTemp = {
                    method: 'POST',
                    headers: {
                        "x-access-token": configCisco.token,
                        "Content-Type": "application/json",
                    },
                    uri: pathApi + "?" + query.join("&"),
                    agentOptions: {
                        rejectUnauthorized: false
                    },
                    json: true
                }
                // lấy tổng số data
                _request(optsTemp, function (errorTemp, responseTemp, bodyTemp) {
                    console.log("aaaaaa", optsTemp.uri, responseTemp.statusCode);
                    
                    if (!errorTemp && responseTemp && responseTemp.statusCode == 200) {
                        console.log(1111, bodyTemp);
                        let resultTemp = bodyTemp
                        let resultfinaltotalpage = []
                        mergeData(resultTemp.data, resultfinaltotalpage, function (err6, result6) {
                            //sort theo dateTime
                            result6.sort(function (a, b) {
                                return new Date(b.DateTime) - new Date(a.DateTime);
                            });
                            _async.waterfall([
                                function (next) {
                                    // filter theo agent nghe máy
                                    if (req.query.agent) {
                                        let condition = new RegExp(_.stringRegex(req.query.agent), 'i');
                                        result6 = result6.filter(function (el) {
                                            if (el.agentInfos && el.agentInfos.displayName) {
                                                return condition.test(el.agentInfos.displayName)
                                            }
                                        });
                                        result6.length == 0 ? next(null, [{ RecoveryKey: "null" }]) : next(null, result6)
                                    } else {
                                        next(null, result6)
                                    }
                                },
                                function (result6, next) {
                                    //filter theo đánh giá của khách hàng
                                    if (req.query.customer_reviews) {
                                        let condition = req.query.customer_reviews
                                        result6 = result6.filter(function (el) {
                                            if (el.code) {
                                                return condition.includes(el.code)
                                            }
                                        });
                                        result6.length == 0 ? next(null, [{ RecoveryKey: "null" }]) : next(null, result6)
                                    } else {
                                        next(null, result6)
                                    }
                                },
                                function (result6, next) {
                                    //filter theo khách hàng
                                    if (req.query.field_ten_KH) {
                                        let condition = new RegExp(_.stringRegex(req.query.field_ten_KH), 'i');
                                        result6 = result6.filter(function (el) {
                                            if (el.customerInfos && el.customerInfos.field_ho_ten) {
                                                return condition.test(el.customerInfos.field_ho_ten)
                                            }
                                        });
                                        result6.length == 0 ? next(null, [{ RecoveryKey: "null" }]) : next(null, result6)
                                    } else {
                                        next(null, result6)
                                    }
                                },
                                function (result6, next) {
                                    //filter theo tình trạng cuộc gọi
                                    if (req.query.ticketReasons) {
                                        let condition = req.query.ticketReasons
                                        result6 = result6.filter(function (el) {
                                            if (el.ticketReasons && el.ticketReasons._id) {
                                                return condition.includes(el.ticketReasons._id.toString())
                                            }
                                        });
                                        result6.length == 0 ? next(null, [{ RecoveryKey: "null" }]) : next(null, result6)
                                    } else {
                                        next(null, result6)
                                    }
                                },
                                function (result6, next) {
                                    //filter theo ghi chú
                                    if (req.query.note) {
                                        let condition = new RegExp(_.stringRegex(req.query.note), 'i');
                                        result6 = result6.filter(function (el) {
                                            if (el.note) {
                                                return condition.test(el.note)
                                            }
                                        });
                                        result6.length == 0 ? next(null, [{ RecoveryKey: "null" }]) : next(null, result6)
                                    } else {
                                        next(null, result6)
                                    }
                                }
                            ], function (err7, data7) {
                                if (data7) {
                                    let queryTemp = _.pluck(data7, 'RecoveryKey')
                                    // query.push(`RecoveryKey=${queryTemp}`);
                                    // dành cho data hiển thị ở màn hình
                                    if (download == 0) {
                                        _async.parallel({
                                            data: function (next) {
                                                query.splice(query.indexOf('download=1'), 1, 'download=0')
                                                let opts = {
                                                    method: 'POST',
                                                    headers: {
                                                        "x-access-token": configCisco.token,
                                                        "Content-Type": "application/json",
                                                    },
                                                    uri: pathApi + "?" + query.join("&"),
                                                    agentOptions: {
                                                        rejectUnauthorized: false
                                                    },
                                                    body: {
                                                        RecoveryKey: queryTemp
                                                    },
                                                    json: true
                                                }
                                                console.log(999, JSON.stringify(opts));

                                                //lấy data phân trang
                                                _request(opts, function (error, response, body) {
                                                    console.log("bbbbbbb", opts.uri, response.statusCode);
                                                    //code:400 rơi vào các lỗi trong trường hợp api report
                                                    if (!error && response && response.statusCode == 200) {
                                                        console.log(2222, body);
                                                        next(null, body)
                                                    } else {
                                                        return res.json({ code: 400 })
                                                    }
                                                })
                                            },
                                            totalPage: function (next) {
                                                // vì data của báo cáo lấy tất cả data 
                                                query.splice(query.indexOf('download=0'), 1, 'download=1')
                                                let opts = {
                                                    method: 'POST',
                                                    headers: {
                                                        "x-access-token": configCisco.token,
                                                        "Content-Type": "application/json",
                                                    },
                                                    uri: pathApi + "?" + query.join("&"),
                                                    agentOptions: {
                                                        rejectUnauthorized: false
                                                    },
                                                    body: {
                                                        RecoveryKey: queryTemp
                                                    },
                                                    json: true
                                                }
                                                // lấy tổng số data
                                                _request(opts, function (error, response, body) {
                                                    console.log("ccccccccc", opts.uri, response.statusCode);
                                                    if (!error && response && response.statusCode == 200) {
                                                        console.log(3333, body);
                                                        next(null, body)
                                                    } else {
                                                        return res.json({ code: 400 })
                                                    }
                                                })
                                            }
                                        }, function (err1, result1) {
                                            if (!err1) {
                                                if (result1.data.data && result1.data.data.length > 0) {
                                                    let resultfinal = []
                                                    var paginator = new pagination.SearchPaginator({
                                                        prelink: '/report-handle-by-agent',
                                                        current: page,
                                                        rowsPerPage: rows,
                                                        totalResult: result1.totalPage.data.length
                                                    });
                                                    mergeData(result1.data.data, resultfinal, function (err3, result3) {
                                                        if (result3) {
                                                            //sort theo dateTime
                                                            resultfinal.sort(function (a, b) {
                                                                return new Date(b.DateTime) - new Date(a.DateTime);
                                                            });
                                                            res.json({ code: 200, data: resultfinal, paging: paginator.getPaginationData() })
                                                        }
                                                    })
                                                } else {
                                                    res.json({ code: 200, data: [], totalPage: 0 })
                                                }
                                            } else {
                                                res.json({ code: 400 })
                                            }
                                        })
                                    }
                                    // dành cho báo cáo
                                    else {
                                        let opts = {
                                            method: 'POST',
                                            headers: {
                                                "x-access-token": configCisco.token,
                                                "Content-Type": "application/json",
                                            },
                                            uri: pathApi + "?" + query.join("&"),
                                            agentOptions: {
                                                rejectUnauthorized: false
                                            },
                                            json: true
                                        }
                                        // lấy tổng số data
                                        _request(opts, function (error, response, body) {
                                            if (!error) {
                                                console.log(4444, body);
                                                let result = body
                                                let resultfinal = []
                                                mergeData(result.data, resultfinal, function (err4, result4) {
                                                    if (result4) {
                                                        //sort theo dateTime
                                                        resultfinal.sort(function (a, b) {
                                                            return new Date(b.DateTime) - new Date(a.DateTime);
                                                        });
                                                        exportExcel(req, res, result4, result.startDate, result.endDate, null)
                                                    }
                                                })
                                            } else {
                                                next(null, error)
                                            }
                                        })
                                    }
                                } else {
                                    res.json({ code: 400 })
                                }
                            })
                        })
                    } else {
                        res.json({ code: 400 })
                    }
                })
            }
        })
    },
    html: function (req, res) {
        _async.parallel({
            ticketReasonCategory: function (callback) {
                _async.waterfall([
                    function (callback) {
                        _TicketReasonCategory.find({ category: 1 }, callback);
                    },
                    function (trc, callback) {
                        _TicketReason.find({ idCategory: { $in: _.pluck(trc, '_id') } }, function (err, result) {
                            callback(err, trc, result);
                        });
                    },
                    function (trc, tr, callback) {
                        _TicketSubreason.find({ idReason: { $in: _.pluck(tr, '_id') } }, function (err, result) {
                            callback(err, {
                                trc: trc,
                                tr: tr,
                                tsr: result
                            });
                        });
                    }
                ], callback);
            },
        }, function (err, result) {
            return _.render(req, res, 'report-handle-by-agent', {
                title: "Báo cáo đánh giá chất lượng dịch vụ",
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-daterangepicker'], ['chosen']],
                result: result,
                Type_Reviews: TYPE_REVIEWS
            }, true, err);
        });
    }
};

//merge data
function mergeData(arrData, resultfinal, callback) {
    _async.each(arrData, function (el, cb) {
        _async.waterfall([
            function (next) {
                _Tickets.aggregate(getInforCustomer(el.PeripheralCallKey.toString()), function (err2, result2) {
                    if (result2 && result2.length > 0) {
                        let merged = { ...el, ...result2[0] }
                        resultfinal.push(merged)
                    } else {
                        let merged = { ...el, ...{} }
                        resultfinal.push(merged)
                    }
                    next(null, resultfinal)
                })
            }
        ], function (err, resultfinal) {
            cb()
        })
    }, function (err) {
        callback(null, resultfinal)
    })
}
function getInforCustomer(PeripheralCallKey) {
    return [
        {
            $match: { callId: PeripheralCallKey }
        },
        {
            $lookup:
            {
                from: "customerindex",
                localField: "idCustomer",
                foreignField: "_id",
                as: "customerInfos"
            }
        },
        {
            $lookup:
            {
                from: "users",
                localField: "idAgent",
                foreignField: "_id",
                as: "agentInfos"
            }
        },
        {
            $lookup:
            {
                from: "ticketreasons",
                localField: "ticketReason",
                foreignField: "_id",
                as: "ticketReasons"
            }
        },
        {
            $unwind:
            {
                path: "$customerInfos",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind:
            {
                path: "$agentInfos",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind:
            {
                path: "$ticketReasons",
                preserveNullAndEmptyArrays: true
            }
        },
    ]
}
var toHHMMSS = (secs) => {
    var sec_num = parseInt(secs, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
}
function exportExcel(req, res, result, startDate, endDate) {
    var waterFallTask = [];

    waterFallTask.push(function (next) {
        var workbook = new _Excel.Workbook();
        workbook.created = new Date();
        next(null, workbook)
    });
    waterFallTask.push(function (workbook, next) {
        var sheet = workbook.addWorksheet();
        setWeightColumn(sheet);
        createTitleExcel(sheet, titleReport, startDate, endDate);
        createHead(sheet);
        _.each(result, (item) => {
            sheet.addRow([
                (item.customerInfos ? (item.customerInfos.field_ho_ten ? item.customerInfos.field_ho_ten : "") : ""),
                (item.ANI ? item.ANI : ""),
                (_moment(item.StartDateTimeUTC).format("DD/MM/YYYY HH:mm:ss")),
                (item.agentInfos ? item.agentInfos.displayName : ""),
                (_moment(item.TimePickUpCall).format("DD/MM/YYYY HH:mm:ss")),
                (toHHMMSS(item.TotalDuarationHandling)),
                (item.ticketReasons ? item.ticketReasons.name : ""),
                (item.note ? item.note : ""),
                (item.code == TYPE_REVIEWS.HaiLong.value ? TYPE_REVIEWS.HaiLong.name : (item.code == TYPE_REVIEWS.KhongHaiLong.value ? TYPE_REVIEWS.KhongHaiLong.name : "")),
            ]);
            sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.lastRow.font = { name: EXCEL_CONFIG.fontName, size: 12 };
            for (let i = 1; i <= titleHeadTable.length; i++) {
                let charNameColumn = _.columnToLetter(i);
                sheet.lastRow.getCell(charNameColumn).border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                }
            }
        })
        next(null, workbook);
    });

    waterFallTask.push(
        function (workbook, next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'report-handle-by-agent'), function (error, result) {
                next(error, workbook);
            });
        },
        function (workbook, next) {
            var currentDate = new Date();
            var fileName = currentDate.getTime();
            var folderName = path.join(_rootPath, 'assets', 'export', 'report-handle-by-agent', "BaoCaoChatLuongDichVu_" + fileName + '.xlsx');
            workbook.xlsx.writeFile(folderName).then(function (error, result) {
                next(error, path.join('assets', 'export', 'report-handle-by-agent', "BaoCaoChatLuongDichVu_" + fileName + '.xlsx'));
            });
        }
    );

    _async.waterfall(waterFallTask, function (error, result) {
        res.json({ code: error ? 500 : 200, data: '/' + result });
    });
}
function setWeightColumn(worksheet) {
    let valueWidthColumn = [
        20, 20, 20, 20, 20, 20, 30, 30, 20
    ]
    _.each(valueWidthColumn, function (item, index) {
        worksheet.getColumn(++index).width = item;
    })

}
function createTitleExcel(worksheet, titleReport, startDate, endDate) {
    worksheet.mergeCells('A2:C2');
    worksheet.getCell('A2').value = "GOLDENT GATE GROUP";
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').font = {
        name: EXCEL_CONFIG.fontName,
        family: 4,
        size: 12,
        bold: true
    };
    worksheet.mergeCells('A3:C3');
    worksheet.getCell('A3').value = "TELEHUB T1";
    worksheet.getCell('A3').alignment = { horizontal: 'center' };
    worksheet.getCell('A3').font = {
        name: EXCEL_CONFIG.fontName,
        family: 4,
        bold: true
    };
    worksheet.mergeCells('H2:I2');
    worksheet.getCell('H2').value = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
    worksheet.getCell('H2').alignment = { horizontal: 'center' };
    worksheet.getCell('H2').font = {
        name: EXCEL_CONFIG.fontName,
        family: 4,
        size: 12,
        bold: true
    };
    worksheet.mergeCells('H3:I3');
    worksheet.getCell('H3').value = "Độc lập - Tự do - Hạnh phúc";
    worksheet.getCell('H3').alignment = { horizontal: 'center' };
    worksheet.getCell('H3').font = {
        name: EXCEL_CONFIG.fontName,
        family: 4,
        bold: true
    };

    worksheet.mergeCells('A6:I8');
    worksheet.getCell('A6').value = titleReport;
    worksheet.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle', };
    worksheet.getCell('A6').font = {
        name: EXCEL_CONFIG.fontName,
        family: 4,
        size: 18,
        bold: true
    };

    worksheet.mergeCells('A9:I9');
    worksheet.getCell('A9').value = "Thời gian: Từ ngày: " + startDate + " - Đến ngày: " + endDate + "";
    worksheet.getCell('A9').alignment = { horizontal: 'center' };
    worksheet.getCell('A9').font = {
        name: EXCEL_CONFIG.fontName,
        family: 4,
        bold: true
    };
    worksheet.addRow([]);
}
function createHead(worksheet) {
    worksheet.addRow(_.pluck(titleHeadTable, 'value'));
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, bold: true, color: { argb: 'F9FCFD' } };
    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = _.columnToLetter(i);
        worksheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        }
        //đổ màu header
        worksheet.lastRow.getCell(charNameColumn).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '45818E' }
        }
    }
}
