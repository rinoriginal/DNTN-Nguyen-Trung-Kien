//{auth:loi-dev}
var fs = require('fs');
var fsx = require('fs.extra');
const excelToJson = require('convert-excel-to-json');
var titleHeadTable = [
    { key: 'sđt', value: 'Số điện thoại', },
    { key: 'ho_ten', value: 'Họ tên', },
    { key: 'tinh_thanh', value: 'Tỉnh thành', },
    { key: 'quan_huyen', value: 'Quận huyện', },
    { key: 'id', value: 'ID', },
    { key: 'ghi_chu', value: 'Ghi chú', },
    { key: 'dia_chi_chi_tiet', value: 'Địa chỉ chi tiết', },
    { key: 'dong_xe', value: 'Dòng xe', },
    { key: 'ket_qua', value: 'Kết quả' },
]
exports.create = (req, res) => {
    console.log("IMPORT_CUSTOMER start console");
    req.connection.setTimeout(20 * 60 * 1000);
    const {
        destination,
        originalname,
        filename
    } = req.files[0];
    let filePath = req.files[0].path;
    // let specialKey = '';
    const [originalnameOnly, fileExtension] = originalname.split('.');
    if (!filename || !fileExtension) {
        return res.send({ code: 500, message: "bad request" });
    }

    //check chưa tồn tại folder chưa file import thì tạo
    var dir = './assets/uploads/import-data';
    if (!fs.existsSync(dir)) {
        fsx.mkdirs(path.join(_rootPath, 'assets', 'uploads', 'import-data'))
    }

    fs.renameSync(filePath, path.join(destination, '../assets/uploads/import-data/') + filename + '.' + fileExtension)
    console.log("IMPORT_CUSTOMER start file");

    importExcelData2MongoDB((__basedir + '/assets/uploads/import-data/' + filename + '.' + fileExtension), filename, req, res);
};

exports.index = {
    json: function (req, res) {

    },
    html: function (req, res) {
        _CustomerGroups.aggregate([
            { $lookup: { from: 'customersources', localField: '_id', foreignField: 'group', as: 'sources' } },
            { $match: { status: 1 } },
            { $sort: { 'name': -1, 'sources.name': -1 } }
        ], function (error, groups) {
            _.render(req, res, 'customer-import', { title: 'Thêm khách hàng', plugins: [['chosen'], 'fileinput'], groups: groups }, true);
        });
    }
};

// New
exports.new = function (req, res) {
    _CustomerGroups.aggregate([
        { $lookup: { from: 'customersources', localField: '_id', foreignField: 'group', as: 'sources' } },
        { $match: { status: 1, '_id.sources.status': 1 } }
    ], function (error, groups) {
        _.render(req, res, 'customer-import', _.extend({ title: 'Tạo mới khách hàng', plugins: [['bootstrap-select']] }, result), true, error);
    });
};
// -> Import Excel File to MongoDB database
function importExcelData2MongoDB(filePath, fileNameReal, req, res) {
    // -> Read Excel File to Json Data
    const excelData = excelToJson({
        sourceFile: filePath,

        sheets: [{
            // Excel Sheet Name
            name: 'My Sheet',
            // Header Row -> be skipped and will not be present at our result object.
            header: {
                rows: 1,
            },
            // Mapping columns to keys
            columnToKey: {
                A: 'field_so_dien_thoai',
                B: 'field_ho_ten',
                C: 'field_tinh_thanh',
                D: 'field_quan_huyen',
                E: 'field_id',
                F: 'field_ghi_chu',
                G: 'field_dia_chi_chi_tiet',
                H: 'field_dong_xe'
            }
        }],
    });
    console.log("IMPORT_CUSTOMER read file done");

    // check cac dieu kien
    if (excelData['My Sheet'].length > 50000) {
        //res.json({ code: 500, message: "Vui lòng import data nhỏ hơn 50000!" })
        res.send("Vui lòng import data nhỏ hơn 50000!")
    } else {
        let processExcelData = async () => {
            try {
                console.log("IMPORT_CUSTOMER checkDuplicate");
                let result = await checkDuplicate(excelData['My Sheet'])

                console.log("IMPORT_CUSTOMER checkFormatPhone");
                let result1 = await checkFormatPhone(result)

                return Promise.resolve(result1)
            } catch (e) {
                return Promise.reject(e)
            }
        }
        processExcelData()
            .then(async data => {
                try {
                    // loại bỏ những data fail
                    console.log("IMPORT_CUSTOMER loại bỏ những data fail");
                    var filtered = data.filter(function (el) {
                        return el.status != false;
                    });

                    //map thêm value trường nguồn khách hàng cho từng data
                    filtered.map(o => o.sources = req.body.sources)

                    let result3 = await fnupdateCustomers(req, res, filtered);

                    console.log("IMPORT_CUSTOMER loại bỏ những data fail và data đã update");
                    let filtered2 = result3.filter(function (el) {
                        return el.status != false && el.status != "update";
                    });
                    //trường hợp filtered2.length < 0 rơi vào những data fail hoặc những data đã cập nhật
                    if (filtered2.length > 0) {
                        console.log("create customer")
                        let result4 = await createCustomer(req, res, filtered2, fileNameReal, data);
                    } else {
                        exportExcel(req, res, fileNameReal, data)
                    }
                } catch (err1) {
                    throw err1
                }
            })
            .catch(err => {
                console.log("đã xảy ra lỗi", err);
                res.json({ code: 400, message: JSON.stringify(err) })
            })
    }
}

// tạo mới khách hàng
function createCustomer(req, res, filtered2, fileNameReal, excelData) {
    return new Promise(async (resolve, reject) => {
        let count = await _Customerindex.find({}).count()
        filtered2.map((el) => {
            count++;
            el.field_id = "KH" + count;
            return el;
        })
        _Customerindex.insertMany(filtered2, function (err, result) {
            if (err) {
                reject(err)
            } else {
                result.forEach(function (item) {
                    _Customer.create(item._doc);
                    var temp = item._doc
                    var id_CCKFields = item._doc._id
                    delete temp.status;
                    delete temp.sources;
                    delete temp.v;
                    delete temp._id;
                    // Chuẩn hóa dữ liệu đầu vào
                    _async.each(_.keys(temp), function (k, cb) {
                        if (!_CCKFields[k] || _.isNull(temp[k]) || _.isEmpty(temp[k].toString()) || _.isUndefined(temp[k]) || temp[k] == "null") return cb(null, null)
                        switch (_CCKFields[k].type) {
                            case 2:
                                temp[k] = Number(temp[k]);
                                break;
                            case 6:
                                temp[k] = _moment(temp[k], 'DD/MM/YYYY')._d;
                                break;
                            default:
                                break;
                        }
                        _CCKFields[k].db.update({ entityId: id_CCKFields }, { entityId: id_CCKFields, value: temp[k] }, { upsert: true }, cb);
                    });
                })
                exportExcel(req, res, fileNameReal, excelData, resolve)
            }
        })
    });
}
// function update customer exist
async function fnupdateCustomers(req, res, filtered) {
    try {
        var p = filtered.map((el) => {
            return _Customerindex.find({ "field_so_dien_thoai": el.field_so_dien_thoai });
        })
        let temp = await Promise.all(p);

        return filtered.map((el2, index) => {
            let found = temp[index];
            if (found.length > 0) {
                let arrString = [];
                temp[index][0].sources.forEach(function (el4) {
                    arrString.push(el4.toString())
                })
                el2.sources.forEach(function (el3) {
                    //khách hàng đã có trong sources từ trc đo thì báo duplicate
                    if (_.includes(arrString, el3.toString())) {
                        el2.status = false;
                        el2.statusMessage = "field_so_dien_thoai duplicate"
                    } else {
                        //không thì update
                        arrString.push(el3)
                        el2.sources = arrString;
                        el2.status = "update";
                        updateCustomer(found[0], el2, req);
                    }
                    return el2;
                })
                return el2;
            } else {
                return el2;
            }
        })
    } catch (error) {
        throw error
    }
}
// cập nhật khách hàng nếu số điện thoại đã tồn tại trước đó
function updateCustomer(result, el, req) {
    //update collection customer vs customerIndex
    _Customerindex.findByIdAndUpdate(result._id, {
        field_so_dien_thoai: el.field_so_dien_thoai,
        field_ho_ten: el.field_ho_ten,
        field_tinh_thanh: [el.field_tinh_thanh],
        field_quan_huyen: [el.field_quan_huyen],
        field_ghi_chu: el.field_ghi_chu,
        field_dia_chi_chi_tiet: el.field_dia_chi_chi_tiet,
        field_dong_xe: el.field_dong_xe,
        sources: el.sources,
    }, function (err, data) {
        if (err) {
            console.log("update fail", err)
        } else {
            _Customer.findByIdAndUpdate(result._id, { sources: el.sources }, function (err1, data1) {
                data1.save();
            })
            var temp = el
            var id_CCKFields = data._doc._id
            delete temp.status;
            delete temp.sources;
            delete temp.v;
            delete temp._id;
            // Chuẩn hóa dữ liệu đầu vào
            _async.each(_.keys(temp), function (k, cb) {
                if (!_CCKFields[k] || _.isNull(temp[k]) || _.isEmpty(temp[k].toString()) || _.isUndefined(temp[k]) || temp[k] == "null") return cb(null, null)
                switch (_CCKFields[k].type) {
                    case 2:
                        temp[k] = Number(temp[k]);
                        break;
                    case 6:
                        temp[k] = _moment(temp[k], 'DD/MM/YYYY')._d;
                        break;
                    default:
                        break;
                }
                _CCKFields[k].db.update({ entityId: id_CCKFields }, { entityId: id_CCKFields, value: temp[k] }, { upsert: true }, cb);
            });
        }
    });
}
//check định dạng số điện thoại đầu vào
function checkFormatPhone(arr) {
    arr.forEach(function (el, index) {
        el.field_so_dien_thoai = el.field_so_dien_thoai ? el.field_so_dien_thoai.toString() : "";
        if (el.field_so_dien_thoai && el.field_so_dien_thoai.length > 0 && el.field_so_dien_thoai[0] != "0") {
            el.field_so_dien_thoai = "0" + el.field_so_dien_thoai
        }
        return el;
    })
    return arr;
}
//check trùng số điện thoại
function checkDuplicate(arr) {
    var temp = []
    arr.forEach(function (el, index) {
        temp.push(el.field_so_dien_thoai)
        const found = temp.filter(element => element == el.field_so_dien_thoai);
        if (found.length < 2) {
            el.status = true
            el.cellFail = []; // chứa các cell fail
        } else {
            el.status = false
            el.statusMessage = "checkDuplicate";
            el.cellFail = []; // chứa các cell fail
            el.cellFail.push("A" + (2 + index))
        }
        return el;
    })
    return arr;
}

function exportExcel(req, res, fileNameReal, excelData) {
    var waterFallTask = [];
    waterFallTask.push(function (next) {
        var workbook = new _Excel.Workbook();
        workbook.created = new Date();
        next(null, workbook)
    });
    waterFallTask.push(function (workbook, next) {
        var sheet = workbook.addWorksheet('My Sheet', { state: 'visible' });
        //setWeightColumn(sheet);
        //createTitleExcel(sheet);
        createHead(sheet);
        _.each(excelData, (item) => {
            sheet.addRow([
                (item.field_so_dien_thoai ? item.field_so_dien_thoai : ""),
                (item.field_ho_ten ? item.field_ho_ten : ""),
                (item.field_tinh_thanh ? item.field_tinh_thanh : ""),
                (item.field_quan_huyen ? item.field_quan_huyen : ""),
                (item.field_id ? item.field_id : ""),
                (item.field_ghi_chu ? item.field_ghi_chu : ""),
                (item.field_dia_chi_chi_tiet ? item.field_dia_chi_chi_tiet : ""),
                (item.field_dong_xe ? item.field_dong_xe : ""),
                (item.status == true ? "Success" : (item.status == false ? `Fail${item.statusMessage ? " " + item.statusMessage : "Chưa xác định"}` : "Updated")),
            ]);
            // đổ màu back log
            if (item.cellFail && item.cellFail.length > 0) {
                item.cellFail.map(key => {
                    sheet.getCell(key).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'ffcc00' }
                    };
                });
            }
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
        })
        sheet.addRow([]);
        next(null, workbook);
    });
    waterFallTask.push(
        function (workbook, next) {
            console.log("IMPORT_CUSTOMER waterFallTask", path.join(_rootPath, 'assets', 'export', 'result-import'));

            fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'result-import'), function (error, result) {
                next(error, workbook);
            });
        },
        function (workbook, next) {
            var fileName = path.join(_rootPath, 'assets', 'export', 'result-import', fileNameReal + '.xlsx');
            workbook.xlsx.writeFile(fileName).then(function (error, result) {
                next(error, path.join('assets', 'export', 'result-import', fileNameReal + '.xlsx'));
            });
        }
    );
    _async.waterfall(waterFallTask, function (error, result) {
        console.log("IMPORT_CUSTOMER result", error, result);
        if (error) {
            let data = {
                name: fileNameReal,
                createBy: req.session.user.displayName,
                status: 0,
                created: new Date()
            }
            _CustomerImportHistory.create(data)
            res.json({ code: 500, message: "Import thất bại !" });
        } else {
            let data = {
                name: fileNameReal,
                created: new Date(),
                createBy: req.session.user.displayName,
                status: 1,
                url: '/' + result
            }
            _CustomerImportHistory.create(data)
            res.json({ code: 200, data: '/' + result });
        }
    });
}
function createHead(worksheet) {
    worksheet.addRow(_.pluck(titleHeadTable, 'value'));
    worksheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.lastRow.font = { name: 'Times New Roman', family: 4, size: 12, bold: true };
    for (let i = 1; i <= titleHeadTable.length; i++) {
        let charNameColumn = _.columnToLetter(i);
        worksheet.lastRow.getCell(charNameColumn).border = {
            top: { style: "medium" },
            left: { style: "thin" },
            bottom: { style: "medium" },
            right: { style: "thin" }
        }
    }
}