const axios = require('axios');

var token;

exports.index = {
    json: function (req, res) {
        try {
            if(!token){
                res.json({
                    code: 401,
                    message: "Hệ thống chưa xác thực!"
                })
            }
            else{
                var page = _.has(req.query, 'page') ? parseInt(req.query.page) : 1;
                var rows = _.has(req.query, 'rows') ? parseInt(req.query.rows) : 10;
                let data = {}
                if(_.has(req.query, 'createdAt') && !_.isEqual(req.query.createdAt, '')){
                    data.createdAt = moment(req.query.createdAt, 'DD/MM/YYYY').format('YYYY-MM-DD');
                }

                let config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: `${_config.ipRecording.ip}/histories?page=${page}&limit=${rows}`,
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
                            prelink: '/report-call-recording-history',
                            current: page || 0,
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
        } catch (error) {
            res.json({
                code: 500,
                message: error.message || error
            })
        }
    },
    html: function(req, res){
        loginRecording()
        try {
            _.render(req, res, 'report-call-recording-history',{
                title: 'Danh sách báo cáo ghi âm',
                plugins: [['chosen'], ['bootstrap-select'], ['bootstrap-datetimepicker']]
            }, true, false);
        } catch (error) {
            res.json({
                code: 500,
                message: error.message || error
            })
        }
    }
}

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