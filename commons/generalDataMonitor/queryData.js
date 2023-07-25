function queryData(_Model, queryCurrentMonth, queryPreviousMonth, cb) {

  _async.parallel({
    dataCurrentMonth: function (callback) {
      _Model.aggregate(queryCurrentMonth, function (error, result) {
        callback(error, result);
      });
    },
    dataPreviousMonth: function (callback) {
      _Model.aggregate(queryPreviousMonth, function (error, result) {
        callback(error, result);
      });
    },
  }, function (err, result) {
    cb(err, result);
  })
}

module.exports = queryData;