var zipFolder = require('zip-folder');

const { createExcelFile } = require('../commons/handleExcel')
let titleExcelTotal = 'Báo cáo login - logout tổng hợp';

exports.index = {
	json: async function (req, res) {
    try {
      const {
				dateTime,
				agents,
				exportExcel,
				type,
			} = req.query;
			let queryApi = {};

			if (!dateTime) throw new Error('Trường thời gian là bắt buộc!');

      let startTime = _moment(dateTime.split(' - ')[0], 'DD-MM-YYYY').startOf('day').format('YYYY-MM-DD HH:mm:ss');
			let endTime = dateTime.split(' - ')[1] ? moment(dateTime.split(' - ')[1], 'DD-MM-YYYY').endOf('day').format('YYYY-MM-DD HH:mm:ss') : moment(dateTime.split(' - ')[0], 'DD-MM-YYYY').endOf('day').format('YYYY-MM-DD HH:mm:ss');

			if (!startTime || !endTime) throw new Error('Ngày bắt đầu và ngày kết thúc là bắt buộc!');
      queryApi.startTime = {$gte: _moment(startTime).toDate()}
      queryApi.endTime = {$lte: _moment(endTime).toDate()}
      let agg = bindAgg(type, agents, queryApi)
      _Users.aggregate(agg, async function(err, result){
        if(err) res.json({ code: 500,message: err.message || err })
        else if(exportExcel){
          const createExcelResult = await exportExcelTotal(req, startTime, endTime, result)

          return res.json({ code: 200, linkFile: createExcelResult });
        }
        else{
          res.json({
            code: 200,
            data: result
          })
        }
      })
    } catch (error) {
      res.json({
        code: 500,
        message: error.message || error
      })
    }
  },
  html: async function (req, res) {
    try {
      // Kiểm tra quyền truy cập
			if (!req.session.auth.company || !req.session.auth.company.leader) {
				throw new Error('Không đủ quyền truy cập!');
			}
      // Lấy danh sách agent
			const agentsInfoResult = await _Users.find({status: 1});

      _.render(req, res, 'report-login-logout', _.extend({
				title: 'Báo cáo Login - Logout',
        agent: agentsInfoResult,
				plugins: ['moment', ['bootstrap-select'], 'export-excel', 'google-chart'],
			}, {}), true);
    } catch (error) {
      return _.render(req, res, 'report-login-logout', null, true, error);
    }
  }
}

function bindAgg (type, agents, queryApi) {
  try {
    let agg = []
    if(agents) agg.push({$match: {_id: {$in: _.arrayObjectId(agents)} }})
      agg.push(
        { $lookup: { from: 'agentstatuslogs', localField: '_id', foreignField: 'agentId', as: 'agentstatuslogs' } },
        { $unwind: {path: '$agentstatuslogs', preserveNullAndEmptyArrays: true}},
        { $project: {
            _id: 1,
            startTime: "$agentstatuslogs.startTime",
            endTime: "$agentstatuslogs.endTime",
            status: "$agentstatuslogs.status",
            endReason: "$agentstatuslogs.endReason",
            displayName: 1
        }},
        {$match: {endReason: "logout"}},
        {$match: queryApi},
      )
      if(type == 'by-day'){
        agg.push(
          { $project: {
            _id: 1,
            startTime: 1,
            endTime: 1,
            displayName: 1,
            date: { $dateToString: { format: "%d-%m-%Y", date: "$startTime" } },
            status: 1
          }},
          {$group: {
            _id: {id: "$_id", date: "$date"},
            totalDuration: {$sum: {$subtract: ["$endTime", "$startTime"]}},
            avgDuration: {$avg: {$subtract: ["$endTime", "$startTime"]}},
            status: {$push: {
              startTime: "$startTime",
              endTime: "$endTime",
              event: "$status",
            }},
            displayName: {$first: "$displayName"},
            LoginDateTime: {$first: "$startTime"},
            LogoutDateTime: {$last: "$endTime"},
          }}
        )
      }
      else{
        agg.push(
          { $group: {
            _id: "$_id",
            displayName: {$first: "$displayName"},
            LoginDateTime: {$first: "$startTime"},
            LogoutDateTime: {$last: "$endTime"},
            status: {$push: {
              startTime: "$startTime",
              endTime: "$endTime",
              event: "$status",
            }},
            totalDuration: {$sum: {$subtract: ["$endTime", "$startTime"]}},
            avgDuration: {$avg: {$subtract: ["$endTime", "$startTime"]}},
          }}
        )
      }
    return agg;
  } catch (error) {
    console.log('errr', error);
  }
}

function exportExcelTotal(req, startDate, endDate, data) {
	return new Promise(async (resolve, reject) => {
		try {
			let currentDate = new Date();
			let folderName = req.session.user._id + "-" + currentDate.getTime();
			let fileName = titleExcelTotal + ' ' + _moment(currentDate).format('DD-MM-YYYY');

			let dataHeader = {
				TXT_NAME: 'displayName',
				TXT_FIRST_LOGIN_TIME: 'loginDateTime',
				TXT_LAST_LOGOUT_TIME: 'logoutDateTime',
				TXT_TOTAL_ONLINE_DUR: 'totalDuration',
				TXT_AVG_ONLINE_DUR: 'avgDuration',
			}

			let newData = data.map((item) => {
				return {
					displayName: item.displayName,
					loginDateTime: _moment(item.LoginDateTime).format('HH:mm DD/MM/YYYY'),
					logoutDateTime: _moment(item.LogoutDateTime).format('HH:mm DD/MM/YYYY'),
					totalDuration: hms(item.totalDuration),
					avgDuration: hms(item.avgDuration),
				}
			});

			await createExcel(
				req,
				startDate,
				endDate,
				titleExcelTotal,
				dataHeader,
				'REPORT_LOGIN_LOGOUT',
				folderName,
				null,
				fileName,
				newData,
				null,
				{
					valueWidthColumn: [35, 20, 20, 20, 35],
					companyName: 'Công Ty CP Viễn Thông Di Động ICall',
					projectName: 'PHÒNG CHĂM SÓC KHÁCH HÀNG'
				},
			);


			await fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'archiver'));

			await fsx.mkdirs(path.join(_rootPath, 'assets', 'export', 'cdr'));

			let folderPath = path.join(_rootPath, 'assets', 'export', 'cdr', folderName);
			let folderZip = path.join(_rootPath, 'assets', 'export', 'archiver', folderName + '.zip');
			await createFile(folderPath, folderZip);
			const zipFolderResult = folderZip.replace(_rootPath, '');

			return resolve(zipFolderResult);
		} catch (error) {
			return reject(error);
		}
	})
}

// Chuyển callback thành promise
function createExcel(
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
) {
	return new Promise((resolve, reject) => {
		createExcelFile(
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
			function (error, result) {
				if (error) {
					return reject(error);
				}
				return resolve(result);
			}
		);
	})
}
// Chuyển callback thành promise
function createFile(folderPath, folderZip) {
	return new Promise((resolve, reject) => {
		zipFolder(folderPath, folderZip, function (error, result) {
			if (error) {
				return reject(error);
			}
			return resolve(result);
		});
	})
}

function hms(secs) {
	if (isNaN(secs) || !secs || secs <= 0) return "0:00:00";
	var sec = Math.floor(secs / 1000);
	var minutes = Math.floor(sec / 60);
	sec = sec % 60;
	var hours = Math.floor(minutes / 60)
	minutes = minutes % 60;
	return hours + ":" + pad(minutes) + ":" + pad(sec);
}

function pad(num) {
	return ("0" + num).slice(-2);
}