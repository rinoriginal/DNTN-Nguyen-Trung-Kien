var zipFolder = require('zip-folder');

const createExcelFile = require('./createExcelFile');
const templateExcel = require('./templateExcel');
const weightColumnTable = require('./weightColumnTable');

const MAX_RECORDS_PER_FILE = 10;


/**
 * ! Function này hiện đang thử nghiệm, chưa thể sử dụng được
 * @param {*} req 
 * @param {*} titleTable 
 * @param {*} excelHeader 
 * @param {*} configHeader 
 * @param {*} Model 
 * @param {*} aggregateQuery 
 * @param {*} totalResult 
 * @param {*} opts 
 * @param {*} cb 
 */
function handleExcel(
  req,
  titleTable,
  excelHeader,
  configHeader,
  Model,
  aggregateQuery,
  totalResult,
  opts,
  cb) {
  let waterFallTask = [];
  let currentDate = new Date();
  let folderName = req.session.user._id + "-" + currentDate.getTime();
  let fileName = titleTable + ' ' + _moment(currentDate).format('DD-MM-YYYY');

  if (totalResult > MAX_RECORDS_PER_FILE) {
    for (let k = 0; k < Math.ceil(totalResult / MAX_RECORDS_PER_FILE); k++) {
      let tempWaterfall = [];
      if (k == 0) {
        tempWaterfall = function (callback) {
          _async.parallel(createParallelTask(k), callback);
        }
      } else {
        tempWaterfall = function (objectId, callback) {
          let lastObjectId = objectId[0].objectId;
          let lastFolderName = objectId[0]._folderName;
          _async.parallel(createParallelTask(k, lastObjectId, lastFolderName), callback);
        }
      }
      waterFallTask.push(tempWaterfall);
    }

    let createParallelTask = function (index, objectId, lastfolderName) {
      let tempParallelTask = [];
      let _fileName = fileName + '-' + index
      let temp = function (callback) {
        let _agg = [...aggregateQuery];
        if (_.isEmpty(objectId)) {
          _agg.push({ $limit: MAX_RECORDS_PER_FILE });
        } else {
          _agg.push({ $match: { _id: { $gt: _.convertObjectId(objectId) } } }, { $limit: MAX_RECORDS_PER_FILE });
        }
        Model.aggregate(_agg, function (err, result) {
          if (err) return callback(err, null);

          createExcelFile(
            req,
            titleTable,
            excelHeader,
            configHeader,
            folderName,
            _.isEmpty(lastfolderName) ? null : lastfolderName,
            _fileName,
            result,
            opts,
            callback
          );
        });
      };
      tempParallelTask.push(temp);
      return tempParallelTask;
    }
  } else {
    let temp = function (callback) {

      Model.aggregate(aggregateQuery, function (err, result) {
        if (err) return callback(err, null);

        createExcelFile(
          req,
          titleTable,
          excelHeader,
          configHeader,
          folderName,
          null,
          fileName,
          result,
          opts,
          callback
        );
      });
    };
    waterFallTask.push(temp);
  }

  waterFallTask.push(
    function (objectId, callback) {
      _async.parallel({
        archiver: function (callback) {
          fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'export-ternal'), callback);
        },
        cdr: function (callback) {
          fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'), callback);
        }
      }, callback);
    },
    function (t, callback) {
      let folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
      let folderZip = path.join(_rootPath, 'assets', 'export', 'export-ternal', folderName + '.zip');

      zipFolder(folderPath, folderZip, function (err) {
        console.log(err);
        callback(err, folderZip.replace(_rootPath, ''));
      });
      console.log(222, folderPath, folderZip);

    }
  );

  _async.waterfall(waterFallTask, function (err, folderZip) {
    console.log(err);
    console.log('folderZipppp', folderZip);
    cb(err, folderZip);
  });
}

module.exports = {
  handleExcel,
  createExcelFile,
  templateExcel,
  weightColumnTable,
};