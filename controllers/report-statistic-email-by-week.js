var titleExport = 'BÁO CÁO THỐNG KÊ EMAIL THEO TUẦN';
exports.index = {
  json: function (req, res) {
    let page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
    let rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
  },
  html: function (req, res) {
    _.render(req, res, 'report-statistic-email-by-day', {
      title: titleExport,
      plugins: [['chosen'], ['bootstrap-select'], ['ckeditor'], ['ApexCharts'], 'fileinput']
    }, true);
  }
}