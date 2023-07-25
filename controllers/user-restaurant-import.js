/**
 * Dear maintainer,
 * Once you are done trying to 'optimize' this routine,
 * and have realized what a terrible mistake that was,
 * please increment the following counter as a warning
 * to the next guy:
 * total_hours_wasted_here = 16
 */
var fs = require('fs');
/**
 * Đặt thời gian time out lớn (20 phút), trường hợp đọc file quá lớn (56k dòng) gặp lỗi duplicate của express.
 * @type {number}
 */
var requestTimeout = 20 * 60 * 1000;
var maxExcelRecord = 65000;
exports.index = {
    json: function (req, res) {
    },
    html: function (req, res) {
        _.render(req, res, 'user-restaurant-import', {
            title: 'Thêm Agent',
            plugins: [['chosen'], 'fileinput']
        }, true);
    }
};

// New
exports.new = function (req, res) {
    _.render(req, res, 'user-restaurant-import', _.extend({
        title: 'Tạo mới khách hàng',
        plugins: [['bootstrap-select']]
    }), true, error);
};
/**
 * Thực hiện chức năng này với file excel lớn, có khả năng gây lỗi "Out of memory", cần thiết đặt nodeV8
 * You can increase the default limits by passing --max-old-space-size=<value> which is in MB.
 * node --max-old-space-size=4096 app.js
 * @param req
 * @param res
 */
exports.create = function (req, res) {
    req.connection.setTimeout(requestTimeout);
    var checkTime = Date.now();
    _async.parallel({
        user: function (callback) {
            _Users.find({}, { name: 1 }, callback)
        },
        restaurant: function (callback) {
            _Restaurants.find({}, { code: 1 }, callback)
        },

    }, function (err9, data9) {
        var templateAgent = data9.user;
        var templateRestaurant = data9.restaurant;

        _async.waterfall([
            function (next) {
                var workbook = new _Excel.Workbook();
                console.log(38, Date.now() - checkTime);
                // Đọc file excel
                workbook.xlsx
                    .readFile(req.files[0].path)
                    .then(function () {
                        console.log(42, Date.now() - checkTime);
                        var _objs = [];
                        var _bObjs = []; //luu array obj backup
                        var _checkedUserRestaurant = [];
                        var _processUserRestaurant = [];

                        var _templateUserRestaurant = {
                            "AGENT": { _value: "idAgent", type: 0 },
                            "RESTAURANT": { _value: "idRestaurant", type: 0 }
                        }

                        workbook.eachSheet(function (worksheet, sheetId) {
                            //Todo: Bỏ qua nếu số bản ghi trống
                            if (worksheet._rows.length < 2) {
                                next(null, '---------y---------', []);
                            }
                            else {
                                var _required = []
                                var _headersUserRestaurant = _convertUserRestaurant(worksheet.getRow(1).values, _templateUserRestaurant)
                                var _headerFieldsUserRestaurant = _.keys(_headersUserRestaurant)
                                var _keysUserRestaurant = (function () {
                                    var keysHeaderUserRestaurant = _.keys(_headersUserRestaurant);
                                    if (keysHeaderUserRestaurant.length > 0 && keysHeaderUserRestaurant.length - 1 < _.keys(_templateUserRestaurant).length) {
                                        return keysHeaderUserRestaurant[0] == '0' ? keysHeaderUserRestaurant.slice(1) : keysHeaderUserRestaurant;
                                    }
                                    return _.keys(_templateUserRestaurant);
                                })();

                                //check file excel import sai
                                var checkFile = true;
                                var xxx = []
                                _.each(_templateUserRestaurant, function (el) {
                                    xxx.push(el._value)
                                })
                                var zzz = Object.keys(_headersUserRestaurant)
                                if (zzz.length < 1) {
                                    checkFile = false;
                                } else if (zzz.length > 0 && _.difference(xxx.zzz).length > 0) {
                                    checkFile = false
                                }
                                if (!checkFile) return res.json({ code: 500, msg: 'File import không đúng mẫu!' })


                                var count = 1;
                                var _inNumbers = [];
                                var _addedNumber = [];
                                var _addedUserRestaurant = [];
                                var _duplicatedNumbers = [];
                                var _duplicatedUserRestaurant = [];

                                // // Chuẩn hóa trường số điện thoại
                                // for (var i = 2; i <= worksheet._rows.length; i++) {
                                //     var _sdtIndex = _headerFields.indexOf('field_so_dien_thoai');

                                //     if (worksheet.getRow(i).values[_sdtIndex]) {
                                //         var text = worksheet.getRow(i).values[_sdtIndex].toString().match(/\d/g) ? worksheet.getRow(i).values[_sdtIndex].toString().match(/\d/g) : [];
                                //         text = text.join("");
                                //         text = (text[0] != 0 && text.substr(0, 2) != 84) ? '0' + text : text;
                                //         worksheet.getRow(i).getCell(_sdtIndex).value = text;
                                //         _inNumbers.push(text);
                                //     };
                                // };

                                // if (!_CCKFields['field_so_dien_thoai'].processNumbers) {
                                //     _CCKFields['field_so_dien_thoai'].processNumbers = [];
                                // }

                                // _addedNumber = _.difference(_inNumbers, _CCKFields['field_so_dien_thoai'].processNumbers);
                                // _CCKFields['field_so_dien_thoai'].processNumbers = _.union(_CCKFields['field_so_dien_thoai'].processNumbers, _inNumbers);

                                // _addedUserRestaurant = _.difference(_inNumbers, _processUserRestaurant);
                                // _processUserRestaurant = _.union(_processUserRestaurant, _inNumbers);

                                // Đọc dữ liệu từng dùng
                                _async.whilst(
                                    function () {
                                        return count < worksheet._rows.length;
                                    },
                                    function (callback) {
                                        count++;
                                        var _row = worksheet.getRow(count).values;
                                        var _bObj = {};
                                        //Todo: Bỏ qua dòng trống
                                        _.each(_row, function (cell, i) {
                                            if (i > 0) _row[i] = getCellValue(worksheet.getRow(count).getCell(i));
                                        });

                                        if (_.isEmpty(_row)) {
                                            //Dong trang
                                            _async.eachSeries(_keysUserRestaurant, function (k, cb) {
                                                _bObj[k] = { 'value': '', 'isRequired': 1 };
                                                cb();
                                            }, function (error) {
                                                _bObj['field_error'] = 'Wrong form';
                                                _bObjs.push(_bObj);
                                                callback(null, count);
                                            });
                                        } else if (!_.isEqual(_.intersection(_required, _.keys(_row)), _required)) {
                                            //Thieu field
                                            _async.eachSeries(_keysUserRestaurant, function (k, cb) {
                                                if (_.has(_headersUserRestaurant, k)) {
                                                    _bObj[k] = { 'value': _row[_headerFieldsUserRestaurant.indexOf(k)], 'isRequired': 1 };
                                                }
                                                cb();
                                            }, function (error) {
                                                _bObj['field_error'] = 'Wrong form';
                                                _bObjs.push(_bObj);
                                                callback(null, count);
                                            });
                                        }
                                        else {
                                            var _id = new mongodb.ObjectID();
                                            var _obj = {
                                                _id: _id,
                                                entityId: _id,
                                                status: 1,
                                                // sources: req.body.sources
                                            };
                                            //Todo: Chạy vòng lặp lấy dữ liệu từng dòng
                                            _async.eachSeries(_keysUserRestaurant, function (k, cb) {
                                                var value = _row[_headerFieldsUserRestaurant.indexOf(k) + 1];
                                                if (_.has(_headersUserRestaurant, k) && !_.isUndefined(value)) {
                                                    _obj[k] = (k == 'idAgent' ? _convertAgent(templateAgent, value) : _convertRestaurant(templateRestaurant, value));
                                                    _bObj[k] = { 'value': value, 'isRequired': 1 };
                                                }
                                                else {
                                                    _obj[k] = '';
                                                    _bObj[k] = { 'value': '', 'isRequired': 1 };
                                                }

                                                cb();
                                            }, function (error) {
                                                _bObjs.push(_bObj);
                                                _obj.bIndex = _bObjs.length - 1;
                                                _objs.push(_obj);
                                                callback(null, count);
                                            });
                                        }
                                    },
                                    function (err, n) {
                                        // var _emailObjs = [];
                                        _async.waterfall([
                                            function (next2) {
                                                // Tìm kiếm số điện thoại đã tồn tại trong hệ thống
                                                mongoClient.collection('userrestaurants').find({
                                                    idAgent: { $in: _.pluck(_objs, 'idAgent') },
                                                    idRestaurant: { $in: _.pluck(_objs, 'idRestaurant') }
                                                }).toArray(function (err, result) {
                                                    _duplicatedUserRestaurant = [];
                                                    _.each(result, function (i) {
                                                        _duplicatedUserRestaurant.push(i.idAgent + i.idRestaurant)
                                                    })

                                                    _objs = _.chain(_objs)
                                                        .map(function (_obj) {
                                                            var bIndex = _obj.bIndex;
                                                            _bObjs[bIndex]['field_error'] = '';
                                                            var wrongFormat = false;
                                                            _.each(_.keys(_obj), function (field) {

                                                                if (_.has(_headersUserRestaurant, field)
                                                                    && _.isNull(_convertType(_obj[field], field, _headersUserRestaurant[field]))
                                                                    && !_.isEqual(_obj[field], '')
                                                                ) {
                                                                    wrongFormat = true;
                                                                    _bObjs[bIndex][field].isWrongFormat = 1;
                                                                    _bObjs[bIndex]['field_error'] += (_.isEqual(_bObjs[bIndex]['field_error'], '') ? '' : '|') + 'Wrong form';

                                                                }
                                                            });
                                                            // console.log(1111111,_convertType(_obj['idAgent']));
                                                            // console.log(222222222, _.isNull(_convertType(_obj['idAgent'], 'idAgent', _headerFieldsUserRestaurant['idAgent'])));

                                                            // // Kiểm tra format của số điện thoại
                                                            // if (!isPhoneValid(String(_obj['field_so_dien_thoai'])) || wrongFormat) {
                                                            //     if (String(_obj['field_so_dien_thoai']).length == 0) _bObjs[bIndex]['field_so_dien_thoai'].isRequired = 1;
                                                            //     _bObjs[bIndex]['field_error'] += (_.isEqual(_bObjs[bIndex]['field_error'], '') ? '' : '|') + 'Wrong form';
                                                            // };

                                                            // Kiểm tra agent đã được xử lý
                                                            if (_checkedUserRestaurant.indexOf(_obj['idAgent'] + _obj['idRestaurant']) >= 0) {
                                                                _bObjs[bIndex]['field_error'] += (_.isEqual(_bObjs[bIndex]['field_error'], '') ? '' : '|') + 'Duplicated';
                                                            };

                                                            // // Kiểm tra số điện thoại đang được xử lý
                                                            // if (_CCKFields['field_so_dien_thoai'].processNumbers.indexOf(_obj['field_so_dien_thoai']) >= 0 &&
                                                            //     _addedNumber.indexOf(_obj['field_so_dien_thoai']) < 0) {
                                                            //     _bObjs[bIndex]['field_error'] += (_.isEqual(_bObjs[bIndex]['field_error'], '') ? '' : '|') + 'In Processing';
                                                            // };

                                                            // Kiểm tra số điện thoại đã tồn tại trong hệ thống
                                                            if (_duplicatedUserRestaurant.indexOf(_obj['idAgent'] + _obj['idRestaurant']) >= 0) {
                                                                if (_.isEqual(_bObjs[bIndex]['field_error'], '')) {
                                                                    _obj._id = result[_duplicatedUserRestaurant.indexOf(_obj['idAgent'] + _obj['idRestaurant'])]._id;
                                                                }
                                                                _bObjs[bIndex]['field_error'] += (_.isEqual(_bObjs[bIndex]['field_error'], '') ? '' : '|') + 'Duplicated';
                                                            };


                                                            if (_.isEqual(_bObjs[bIndex]['field_error'], '')) {
                                                                _checkedUserRestaurant.push(_obj.idAgent + _obj.idRestaurant);
                                                                return _obj;
                                                            } else {
                                                                return null;
                                                            }
                                                        })
                                                        .compact()
                                                        .value();
                                                    var _userRestaurantBulk = mongoClient.collection('userrestaurants').initializeUnorderedBulkOp({ useLegacyOps: true });
                                                    // Cập nhật dữ liệu mới
                                                    _.each(_objs, function (obj) {
                                                        var _userRestaurantData = {
                                                            status: 1,
                                                            created: new Date(),
                                                            createBy: req.session.user ? _.convertObjectId(req.session.user._id) : null,
                                                            updated: null,
                                                            updateBy: null
                                                        };
                                                        _.each(Object.keys(_headersUserRestaurant), function (header) {
                                                            var fValue = _convertType(obj[header], header, _headersUserRestaurant[header]);
                                                            _userRestaurantData[header] = fValue;
                                                        })
                                                        _userRestaurantBulk.insert(_userRestaurantData);
                                                    });

                                                    var _bulks = [];
                                                    _bulks.push(_userRestaurantBulk);

                                                    /**
                                                     * 22.Feb.2017 hoangdv I develop & test this feature on
                                                     * mongodb@2.1.4, mongodb-core@1.2.32, bson@0.4.21 !important
                                                     * in your case if this block you can get Error "TypeError: Argument must be a string" please check version of modules
                                                     */
                                                    _async.each(_bulks, function (batch, callback) {
                                                        if (batch.s.currentBatch)
                                                            batch.execute(callback);
                                                        else
                                                            callback();
                                                    }, function (err) {
                                                        // _CCKFields['field_so_dien_thoai'].processNumbers = _.difference(_CCKFields['field_so_dien_thoai'].processNumbers, _addedNumber);
                                                        return next2(err);
                                                    });
                                                });
                                            },

                                        ], function (err2) {
                                            if (err2) next(err2, '-------y------', []);
                                            else next(null, _bObjs, _keysUserRestaurant);
                                        });
                                    }
                                );
                            }
                        });
                    });
            }
        ], function (error, result, header) {
            if (error) {
                return res.json({
                    code: 500,
                    msg: error.toString()
                });
            }
            var fileName = 'backup-' + 'user-restaurant-schema-' + Date.now() + '.xls';
            _async.waterfall([
                function (cb) {
                    var url = '/assets/export/' + fileName;
                    if (result.length > maxExcelRecord) {
                        // backup origin file, no mark error
                        fs.readFile(req.files[0].path, function (err, data) {
                            if (!err) {
                                fs.writeFile(path.join(_rootPath, 'assets', 'export', fileName), data, function () {
                                    // "do" do nothing.
                                });
                            }
                        });
                    } else {
                        //Tao file backup excel, đánh dấu lỗi
                        header.push('field_error');
                        createExcel(fileName, result, header);
                    }
                    // don't care
                    cb(null, url);
                }
            ], function (err, resp) {
                //Luu vao modal
                _UserRestaurantImportHistory.create({
                    name: fileName,
                    url: resp,
                    description: 'Import Data' + ": " + req.files[0].originalname,
                    createBy: req.session.user ? req.session.user.displayName : 'Missing',
                    created: Date.now()
                });
            });
            fs.unlink(req.files[0].path, function (er, status) {
                var timeProcess = Date.now() - checkTime;
                console.log(480, timeProcess);
                res.json({
                    code: 200,
                    total: result.length,
                    header,
                    processTime: millisToMinutesAndSeconds(timeProcess)
                });
            });
        });
    })
};

/**
 * millisecond -> mm:ss
 * @param millis
 * @returns {string}
 */
function millisToMinutesAndSeconds(millis) {
    var minutes = Math.floor(millis / 60000);
    var seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

/**
 * Chuẩn hóa dữ liệu khách hàng
 * @param val Dữ liệu đầu vào
 * @param k Loại dữ liệu
 * @param template Dữ liệu customer field
 * @returns {*}
 * @private
 */
var _convertType = function (val, k, template) {
    console.log(555555555, template);

    switch (template.type) {
        case 0:
            let _val = _.convertObjectId(val)
            return (_val) ? _val : null;
            break;
    }
};

var _convertAgent = function (templateAgent, str) {
    let z = _.filter(templateAgent, (el) => el.name == str.trim())
    return z.length > 0 ? z[0]._id : null;
}

var _convertRestaurant = function (templateRestaurant, str) {
    let z = _.filter(templateRestaurant, (el) => el.code == str.trim())
    return z.length > 0 ? z[0]._id : null;
}

/**
 * Tạo file excel backup
 * @param fileName tên file
 * @param arrayObj Dữ liệu đầu vào
 * @param header
 */
var createExcel = function (fileName, arrayObj, header) {
    var options = {
        filename: path.join(_rootPath, 'assets', 'export', fileName),
        useStyles: true, // Default
        useSharedStrings: true,
        dateFormat: 'DD/MM/YYYY HH:mm:ss'
    };
    var workbook = new _Excel.stream.xlsx.WorkbookWriter(options);
    workbook.addWorksheet("My Sheet");
    var worksheet = workbook.getWorksheet("My Sheet");
    var _cl = [];
    var _obj = arrayObj[0];
    _async.waterfall([
        function (callback1) {
            //Todo: Tạo column
            _async.each(_.keys(_obj), function (field, next) {
                var _style = {
                    alignment: { vertical: "middle", horizontal: "center" }, font: { size: 14, bold: true }, border: {
                        top: { style: "thin", color: { argb: "000000" } },
                        left: { style: "thin", color: { argb: "000000" } },
                        bottom: { style: "thin", color: { argb: "000000" } },
                        right: { style: "thin", color: { argb: "000000" } }
                    }
                };
                _cl.push({
                    header: field.indexOf('field_') > -1 ? field.split('field_')[1].toUpperCase() : field.toUpperCase(),
                    style: _style,
                    key: field.indexOf('field_') > -1 ? field.split('field_')[1].toUpperCase() : field.toUpperCase(),
                    width: 20
                });
                if (_.isEqual(typeof (_obj[field]), 'object') && _obj[field].isRequired) _style.font['color'] = { argb: "FF0000" };
                next();
            }, function (err) {
                if (!err) worksheet.columns = _cl;
                callback1();
            });
        },
        function (callback2) {
            //Todo: Tạo các bản ghi
            _async.each(arrayObj, function (obj, cb) {
                var row = {};
                _async.each(_.keys(_obj), function (field, next) {
                    if (!_.isEqual(typeof (obj[field]), 'object')) {
                        row[field.split('field_')[1].toUpperCase()] = obj[field];
                    }
                    else {
                        if (_.isEqual(obj[field].value, '') && obj[field].isRequired) {
                            //Todo: đánh dấu các cell gây error để fill màu sau
                            row[field.indexOf('field_') > -1 ? field.split('field_')[1].toUpperCase() : field.toUpperCase()] = '--NULL--';
                        } else if (obj[field].isWrongFormat) {
                            //Todo: đánh dấu các cell gây error để fill màu sau
                            row[field.indexOf('field_') > -1 ? field.split('field_')[1].toUpperCase() : field.toUpperCase()] = '--WRONG--' + obj[field].value;
                        }
                        else {
                            row[field.indexOf('field_') > -1 ? field.split('field_')[1].toUpperCase() : field.toUpperCase()] = obj[field].value;
                        }
                    }
                    next();
                }, function (error) {
                    if (!error) {
                        worksheet.addRow(row);
                    };
                    cb();
                });
            }, function (err) {
                callback2();
            });
        }
    ], function (err, resp) {
        worksheet.eachRow(function (row, rowNumber) {
            //Todo: Fill màu các cell error
            row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
                if (_.isEqual(cell.value, '--NULL--')) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "darkTrellis",
                        fgColor: { argb: "FFFF00" },
                        bgColor: { argb: "FFFF00" }
                    };
                    cell.value = '';
                } else if (cell.value && cell.value.toString().indexOf('--WRONG--') == 0) {
                    cell.fill = {
                        type: "pattern",
                        pattern: "darkTrellis",
                        fgColor: { argb: "FFFF00" },
                        bgColor: { argb: "FFFF00" }
                    };
                    cell.value = cell.value.replace('--WRONG--', '');
                }
            });
        });

        worksheet.commit();
        workbook.commit().then(function () {
            //res.download(options.filename);
        });
    });
};

/**
 * Lấy dữ liệu 1 cell của excel
 * @param cell
 * @returns {*}
 */
var getCellValue = function (cell) {
    switch (cell.type) {
        case 4:
            return _moment(cell.value).format("DD/MM/YYYY");
            break;
        default:
            return cell.toString();
            break;
    }
};

/**
 * Chuẩn hóa dữ liệu customer field
 * @param arr Dữ liệu khách hàng
 * @param template Tập giới hạn số trường
 * @returns {*}
 * @private
 */

var _convertUserRestaurant = function (arr, template) {
    return _.chain(arr)
        .compact()
        .reduce(function (memo, item) {

            item = item.replace("\r\n", ' ').trim()
            // console.log(item);

            if (_.has(template, item)) memo[template[item]._value] = { type: template[item].type, required: 1 };
            // else memo[_field] = {};
            return memo;
        }, {})
        .value();
};
