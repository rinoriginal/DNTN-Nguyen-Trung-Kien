
var request = require('request');
var fs = require('fs')
var fsg = require('graceful-fs')
var url = require('url');
var http = require('http');

const jobSyncRecordingByDay = () => {
    // Tạo các bản ghi từ ticket
    let dateTime = new Date()
    console.log("-Ngày ghi âm:", new Date(dateTime.toUTCFormat("YYYY-MM-DD")))
    let nameFolder = dateTime.toUTCFormat("YYYY-MM-DD")
    if (!fs.existsSync( _rootPath  + '/assets/recording')) {
        fs.mkdirSync( _rootPath  + '/assets/recording');
    } else {
        console.log("Directory already exist");
    }
    if (!fs.existsSync( _rootPath  + '/assets/recording/' +  nameFolder)) {
        fs.mkdirSync( _rootPath  + '/assets/recording/' +  nameFolder);
    } else {
        console.log("Directory already exist");
    }
    let query = [
        {
            $match: { updated: { $gte: new Date(dateTime.toUTCFormat("YYYY-MM-DD")) } }
        },
        { $unwind: "$callId" },
        {
            $lookup: {
                from: 'campains',
                localField: 'idCampain', // tìm id service cho outbound
                foreignField: '_id',
                as: 'campains'
            }
        },
        {
            $lookup: {
                from: 'services',
                localField: 'idService', // tìm id service cho outbound
                foreignField: '_id',
                as: 'services'
            }
        },
         {
            $lookup: {
                from: 'recordings',
                localField: 'callId',
                foreignField: 'callId',
                as: 'recordings'
            }
        },
        {
            $match: {
                "recordings": []
            }
        },
        {
            $group: {
                _id: "$callId",
                status: { $first: "$status" },
                idTicket: { $first: "$_id" },
                idAgent: { $first: "$idAgent" },
                idService: { $first: "$idService" },
                idCustomer: { $first: "$idCustomer" },
                channelType: { $first: "$channelType" },
                idCampain: { $first: "$idCampain" },
                campains: { $first: "$campains" },
                services: { $first: "$services" },
                recordings: {$first: "$recordings"}
            }
        },
        {
            $project: {
                callId: 1,
                status: 1,
                idTicket: 1,
                idAgent: 1,
                idService: 1,
                idCampain: 1,
                channelType: 1,
                campains: 1,
                services: 1,
                recordings: 1
            }
        },
        {
            $sort: {
                updated: -1
            }
        },
        {
            $limit: 5,
        }

    ]
    _Tickets.aggregate(query, function (error, data) {
        if (data) {
            let isRecording = 0
            let isNotRecording = 0
            var _bulkRecordingInfos = mongoClient.collection('recordinginfos').initializeUnorderedBulkOp({ useLegacyOps: true });
            var _bulkRecordings = mongoClient.collection('recordings').initializeUnorderedBulkOp({ useLegacyOps: true });
            _async.eachSeries(data, function (ticket, callback) {
                let ticketId = ticket.idTicket
                // let companyId = req.query['companyId'] === "undefined" ? undefined : req.query['companyId'];
                let serviceId = ticket.idService ? ticket.idService : undefined;
                let campainId = ticket.idCampain ? ticket.idCampain : undefined;
                let company = ticket.services ? ticket.services : ticket.campains
                let ternalId = _config.app._id
                let transId = new Date().getTime()
                let callType = ticket.channelType == "Inbound" ? 1 : 6
                let idAgent = ""
                let callId = ticket._id
                let transType = ticket.channelType == "Inbound" ? 1 : 6
                _async.waterfall([
                    // Call api tìm kiếm thông tin cuộc call từ callId
                    function (next) {
                        // Lấy thông tin cuộc gọi
                        let pathApiGetListCompaign = 'http://172.16.86.195:9600/media/sessions?dialog-id=' + callId
                        let option = {
                            rejectUnauthorized: false
                        }
                        _request.get(pathApiGetListCompaign, option, function (err, response, body) {
                            if (!err && response && response.body ) {
                                let data = JSON.parse(response.body)
                                next(null, data)
                            } else {
                                next(null, null)
                            }
                        });
                    },
                    function (dataNext, next) {
                        // Tải file ghi âm từ cisco về  telehub
                        if (dataNext) {
                            if (dataNext.wavUrl) {
                                let file_url = dataNext.wavUrl
                                let option = {
                                    "auth": {
                                        "username": "telehubapi",
                                        "password": "123456@A",
                                        "sendImmediately": true
                                    },
                                    rejectUnauthorized: false
                                }
                                let dateTime = new Date(dataNext.origTime * 1000)
                                dateTime = dateTime.getFullYear() + '' + dateTime.getMonth() + ''+ dateTime.getDate() + '-' + dateTime.getHours() + '' +  dateTime.getMinutes() + '' + dateTime.getSeconds();
                                let file_name = dateTime + "-" + url.parse(file_url).pathname.split('/').pop();

                                let file = fsg.createWriteStream(path.join(_rootPath, "assets", "recording", nameFolder, file_name));
                                _request.get(file_url, option, function (err, response, body) {
                                }).pipe(file).on('finish', function () {
                                    // Tạo recordingsinfo và recordings
                                    isRecording++;
                                    let message = {}
                                    message.startTime = null
                                    message.ringTime = null
                                    message.answerTime = null
                                    message.endTime = null
                                    message.callDuration = null
                                    message.durationBlock = null
                                    message.waitDuration = null
                                    message.waitingDurationBlock = null
                                    message.timeBlock = null
                                    if (dataNext.origTime) {
                                        message.startTime = dataNext.origTime * 1000
                                        message.ringTime = dataNext.origTime * 1000
                                    }
                                    if (dataNext.disconnectTime) {
                                        message.endTime = dataNext.disconnectTime * 1000
                                    }
                                    if (dataNext.connectTime) {
                                        message.answerTime = dataNext.connectTime * 1000
                                    }
                                    if (message.answerTime) {
                                        message.callDuration = message.endTime - message.answerTime;
                                        message.durationBlock = Math.floor((message.callDuration) / (5 * 1000));
                                    }
                                    if ((message.answerTime || message.endTime) && (message.ringTime || message.startTime)) {
                                        message.waitDuration = (message.answerTime || message.endTime) - (message.ringTime || message.startTime);
                                        message.waitingDurationBlock = Math.floor((message.waitDuration) / (5 * 1000));
                                    }
                                    if (message.startTime) {
                                        message.timeBlock = moment(message.startTime).hour();
                                    }
                                    if (message.answerTime === 0) {
                                        message.callDuration = 0;
                                        message.durationBlock = Math.floor((message.callDuration) / (5 * 1000));
                                    }
                                    let recordPath = "assets/recording/"  + nameFolder + '/' + file_name

                                    // Tao Recording info
                                    // Tìm kiếm user dựa vào caller hoặc called
                                    _async.waterfall([
                                        function (next) {
                                            _Users.findOne({ $or: [{ accountCode: Number(dataNext.caller) }, { accountCode: Number(dataNext.called) }] }, function (error, user) {
                                                if (error) {
                                                    next(error)
                                                } else {
                                                    if (user) {
                                                        idAgent = user._id
                                                        next(null, user)
                                                    } else {
                                                        next(null, null)
                                                    }
                                                }
                                            })
                                            
                                        }
                                    ], function (error, result) {
                                        _bulkRecordingInfos.find({ callId: callId }).upsert().update({
                                            $setOnInsert: {
                                                caller: dataNext.caller ? dataNext.caller : undefined,
                                                called: dataNext.called ? dataNext.called : undefined,
                                                startTime: message.startTime,
                                                endTime: message.endTime,
                                                idTicket: ticketId,
                                                serviceId: serviceId,
                                                idCompany: company[0] && company[0].idCompany,
                                                idCampain: campainId,
                                                callType: callType,
                                                callId: callId,
                                                tenanl: ternalId,
                                                transId: transId.toString()
                                            },
                                            $set: {
                                                created: message.startTime ? new Date(message.startTime) : new Date()
                                            }
                                        });
                                        // Tao recordings
                                        _bulkRecordings.find({ callId: callId }).upsert().update({
                                            $setOnInsert: {
                                                idTicket: ticketId,
                                                serviceId: serviceId,
                                                idCompany: company[0] && company[0].idCompany,
                                                idCampain: campainId,
                                                transType: callType,
                                                callId: callId,
                                                tenanl: ternalId,
                                                transType: transType,
                                                transId: transId.toString(),
                                                agentId: idAgent,
                                                invokerId: idAgent,
                                                serviceType: 3,
                                                deviceId: transType == 1 ? dataNext.called : dataNext.caller,
                                                caller: dataNext.caller ? dataNext.caller : undefined,
                                                called: dataNext.called ? dataNext.called : undefined,
                                                recordPath: recordPath,
                                                startTime: message.startTime,
                                                ringTime: message.ringTime,
                                                endTime: message.endTime,
                                                callDuration: message.callDuration,
                                                answerTime: message.answerTime,
                                                durationBlock: message.durationBlock,
                                                waitDuration: message.waitDuration,
                                                waitingDurationBlock: message.waitingDurationBlock,
                                            },
                                            $set: {
                                                created: message.startTime ? new Date(message.startTime) : new Date()
                                            }
                                        });
                                        next(null, recordPath)
                                    })

                                })
                            } else {
                                isNotRecording++
                                next(null, null)
                            }
                        } else {
                            next(null, null)
                        }
                    }
                ], function (error, result) {
                    callback(null)
                })
            }, function (err) {
                if (!err) {
                    _async.waterfall([
                        function (next) {
                            if (_bulkRecordingInfos == null || !_bulkRecordingInfos.s.currentBatch) {
                                next("Không tồn dự liệu để tạo cho bảng recordinginfos");
                            } else {
                                _bulkRecordingInfos.execute(function (err) {
                                    if (err) {
                                        next("Lỗi khi bulk recording info")
                                    } else {
                                        next(null, "Tạo recording info thành công")
                                    }
                                });
                            }

                        },
                        function (data, next) {
                            if (_bulkRecordings == null || !_bulkRecordings.s.currentBatch) {
                                next("Không tồn dự liệu để tạo cho bảng recordings");
                            } else {
                                _bulkRecordings.execute(function (err) {
                                    if (err) {
                                        next("Lỗi khi bulk recording")
                                    } else {
                                        next(null, "Tạo recording thành công")
                                    }
                                });
                            }

                        }

                    ], function (error, result) {
                        console.log("----------------Kết quả đồng bộ ghi âm -----------------")
                        console.log("Số cuộc call đã có file ghi âm ", isRecording)
                        console.log("Số cuộc call chưa có file ghi âm", isNotRecording)
                        console.log("Kết quả: ", error)
                        console.log("---------------------------------------------------------")
                    })
                }

            })
        }
    })
}
module.exports = {
    jobSyncRecordingByDay,
}