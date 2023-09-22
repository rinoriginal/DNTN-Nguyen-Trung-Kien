//{auth:loi-dev}
var fs = require('fs');
var fsx = require('fs.extra');
var commonFunc = require(path.join(_rootPath, 'commons', 'functions','customer.fields.js'));
var titleHeadTable = [];
const excelToJson = require('convert-excel-to-json');
exports.create = async (req, res) => {
    console.log("IMPORT_CUSTOMER start console");
    req.connection.setTimeout(20 * 60 * 1000);
    let idCompany = req.session.auth && req.session.auth.company && req.session.auth.company._id ? req.session.auth.company._id : null;
    let fields = await commonFunc.getCustomerFields(idCompany);
    //gen header cho file excel kết quả
    getTitleHeadTableExcel(fields);

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

    importExcelData2MongoDB((__basedir + '/assets/uploads/import-data/' + filename + '.' + fileExtension), filename, fields, req, res);
};

exports.index = {
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
function importExcelData2MongoDB(filePath, fileNameReal, fields, req, res) {
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
            columnToKey: genColumnExcel(fields)
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

                console.log("IMPORT_CUSTOMER checkDate"); //nếu thông tin customerfield k có trường date thì k cần check đoạn này
                let result2 = await checkDate(result1, fields)

                console.log("IMPORT_CUSTOMER check NĐ91");
                let result3 = await checkDoNotCall(result2)

                return Promise.resolve(result3)
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
                        return el.statusCheck != false;
                    });

                    //map thêm value trường nguồn khách hàng cho từng data
                    filtered.map(o => o.sources = req.body.sources)
                    const sourceOrigin = req.body.sources
                    let result3 = await fnupdateCustomers(req, res, filtered);

                    // update lại số lượng KH trong nguồn
                    await Promise.all(
                        sourceOrigin.map(async (el) => {
                            const totalCusInSource = await _Customerindex.find({ sources: el }).count()
                            await _CustomerSource.findByIdAndUpdate(el, { amount: totalCusInSource })
                        })
                    )

                    console.log("IMPORT_CUSTOMER loại bỏ những data fail và data đã update");
                    let filtered2 = result3.filter(function (el) {
                        return el.statusCheck != false && el.statusCheck != "update";
                    });

                    //trường hợp filtered2.length < 0 rơi vào những data fail hoặc những data đã cập nhật
                    if (filtered2.length > 0) {
                        console.log("create customer")
                        let result4 = await createCustomer(req, res, filtered2, fileNameReal, data, genColumnExcel(fields), sourceOrigin);
                    } else {
                        exportExcel(req, res, fileNameReal, data, genColumnExcel(fields))
                    }
                } catch (err1) {
                    throw err1
                }
            })
            .catch(err => {
                console.log("đã xảy ra lỗi", err);
                res.json({ code: 400, message: err && err.message ? err.message : err })
            })
    }
}

// tạo mới khách hàng
async function createCustomer(req, res, filtered2, fileNameReal, excelData, columnToKey, sourceOrigin) {
    try {
        const insertCus = await _Customerindex.insertMany(filtered2)
        //update lại số lượng KH trong nguồn
        await Promise.all(
            insertCus.map(async (el) => {
                await _Customer.create(el._doc);
                var temp = el._doc
                var id_CCKFields = el._doc._id
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
                        case 4:
                            temp[k] = _.chain(temp[k]).map(function (el) {
                                return _.isEqual("0", el) ? null : el;
                            }).compact().value();
                            break;
                        case 5:
                            temp[k] = temp[k];
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
        )
        //update lại số lượng KH trong nguồn
        await Promise.all(
            sourceOrigin.map(async (el) => {
                const totalCusInSource = await _Customerindex.find({ sources: el }).count()
                await _CustomerSource.findByIdAndUpdate(el, { amount: totalCusInSource })
            })
        )
        exportExcel(req, res, fileNameReal, excelData, columnToKey)
    } catch (error) {
        console.log("err create", error.message || error);
    }
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
                        el2.statusCheck = false;
                        el2.statusMessage = "Số điện thoại duplicate"
                    } else {
                        //không thì update
                        arrString.push(el3)
                        el2.sources = arrString;
                        el2.statusCheck = "update";
                        updateCustomer(found[0], el2, req, arrString);
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
function updateCustomer(result, el, req, sourceOrigin) {
    try {
        //update collection customer vs customerIndex
        let obj = {}
        let getKeyObject = Object.keys(el)
        getKeyObject.forEach(function (temp) {
            obj[temp] = el[temp]
        })
        delete obj.status;
        delete obj.sources
        obj.sources = sourceOrigin;
        _Customerindex.findByIdAndUpdate(result._id, obj, function (err, data) {
            if (err) {
                console.log("update fail", err)
            } else {
                _Customer.findByIdAndUpdate(result._id, { sources: sourceOrigin }, function (err1, data1) {
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
                        case 4:
                            temp[k] = _.chain(temp[k]).map(function (el) {
                                return _.isEqual("0", el) ? null : el;
                            }).compact().value();
                            break;
                        case 5:
                            temp[k] = temp[k];
                            break;
                        // case 6:
                        //     temp[k] = _moment(temp[k], 'DD/MM/YYYY')._d;
                        //     break;
                        default:
                            break;
                    }
                    _CCKFields[k].db.update({ entityId: id_CCKFields }, { entityId: id_CCKFields, value: temp[k] }, { upsert: true }, cb);
                });
            }
        });
    } catch (error) {
        console.log("err update",error.message || error);
    }
}

//check ngày
async function checkDate(excelData, fields) {
    let found = fields.filter(function (el) {
        return el.modalName == "field_thoi_gian_lap_dat_mua"
    })
    _.each(excelData, function (el, index) {
        if (el.field_thoi_gian_lap_dat_mua && (typeof el.field_thoi_gian_lap_dat_mua == 'string')) {
            if (moment(el.field_thoi_gian_lap_dat_mua, "DD/MM/YYYY").isValid() == false) {
                console.log((found && found[0] && found[0].displayName ? found[0].displayName : "Ngày") + " khong hop le", el.field_thoi_gian_lap_dat_mua)
                el.statusCheck = false
                el.thoi_gian_lap_dat_mua = el.field_thoi_gian_lap_dat_mua
                el.statusMessage = (found && found[0] && found[0].displayName ? found[0].displayName : "Ngày") + " khong hop le";
                el.cellFail.push("E" + (index + 2))
            } else {
                el.thoi_gian_lap_dat_mua = el.field_thoi_gian_lap_dat_mua
                el.field_thoi_gian_lap_dat_mua = _moment(el.field_thoi_gian_lap_dat_mua, 'DD/MM/YYYY').format("MM/DD/YYYY")
            }
        }
        if (el.field_thoi_gian_lap_dat_mua && (typeof el.field_thoi_gian_lap_dat_mua == 'object')) {
            var temp = moment(el.field_thoi_gian_lap_dat_mua, "MM/DD/YYYY").valueOf() + (60000 * 60); //những trường hợp input truyền vào kiểu date thì bị thiếu mất 1 số s lên cứ cộng thêm 1h
            if (moment(moment(temp).format("DD/MM/YYYY"), "DD/MM/YYYY").isValid() == false) {
                console.log((found && found[0] && found[0].displayName ? found[0].displayName : "Ngày") + " khong hop le", el.field_thoi_gian_lap_dat_mua)
                el.statusCheck = false
                el.thoi_gian_lap_dat_mua = moment(el.field_thoi_gian_lap_dat_mua).format("DD/MM/YYYY");
                el.statusMessage = (found && found[0] && found[0].displayName ? found[0].displayName : "Ngày") + " khong hop le";
                el.cellFail.push("E" + (index + 2))
            } else {
                el.thoi_gian_lap_dat_mua = moment(moment(el.field_thoi_gian_lap_dat_mua, "DD/MM/YYYY").valueOf() + (60000 * 60)).format("DD/MM/YYYY");
                el.field_thoi_gian_lap_dat_mua = moment(moment(el.field_thoi_gian_lap_dat_mua, "DD/MM/YYYY").valueOf() + (60000 * 60)).format("MM/DD/YYYY")
            }
        }
        return el;
    })
    return excelData;
}
//check định dạng số điện thoại đầu vào
function checkFormatPhone(arr) {
    arr.forEach(function (el, index) {
        el.field_so_dien_thoai = el.field_so_dien_thoai ? el.field_so_dien_thoai.toString() : "";
        /* Xóa khoảng trắng trong số điện thoại */
        el.field_so_dien_thoai = _.reduce(el.field_so_dien_thoai, (memo, c)=>{
            if(c != ' '){
                return memo.concat(c);
            }
            return memo
        }, '');
        /* số điện thoại bắt đầu bằng +84XXXXXX hoặc 84XXXXXX => 0XXXXXX */
        if(el.field_so_dien_thoai.slice(0, 2) == '84'){
            el.field_so_dien_thoai = el.field_so_dien_thoai.replace('84', '0');
        }else if(el.field_so_dien_thoai.slice(0, 3) == '+84'){
            el.field_so_dien_thoai = el.field_so_dien_thoai.replace('+84', '0');
        }
        if (el.field_so_dien_thoai && el.field_so_dien_thoai.length > 0 && el.field_so_dien_thoai[0] != "0") {
            el.field_so_dien_thoai = "0" + el.field_so_dien_thoai
        }

        /* số điện thoại phải hoàn toàn là số và không chứa kí tự đặc biệt, độ dài 10 hoặc 11 số */
        var phoneReg = new RegExp('^\\d+$');
        if(!el.field_so_dien_thoai.toString().match(phoneReg)|| el.field_so_dien_thoai.toString().length < 10 || el.field_so_dien_thoai.toString().length > 11){
            el.statusCheck = false
            el.statusMessage = "Wrong form";
            el.cellFail = []; // chứa các cell fail
            el.cellFail.push("A" + (2 + index))
        }else{
            el.statusCheck = true
            el.cellFail = []; // chứa các cell fail
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
            el.statusCheck = true
            el.cellFail = []; // chứa các cell fail
        } else {
            el.statusCheck = false
            el.statusMessage = "checkDuplicate";
            el.cellFail = []; // chứa các cell fail
            el.cellFail.push("A" + (2 + index))
        }
        return el;
    })
    return arr;
}

//check số điện thoại có nằm trong danh sách chặn hay không
async function checkDoNotCall(arr) {
    let listDoNotCall = await getListDonotCall();

    let doNotCall = new Set(listDoNotCall)
    console.log("lấy xong do not call");
    arr.forEach(function (el, index) {
        if(el.statusCheck){
            // Kiểm tra số điện thoại có nằm trong danh sách donotcall không	
            if (doNotCall.has(el.field_so_dien_thoai)) {
                el.statusCheck = false
                el.statusMessage = "Do Not Call";
                el.cellFail.push("A" + (2 + index))
            }
            return el;
        }
    })
    return arr;
}

function exportExcel(req, res, fileNameReal, excelData, columnToKey) {
    var waterFallTask = [];
    var arrTemp = Object.values(columnToKey);

    waterFallTask.push(function (next) {
        var workbook = new _Excel.Workbook();
        workbook.created = new Date();
        next(null, workbook)
    });
    waterFallTask.push(function (workbook, next) {
        var sheet = workbook.addWorksheet('My Sheet', { state: 'visible' });
        setWeightColumn(sheet);
        //createTitleExcel(sheet);
        createHead(sheet);
        _.each(excelData, (item) => {
            if(item.thoi_gian_lap_dat_mua){
                item.field_thoi_gian_lap_dat_mua = item.thoi_gian_lap_dat_mua
            }
            sheet.addRow(genRowTable(item, arrTemp));
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
function setWeightColumn(worksheet) {
    let valueWidthColumn = [
        30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30
    ]
    _.each(valueWidthColumn, function (item, index) {
        worksheet.getColumn(++index).width = item;
    })

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

function getTitleHeadTableExcel(fields) {
    titleHeadTable = [];
    fields.forEach(function (el, index) {
        titleHeadTable.push(
            { key: "key_" + index, value: el.displayName.toLocaleUpperCase() }
        )
    })
    titleHeadTable.push({ key: "ketqua", value: "KẾT QUẢ" });
    return titleHeadTable;
}

function genRowTable(item, arrTemp) {
    var nameTitleTable = [];
    arrTemp.forEach(function (el) {
        nameTitleTable.push((item[el] ? item[el] : ""))
    })
    nameTitleTable.push((item.statusCheck == true ? "Success" : (item.statusCheck == false ? `Fail${item.statusMessage ? " " + item.statusMessage : "Chưa xác định"}` : "Updated")))
    return nameTitleTable;
}

//gen ra thông tin các trường cần insert
function genColumnExcel(fields) {
    let columnToKey = {};
    fields.forEach((element, index) => {
        let chr = String.fromCharCode(97 + index).toLocaleUpperCase()
        columnToKey[chr] = element.modalName
    });
    return columnToKey;
}

//lấy danh sách donotcalls

async function getListDonotCall() {
    let CONFIG = await _Config.findOne({}).lean();
    if (!CONFIG || !CONFIG.FCAPI) {
        throw new Error("Chưa set up modal config !");
    }

    let opts = {
        method: 'GET',
        uri: CONFIG.FCAPI.ip + CONFIG.FCAPI.getListDoNotCall + "?" + "token=" + CONFIG.FCAPI.token,
        agentOptions: {
            rejectUnauthorized: false
        }
    }

    return new Promise((resolve, reject) => {
        _request(opts, function (error, response, body) {
            // code:400 rơi vào các lỗi trong trường hợp api verify	
            if (body && _.IsJsonString(body) && body.code != 400) {
                var body = JSON.parse(body)
                resolve(body.message)
            } else {
                console.log("Lỗi api NĐ91", error)
                reject("Cloud Disconnect or Error !")
            }
        });
    })
}