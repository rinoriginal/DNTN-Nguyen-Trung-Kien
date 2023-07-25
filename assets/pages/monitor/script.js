var DFT = function($) {
    var groupData = null;
    var callData = null;
    var myTimer = null;
    var refreshListUserTimer = null;
    var selectAgent = null;
    var selectGroup = null;
    var users = []

    var bindClick = function() {
        // Chọn cấu hình cho group/queue
        $(document).on('click', '#type-setting', function() {
            if (_.isEqual($(this).val().toString(), '1')) {
                $('#group-setting').removeClass('hidden');
                $('#queue-setting').addClass('hidden');
            } else {
                $('#group-setting').addClass('hidden');
                $('#queue-setting').removeClass('hidden');
            }
        });

        // Click button setting
        $(document).on('click', '#setting-btn', function() {
            refreshListUserTimerFunc()
                // window._finesse.getTeam(getCookie('_teamId'), _getUsersHandler, _getUsersHandler);
        });

        // Transer call
        $(document).on('click', '#transfer-btn', function() {
            var transAgent = $('#transfer-agent').val();
            let toExtension = users[selectAgent].extension
            let idDialog = users[selectAgent].idDialog
            window._finesse.makeBargeCall(toExtension, transAgent, idDialog, _makeTranferCallHandler, _makeTranferCallErrorHandler);
        });

        // Thao tác với agent trên queue
        $(document).on('change', '#queue-agent-control', function() {
            _socket.emit('QueueAgentStatus', {
                agent: $(this).parent().parent().attr('data-agent-id'),
                queue: $(this).parent().parent().parent().parent().attr('id').split('queue-agent-tbl-')[1],
                status: Number($(this).val()),
                user: user
            });
            //$(this).val('0');
            //$('.selectpicker').selectpicker('refresh');
        });

        var _changeStateHandler = function(data, statusText, xhr) {
            if (xhr && xhr.status === 202) {
                console.log("Đổi trạng thái thành công");
                if (silentMonitorExtension) {
                    window._finesse.silentMonitor(getCookie('_agentId'), getCookie('_extension'), silentMonitorExtension, _silentMonitorHandler, _silentMonitorHandler);
                    silentMonitorExtension = null;
                }
                refreshListUserTimerFunc();
            }
        };

        // Thay đổi trạng thái của agent
        $(document).on('click', '#change-agent-status-btn', function() {
            var newStatus = $('#agent-status-list').val();
            console.log('agent1', selectAgent)
            if (newStatus > 0) {
                var state = (newStatus == 1 ? "READY" : "NOT_READY");
                console.log('test', users)
                if (state != users[selectAgent].state) {
                    console.log("Đổi trạng thái của: ", users[selectAgent].loginId, " thành ", state);
                    window._finesse.changeState(users[selectAgent].loginId, state, _changeStateHandler, _changeStateHandler);
                }
            }
        });

        // Thao tác với cuộc gọi trên queue
        $(document).on('change', '#queue-call-control', function() {
            if (_.isEqual($(this).val(), '3')) {
                var selectService = $(this).parent().parent().parent().parent().attr('id').split('tbl-')[1];
                _socket.emit('GetQueueAgents', $(this).attr('data-call-id'), user, selectService);
            } else {
                _socket.emit('QueueCallControl', { _id: $(this).attr('data-call-id'), type: $(this).val(), agentID: user, channelID: $(this).attr('data-channel-id') });
            }
            $(this).val('0').selectpicker('refresh');
        });

        var silentMonitorExtension = null;
        // Thao tác với cuộc gọi của nhóm
        $(document).on('change', '#group-call-control', function() {
            console.log('gergerg', $(this).siblings('input').val())

            // disconnect
            if (_.isEqual($(this).val(), '1')) {
                selectAgent = $(this).parent().parent().attr('data-agent-id');
                let idDialog = users[selectAgent].idDialog
                if (idDialog) {
                    window._finesse.dropCall(idDialog, getCookie('_extension'), _silentMonitorHandler, _silentMonitorHandler);
                }
            }

            // pickup
            if (_.isEqual($(this).val(), '2')) {
                if (dialogId) {
                    window._finesse.dropCall(dialogId, getCookie('_extension'), toExtension, _silentMonitorHandler, _silentMonitorHandler);
                }
            }

            // Listen/silent monitor 
            if (_.isEqual($(this).val(), '4')) {
                selectAgent = $(this).parent().parent().attr('data-agent-id');
                console.log(selectAgent)
                console.log(users[selectAgent])
                let toExtension = users[selectAgent].extension
                if (getCookie('_agentState') == "LOGOUT") {
                    alert("Bạn cần đăng nhập vào jabber trước khi thực hiện thao tác này!");
                } else if (getCookie('_agentState') == "NOT_READY") {
                    window._finesse.silentMonitor(getCookie('_agentId'), getCookie('_extension'), toExtension, _silentMonitorHandler, _silentMonitorErrorHandler);
                } else if (getCookie('_agentState') == "READY") {
                    //state isREADY, change to NOT_READY
                    silentMonitorExtension = toExtension;
                    window._finesse.changeState(getCookie('_agentId'), "NOT_READY", _changeStateHandler, _changeStateHandler);
                } else {
                    alert("Bạn không thể thực hiện thao tác này!");
                }
            }
            // change status
            if (_.isEqual($(this).val(), '7')) {
                console.log($(this).parent().parent().attr('data-agent-id'))
                selectAgent = $(this).parent().parent().attr('data-agent-id');
                $('#change-agent-status').modal('show');
            }
            // tranfer
            if (_.isEqual($(this).val(), '3')) {
                selectAgent = $(this).parent().parent().attr('data-agent-id');
                addTransferAgents(users);
                $('#transfer-info').modal('show');
            }
            // join/ make a barge call
            if (_.isEqual($(this).val(), '6')) {
                selectAgent = $(this).parent().parent().attr('data-agent-id');
                let toExtension = users[selectAgent].extension
                console.log('join', users[selectAgent])
                let idDialog = users[selectAgent].idDialog
                console.log(users[selectAgent])
                window._finesse.makeBargeCall(getCookie('_agentId'), getCookie('_extension'), toExtension, idDialog, _makeBargeCallHandler, _makeBargeCallErrorHandler);
            }
            $(this).val('0').selectpicker('refresh');
        });

    };

    function _makeTranferCallHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status == 200) {
            console.log("transfer is successfully");
            refreshListUserTimerFunc();
        }
    }

    function _makeTranferCallErrorHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status !== 200) {
            console.log("transfer is error");
            refreshListUserTimerFunc();
        }
    }

    function _silentMonitorErrorHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status !== 200) {
            console.log("silent monitor is error");
            refreshListUserTimerFunc();
        }
    }

    function _silentMonitorHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status === 200) {
            console.log("Silent monitor successfully");
            refreshListUserTimerFunc();
        }
    }

    function _makeBargeCallHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status === 200) {
            console.log("make a barge call successfully");
            refreshListUserTimerFunc();
        }
    }

    function _makeBargeCallErrorHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status !== 200) {
            console.log("make a barge is error");
            refreshListUserTimerFunc();
        }
    }

    var bindSubmit = function() {
        // Xác nhận cập nhật cấu hình monitor
        $('#frm-item form').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function(form, status) {
                if (status) {
                    _AjaxData('monitor/' + user, 'PUT', form.getData(), function(resp) {
                        _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({ title: 'Thông báo !', text: resp.message });
                    });
                }
            }
        });
    };

    var bindPressKey = function() {

    };

    var resetControlButton = function() {

    };

    // Hiển thị dữ liệu service lên giao diện
    var serviceContentTag = function(sendData, serviceData) {
        var thead = {
            tag: 'thead',
            childs: [{
                tag: 'tr',
                attr: { class: 'f-12' },
                childs: [
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center w-200' }, content: 'Agent' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Call Type' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Call Status' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Caller' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Called' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Duration Call' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Time Call' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Tác vụ' },
                ]
            }]
        };
        var trs = [];
        _.each(sendData, function(ag) {
            trs.push(callTag(ag));
        });

        var tbody = { tag: 'tbody', childs: trs };
        var table = { tag: 'table', attr: { class: 'table table-bordered table-fix', id: 'tbl-' + serviceData._id }, childs: [thead, tbody] };
        var infoDiv = {
            tag: 'div',
            attr: { class: 'p-r-10 p-t-10 p-b-10 text-right' },
            childs: [
                { tag: 'input', attr: { value: 'Gọi: 0', disabled: '', class: 'text-center callRate0', style: 'margin-right: 5px; width: 90px' } },
                { tag: 'input', attr: { value: 'Nghe: 0', disabled: '', class: 'text-center callRate1', style: 'margin-right: 5px; width: 90px' } },
                { tag: 'input', attr: { value: 'Rớt: 0', disabled: '', class: 'text-center callRate2', style: 'margin-right: 5px; width: 90px' } },
                { tag: 'input', attr: { value: 'Đàm thoại: 0', disabled: '', class: 'text-center callDuration', style: 'margin-right: 5px;' } },
                { tag: 'input', attr: { value: ' Tỉ lệ rớt: 0%', disabled: '', class: 'text-center callDropRate', style: 'margin-right: 5px;' } },
                { tag: 'input', attr: { value: ' Tổng g nhỡ: 0', disabled: '', class: 'text-center missCall', style: 'margin-right: 5px;' } },
                { tag: 'input', attr: { value: ' KH Đợi: 0', disabled: '', class: 'text-center waitingCustomer', style: 'margin-right: 5px;' } },
                { tag: 'input', attr: { value: ' Agents: 0', disabled: '', class: 'text-center totalAgent' } },
            ]
        };

        var blankLabel = { tag: 'label', attr: { class: 'blank' } };
        var thead2 = {
            tag: 'thead',
            childs: [{
                tag: 'tr',
                attr: { class: 'f-12' },
                childs: [
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Agent' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Extension' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Status' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Tác vụ' }
                ]
            }]
        };

        var tbody2 = { tag: 'tbody', childs: [] };
        var table2 = { tag: 'table', attr: { class: 'table table-bordered table-fix', id: 'queue-agent-tbl-' + serviceData._id }, childs: [thead2, tbody2] };

        var div = {
            tag: 'div',
            attr: {
                role: 'tabpanel',
                style: "height: 100%",
                class: ($('#tab-list-service').children('li').html() ? 'tab-pane animated' : 'tab-pane animated active'),
                id: 'tab-' + serviceData._id
            },
            childs: [infoDiv, table2, blankLabel, table]
        };

        return _.Tags([div]);
    }

    // Hiển thị dữ liệu của nhóm lên giao diện
    var groupContentTag = function(group, groupAgents) {
        var thead = {
            tag: 'thead',
            childs: [{
                tag: 'tr',
                attr: { class: 'f-12' },
                childs: [
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Agent' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Extension' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Call Type' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Status' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Call Status' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Caller' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Called' },
                    // { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Duration Call' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'State Change Time' },
                    // { tag: 'th', attr: { class: 'bgm-orange c-white text-center  w-200' }, content: 'State Change Time' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Time In State' },
                    { tag: 'th', attr: { class: 'bgm-orange c-white text-center' }, content: 'Tác vụ' },
                ]
            }]
        };
        var trs = [];

        // Add agent data (user)
        // _.each(groupAgents, function(ag){
        //     trs.push(agentTag(ag));
        // });
        $("#agent-id").html(group._id);

        var tbody = { tag: 'tbody', childs: trs };
        var table = { tag: 'table', attr: { class: 'table table-bordered table-fix test', id: 'tbl-' + group._id }, childs: [thead, tbody] };
        // var noAcdDiv = {
        //     tag: 'div',
        //     attr: { class: 'p-r-10 p-t-10 p-b-10 text-right' },
        //     childs: [
        //         { tag: 'input', attr: { value: 'Gọi: 0', disabled: '', class: 'text-center callRate0', style: 'margin-right: 5px; width: 90px' } },
        //         { tag: 'input', attr: { value: 'Nghe: 0', disabled: '', class: 'text-center callRate1', style: 'margin-right: 5px; width: 90px' } },
        //         { tag: 'input', attr: { value: 'Rớt: 0', disabled: '', class: 'text-center callRate2', style: 'margin-right: 5px; width: 90px' } },
        //         { tag: 'input', attr: { value: 'Đàm thoại: 0', disabled: '', class: 'text-center callDuration', style: 'margin-right: 5px;' } },
        //         { tag: 'input', attr: { value: 'Sẵn sàng: 0', disabled: '', class: 'text-center availableTime', style: 'margin-right: 5px;' } },
        //         { tag: 'input', attr: { value: 'Nghỉ: 0', disabled: '', class: 'text-center breakTime', style: 'margin-right: 5px;' } },
        //         { tag: 'input', attr: { value: 'Tạm nghỉ: 0', disabled: '', class: 'text-center agentNoAcd' } }
        //     ]
        // };
        var noAcdDiv = {}
        var div = {
            tag: 'div',
            attr: {
                role: 'tabpanel',
                style: "height: 100%",
                class: ($('#tab-list-group').children('li').html() ? 'tab-pane animated' : 'tab-pane animated active'),
                id: 'tab-' + group._id
            },
            childs: [noAcdDiv, table]
        };

        return _.Tags([div]);
    }

    // Tạo tab group mới trên giao diện
    var groupTabTag = function(group, tablist) {
        return _.Tags(
            [{
                tag: 'li',
                attr: { class: $(tablist).children('li').html() ? '' : 'active', role: "presentation", id: 'tab-header-' + group._id },
                childs: [
                    { tag: 'a', attr: { class: 'col-sm-6 p-5 f-10', href: "#tab-" + group._id, 'aria-controls': "", role: "tab", 'data-toggle': "tab", 'aria-expanded': "false" }, content: group.name }
                ]
            }]
        );
    }

    // Cập nhật dữ liệu agent lên giao diện
    var agentTag = function(agent) {
        var tds = [];
        tds.push({ tag: 'td', attr: { class: 'text-center name' }, content: agent.name + agent.displayName });
        tds.push({ tag: 'td', attr: { class: 'text-center extension' }, content: agent.extension });
        tds.push({ tag: 'td', attr: { class: 'text-center callType' }, content: agent.callStatus != 5 ? agent.callType : "" });
        // var curStatus = getStatus(agent.status);
        // tds.push({tag:'td', attr: {class: 'status'}, content: curStatus ? curStatus.name : 'UNKNOW'});
        tds.push({ tag: 'td', attr: { class: 'text-center status' }, content: agent.status ? agent.status : 'UNKNOW' });
        tds.push({ tag: 'td', attr: { class: 'text-center callStatus' }, content: agent.callStatus });
        tds.push({ tag: 'td', attr: { class: 'text-center caller' }, content: agent.caller });
        tds.push({ tag: 'td', attr: { class: 'text-center called' }, content: agent.called });
        // tds.push({ tag: 'td', attr: { class: 'text-center duration-call' }, content: '00:00:00' });
        tds.push({ tag: 'td', attr: { class: 'text-center callTime' }, content: agent.callTime });
        tds.push({ tag: 'td', attr: { class: 'text-center duration-status' }, content: msToTime(agent.timeInState) });
        var optionsChild = [];
        optionsChild.push({ tag: 'option', attr: { value: '0' }, content: 'Chọn' });
        optionsChild.push({ tag: 'option', attr: { value: '1' }, content: 'Disconnect' });
        // optionsChild.push({ tag: 'option', attr: { value: '2' }, content: 'Pickup' });
        optionsChild.push({ tag: 'option', attr: { value: '3' }, content: 'Transfer' });
        if (agent.status == 'TALKING')
            optionsChild.push({ tag: 'option', attr: { value: '4' }, content: 'Listen' });
        else
            optionsChild.push({ tag: 'option', attr: { value: '4', disabled: true }, content: 'Listen' });
        // optionsChild.push({ tag: 'option', attr: { value: '5' }, content: 'Whisper' });
        optionsChild.push({ tag: 'option', attr: { value: '6' }, content: 'Join' });
        if (agent.status != "LOGOUT")
            optionsChild.push({ tag: 'option', attr: { value: '7' }, content: 'Change Status' });
        else
            optionsChild.push({ tag: 'option', attr: { value: '7', disabled: true }, content: 'Change Status' });
        tds.push({
            tag: 'td',
            attr: { class: 'text-center' },
            childs: [{
                    tag: 'input',
                    attr: { value: agent.dialogId, hidden: true }
                },
                {
                    tag: 'select',
                    attr: { class: 'selectpicker', id: 'group-call-control' },
                    childs: optionsChild
                }
            ]
        });

        return { tag: 'tr', attr: { class: 'f-12 agent-tag', 'data-agent-id': agent._id.toString() }, childs: tds };
    }

    // Cập nhật dữ liệu call lên giao diện
    var callTag = function(agent) {
        var tds = [];
        tds.push({ tag: 'td', attr: { class: 'text-center name' }, content: agent.name });
        //tds.push({tag:'td', attr: {class: 'text-center extension'}, content: agent.extension});
        tds.push({ tag: 'td', attr: { class: 'text-center callType' }, content: agent.callType });
        tds.push({ tag: 'td', attr: { class: 'text-center callStatus' }, content: agent.callStatus });
        tds.push({ tag: 'td', attr: { class: 'text-center caller' }, content: agent.caller });
        tds.push({ tag: 'td', attr: { class: 'text-center called' }, content: agent.called });
        tds.push({ tag: 'td', attr: { class: 'text-center duration-call' }, content: '00:00:00' });
        tds.push({ tag: 'td', attr: { class: 'text-center callTime' }, content: agent.callTime });
        tds.push({
            tag: 'td',
            attr: { class: 'text-center' },
            childs: [{
                tag: 'select',
                attr: {
                    class: 'selectpicker',
                    id: 'queue-call-control',
                    'data-call-id': agent._id.toString(),
                    'data-channel-id': agent.channelID.toString()
                },
                childs: [
                    { tag: 'option', attr: { value: '0' }, content: 'Chọn' },
                    { tag: 'option', attr: { value: '1' }, content: 'Disconnect' },
                    { tag: 'option', attr: { value: '2' }, content: 'Pickup' },
                    { tag: 'option', attr: { value: '3' }, content: 'Assign' }
                ]
            }]
        });
        return { tag: 'tr', attr: { class: 'f-12 call-tag', 'data-agent-id': agent._id.toString() }, childs: tds };
    }

    // Định kỳ cập nhật dữ liệu call của agent trên giao diện
    var timer = function() {
        console.log('vao day nhes cung')
            // _.each(groupData, function(agentData, i) {
            //     agentData.callDuration += 1000;
            //     agentData.statusDuration += 1000;

        //     $('.agent-tag').each(function() {
        //         var $this = this;
        //         if (_.isEqual(agentData._id.toString(), $($this).attr('data-agent-id'))) {
        //             $($this).children('.duration-call').html((agentData.callStatus == 4) ? msToTime(agentData.callDuration) : '00:00:00');
        //             $($this).children('.duration-status').html(msToTime(agentData.statusDuration));
        //         }
        //     });
        // });

        _.each(users, function(user) {
            console.log('user', user)
            if (user && user.stateChangeTime) {
                user.stateChangeTime = moment(user.stateChangeTime).format("YYYY-MM-DD HH:mm:ss")
                let timeInState = new Date(user.stateChangeTime).getTime()
                let timeNow = new Date();
                timeNow = timeNow.getTime();
                user.timeInState = timeNow - timeInState
            } else {
                user.timeInState = 0
            }
            console.log('oo', user.timeInState)
            user.timeInState += (user.timeInState ? 1000 : 0);
            $('.agent-tag').each(function() {
                console.log('33333')
                var $this = this;
                console.log($($this).children('.duration-status'))
                $($this).children('.duration-status').html(msToTime(user.timeInState));
                // if (_.isEqual(user._id.toString(), $($this).attr('data-agent-id'))) {
                //     $($this).children('.duration-status').html(msToTime(user.timeInState));
                // }
            });
        });
    }

    var refreshListUserTimerFunc = function() {
        console.log('so lan')
            // $('#tab-content-group').empty();
            // $('#tab-list-group').empty();
            // _.each(firstGroups, function(el, i) {
            //     $('#tab-content-group').append(groupContentTag(el, []));
            //     $('#tab-list-group').append(groupTabTag(el, '#tab-list-group'));
            // });
        window._finesse.getTeam(getCookie('_teamId'), _getUsersHandler, _getUsersHandler);
    }

    // Chuyển dữ liệu từ milliseconds sang 'hh:mm:ss'
    var msToTime = function(s) {
        if (s == 0) return '00:00:00';
        var ms = s % 1000;
        s = (s - ms) / 1000;
        var secs = s % 60;
        s = (s - secs) / 60;
        var mins = s % 60;
        var hrs = (s - mins) / 60;

        return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
    }

    // Lấy tên trạng thái làm việc
    var getStatus = function(sts) {
        if (sts == 4) {
            return { name: 'Not Answering' };
        } else {
            return _.find(statusData, function(stsData) {
                return stsData.statusCode == sts;
            });
        }
    }

    // Lấy tên trạng thái call
    var getCallStatus = function(status) {
        switch (status) {
            case -1:
                return 'CALLING';
                break;
            case 0:
                return 'UNKOWN';
                break;
            case 1:
                return 'PROCESSING';
                break;
            case 2:
                return 'CALLING';
                break;
            case 3:
                return 'RINGING';
                break;
            case 4:
                return 'CONNECTED';
                break;
            case 5:
                return 'DISCONNECTED';
                break;
            case 6:
                return 'HOLD';
                break;
            case 7:
                return 'RESUME';
                break;
            case 8:
                return 'TRANSFER';
                break;
            case 9:
                return 'COUNT';
                break;
        };
    }

    // Cập nhật dữ liệu nhóm agent khi có sự thay đổi
    var updateGroupData = function(sendData) {
        $('.agent-tag').each(function() {
            var $this = this;
            if (_.isEqual(sendData._id.toString(), $($this).attr('data-agent-id'))) {
                var curStatus = getStatus(sendData.status);
                $($this).children('.callType').html(sendData.callStatus != 5 ? sendData.callType : "");
                $($this).children('.status').html(curStatus ? curStatus.name : 'UNKNOW');
                $($this).children('.callStatus').html(getCallStatus(sendData.callStatus));
                $($this).children('.caller').html(sendData.caller);
                $($this).children('.called').html(sendData.called);
                $($this).children('.duration-call').html((sendData.callStatus == 4) ? msToTime(sendData.callDuration) : '00:00:00');
                $($this).children('.callTime').html(sendData.callTime);
                $($this).children('.duration-status').html(msToTime(sendData.statusDuration));
            }
        });
    }

    // Thêm nhóm agent
    var addGroupData = function(addData) {
        _.each(addData.groups, function(groupId) {
            $('#tbl-' + groupId + ' tbody').append(_.Tags([agentTag(addData)]));
        });
        $('.selectpicker').selectpicker('refresh');
    }

    // Cập nhật dữ liệu call trên queue
    var updateCallData = function(sendData) {
        $('.call-tag').each(function() {
            var $this = this;
            if (_.isEqual(sendData._id.toString(), $($this).attr('data-agent-id'))) {
                $($this).children('.callType').html(sendData.callType);
                $($this).children('.name').html(sendData.name);
                $($this).children('.extension').html(sendData.extension);
                $($this).children('.callStatus').html(sendData.callStatus);
                $($this).children('.caller').html(sendData.caller);
                $($this).children('.called').html(sendData.called);
                $($this).children('.duration-call').html(msToTime(sendData.callDuration));
                $($this).children('.callTime').html(sendData.callTime);
                $($this).children('td').children('select').attr('data-channel-id', sendData.channelID);
            }
        });
    }

    // Add call trên queue
    var addCallData = function(addData) {
        $('#tbl-' + addData.service + ' tbody').append(_.Tags([callTag(addData)]));
        $('.selectpicker').selectpicker('refresh');
    }

    // Thêm danh sách agent có thể transfer
    var addTransferAgents = function(agents) {
        console.log('selectAgent', selectAgent)
        $('#transfer-agent option').each(function(i, e) {
            if (!_.isEqual($(e).val(), "")) e.remove();
        });
        _.each(agents, function(agent) {
            console.log('agent', agent)
            let user = agents[selectAgent]
            if (!_.isEqual(agent.extension, user.extension))
                $('#transfer-agent').append('<option value="' + agent.extension + '">' + agent.firstName + agent.lastName + '</option>');
        });
        $('#transfer-agent').selectpicker('refresh');
    };

    // Cập nhật agent lên giao diện queue
    var queueAgentTag = function(agent) {
        var tds = [];
        tds.push({ tag: 'td', attr: { class: 'text-center name' }, content: agent.name + ' - ' + agent.displayName });
        tds.push({ tag: 'td', attr: { class: 'text-center extension' }, content: agent.extension });
        tds.push({ tag: 'td', attr: { class: 'text-center queue-status' }, content: agent.active ? 'Enable' : 'Disable' });
        tds.push({
            tag: 'td',
            attr: { class: 'text-center' },
            childs: [{
                tag: 'select',
                attr: {
                    class: 'selectpicker',
                    id: 'queue-agent-control',
                    'data-agent-id': agent._id.toString()
                },
                childs: [
                    { tag: 'option', attr: { value: '0' }, content: 'Chọn' },
                    { tag: 'option', attr: { value: '1' }, content: 'Enable' },
                    { tag: 'option', attr: { value: '2' }, content: 'Disable' }
                ]
            }]
        });
        return tds;
    }

    // Cập nhật danh sách agent trên queue
    var bindAgentList = function(serviceId, agentList) {
        _.each(agentList, function(agentData) {
            var isNew = 1;
            $('#queue-agent-tbl-' + serviceId + ' tbody tr').each(function() {
                if (_.isEqual($(this).attr('data-agent-id'), agentData._id.toString())) {
                    isNew = 0;
                    $(this).children('.name').html(agentData.name + ' - ' + agentData.displayName);
                    $(this).children('.extension').html(agentData.extension);
                    $(this).children('.queue-status').html(agentData.active ? 'Enable' : 'Disable');
                }
            });
            if (isNew) {
                $('#queue-agent-tbl-' + serviceId + ' tbody').append('<tr class="f-12" data-agent-id="' + agentData._id.toString() + '">' + _.Tags(queueAgentTag(agentData)) + '</tr>');
                $('.selectpicker').selectpicker('refresh');
            }
        });

        $('#queue-agent-tbl-' + serviceId + ' tbody tr').each(function() {
            if (_.pluck(agentList, '_id').indexOf($(this).attr('data-agent-id')) < 0) {
                $(this).remove();
            }
        });
    };

    var bindSocket = function(client) {
        // Nhận cảnh báo service từ server
        client.on('ServiceWarning', function(sender, sendData) {
            var isWarning = false;
            async.forEachOf(sendData, function(warn, i, callback) {
                switch (warn.field) {
                    case 'callRate':
                        $('#tab-' + sender + ' div .callRate0').val('Gọi: ' + warn.data[0]);
                        $('#tab-' + sender + ' div .callRate1').val('Nghe: ' + warn.data[1]);
                        $('#tab-' + sender + ' div .callRate2').val('Rớt: ' + warn.data[2]);
                        break;
                    case 'callDuration':
                        $('#tab-' + sender + ' div .callDuration').val('Đàm thoại: ' + msToTime(warn.data));
                        break;
                    case 'callDropRate':
                        $('#tab-' + sender + ' div .callDropRate').val('Tỉ lệ rớt: ' + warn.data + '%');
                        break;
                    case 'waitingCustomer':
                        $('#tab-' + sender + ' div .waitingCustomer').val('KH đợi: ' + warn.data);
                        break;
                    case 'missCall':
                        $('#tab-' + sender + ' div .missCall').val('Tổng g nhỡ: ' + warn.data);
                        break;
                    case 'totalAgent':
                        $('#tab-' + sender + ' div .totalAgent').val('Agents: ' + warn.data);
                        break;
                    case 'agentList':
                        bindAgentList(sender, warn.data);
                        break;
                }

                if (warn.isWarning) {
                    $('#tab-' + sender + ' div .' + warn.field).addClass('warning');
                    isWarning = true;
                } else {
                    $('#tab-' + sender + ' div .' + warn.field).removeClass('warning');
                }
                callback();
            }, function(err) {
                if (isWarning) {
                    $('#tab-header-' + sender).addClass('warning');
                } else {
                    $('#tab-header-' + sender).removeClass('warning');
                }
            });
        });

        // Cảnh báo của nhóm từ server
        client.on('GroupWarning', function(sender, sendData) {
            var isWarning = false;
            async.forEachOf(sendData, function(warn, i, callback) {
                if (_.isEqual(warn.field, 'agentNoAcd')) {
                    $('#tab-' + sender + ' div .agentNoAcd').val('Tạm nghỉ: ' + warn.data);
                    if (warn.isWarning) {
                        $('#tab-' + sender + ' div .agentNoAcd').addClass('warning');
                        isWarning = true;
                    } else {
                        $('#tab-' + sender + ' div .agentNoAcd').removeClass('warning');
                    }
                } else if (_.isEqual(warn.field, 'availableTime')) {
                    $('#tab-' + sender + ' div .availableTime').val('Sẵn sàng: ' + msToTime(warn.data));
                } else if (_.isEqual(warn.field, 'breakTime')) {
                    $('#tab-' + sender + ' div .breakTime').val('Nghỉ: ' + msToTime(warn.data));
                } else if (_.isEqual(warn.field, 'callDuration')) {
                    $('#tab-' + sender + ' div .callDuration').val('Đàm thoại: ' + msToTime(warn.data));
                } else if (_.isEqual(warn.field, 'callRate')) {
                    $('#tab-' + sender + ' div .callRate0').val('Gọi: ' + warn.data[0]);
                    $('#tab-' + sender + ' div .callRate1').val('Nghe: ' + warn.data[1]);
                    $('#tab-' + sender + ' div .callRate2').val('Rớt: ' + warn.data[2]);
                } else {
                    $('#tbl-' + sender + ' tbody .agent-tag').each(function() {
                        var $this = this;
                        if (_.isEqual(warn.data.toString(), $($this).attr('data-agent-id'))) {
                            if (warn.field.length == 0) {
                                $($this).removeAttr('bgcolor');
                                $($this).children().removeAttr('bgcolor');
                            } else {
                                isWarning = true;
                                $($this).attr('bgcolor', 'red');
                                _.each(warn.field, function(field) {
                                    $($this).children('.' + field).attr('bgcolor', 'yellow');
                                });
                                $($this).prependTo($($this).parent());
                            }
                        }
                    });
                }
                callback();
            }, function(err) {
                if (isWarning) {
                    $('#tab-header-' + sender).addClass('warning');
                } else {
                    $('#tab-header-' + sender).removeClass('warning');
                }
            });
        });

        // Loại service khỏi danh sách monitor
        client.on('RemoveService', function(serviceId) {
            $('#tab-header-' + serviceId).remove();
            $('#tab-' + serviceId).remove();
        });

        // Thêm mới service vào danh sách monitor
        // client.on('AddService', function(sendData, serviceData) {
        //     if ($('#tbl-' + serviceData._id).html()) {
        //         $('#tab-header-' + serviceData._id + ' a').html(serviceData.name);
        //     } else {
        //         $('#tab-content-service').append(serviceContentTag(sendData, serviceData));
        //         $('.selectpicker').selectpicker('refresh');
        //         $('#tab-list-service').append(groupTabTag(serviceData, '#tab-list-service'));
        //     }
        // });

        // Loại nhóm khỏi danh sách monitor
        // client.on('RemoveGroup', function(groupId) {
        //     $('#tab-header-' + groupId).remove();
        //     $('#tab-' + groupId).remove();
        // });

        // Cập nhật dữ liệu của nhóm lên giao diện
        // client.on('AddGroup', function(sendData, groupInfo) {
        //     if ($('#tbl-' + groupInfo._id).html()) {
        //         $('#tab-header-' + groupInfo._id + ' a').html(groupInfo.name);
        //         $('#tbl-' + groupInfo._id + ' tbody').empty();
        //         _.each(sendData, function(agent) {
        //             $('#tbl-' + groupInfo._id + ' tbody').append(_.Tags([agentTag(agent)]));
        //         });
        //     } else {
        //         $('#tab-content-group').append(groupContentTag(groupInfo, sendData));
        //         $('.selectpicker').selectpicker('refresh');
        //         $('#tab-list-group').append(groupTabTag(groupInfo, '#tab-list-group'));
        //     }
        //     _.each(sendData, function(newData) {
        //         var isUpdate = false;
        //         async.forEachOf(groupData, function(agent, i, callback) {
        //             if (_.isEqual(agent._id.toString(), newData._id.toString())) {
        //                 groupData[i] = newData;
        //                 isUpdate = true;
        //             };
        //             callback();
        //         }, function(err) {
        //             if (!isUpdate) groupData.push(newData);
        //         });
        //     });
        // });

        // // Cập nhật dữ liệu của agent
        // client.on('MonitorAgent', function(sendData) {
        //     var isUpdate = false;
        //     async.forEachOf(groupData, function(agent, i, callback) {
        //         if (_.isEqual(agent._id.toString(), sendData._id.toString())) {
        //             groupData[i] = sendData;
        //             isUpdate = true;
        //         };
        //         callback();
        //     }, function(err) {
        //         if (isUpdate) {
        //             updateGroupData(sendData);
        //         } else {
        //             groupData.push(sendData);
        //             addGroupData(sendData);
        //         }
        //     });
        // });

        // // Cập nhật dữ liệu call
        // client.on('MonitorCall', function(sendData) {
        //     var isUpdate = false;
        //     async.forEachOf(callData, function(agent, i, callback) {
        //         if (_.isEqual(agent._id.toString(), sendData._id.toString())) {
        //             callData[i] = sendData;
        //             isUpdate = true;
        //         };
        //         callback();
        //     }, function(err) {
        //         if (isUpdate) {
        //             updateCallData(sendData);
        //         } else {
        //             callData.push(sendData);
        //             addCallData(sendData);
        //         }
        //     });
        // });

        // Loại agent khỏi danh sách monitor
        // client.on('RemoveAgent', function(sendData) {
        //     $('.agent-tag').each(function() {
        //         var $this = this;
        //         if (_.isEqual(sendData, $($this).attr('data-agent-id'))) {
        //             $($this).remove();
        //         }
        //     });
        //     _.each(groupData, function(agent, i) {
        //         if (agent._id && _.isEqual(agent._id.toString(), sendData)) {
        //             groupData.splice(i, 1);
        //         }

        //         if (!agent._id) {
        //             groupData.splice(i, 1);
        //         }
        //     });
        // });

        // Loại call khỏi danh sách monitor
        // client.on('RemoveCall', function(sendData) {
        //     $('.call-tag').each(function() {
        //         var $this = this;
        //         if (_.isEqual(sendData, $($this).attr('data-agent-id'))) {
        //             $($this).remove();
        //         }
        //     });
        //     _.each(callData, function(agent, i) {
        //         console.log(666, agent);
        //         if (agent._id && _.isEqual(agent._id.toString(), sendData)) {
        //             callData.splice(i, 1);
        //         }
        //     });
        // });

        // Tryt vấn dữ liệu agent trong nhóm để transfer
        client.on('GetGroupAgents', function(selectAgent) {
            addTransferAgents(selectAgent);
            // $('#transfer-info').modal('show');
        });

        // Truy vấn dữ liệu agent phục vụ queue để transfer
        client.on('GetQueueAgents', function(queueData, fromAgent) {
            selectAgent = fromAgent;
            addTransferAgents(queueData);
            // $('#transfer-info').modal('show');
        });
    }

    function _getUsersHandler(data, statusText, xhr) {
        //Ensure success.
        if (xhr && xhr.status === 200) {
            var groupId = $("#agent-id").html();
            $('#tbl-' + groupId + ' tbody').empty();
            // $('#tbl-'+groupId+' tbody').append(_.Tags([agentTag(addData)]));
            users = JSON.parse(xml2json(xhr.responseText)).Team.users.User;
            // get list agent
            async.waterfall([
                function(next) {
                    // get list user
                    _AjaxObject(`/users?type=all`, 'POST', [],
                        function(res) {
                            if (res) {
                                if (res.code == 200) {
                                    next(null, res)
                                }
                            }
                        });
                },
                function(data, next) {
                    // filter user  admin
                    let userTelehub = data.users.filter(item => item.name != "admin")
                    users = users.filter(item => {
                        let isCheck = false
                        for (let userCisco of userTelehub) {
                            if (userCisco.idAgentCisco == item.loginId) {
                                isCheck = true
                                break;
                            }
                        }
                        if (isCheck) {
                            return item
                        }
                    })
                    next(null, users)
                },
            ], function(error, data) {
                async.each(data, function(user, callback) {
                    let index = data.indexOf(user)
                    let agentId = user.loginId
                    async.waterfall([
                        function(next) {
                            // get list dialogs group form cisco 
                            window._finesse.getDialogs(agentId, function _getDialogsHandler(data, statusText, xhr) {
                                if (xhr && xhr.status === 200) {
                                    next(null, xhr.responseText)
                                }
                            }, _getDialogsHandler);
                        }
                    ], function(error, result) {
                        let dialogsObject = JSON.parse(xml2json(result))
                        if (dialogsObject && dialogsObject.Dialogs) {
                            let dialog = dialogsObject.Dialogs.Dialog
                            console.log(dialog)
                            if (Array.isArray(dialog)) {
                                for (let item of dialog) {
                                    if (item.fromAddress == user.extension) {
                                        user['caller'] = item.fromAddress
                                        user['called'] = item.toAddress
                                        user['callStatus'] = item.state

                                        if (item.mediaProperties) {
                                            if (item.mediaProperties.callType == "OUT") {
                                                user.callType = "OUTBOUND"
                                            } else {
                                                if (item.mediaProperties.callType == "SUPERVISOR_MONITOR") {
                                                    user.callType = "SUPERVISOR_MONITOR"
                                                } else {
                                                    user.callType = "INBOUND"
                                                }
                                            }
                                        }
                                    } else if (item.toAddress == user.extension) {
                                        user['idDialog'] = item.id
                                    } else {
                                        user['caller'] = item.fromAddress
                                        user['called'] = item.toAddress
                                        user['callStatus'] = item.state
                                        if (item.mediaProperties) {
                                            if (item.mediaProperties.callType == "OUT") {
                                                user.callType = "OUTBOUND"
                                            } else {
                                                if (item.mediaProperties.callType == "SUPERVISOR_MONITOR") {
                                                    user.callType = "SUPERVISOR_MONITOR"
                                                } else {
                                                    user.callType = "INBOUND"
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                user['caller'] = dialog.fromAddress
                                user['called'] = dialog.toAddress
                                user['callStatus'] = dialog.state
                                user['idDialog'] = dialog.id
                                if (dialog.mediaProperties) {
                                    if (dialog.mediaProperties.callType == "OUT") {
                                        user.callType = "OUTBOUND"
                                    } else {
                                        if (dialog.mediaProperties.callType == "SUPERVISOR_MONITOR") {
                                            user.callType = "SUPERVISOR_MONITOR"
                                        } else {
                                            user.callType = "INBOUND"
                                        }
                                    }
                                }
                            }
                        }
                        if (user && user.stateChangeTime) {
                            user.stateChangeTime = moment(user.stateChangeTime).format("YYYY-MM-DD HH:mm:ss")
                            let timeInState = new Date(user.stateChangeTime).getTime()
                            let timeNow = new Date();
                            timeNow = timeNow.getTime();
                            user.timeInState = timeNow - timeInState
                        } else {
                            user.timeInState = 0
                        }
                        user._id = index
                        user.fullName = user.firstName + user.lastName

                        callback()
                    })
                }, function(err) {
                    users.sort((a, b) => (a.fullName > b.fullName) ? 1 : -1)
                    console.log('user', users);
                    for (let i = 0; i < users.length > 0; i++) {
                        let user = users[i]
                        let data = {
                            dialogId: (user && user.dialogId) ? user.dialogId : '',
                            displayName: user.lastName,
                            name: user.firstName,
                            extension: user.extension,
                            callStatus: (user && user.callStatus) ? user.callStatus : '',
                            callType: (user && user.callType) ? user.callType : '',
                            status: user.state,
                            caller: (user && user.caller) ? user.caller : '',
                            called: user.called,
                            callTime: user.stateChangeTime,
                            timeInState: user.timeInState,
                            _id: i
                        }
                        $('#tbl-' + groupId + ' tbody').append(_.Tags([agentTag(data)]));
                        $('.selectpicker').selectpicker('refresh');
                    }
                })
            })
        }
    }

    function _getDialogsHandler(data, statusText, xhr) {
        console.log("Get Dialogs")
        if (xhr && xhr.status === 200) {
            console.log('data monitor', data.xml);
        }
    }

    var getCookie = function(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    };

    return {
        init: function() {
            bindClick();
            bindSubmit();
            bindPressKey();
            bindSocket(_socket);

            groupData = monitorData;
            callData = serviceData;

            window._finesse.getTeam(getCookie('_teamId'), _getUsersHandler, _getUsersHandler);
            // window._finesse.getDialogs(getCookie('_agentId'), _getDialogsHandler, _getDialogsHandler);
            // Hiển thị dữ liệu monitor lên giao diện
            // _.each(firstGroups, function(el, i) {
            //     $('#tab-content-group').append(groupContentTag(el, []));
            //     // $('#tab-list-group').append(groupTabTag(el, '#tab-list-group'));
            // });
            $('#tab-content-group').append(groupContentTag(firstGroups[0], []));
            _.each(groupData, function(el, i) {
                // addGroupData(el);
            });

            // _.each(firstServices, function(el, i) {
            //     $('#tab-content-service').append(serviceContentTag([], el));
            //     $('#tab-list-service').append(groupTabTag(el, '#tab-list-service'));
            // });

            // _.each(callData, function(el, i) {
            //     addCallData(el);
            // });

            $('.selectpicker').selectpicker('refresh');
            // myTimer = setInterval(timer, 1000);
            // refreshListUserTimer = setInterval(refreshListUserTimerFunc, 5000);
        },
        uncut: function() {
            // Disable sự kiện khi đóng trang
            // clearInterval(myTimer);
            clearInterval(refreshListUserTimer);
            $(document).off('click', '#type-setting');
            $(document).off('click', '#setting-btn');
            $(document).off('click', '#transfer-btn');
            $(document).off('click', '#change-agent-status-btn');
            $(document).off('change', '#queue-call-control');
            $(document).off('change', '#group-call-control');
            $(document).off('change', '#queue-agent-control');
        }
    };
}(jQuery);