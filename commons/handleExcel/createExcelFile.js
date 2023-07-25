const templateExcel = require('./templateExcel');
const headerTabble = require('./headerTable');
const setWeightColumnTable = require('./weightColumnTable');
const dataTable = require('./dataTable');
const sumRow = require('./sumRow');

/**
 * * Xin chao
 * @param {*} req 
 * @param {*} startTime Thời gian tìm dữ liêu
 * @param {*} endTime Thời gian Tìm dữ liệu
 * @param {*} titleTable Tên của bảng
 * @param {*} excelHeader Object config dùng để map các dữ liệu vào cột
 * @param {*} configHeader Tên key để tìm title config trong file const.json
 * @param {*} folderName Tên thư mục chứa file excel
 * @param {*} lastFolderName 
 * @param {*} fileName Tên file
 * @param {*} data Dữ liệu
 * @param {*} sumRows Tính tổng dữ liệu
 * @param {*} opts Các option tùy chọn
 * @param {*} cb callback
 * @returns
 */
function createExcelFile(
  req,
  startTime,
  endTime,
  titleTable,
  excelHeader,
  configHeader,
  folderName,
  lastFolderName,
  fileName,
  data,
  sumRows,
  opts,
  cb
) {
  let options = {
    filename: path.join(_rootPath, 'assets', 'export', 'cdr', folderName, fileName + '.xlsx'),
    useStyles: true,
    useSharedStrings: true,
    dateFormat: 'DD/MM/YYYY HH:mm:ss'
  };

  if (data === null || data.length <= 0) {
    const error = new Error('Không có dữ liệu để xuất ra file Excel!');
    return cb(error);
  }

  _async.waterfall([
    function createFolder(callback) {
      if (!lastFolderName) {
        fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr', folderName), callback);
      } else {
        callback(null, null)
      }
    },
    // Tìm object cấu hình tiêu đề của bảng trong file const.json
    function readFileConfigHeader(result, callback) {
      fsx.readJson(path.join(_rootPath, 'assets', 'const.json'), function (err, config) {
        const titles = config.MESSAGE[configHeader];
        callback(err, titles);
      });
    },
    // Tạo workbook và sheet
    function workbook(titles, callback) {
      let workbook = new _Excel.Workbook();
      workbook.creator = req.session.user.displayName;
      workbook.created = new Date();
      let sheet = workbook.addWorksheet(titleTable);

      callback(null, { workbook, sheet, titles });
    },
    // Set chiều rộng cho các cột trong bảng
    function weightColumn(dataResult, callback) {
      setWeightColumnTable(dataResult.sheet, opts, function (err, sheet) {
        dataResult = { ...dataResult, sheet };
        callback(err, dataResult);
      });
    },
    // Tạo giao diện cho file excel
    function configTemplateExcel(dataResult, callback) {
      templateExcel(startTime, endTime, titleTable, dataResult.sheet, opts, function (err, sheet) {
        dataResult = { ...dataResult, sheet };
        callback(err, dataResult)
      });
    },
    // Tạo tiêu đề cho bảng
    function configHeaderTable(dataResult, callback) {
      headerTabble(dataResult.sheet, excelHeader, dataResult.titles, function (err, sheet) {
        dataResult = { ...dataResult, sheet };
        callback(err, dataResult);
      });
    },
    // Tạo bảng
    function createDataTable(dataResult, callback) {
      dataTable(data, excelHeader, dataResult.sheet, function (err, sheet) {
        dataResult = { ...dataResult, sheet };
        callback(err, dataResult);
      })
    },
    // Tạo Dòng tính tổng
    function createSumRow(dataResult, callback) {
      if (!sumRows || sumRows == null || sumRows <= 0) {
        return callback(null, dataResult);
      }
      sumRow(sumRows, excelHeader, dataResult.sheet, function (err, sheet) {
        dataResult = { ...dataResult, sheet };
         callback(err, dataResult);
      })
    },
    // Ghi dữ liệu vào file excel
    function recordData(dataResult, callback) {
      let workbook = dataResult.workbook;
      workbook.xlsx.writeFile(options.filename).then(function (err, rss) {
        callback(err, rss)
      });
    },
  ], function (err, result) {
    return cb(err, {
      objectId: data[data.length - 1]
        ? data[data.length - 1]._id
        : null, _folderName: folderName
    });
  });
};

module.exports = createExcelFile;