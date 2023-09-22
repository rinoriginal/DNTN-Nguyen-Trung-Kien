const axios = require('axios');
var titlePage = 'Báo cáo quản lý ghi âm';
var token;

var { columnToLetter } = require(path.join(
  _rootPath,
  "helpers",
  "functions",
  "handle.string.js"
));
var zipFolder = require('zip-folder');

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
    try {
        let pageSize = _.has(req.query, 'page') ? Number(req.query.page) : 1;
        var rows = _.has(req.query, 'rows') ? Number(req.query.rows) : 10;
        if(!token){
            res.json({
                code: 401,
                message: "Hệ thống chưa xác thực!"
            })
        }
        else{
            let startDate, endDate;
            let queryDate;
            if (_.has(req.query, 'date')) {
                queryDate = req.query.date.split(' - ');
                if (queryDate.length > 1) {
                    [startDate, endDate] = queryDate;
                    startDate = moment(startDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
                    endDate = moment(endDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
                } else {
                    startDate = moment(queryDate[0], 'DD/MM/YYYY').format('YYYY-MM-DD');
                    endDate = moment(queryDate[0], 'DD/MM/YYYY').format('YYYY-MM-DD');
                }
            } else {
                startDate = moment().format('YYYY-MM-DD');
                endDate = moment().format('YYYY-MM-DD');
            }
            let data = {
                "startDate": startDate,
                "endDate": endDate,
                "nameCompany": "YAMAHA"
            };
            if(_.has(req.query, 'typeCall')) data.call = req.query.typeCall 
            if(_.has(req.query, 'remoteParty')) data.remoteParty = req.query.remoteParty // sdt KH
            if(_.has(req.query, 'extension')) data.selectedOption = req.query.extension //loai cuoc goi
            var download = 0
            if (_.has(req.query, 'download') && req.query.download == 1) {
                download = 1
            }
            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${_config.ipRecording.ip}/recordings/searchs/?page=${pageSize}&limit=${rows}&download=${download}`,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`, 
                    'Cookie': `jwt=${token}`
                },
                data : data
            };
            axios.request(config).then((response) => {
                var data = response.data && response.data.data ? response.data.data.docs : []
                if(data.length > 0){
                    var paginator = new pagination.SearchPaginator({
                        prelink: '/report-call-recording-v2',
                        current: pageSize || 0,
                        rowsPerPage: 10,
                        totalResult: response.data && response.data.data ? response.data.data.total : 0
                    });

                    res.json({ code: 200, message: data, paging: paginator.getPaginationData() });
                }
                else{
                    res.json({ code: 500, message: "Không có dữ liệu!"});
                }
            }).catch((error) => {
                return res.json({ code: 500, message: error.message || error });
            });
        }

    } catch (err) {
      return res.json({ code: 500, message: err.message || err });
    }
  },
  html: async function (req, res) {
    try {
        loginRecording()
        let agentInfos = await _Users.find({idAgentCisco: {$ne: null}})
        _.render(req, res, 'report-call-recording-v2', {
            title: titlePage,
            myUsers: agentInfos,
            plugins: ['moment', ['bootstrap-select'], ['bootstrap-datetimepicker'], ['bootstrap-daterangepicker'], ['chosen']]
        }, true, false);
    } catch (err) {
      _.render(req, res, '500', null, null, { title: 'Có lỗi xảy ra', message: err.message || err });
    }
  }
};
async function loginRecording(){
  try {
    let conf = _config.ipRecording;
    let data = JSON.stringify({
      "phone": conf.user,
      "password": conf.pass
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${conf.ip}/auth/login`,
      headers: { 
          'Content-Type': 'application/json'
      },
      data : data
    };

    axios.request(config).then((response) => {
      if(response && response.data && response.data.data){
          token = response.data.data.token
      }
      return response
    }).catch((error) => {
      console.log(error);
    });

  } catch (error) {
    console.log("err login recording", error);
  }
}