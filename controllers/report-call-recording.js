
var request = require('request');
var titlePage = 'Quản lý file ghi âm new';
var searchNotFoundError = new Error('Không tìm thấy kết quả với khoá tìm kiếm');
var accessDenyError = new Error('Không đủ quyền truy cập');
var parseJSONToObject = require(path.join(_rootPath, 'queue', 'common', 'parseJSONToObject.js'));
var {
    CALL_DIRECTION
} = require(path.join(_rootPath, 'helpers', 'constants'));

var {
    getAgentDetailInfo,
} = require(path.join(_rootPath, 'commons', 'functions'));
var { columnToLetter } = require(path.join(
    _rootPath,
    "helpers",
    "functions",
    "handle.string.js"
  ));

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

let title = "BÁO CÁO GHI ÂM";
let titleHeadTable = [
  { key: "date", value: "Loại gọi" },
  { key: "type", value: "Điện thoại viên" },
  { key: "type", value: "Điện thoại cá nhân" },
  { key: "code", value: "Ngày" },
  { key: "value", value: "Giờ bắt đầu" },
  { key: "value", value: "Giờ kết thúc" },
  { key: "value", value: "Giờ phục vụ" },
];

exports.index = {
    json: async function (req, res) {
        let pageSize = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
        let { totalResult } = req.query;  
 
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

            // config.ipRecording = 'http://172.16.86.195:6767'
            let optionsQuery = {startDate, endDate, pages: pageSize, limit: rows, config, agentInfoTelehub, filter: req.query, paging: 0};

            if(_.has(req.query, 'download') && req.query.download == 1) {
                let maxRecordPerFile = 5000;
                let startExport = new Date();

                totalResult = Number(totalResult);
                
                if(totalResult > maxRecordPerFile) {
                    let p = [];
                    var currentDate = new Date();
                    var folderName = req.session.user._id + "-" + currentDate.getTime();
                    for (var k = 0; k < Math.ceil(totalResult / (maxRecordPerFile)); ++k) {
                        optionsQuery.pages = k + 1
                        optionsQuery.limit = maxRecordPerFile
                        p.push(getReportData(optionsQuery))
                    };

                    p = await Promise.all(p);
                    console.log('export mapping after ' + `${(Date.now() - startExport.getTime()) / 1000} seconds`);

                    var folderPath = path.join(_rootPath, "assets", "export", "report", folderName);
                    var folderZip = path.join(_rootPath,  "assets", "export", "report", folderName + '.zip');

                    fsx.mkdirSync(folderPath);

                    // create excel
                    let pExcel = p.map(i => exportExcel(i, {folderName , startDate, endDate, creator: req.session.user.displayName }) ); // promise
                    pExcel = await Promise.all(pExcel);

                    zipFolder(folderPath, folderZip, function (err) {
                        console.log('export done after ' + `${(Date.now() - startExport.getTime()) / 1000} seconds`);
                        res.json({ code: 200, message:  folderZip.replace(_rootPath, '') });
                    });

                }else {
                    let result = await getReportData(optionsQuery);
                    let pathFile = await exportExcel(result, { startDate, endDate, creator: req.session.user.displayName });

                    res.json({ code: 200, message:  pathFile });

                }

            }
            else {
                let [results, pageInfo] = await Promise.all([ 
                    getReportData({...optionsQuery, paging: 0}),
                    getReportData({...optionsQuery, paging: 1})
                ]);
                
                var paginator = new pagination.SearchPaginator({
                    prelink: '/report-call-recording',
                    current: pageSize,
                    rowsPerPage: rows,
                    totalResult: pageInfo[0] ? pageInfo[0].count: 0
                });
    
                res.json({code: 200, message: results, paging: paginator.getPaginationData()}); 

            }
            

        } catch (err) {
            console.log(err);
            return res.json({ code: 500, message: err.message || err});
        }
    },
    html: async function (req, res) {
        // updateRecording();
        try {
            let config = await _Config.findOne({});
            let agentInfos = await getAgentDetailInfo();
            
            _.render(req, res, 'report-call-recording', {
                title: titlePage,
                myUsers: agentInfos,
                ipRecording: config && config.ipRecording ? config.ipRecording : '',
                CALL_DIRECTION,
                getDirection,
                plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], ['chosen']]
            }, true, false);
        } catch (err) {
            _.render(req, res, '500', null, null, {title: 'Có lỗi xảy ra', message: err.message || err}); 
        }
    }
};

async function exportExcel(result, { folderName, startDate, endDate, creator}) {
    
    try {
        var limitIndex = 3000;
        // var sumSheet = Math.ceil(req.query.totalResult / limitIndex);
        
        var workbook = new _Excel.Workbook();
        workbook.creator = creator;
        workbook.created = new Date();
    
        var sheet = workbook.addWorksheet("sheet1", {
            state: "visible",
        });

        createTitleExcel(sheet, title, startDate, endDate);
        createHead(sheet);
        customView(sheet);
        for (let i = 0; i < result.length; i++) {
            let el = result[i];
            el.connectTime = moment(el.connectTime).format('HH:mm:ss DD/MM/YYYY');
            el.disconnectTime =  moment(el.disconnectTime).format('HH:mm:ss DD/MM/YYYY');
            sheet.addRow([
                getDirection(el.direction),
                el.agent,
                el.customer,
                el.connectTime.split(" ")[1],
                el.connectTime,
                el.disconnectTime,
                _moment().startOf('day').seconds(Math.ceil(el.duration)).format('HH:mm:ss')
            ]);

            // hiển thị dòng
            for (let i = 1; i <= titleHeadTable.length; i++) {
            let charNameColumn = columnToLetter(i);

            sheet.lastRow.getCell(charNameColumn).border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" },
            };
            sheet.lastRow.getCell(charNameColumn).font = {
                name: "Times New Roman",
                family: 4,
                size: 12,
            };
            sheet.lastRow.getCell(charNameColumn).alignment = {
                vertical: "middle",
                horizontal: "left",
            };
            }

            
        }

        var currentDate = new Date();
        var fileName = path.join(
              _rootPath,
              "assets",
              "export",
              "report",
              "BaoCaoRecording_" + currentDate.getTime() + ".xlsx"
        );
        if(folderName) fileName = path.join(
              _rootPath,
              "assets",
              "export",
              "report",
              folderName,
              "BaoCaoRecording_" + currentDate.getTime() + ".xlsx"
          );
          
        let bbbb = await workbook.xlsx.writeFile(fileName);
    
        return fileName.replace(_rootPath, '');
    } catch (err) {
        throw err;
    }

}

function createTitleExcel(worksheet, title, startTime, endTime) {
    worksheet.addRow([""]);
    worksheet.addRow([
        EXCEL_CONFIG.congTy,
      "",
      "",
      "",
      "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    ]);
    worksheet.lastRow.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.lastRow.font = { name: "Times New Roman", size: 13, bold: true };
    worksheet.mergeCells("A2:C2");
    worksheet.mergeCells("E2:G2");
  
    worksheet.addRow([
        EXCEL_CONFIG.phongBan,
      "",
      "",
      "",
      "ĐỘC LẬP - TỰ DO - HẠNH PHÚC",
    ]);
    worksheet.lastRow.alignment = { vertical: "middle", horizontal: "center" };
    worksheet.lastRow.font = { name: "Times New Roman", size: 13, bold: false };
    worksheet.mergeCells("A3:C3");
    worksheet.mergeCells("E3:G3");
  
    worksheet.addRow([""]);
    worksheet.addRow([""]);
    worksheet.getCell("B6").value = title;
    worksheet.getCell("B6").font = {
      name: "Times New Roman",
      family: 4,
      size: 16,
      underline: "true",
      bold: true,
    };
    worksheet.getCell("B6").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.mergeCells("B6:E6");
    worksheet.getCell("B7").value =
      "Thời điểm xuất báo cáo : " + moment().format("HH:mm:ss");
    worksheet.getCell("B7").font = {
      name: "Times New Roman",
      family: 4,
      size: 13,
      underline: "true",
      bold: false,
    };
    worksheet.getCell("B7").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.mergeCells("B7:E7");
  
    if (startTime && endTime) {
      var str = "(Thời gian: Từ ngày: ";
      str += startTime + "- Đến ngày : " + endTime + ")";
      worksheet.getCell("B8").value = str;
      worksheet.mergeCells("B8:E8");
      worksheet.getCell("B8").font = {
        name: "Times New Roman",
        family: 4,
        size: 12,
        underline: "true",
      };
      worksheet.getCell("B8").alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    } else {
      worksheet.getCell("B8").value =
        "(Thời gian : Từ ngày .............. - Đến ngày .................)";
      worksheet.mergeCells("B8:E8");
      worksheet.getCell("B8").font = {
        name: "Times New Roman",
        family: 4,
        size: 12,
        underline: "true",
      };
      worksheet.getCell("B8").alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
  
    worksheet.addRow([]);
  }
  function customView(worksheet) {
    for (let i = 1; i <= titleHeadTable.length; i++) {
      let charNameColumn = columnToLetter(i);
      worksheet.lastRow.getCell(charNameColumn).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      worksheet.lastRow.getCell(charNameColumn).font = {
        name: "Times New Roman",
        family: 4,
        size: 12,
        bold: true,
        color: { argb: "000000" },
      };
      worksheet.lastRow.getCell(charNameColumn).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
  }
  
  function createHead(worksheet) {
    //Header 01
    worksheet.addRow(_.pluck(titleHeadTable, "value"));
    for (let i = 1; i <= titleHeadTable.length; i++) {
      let charNameColumn = columnToLetter(i);
      worksheet.lastRow.getCell(charNameColumn).font = {
        name: "Times New Roman",
        family: 4,
        size: 12,
        bold: true,
        color: { argb: "000000" },
      };
      worksheet.lastRow.getCell(charNameColumn).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
  
      worksheet.lastRow.getCell(charNameColumn).fill = {
        type: "gradient",
        gradient: "path",
        center: { left: 0.5, top: 0.5 },
        stops: [
          { position: 0, color: { argb: "d8d8d8" } },
          { position: 1, color: { argb: "d8d8d8" } },
        ],
      };
  
      worksheet.lastRow.getCell(charNameColumn).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
  
    var dobCol1 = worksheet.getColumn(1);
    dobCol1.width = 38;
    var dobCol2 = worksheet.getColumn(2);
    dobCol2.width = 30;
    var dobCol3 = worksheet.getColumn(3);
    dobCol3.width = 25;
    var dobCol4 = worksheet.getColumn(4);
    dobCol4.width = 25;
    var dobCol5 = worksheet.getColumn(5);
    dobCol5.width = 25;
    var dobCol6 = worksheet.getColumn(6);
    dobCol6.width = 25;
    var dobCol7 = worksheet.getColumn(7);
    dobCol7.width = 25;
    var dobCol8 = worksheet.getColumn(8);
    dobCol8.width = 25;
    var dobCol9 = worksheet.getColumn(9);
    dobCol9.width = 25;
    var dobCol10 = worksheet.getColumn(10);
    dobCol10.width = 25;
    var dobCol11 = worksheet.getColumn(11);
    dobCol11.width = 25;
    var dobCol12 = worksheet.getColumn(12);
    dobCol12.width = 25;
    var dobCol13 = worksheet.getColumn(13);
    dobCol13.width = 25;
    var dobCol14 = worksheet.getColumn(14);
    dobCol14.width = 30;
    var dobCol15 = worksheet.getColumn(15);
    dobCol15.width = 30;
    var dobCol16 = worksheet.getColumn(16);
    dobCol16.width = 30;
    var dobCol17 = worksheet.getColumn(17);
    dobCol17.width = 30;
    var dobCol18 = worksheet.getColumn(18);
    dobCol18.width = 30;
    var dobCol19 = worksheet.getColumn(19);
    dobCol19.width = 30;
    var dobCol20 = worksheet.getColumn(20);
    dobCol20.width = 25;
  
    //row
    var row1 = worksheet.getRow(10);
    row1.height = 23;
    var row2 = worksheet.getRow(2);
    row2.height = 23;
    var row3 = worksheet.getRow(3);
    row3.height = 20;
    var row4 = worksheet.getRow(6);
    row4.height = 23;
  
    worksheet.getColumn('H').numFmt = "HH:mm:ss"; // Thoi luong cuoc goi
  }
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
    let {startDate, endDate, pages, limit, config, agentInfoTelehub, filter, paging} = opts
    
    return new Promise((resolve, reject) => {
        try {
            let pathAPI = config.ipRecording + "/api/v2/cdr/byprefix";
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
            query.push(`paging=${paging ? 1: 0}`);

            if(filter) {
                                                
                let {agentId, direction, phone, extension} = filter;

                if(agentId) query.push(`agentId=${agentId.join(',')}`);
                if(direction) query.push(`direction=${direction}`);
                if(phone) query.push(`phone=${phone}`);
                if(extension) query.push(`extension=${extension}`);
            }

            console.log(pathAPI + "?" + query.join("&"));
            request.get(pathAPI + "?" + query.join("&"), opts, function (err, response, body) {
                try {
                    if (!err && (response && response.statusCode == 200) && body.data) {
                        let data = body.data;
                        let agentInfos = data;
    
                        if(paging == 0){
                            agentInfos.forEach(i => {
                                let agentFound = agentInfoTelehub.find(j => j.idAgentCisco == i.agent);
                                let extension = i.agent;
                                if(agentFound) {
                                    // i._id = i.PeripheralNumber;
                                    i.agent = agentFound.displayName;
                                }
        
                                i.direction = getDirection(i.direction);
        
                                i.extension = extension;
                                i.connectTime = moment(i.connectTime).format('HH:mm:ss DD/MM/YYYY');
                                i.disconnectTime =  moment(i.disconnectTime).format('HH:mm:ss DD/MM/YYYY');
        
                            });
                        }
    
                        data = agentInfos;
    
                        resolve(data);
    
                    } else {
                        reject(err ? err.message : (body && body.message ? body.message : "Có lỗi xảy ra"));
                    }
                } catch (err) {
                    reject(err.message || err);
                }
            });
        } catch (err) {
            reject(err.message || err);
        }
    });
}

function getDirection(direction) {
    let txt = '';
    switch (direction.toUpperCase()) {
        case CALL_DIRECTION.INBOUND:
            txt = 'Gọi vào'
            break;
    
        case CALL_DIRECTION.OUTBOUND:
            txt = 'Gọi ra'
            break;
    
        default:
            txt = direction;
            break;
    }

    return txt;
}