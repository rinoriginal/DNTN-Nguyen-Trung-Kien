
var acdPublish = require(path.join(_rootPath, 'queue', 'publish', 'acd-publish.js'));
var manager = require(path.join(_rootPath, 'monitor', 'manager.js'));
var orderMonitor = require(path.join(_rootPath, 'monitor', 'order-monitor'));

/**
 * Kiểm tra trạng thái đăng nhập của agent, nếu không còn kết nối socket thì xóa dữ liệu khỏi bộ nhớ và Log Out
 * @param agentId ID user
 */
var checkOnline = function (agentId, socket) {
    if (_socketUsers[agentId] && _socketUsers[agentId].sid.length == 0) {
        acdPublish.sendLogOutRequest(agentId, '');
        var monitor = _socketUsers[agentId].monitor;
        if (monitor) monitor.destroy();
        delete _socketUsers[agentId];
        socket.broadcast.emit("agentOffline", agentId);
    }
}

module.exports = function init(socket) {
    //TODO: thiết lập kết nối từ client
    socket.on('client-connect', function (data) {
        //1 agent 1 socket
        //_socketUsers[data._id] = {sid: data.sid};
        //1 agent nhieu socket

        /* hoan join socket to room, room name is agentId*/
        socket.join(data._id);

        //TODO: lưu socket id của user để quản lý
        if (_.has(_socketUsers, data._id)) {
            _socketUsers[data._id].sid.push(data.sid);
            orderMonitor.assignWhenOnline(data._id, function (err) {
                if (err) log.error(err);
            })
        } else {
            //_socketUsers[data._id] = {sid: [data.sid]};
        }

        socket.broadcast.emit("agentOnline", {
            _id: data._id,
            emailStatus: _socketUsers[data._id] && _socketUsers[data._id].hasOwnProperty("emailStatus") ? _socketUsers[data._id].emailStatus : null,
            chatStatus: _socketUsers[data._id] && _socketUsers[data._id].hasOwnProperty("chatStatus") ? _socketUsers[data._id].chatStatus : null,
            voiceStatus: _socketUsers[data._id] && _socketUsers[data._id].hasOwnProperty("voiceStatus") ? _socketUsers[data._id].voiceStatus : null
        });
    });

    //TODO: ngắt kết nối với client
    socket.on('disconnect', function () {
        var sid = socket.id;
        var agentId = _.find(_.keys(_socketUsers), function (key) {
            return _socketUsers[key].sid.indexOf(sid) >= 0;
        });

        log.debug("Socket on disconnect: ", sid);
        log.debug("Socket AgentId: ", agentId);
        if (_socketUsers[agentId]) {
            log.debug("Socket _socketUsers: ", _socketUsers[agentId].sid);
        }

        if (agentId) {
            //TODO: xóa socket id khỏi bộ nhớ
            _socketUsers[agentId].sid = _.reject(_socketUsers[agentId].sid, function (el) {
                return _.isEqual(el.toString(), sid.toString());
            });
            delete sio.sockets.sockets[sid];
            //TODO: nếu user không còn kết nối socket nào với backend thì tự động Log Out sau 100s
            if (_socketUsers[agentId].sid.length == 0) {
                setTimeout(checkOnline, 60000, agentId, socket);
            }
        }
    });

    //TODO: gửi bản tin yêu cầu danh sách đầu số có thể sử dụng để tạo mới service
    socket.on('getQueueNumberReq', function (data) {
        acdPublish.sendGetQueueNumber(data.sid);
    });

    //TODO: kiểm tra đầu số đã được sử dụng hay chưa
    socket.on('CheckQueueNumberReq', function (data) {
        acdPublish.sendCheckQueueNumber(data.sid, data.number);
    });

    //TODO: Yêu cầu click to call từ client
    socket.on('MakeCallReq', function (data) {
        var monitor = _socketUsers[data._id.toString()] ? _socketUsers[data._id.toString()].monitor : null;
        var callStatus = monitor ? monitor.getCallStatus() : null;

        if (callStatus && callStatus == 5 && data.ticket) {
            if (data.ticket.idCampain) {
                var campaignId = data.ticket.idCampain._id.toString();
                monitor.setWorkPlace(campaignId);
                monitor.setCallStatus(-1);
                monitor.setCurCall(data.ticket);
                acdPublish.sendMakeCallRequest(data._id, data.number, data.sid, data.ticket.idCampain.trunk.prefix, 1, campaignId);
            }
        }
    });

    //TODO: yêu cầu lấy danh sách trạng thái làm việc của agent từ client
    socket.on('GetAgentStatus', function (data) {
        _AgentStatus.find({}, function (err, result) {
            if (_socketUsers[data.user] && _socketUsers[data.user].monitor) {
                var curStatus = _socketUsers[data.user].monitor.getStatus();
                var curCallStatus = _socketUsers[data.user].monitor.getCallStatus();
                var chatStatus = !!_socketUsers[data.user].chatStatus ? _socketUsers[data.user].chatStatus.status : 0;
                var emailStatus = !!_socketUsers[data.user].emailStatus ? _socketUsers[data.user].emailStatus.status : 0;
                socket.emit('GetAgentStatus', {
                    data: result,
                    curStatus: curStatus,
                    curCallStatus: curCallStatus,
                    chatStatus: chatStatus,
                    emailStatus: emailStatus
                });
            }
        });
    });

    //TODO: yêu cầu thay đổi trạng thái làm việc của agent từ client
    socket.on('ChangeAgentStatus', function (data) {
        var monitor = _socketUsers[data.user] ? _socketUsers[data.user].monitor : null;
        if (monitor && monitor.getStatus() != Number(data.status)) {
            acdPublish.sendChangeAgentStatusRequest(data.user, data.changeBy, data.status, data.sid);
        }
    });

};