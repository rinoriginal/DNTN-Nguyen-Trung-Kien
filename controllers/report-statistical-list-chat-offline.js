//author : haivh - 12/18/2020
const { columnToLetter } = require(path.join(_rootPath, 'helpers', 'functions', 'handle.string.js'));

const { headerReport } = require(path.join(_rootPath, 'commons', 'handleExcel', 'headerExcel.js'));

let title = 'Báo cáo thông kê danh sách chat offline';
let titleHeadTable = [
    { key: 'date', value: 'Ngày tháng' },
    { key: 'type', value: 'Loại chứng từ' },
    { key: 'code', value: 'Số chứng từ' },
    { key: 'idCustomer', value: 'Mã khách hàng' },
    { key: 'field_so_dien_thoai', value: 'Số điện thoại' },
    { key: 'field_ho_ten', value: 'Tên KH' },
    { key: 'notes', value: 'Diễn giải' },
    { key: 'value', value: 'Số tiền' },
    { key: 'note', value: 'Ghi chú' },
]
exports.index = {
    json: function (req, res) {

        if (_.has(req.query, 'isDownload')) {
            exportExcel(req, res);
        }
        else {
            var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
            var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;

            // let aggs = bindAggs(req, res)
            let agg = _Provinces.aggregate()

            _Provinces.aggregatePaginate(agg, { page: page, limit: rows }, function (error, result, pageCount, count) {
                var paginator = new pagination.SearchPaginator({
                    prelink: '/report-statistical-list-chat-offline',
                    current: page,
                    rowsPerPage: rows,
                    totalResult: count
                });

                res.json({
                    code: error ? 500 : 200,
                    data: result,
                    paging: paginator.getPaginationData()
                });
            })



        }
    },
    html: function (req, res) {

        _.render(req, res, 'report-statistical-list-chat-offline', {
            title: 'Báo cáo thông kê danh sách chat offline ',
            plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], 'export-excel', ['chosen'], ['numeral']]
        }, true);

    }
};
function bindAggs(req, res) {

    let matchQuery = {};

    if (_.has(req.query, 'startDate') || _.has(req.query, 'endDate')) {
        let dateQuery = {};

        if (_.has(req.query, 'startDate')) {
            dateQuery['$gte'] = _moment(req.query.startDate, "DD/MM/YYYY").startOf('d')._d;
        }

        if (_.has(req.query, 'endDate')) {
            dateQuery['$lte'] = _moment(req.query.endDate, "DD/MM/YYYY").endOf('d')._d;

        }

        matchQuery['created'] = dateQuery;
    }
    if (_.has(req.query, 'type')) {
        matchQuery['type'] = +(req.query.type)
    }
    if (_.has(req.query, 'phone')) {
        matchQuery['phone'] = { $in: req.query.phone };
    }
    if (_.has(req.query, 'code')) {
        matchQuery['code'] = { $in: req.query.code };
    }

    let aggs = [
    ];

    return aggs;

}
function exportExcel(req, res) {
    var limitIndex = 100;
    var sumSheet = Math.ceil(req.query.totalResult / limitIndex);
    let tongThu = 0;
    let tongChi = 0;
    let sum = 0;
    var waterFallTask = [];

    var aggs = bindAggs(req, res);
    waterFallTask.push(function (next) {
        aggs.push({ $skip: 0 });
        aggs.push({ $limit: limitIndex });

        var workbook = new _Excel.Workbook();
        workbook.creator = req.session.user.displayName;
        workbook.created = new Date();

        next(null, workbook, aggs, 1)
    });

    for (var i = 1; i <= sumSheet; i++) {


        waterFallTask.push(function (workbook, aggs, indexSheet, next) {

            _Provinces.aggregate(aggs, function (error, result) {

                var sheet = workbook.addWorksheet('sheet' + indexSheet, { state: 'visible' });

                createTitleExcel(sheet, title, req.query.startDate, req.query.endDate, req.query.type);
                createHead(sheet);
                customView(sheet, result.length);
                for (let i = 0; i < result.length; i++) {
                    sheet.addRow([

                        ('')

                    ]);

                    for (let i = 1; i <= titleHeadTable.length; i++) {
                        let charNameColumn = columnToLetter(i);

                        sheet.lastRow.getCell(charNameColumn).border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" }
                        }
                        sheet.lastRow.getCell(charNameColumn).font = {
                            name: EXCEL_CONFIG.fontName,
                            family: 4,
                            size: 12
                        };
                        if (charNameColumn != 'G') {
                            sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                    }

                    if (result[i].type == 0) {
                        tongThu += result[i].value
                    }
                    if (result[i].type == 1) {
                        tongChi += result[i].value;
                    }

                    sum = tongThu - tongChi;
                    if (i == result.length - 1) {
                        var row = sheet.lastRow;

                        sheet.addRow([('TỔNG'), (''), (''), (''), (''), (''), (''), (numeral(req.query.sumPrice).format('0,0')), ('')]);
                        for (let i = 1; i <= titleHeadTable.length; i++) {
                            let charNameColumn = columnToLetter(i);

                            sheet.lastRow.getCell(charNameColumn).border = {
                                top: { style: "medium" },
                                left: { style: "medium" },
                                bottom: { style: "medium" },
                                right: { style: "medium" }
                            }
                            sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                        sheet.mergeCells(`A${row._number + 1}:G${row._number + 1}`);
                        sheet.getCell(`A${row._number + 1}`).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, bold: true };
                        sheet.getCell(`A${row._number + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        sheet.mergeCells(`H${row._number + 1}:I${row._number + 1}`);
                        sheet.getCell(`H${row._number + 1}`).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, bold: true };
                        sheet.getCell(`H${row._number + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        sheet.addRow([]);

                        sheet.addRow([('NGƯỜI PHÊ DUYỆT'), (''), (''), (''), (''), (''), ('Hà Nội, ngày....tháng....năm')])
                        sheet.mergeCells(`A${row._number + 3}:D${row._number + 3}`);
                        sheet.getCell(`A${row._number + 3}`).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, bold: true };
                        sheet.getCell(`A${row._number + 3}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        sheet.mergeCells(`G${row._number + 3}:H${row._number + 3}`);
                        sheet.getCell(`G${row._number + 3}`).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, bold: true };
                        sheet.getCell(`G${row._number + 3}`).alignment = { vertical: 'middle', horizontal: 'center' };

                        sheet.addRow([('(Ký và ghi rõ họ tên)'), (''), (''), (''), (''), (''), ('NGƯỜI LẬP')])
                        sheet.mergeCells(`A${row._number + 4}:D${row._number + 4}`);
                        sheet.getCell(`A${row._number + 4}`).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, italic: true };
                        sheet.getCell(`A${row._number + 4}`).alignment = { vertical: 'middle', horizontal: 'center' };
                        sheet.mergeCells(`G${row._number + 4}:H${row._number + 4}`);
                        sheet.getCell(`G${row._number + 4}`).font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, bold: true };
                        sheet.getCell(`G${row._number + 4}`).alignment = { vertical: 'middle', horizontal: 'center' };

                        sheet.addRow([(''), (''), (''), (''), (''), (''), ('(Ký và ghi rõ họ tên)')])
                        sheet.mergeCells(`G${row._number + 5}:H${row._number + 5}`);
                        sheet.getCell(`G${row._number + 5}`).font = { name: EXCEL_CONFIG.fontName, family: 5, size: 12, italic: true };
                        sheet.getCell(`G${row._number + 5}`).alignment = { vertical: 'middle', horizontal: 'center' };

                    }

                }

                aggs.pop();
                aggs.pop();
                aggs.push({ $skip: (indexSheet * limitIndex) });
                aggs.push({ $limit: limitIndex });

                indexSheet = indexSheet + 1;
                next(null, workbook, aggs, indexSheet);
            })
        });
    }

    waterFallTask.push(
        function (workbook, aggs, indexSheet, next) {
            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'report-statistical-list-chat-offline'), function (error, result) {
                next(error, workbook);
            });
        },
        function (workbook, next) {
            var currentDate = new Date();
            var fileName = path.join(_rootPath, 'assets', 'export', 'report-statistical-list-chat-offline', 'BaoCaoChiTietDoanhThu_' + currentDate.getTime() + '.xlsx');
            workbook.xlsx.writeFile(fileName).then(function (error, result) {
                next(error, path.join('assets', 'export', 'report-statistical-list-chat-offline', 'BaoCaoChiTietDoanhThu_' + currentDate.getTime() + '.xlsx'));
            });
        }
    );

    _async.waterfall(waterFallTask, function (error, result) {
        res.json({ code: error ? 500 : 200, data: '/' + result });
    });


}

function createTitleExcel(worksheet, title, startDate, endDate, type) {
    worksheet.getCell('A2').value = title;
    worksheet.getCell('A2').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 16, underline: 'true', bold: true };
    worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.mergeCells('A2:H2');

    if (startDate && endDate) {
        var str = 'Thời gian từ: ';
        str += startDate + ' đến: ' + endDate;
        worksheet.getCell('A3').value = str;
        worksheet.mergeCells('A3:H3');
        worksheet.getCell('A3').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, underline: 'true' };
        worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

    }
    else {
        worksheet.getCell('C3').value = 'Thời gian từ ... đến ...';
        worksheet.mergeCells('C3:F3');
        worksheet.getCell('C3').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, underline: 'true' };
        worksheet.getCell('C3').alignment = { vertical: 'middle', horizontal: 'center' };
    }

    worksheet.getCell('C4').value = '(Mã nhân viên :..................  Phòng:................ )';
    worksheet.mergeCells('C4:F4');
    worksheet.getCell('C4').font = { name: EXCEL_CONFIG.fontName, family: 4, size: 12, underline: 'true' };
    worksheet.getCell('C4').alignment = { vertical: 'middle', horizontal: 'center' };



    worksheet.addRow([]);
}
function customView(worksheet, countRow) {

    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = columnToLetter(i);
        worksheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "medium" },
            left: { style: "medium" },
            bottom: { style: "medium" },
            right: { style: "medium" }
        }
        worksheet.lastRow.getCell(charNameColumn).font = {
            name: EXCEL_CONFIG.fontName,
            family: 4,
            size: 12,
            bold: true
        };
        worksheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
    }

}


function createHead(worksheet) {
    //Header 01
    worksheet.addRow(_.pluck(titleHeadTable, 'value'));
    var dobCol1 = worksheet.getColumn(1);
    dobCol1.width = 25;
    var dobCol2 = worksheet.getColumn(2);
    dobCol2.width = 23;
    var dobCol3 = worksheet.getColumn(3);
    dobCol3.width = 15;
    var dobCol4 = worksheet.getColumn(4);
    dobCol4.width = 15;
    var dobCol5 = worksheet.getColumn(5);
    dobCol5.width = 20;
    var dobCol6 = worksheet.getColumn(6);
    dobCol6.width = 25;
    var dobCol7 = worksheet.getColumn(7);
    dobCol7.width = 30;
    var dobCol8 = worksheet.getColumn(8);
    dobCol8.width = 15;
    var dobCol9 = worksheet.getColumn(9);
    dobCol9.width = 20;

    //row
    var row = worksheet.getRow(6);
    row.height = 23;
}

