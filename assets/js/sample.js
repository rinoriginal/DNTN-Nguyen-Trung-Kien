/**
 * Controller JavaScript to manage the functions of the page. The init function
 * is located near the bottom, which will bind actions to all buttons.
 */

var _username, _password, _extension, _domain, _login, _urlBinding, _finesse, _jwClient, _fromAddress;
let callTypeGlobal = '';
var _this = function (s) {
    return 'body > .tab-content > .tab-pane#tab-voice ' + s;
};

// window._finesse = null;
var answerTime = ''
var ringTime = ''
var endTime = ''
function onClientError(rsp) {
    console.log("ERROR " + rsp);
}
/**
 * Event handler that prints events to console.
 */
function _eventHandler(data) {
    var eventData = JSON.parse(xml2json(data.data._DOM.textContent));
    console.log('eventData', eventData);
    _handleUpdateDataUser(eventData);
    _handleUpdateDataDialog(eventData);
    data = data.selected.firstChild.data;
    var callid = $(data).find("id");

    if (callid.text() !== "") {
        console.log("CallId: " + callid.text());
    }
    var state = $(data).find("state");


    if (eventData && eventData.Update && eventData.Update.data && eventData.Update.data.dialogs && eventData.Update.data.dialogs.Dialog) {
        if (eventData.Update.data.dialogs.Dialog.state == "ALERTING") {
            _callData = {};
            _callData = eventData.Update.data.dialogs.Dialog;
        }

    }
    if (eventData && eventData.Update && eventData.Update.data && eventData.Update.data.dialog) {
        let state = eventData.Update.data.dialog.state
        console.log('stateeee', state);
        let mediaType = data.Update.data.dialog && data.Update.data.dialog.mediaType;

        if (eventData.Update.data.dialog.mediaProperties && eventData.Update.data.dialog.mediaProperties.callType) {
            callTypeGlobal = eventData.Update.data.dialog.mediaProperties.callType;
        };

        if (state == 'ACTIVE' && mediaType != "ECE_Chat") {
            // $('.float-block-call').attr('style', 'display:block;')
            // $('.button-share').attr('style', 'display:block')
            // $('.button-outbound').attr('style', 'display:none')
            // $('#fromAddress').html(eventData.Update.data.dialog.toAddress ? eventData.Update.data.dialog.toAddress.slice(-10) : '')
            // $('#timerCrm').attr('style', 'display:none')
            // $('#endCall').attr('style', 'display:none')
        }
        if (state == 'INITIATED') {

            // $('.float-block-call-crm').attr('style', 'display:none;width: 56%;')
            // $('.float-block-call').attr('style', 'display:none;')
            // $('#fromAddress').attr('style', 'display:block')
            // $('#timerCrm').attr('style', 'display:block')
            // // $('#endCall').attr('style', 'display:block')
            // $('.button-inbound').attr('style', 'display:none')
            // $('.button-outbound').attr('style', 'display:block')
            // $('.button-end').attr('style', 'display:block')
            // $('#fromAddress').html(eventData.Update.data.dialog.toAddress ? 'Dialing ' + eventData.Update.data.dialog.toAddress.slice(-10) : '')
            $('#timerCrm').html(`<label id="hourCrm">00</label>:<label id="minutesCrm">00</label>:<label id="secondsCrm">00</label>`)
            countUpTimer('Crm')
        }

        if (state == "INITIATING") {
            console.log('aaaaaaaaaaaa');
            if (eventData.Update.data.dialog.mediaProperties && eventData.Update.data.dialog.mediaProperties.callType === "AGENT_INSIDE") {
                let dataCall = {};
                dataCall = eventData.Update.data.dialog;
                sessionStorage.setItem("_callData", JSON.stringify(dataCall));
            }
        }

    }
    if (eventData && eventData.Update && eventData.Update.data && eventData.Update.data.dialog && eventData.Update.data.dialog) {
        if (eventData.Update.data.dialog.state == "ACTIVE" && eventData.Update.data.dialog.mediaProperties && eventData.Update.data.dialog.mediaProperties.callType == "OUTBOUND") {
            _callData = {};
            _callData = eventData.Update.data.dialog;
        }
    }
    if (state.text() == "READY" || state.text() == 'NOT_READY') {
        $("#transferCall").hide();
    }
    console.log('--Thông tin cisco trả về : ', state.text())
    if (state.text() == "TALKING") {

        let callType = (_callData && _callData.mediaProperties && _callData.mediaProperties.callType)
        if (callType == 'PREROUTE_ACD_IN') {
            // Hiển thị nút transfer
            $("#transferCall").show();
        }
        if (callType && (callType != "BARGE_IN_CONSULT" || callType != "AGENT_INSIDE")) {
            // Tạo thông tin ticket và thông tin khách hàng
            _Ajax('/api/v1/voice/create', 'POST', [{ data: JSON.stringify(_callData) }], function (resp) {
                console.log('Res', resp)
                if (resp.code == 200) {
                    _callData = {}
                    VoiceContainer.open(resp.message.id, resp.message.title);
                }
            });
        }
    }
}

function _handleUpdateDataDialog(data) {
    if (typeof data !== 'object' || data.Update === undefined || data.Update.data === undefined) {
        return;
    }
    if (data.Update.data.media) {
        console.log("media", data.Update.data.media);
    }
    if (data.Update.data.dialogs) {
        _handleDialogData(data.Update.data.dialogs.Dialog)
    }
    if (data.Update.data.dialog) {
        _handleDialogData(data.Update.data.dialog);
    }
}

function _handleDialogData(data) {
    if (data.mediaType == "ECE_Chat") { // xử lý chat
        var id = data.id;
        var callVariables = data.mediaProperties.callvariables.CallVariable;
        var sdt = ''
        var name = ''
        var email = '';
        var idChannelCisco = ''
        var queueNumber = data.mediaProperties.queueNumber;
        var activityId = ''
        if (callVariables.length > 0) {
            for (let item of callVariables) {
                if (item.name == 'callVariable1') {
                    sdt = item.value
                }
                if (item.name == 'callVariable2') {
                    name = item.value
                }
                if (item.name == 'callVariable3') {
                    email = item.value
                }
                if (item.name == 'callVariable6') {
                    idChannelCisco = item.value
                }
                if (item.name == 'user.ece.activity.id') {
                    activityId = item.value
                }
            }
        }
        switch (data.state) {
            case 'PAUSED': // dừng 1 cuộc chat để mở 1 cuộc khác
                console.log("dừng ", id, " - ", sdt, " - ", name);
                // _socket.emit("EventChat", { state: 1, id: id, sdt: sdt, name: name, email: email, queueNumber: queueNumber, idChannelCisco: idChannelCisco, activityId: activityId });
                break;
            case 'ACTIVE':
                // loadTicketChat(sdt, name, email, id, idChannelCisco, activityId);
                // _socket.local.emit("EventChat", { state: 2, id: id, sdt: sdt, name: name, email: email, queueNumber: queueNumber, idChannelCisco: idChannelCisco, activityId: activityId });
                break;
            case 'WRAPPING_UP':
                console.log("khách thoát ", id, " - ", sdt, " - ", name);
                // _socket.emit("EventChat", { state: 3, id: id, sdt: sdt, name: name, email: email, queueNumber: queueNumber, idChannelCisco: idChannelCisco, activityId: activityId });
                break;
            case 'CLOSED':
                // _socket.emit("EventChat", { state: 4, id: id, sdt: sdt, name: name, email: email, queueNumber: queueNumber, idChannelCisco: idChannelCisco, activityId: activityId });
                break;
            case 'OFFERED':
                console.log("cuộc chat mới ", id, " - ", sdt, " - ", name);
                // _socket.emit("EventChat", { state: 0, id: id, sdt: sdt, name: name, email: email, queueNumber: queueNumber, idChannelCisco: idChannelCisco, activityId: activityId });
                break;
        }


    } else if (data.mediaType == "ECE_Email") { //xử lý email
        console.log("Thông tin mail trả về: ", data);
        var id = data.id;
        var callVariables = data.mediaProperties.callvariables.CallVariable;
        var email = "";
        var subject = "";
        var queueNumber = ""
        var activityId = "";
        if (callVariables.length > 0) {
            for (let item of callVariables) {
                if (item.name == 'callVariable1') {
                    email = item.value
                }
                if (item.name == 'callVariable2') {
                    subject = item.value
                }
                if (item.name == 'callVariable5') {
                    queueNumber = item.value
                }
                if (item.name == 'user.ece.activity.id') {
                    activityId = item.value
                }
            }
        }
        switch (data.state) {
            case 'PAUSED': // dừng 1 cuộc email để mở 1 email khác
                console.log("Dừng email", id, " - ", email, " - ", subject);
                _socket.emit("EventMail", { state: 1, id: id, email: email, subject: subject, queueNumber: queueNumber, queueName: queueName, activityId: activityId });
                break;
            case 'ACTIVE':
                console.log("Mở email", id, " - ", email, " - ", subject);
                // $('#accordion').show();
                // loadTicketMail(id, email, subject, queueNumber, activityId);
                // _socket.emit("EventMail", { state: 2, id: id, email: email, subject: subject, queueNumber: queueNumber, queueName: queueName, activityId: activityId });
                break;
            case 'WRAPPING_UP':
                console.log("khách thoát email", id, " - ", email, " - ", subject);
                // _socket.emit("EventMail", { state: 3, id: id, email: email, subject: subject, queueNumber: queueNumber, queueName: queueName, activityId: activityId });
                break;
            case 'CLOSED':
                console.log("Đóng email", id, " - ", email, " - ", subject);
                // _socket.emit("EventMail", { state: 4, id: id, email: email, subject: subject, queueNumber: queueNumber, queueName: queueName, activityId: activityId });
                break;
            case 'OFFERED':
                console.log("Email mới ", id, " - ", email, " - ", subject);
                // _socket.emit("EventMail", { state: 0, id: id, email: email, subject: subject, queueNumber: queueNumber, queueName: queueName, activityId: activityId });
                break;
        }
    } else if (data.mediaType === 'Voice') {
        var callType = data.mediaProperties.callType;
        var phoneNumber = '';
        if (callType === 'ACD_IN' || callType === 'PREROUTE_ACD_IN' || callType === 'OTHER_IN') {
            phoneNumber = data.fromAddress;
            _fromAddress = data.fromAddress
        } else {
            phoneNumber = data.toAddress;
        }
    }
}

/**
 * Connects to the BOSH connection. Any XMPP library or implementation can be
 * used to connect, as long as it conforms to BOSH over XMPP specifications. In
 * this case, we are using Cisco's Ajax XMPP library (aka JabberWerx). In order
 * to make a cross-domain request to the XMPP server, a proxy should be
 * configured to forward requests to the correct server.
 */
function _eventConnect() {
    if (window.jabberwerx) {
        if (window._jwClient) {
            _eventConnect();
        }
        var jid = getCookie('_agentId') + '@' + getCookie('_domain'),
            _jwClient = new jabberwerx.Client("cisco");
        jwArgs = {
            httpBindingURL: _urlBinding + "/http-bind",
            errorCallback: onClientError,
            successCallback: function () {
                _finesse.setResource(_jwClient.resourceName);
            }
        };
        jabberwerx._config.unsecureAllowed = true;
        _jwClient.event("messageReceived").bindWhen("event[xmlns='http://jabber.org/protocol/pubsub#event'] items item notification", _eventHandler);
        _jwClient.event("clientStatusChanged").bind(function (evt) {
            if (evt.data.next == jabberwerx.Client.status_connected) {
                _finesse.signIn(getCookie('_agentId'), getCookie('_extension'), getCookie('_isLoginMobile'), getCookie('_extensionMobile'), getCookie('_dialNumber'), true, _signInHandler, _signInHandler);
            } else if (evt.data.next == jabberwerx.Client.status_disconnected) {
                _finesse.signOut(getCookie('_agentId'), _extension, null, _signOutHandler, _signOutHandler);
            }
        });
        _jwClient.connect(jid, _password, jwArgs);
        window._jwClient = _jwClient;
    } else {
        alert("CAXL library not found. Please download from http://developer.cisco.com/web/xmpp/resources")
    }
}

/**
 * Disconnects from the BOSH connection.
 */
function _eventDisconnect() {
    if (_jwClient) {
        _jwClient.disconnect();
        _jwClient = null;
    }
}

/**
 * Generic handler that prints response to console.
 */
function _handler(data, statusText, xhr) {
    if (xhr) {
        console.log("RESPONSE", xhr.status);
    } else {
        console.log("RESPONSE", data);
    }
}

/**
 * GetState handler that prints response to console.
 */
function _getStateHandler(data) {
    console.log("RESPONSE", data.xml);
}

/**
 * Handler for the make call that will validate the response and automatically
 * store the call id retrieve from the response data.
 */
function _makeCallHandler(data, statusText, xhr) {
    if (statusText === "success") {
        $("#field-call-control-callid").val("");
    }
}

/**
 * Sign in handler. If successful, hide sign in forms, display actions, and
 * connect to BOSH channel to receive events.
 */
function _signInHandler(data, statusText, xhr) {
    if (xhr.status === 202) {
        _finesse.getState(getCookie('_agentId'), _getStateHandler, _getStateHandler);
    }
}

function _getStateHandler(data, statusText, xhr) {
    if (xhr.status === 200) {
        var teamId = data.getElementsByTagName("teamId")[0].childNodes[0].nodeValue;
        setCookie('_teamId', teamId, 7);
    }
}

function _signOutHandler(data, statusText, xhr) {
    if (xhr.status === 202) {

    }
}

var setCookie = function (cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
};
var getCookie = function (cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
};

var getStateCall = function (state) {
    switch (state) {
        case "ALERTINGINITIATEDALERTING":
            //Inbound call is coming
            return "Calling";
        case "INITIATEDDROPPEDALERTING":
            //end call
            return "";
        case "TALKING":
            //Talking
            return "Processing";
        case "NOT_READY":
            //End call
            return "";
        case "ACTIVEACTIVEACTIVE":
            // Customer accept call
            return "Processing";
        case "INITIATEDALERTINGALERTING":
            //Init outboundcall
            return "Calling";
        default:
            return "";
    }
}

function _handleUpdateDataUser(data) {
    if (typeof data !== 'object' || data.Update === undefined || data.Update.data === undefined) {
        return;
    }

    if (data.Update.data.user) {
        _handleUserData(data);
    }
}
function _handleUserData(data) {
    var user = data.Update.data.user;
    // let __dialogs = data.Update.data.dialogs;

    console.log('USER:', user, 'data:');
    console.log(' - Trạng thái user', user && user.state)
    console.log('getUserState(user)', getUserState(user));
    // ready thì ẩn button wrap up
    if (getUserState(user) == "Ready") {
        // $('#dropDownWrapUp').attr('style', 'display:none')
        // $('#sideCallVariable').attr('style', 'display:none')
        // $('#navbarDropdown').attr('style', 'display:none')
        // $('.holdCall').attr('style', 'display:none')
        // $('.retrieveCall').attr('style', 'display:none')
        // $('.btnDirect').attr('style', 'display:none')
        // $('.btnConsult').attr('style', 'display:none')
        // $('#endCall').attr('style', 'display:none')
    }
    // trạng thái wrap up thì hiển thị nút wrap up
    if (getUserState(user) == "WRAP-UP") {
        // $('#dropDownWrapUp').attr('style', 'display:block')
        // $('#sideCallVariable').attr('style', 'display:block')
        // $('#navbarDropdown').attr('style', 'display:none')
        // $('.holdCall').attr('style', 'display:none')
        // $('.retrieveCall').attr('style', 'display:none')
        // $('.btnDirect').attr('style', 'display:none')
        // $('.btnConsult').attr('style', 'display:none')
        // $('#endCall').attr('style', 'display:none')
    }
    if (getUserState(user) === 'TALKING') {
        // talking thì hiển thị các nút thao tác
        // $('#fromAddress').html(_fromAddress) //hiển thị đầu số gọi vào
        // $('.float-block-call').attr('style', 'display:block')
        // $('.holdCall').attr('style', 'display:block')
        // $('.btnDirect').attr('style', 'display:block')
        // $('.btnConsult').attr('style', 'display:block')
        // $('#navbarDropdown').attr('style', 'display:block')
        // $('#sideCallVariable').attr('style', 'display:block')
        // $('#dropDownWrapUp').attr('style', 'display:block')
        // $('#endCall').attr('style', 'display:block')
        // $('#dropDownWrapUp').removeClass('btnActive')
        // $('#fromAddress').attr('style', 'display:none')
        // $('#timerCrm').attr('style', 'display:none')
        // $('button-outbound').attr('style', 'display:none')
        // $('button-share').attr('style', 'display:block')
        // $('button-end').attr('style', 'display:block')

    }
    // Nếu là trạng thái RESERVED thì show popup trả lời
    if (getUserState(user) == "RESERVED") {
        webToast.loading({
            status: 'Loading...',
            message: 'Please Wait a moment',
            align: 'bottomright',
            line: false
        });
    } else {
        // check element toastContainer tồn tại
        if ($('.toastContainer').length > 0) {
            webToast.ToastRemove('.toastContainer')
        }
    }
    if (user.state) {
        if (user.state === "NOT_READY") {
            $('.float-block-call-crm').attr('style', 'display:none')
            setCookie('_agentState', user.reasonCode && user.reasonCode.label);
        } else {
            setCookie('_agentState', user.state);
        }
        // Logout telehub nếu trạng thái user là logout
        if (user.state === 'LOGOUT') {
            // Kiểm tra nếu không sử dụng hệ thống voice trong khoảng 1 thời gian được config  thì cisco tự động logout ,
            // Dưới telehub sẽ login lại  cisco finess
            if (user.reasonCode && user.reasonCode.label && user.reasonCode.label === "Inactivity Timeout") {
                setCookie('_password', null);
                setCookie('_extension', null);
                setCookie('_agentId', null);
                jQuery.ajax({ url: '/logout' }).done(function () {
                    swal({
                        title: "Thông báo",
                        text: "Phiên làm việc của bạn đã hết hiệu lực, vui lòng đăng nhập lại!",
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Ok",
                        closeOnConfirm: true,
                        allowOutsideClick: false,
                    }, function (isConfirm) {
                        if (isConfirm) {
                            window.location.reload();
                        }
                    }, _handler);
                });;
            } else {
                setCookie('_password', null);
                setCookie('_extension', null);
                setCookie('_agentId', null);
                jQuery.ajax({ url: '/logout' }).done(function () {
                    window.location.href = '/';
                });;
            }
        }



        console.log('callTypeGlobal', callTypeGlobal);
        // sau khi gọi ra và trạng thái trước lúc gọi ra thì ẩn các nút
        if (
            !['TALKING', 'RESERVED', "HOLD", "WORK"].includes(user.state)
            && callTypeGlobal == 'OUT'
        ) {
            $('#navbarDropdown').attr('style', 'display:none')
            $('#sideCallVariable').attr('style', 'display:none')
            $('#dropDownWrapUp').attr('style', 'display:none')
            $('.holdCall').attr('style', 'display:none')
            $('.retrieveCall').attr('style', 'display:none')
            $('.btnDirect').attr('style', 'display:none')
            $('.btnConsult').attr('style', 'display:none')
            $('#endCall').attr('style', 'display:none')
        }
    }
    // render danh sách trạng thái
    $('#call-status-info').html('<table>' +
        '<tr>' +
        '   <td class="p-r-10" rowspan="2"><img style="width:60px;height:40px" src="' + getImageState(user) + '"></td>' +
        '   <td>' + getUserState(user) + '</td>' +
        '</tr>' +
        '<tr>' +
        '   <td><label id="hour">00</label>:<label id="minutes">00</label>:<label id="seconds">00</label></td>' +
        '</tr>' +
        '</table>');
    $('#call-status-info').css('background-color', getStatusColor(user.state));
    // sau khi endcall thì trạng thái là work ready => đếm ngược theo thời gian wrapup
    if (user.state == 'WORK_READY') {
        countDownTimer(user.wrapUpTimer)
    } else {
        countUpTimer('')
    }
}

function getUserState(user) {
    switch (user && user.state) {
        case 'LOGOUT':
            return 'ĐÃ ĐĂNG XUẤT';
        case 'NOT_READY':
            return user.reasonCodeId == -1 ? 'NOT READY' : user.reasonCode && user.reasonCode.label;
        case 'READY':
            return 'Ready';
        case 'RESERVED':
            return 'RESERVED';
        case 'RESERVED_OUTBOUND':
            return 'RESERVED OUTBOUND';
        case 'RESERVED_OUTBOUND_PREVIEW':
            return 'RESERVED OUTBOUND PREVIEW';
        case 'TALKING':
            // talking thì hiển thị các nút thao tác
            // $('#fromAddress').html(_fromAddress) //hiển thị đầu số gọi vào
            // $('.float-block-call').attr('style', 'display:block')
            // $('.holdCall').attr('style', 'display:block')
            // $('.btnDirect').attr('style', 'display:block')
            // $('.btnConsult').attr('style', 'display:block')
            // $('#navbarDropdown').attr('style', 'display:block')
            // $('#sideCallVariable').attr('style', 'display:block')
            // $('#dropDownWrapUp').attr('style', 'display:block')
            // $('#endCall').attr('style', 'display:block')
            // $('#dropDownWrapUp').removeClass('btnActive')
            // $('#fromAddress').attr('style', 'display:none')
            // $('#timerCrm').attr('style', 'display:none')
            // $('button-outbound').attr('style', 'display:none')
            // $('button-share').attr('style', 'display:block')
            // $('button-end').attr('style', 'display:block')

            return 'TALKING';
        case 'HOLD':
            return 'GIỮ MÁY';
        case 'WORK':
            return 'WORK';
        case 'WORK_READY':
            return 'WRAP-UP';
        default:
            return 'KHÔNG RÕ TRẠNG THÁI';
    }
}

function getImageState(user) {
    switch (user && user.state) {
        case 'NOT_READY':
            if (user && user.reasonCodeId == 1) {
                return 'assets/images/voice-not-answer.png'
            }
            return 'assets/images/voice-not-ready.png';
        case 'READY':
            return 'assets/images/voice-ready.png';
        case 'RESERVED':
            return 'assets/images/voice-talking.png';
        case 'RESERVED_OUTBOUND':
            return 'assets/images/voice-talking.png';
        case 'RESERVED_OUTBOUND_PREVIEW':
            return 'assets/images/voice-talking.png';
        case 'TALKING':
            return 'assets/images/voice-talking.png';
        case 'HOLD':
            return 'assets/images/voice-talking.png';
        case 'WORK':
            return 'assets/images/voice-talking.png';
        case 'WORK_READY':
            return 'assets/images/voice-talking.png';
        default:
            return '';
    }
}

var getStatusColor = function (state) {
    switch (state) {
        case 'TALKING':
            return '#33dcff';
        case 'READY':
            return '#33dcff';
        case 'NOT_READY':
            return '#f8f8f8';
        default:
            return 'yellow';
    }
}

var countUpTimer = function (type) {
    var minutesLabel = document.getElementById("minutes" + type);
    var secondsLabel = document.getElementById("seconds" + type);
    var hourLabel = document.getElementById("hour" + type);
    var totalSeconds = 0;
    setInterval(setTime, 1000);

    function setTime() {
        ++totalSeconds;
        var h = Math.floor(totalSeconds / 3600);
        var m = Math.floor(totalSeconds % 3600 / 60);
        var s = Math.floor(totalSeconds % 3600 % 60);
        secondsLabel.innerHTML = pad(s);
        minutesLabel.innerHTML = pad(parseInt(m));
        hourLabel.innerHTML = pad(parseInt(h));
    }

    function pad(val) {
        var valString = val + "";
        if (valString.length < 2) {
            return "0" + valString;
        } else {
            return valString;
        }
    }
}
var countDownTimer = function (time) {
    var minutesLabel = document.getElementById("minutes");
    var secondsLabel = document.getElementById("seconds");
    var hourLabel = document.getElementById("hour");
    setInterval(setTime, 1000);

    function setTime() {
        time--;
        secondsLabel.innerHTML = pad(time % 60);
        minutesLabel.innerHTML = pad(parseInt(time / 60));
        hourLabel.innerHTML = pad(parseInt(time / 3600));
    }

    function pad(val) {
        var valString = val + "";
        if (valString.length < 2) {
            return "0" + valString;
        } else {
            return valString;
        }
    }
}

var _customer = {}

function loadTicketChat(_phoneNumber, _name, _email, id, idChannelCisco, activityId) {
    console.log('load ticket chat')
    async.waterfall([
        function (next) {
            _Ajax(`/chat-subscribe-cisco?idCallDialog=${id}&idChannelCisco=${idChannelCisco}&phoneNumber=${_phoneNumber}&email=${_email}&name=${_name}&activityId=${activityId}`, 'POST', [],
                function (res) {
                    if (res) {
                        if (res.code == 200) {
                            var chatThread = res.result
                            _customer['threadId'] = chatThread._id
                            _customer['idService'] = chatThread.idServiceChat
                            next()
                        }
                    }
                });
        },
        function (next) {
            _AjaxObject(`/chat-client?queryCustomer=1&phoneNumber=${_phoneNumber}&name=${_name}&email=${_email}&idCallDialog=${id}&type=chat&mode=2`, 'GET', [],
                function (res) {
                    if (res) {
                        if (res.code == 200) {
                            _customer['idCustomer'] = res.customer._id
                            _customer['ticketId'] = res.ticket
                            _customer['threadId'] = res.threadId
                            _customer['email'] = _email
                            _customer['idCallDialog'] = id
                            next()
                        }
                    }
                });
        }

    ], function (error, result) {
        loadFormTicket(_customer)
    })

}

function loadTicketMail(id, email, subject, queueNumber, activityId) {
    console.log('Load ticket mail 1111', email)
    let dataBodyMail = {
        id: id,
        email: email,
        subject: subject,
        queueNumber: queueNumber,
        activityId: activityId
    }
    console.log('data passs', dataBodyMail);
    async.waterfall([
        function (next) {
            jQuery.post("/api/v1/mail/create", dataBodyMail, function (res) {
                if (res) {
                    if (res.success) {
                        let dataNext = {
                            mailInbound: res.data.mailInbound,
                            ticket: res.data.ticket
                        }
                        next(null, dataNext)

                    } else {
                        next(null, null)
                    }
                }
            });
        },
    ], function (error, result) {
        console.log("Thong tin khach1111: ", result)
        if (result) {
            let _customer = {}
            _customer.idCustomer = result.mailInbound.idCustomer
            _customer.ticketId = result.ticket._id
            _customer.caseId = result.ticket.caseId
            _customer.type = "mail"
            _customer.idMailInboundChannel = result.mailInbound.idMailInboundChannel

            loadFormTicket(_customer)
        }
    })
}

function loadFormTicket(customer) {
    console.log("Thong tin khach: ", customer)
    $('#frm-update-ticket').empty();
    var ticketId = customer && customer.ticketId;
    var type = customer && customer.type;
    var caseId = customer && customer.caseId
    var idMailInboundChannel = customer && customer.idMailInboundChannel
    var mailId = customer && customer.mailId ? customer.mailId : "";
    var ticketParam = (ticketId != null && ticketId != undefined) ? ('&ticketId=' + ticketId) : '';

    if (_.has(customer, 'idCustomer') && customer.idCustomer != null) {
        ticketParam = ticketParam + '&CustomerId=' + customer.idCustomer;
    } else {
        if (_.has(customer, 'field_so_dien_thoai') && customer['field_so_dien_thoai'].length) {
            ticketParam = ticketParam + '&field_so_dien_thoai=' + customer['field_so_dien_thoai'][0];
        }
        if (_.has(customer, 'field_e_mail') && customer['field_e_mail'].length) {
            ticketParam = ticketParam + '&field_e_mail=' + customer['field_e_mail'];
        }
    }
    if (type == "mail") {
        $('#frm-update-ticket').append('<iframe id="frm-ticket" width="100%" height="100%" border="none" src="/ticket?type=mail&caseId=' + caseId + '&idMailInboundChannel=' + idMailInboundChannel + ticketParam + '"></iframe>');
    } else {
        $('#frm-update-ticket').append('<iframe  id="frm-ticket" width="100%" height="100%" border="none" src="/ticket?type=chat&mailId=' + mailId + '&service=' + customer.idService + '&threadId=' + customer.threadId + '&dialogId=' + ticketParam + '&email=' + customer.email + '&idCallDialog=' + customer.idCallDialog + '"></iframe>');
    }
}

/**
 * Init function. Wait until document is ready before binding actions to buttons
 * on the page.
 */
$(document).ready(function () {
    if (!window._finesse) {
        _username = getCookie('_username');
        _password = getCookie('_password');
        _extension = getCookie('_extension');
        _domain = getCookie('_domain');
        _urlBinding = getCookie('_urlBinding');
        _agentId = getCookie('_agentId');
        if (_agentId !== 'null') {
            _finesse = new Finesse(_agentId, _password);
            window._finesse = _finesse;
            _eventConnect();
        }


    } else {
        _agentId = getCookie('_agentId');
        if (_agentId !== 'null') {
            _eventConnect();
        }
    }
    // logout finess
    $("#logoutTelehubCisco").on("click", function () {
        $.get('/logout', function (data) {
            window.onbeforeunload = null;
            history.replaceState({}, document.title, "/");
            console.log(_finesse);
            if (getCookie('_agentId') != 'null') {
                _finesse.signOut(getCookie('_agentId'), getCookie('_extension'), null, _signOutHandler, _signOutHandler)
            }
            setCookie('_username', null);
            setCookie('_password', null);
            setCookie('_extension', null);
            setCookie('_agentId', null);
            window.location.reload();
        });
    });
    // answer call inbound
    $(document).on('click', '#answerCallInbound', function (event) {
        event.preventDefault();
        if (!event.detail || event.detail == 1) {//activate on first click only to avoid hiding again on multiple clicks
            window._finesse.getDialogs(getCookie('_agentId'), function (_11, _12, data) {
                let response = JSON.parse(xml2json(data && data.responseText));
                if (response && response.Dialogs && response.Dialogs.Dialog) {
                    let dialog = response.Dialogs.Dialog;
                    window._finesse.answerCall(dialog.id, getCookie('_extension'), function (_11, _12, data) {
                        console.log("Thanfh cong", data)
                    })
                } else {

                }
            })
        }

    });
    // drop call
    $(document).on('click', '#endCall', function (event) {
        event.preventDefault();
        if (!event.detail || event.detail == 1) {//activate on first click only to avoid hiding again on multiple clicks
            window._finesse.getDialogs(getCookie('_agentId'), function (_11, _12, data) {
                let response = JSON.parse(xml2json(data && data.responseText));
                if (response && response.Dialogs && response.Dialogs.Dialog) {
                    let dialog = response.Dialogs.Dialog;
                    window._finesse.dropCall(dialog.id, getCookie('_extension'), function (_11, _12, data) {
                        console.log("Thanfh cong", data)

                        $('#navbarDropdown').attr('style', 'display:none')
                        $('.holdCall').attr('style', 'display:none')
                        $('.retrieveCall').attr('style', 'display:none')
                        $('.btnDirect').attr('style', 'display:none')
                        $('.btnConsult').attr('style', 'display:none')
                        $('#endCall').attr('style', 'display:none')
                    })
                } else {

                }
            })
        }

    });
    // hold call
    $(document).on('click', '.holdCall', function (event) {
        event.preventDefault();
        if (!event.detail || event.detail == 1) {//activate on first click only to avoid hiding again on multiple clicks
            window._finesse.getDialogs(getCookie('_agentId'), function (_11, _12, data) {
                let response = JSON.parse(xml2json(data && data.responseText));
                if (response && response.Dialogs && response.Dialogs.Dialog) {
                    let dialog = response.Dialogs.Dialog;
                    window._finesse.holdCall(dialog.id, getCookie('_extension'), function (_11, _12, data) {
                        console.log("Thanfh cong", data)
                        $('.holdCall').attr('style', 'display:none')
                        $('.btnDirect').attr('style', 'display:none')
                        $('.btnConsult').attr('style', 'display:none')
                        $('#navbarDropdown').attr('style', 'display:none')
                        $('#navbarDropdownCrm').attr('style', 'display:none')
                        $('.retrieveCall').attr('style', 'display:block')
                        $('.retrieveCall').addClass('btnActive')
                    })
                } else {

                }
            })
        }

    });
    // retrieve call
    $(document).on('click', '.retrieveCall', function (event) {
        event.preventDefault();
        if (!event.detail || event.detail == 1) {//activate on first click only to avoid hiding again on multiple clicks
            window._finesse.getDialogs(getCookie('_agentId'), function (_11, _12, data) {
                let response = JSON.parse(xml2json(data && data.responseText));
                if (response && response.Dialogs && response.Dialogs.Dialog) {
                    let dialog = response.Dialogs.Dialog;
                    window._finesse.retrieveCall(dialog.id, getCookie('_extension'), function (_11, _12, data) {
                        console.log("Thanfh cong", data)
                        $('.holdCall').attr('style', 'display:block')
                        $('.holdCall').removeClass('btnActive')
                        $('.btnDirect').attr('style', 'display:block')
                        $('.btnConsult').attr('style', 'display:block')
                        $('#navbarDropdown').attr('style', 'display:block')
                        $('#navbarDropdownCrm').attr('style', 'display:block')
                        $('.retrieveCall').attr('style', 'display:none')
                    })
                } else {

                }
            })
        }

    });
    // keypad call
    $('.key').on('click', function (event) {
        event.preventDefault();
        let key = +$(this).text()

        if (!event.detail || event.detail == 1) {//activate on first click only to avoid hiding again on multiple clicks
            window._finesse.getDialogs(getCookie('_agentId'), function (_11, _12, data) {
                let response = JSON.parse(xml2json(data && data.responseText));
                if (response && response.Dialogs && response.Dialogs.Dialog) {

                    let dialog = response.Dialogs.Dialog;
                    window._finesse.keypad(dialog.id, getCookie('_extension'), key, function (_11, _12, data) {
                        console.log("Thanfh cong", data)
                    })
                } else {

                }
            })
        }
    })
    // check số lượng list wrap-up, nếu không có thì disabled
    window._finesse.getWrapUp(getCookie('_agentId'), function (_11, _12, data) {
        let response = JSON.parse(xml2json(data && data.responseText));
        if (!response || !response.WrapUpReasons || !response.WrapUpReasons.WrapUpReason) {
            $('#dropDownWrapUp').attr('disabled', true)
        } else {
            $('#dropDownWrapUp').attr('disabled', false)
        }
    })

    // get wrap up list 
    $('#dropDownWrapUp').on('click', function () {
        window._finesse.getWrapUp(getCookie('_agentId'), function (_11, _12, data) {
            let response = JSON.parse(xml2json(data && data.responseText));
            if (response && response.WrapUpReasons && response.WrapUpReasons.WrapUpReason) {
                let listReason = response.WrapUpReasons.WrapUpReason
                $('#wrapList').html('')
                listReason.forEach(function (item) {
                    $('#wrapList').append(`<div class="liList col-md-12 m-t-10"> <input class="form-check-input col-md-1 checkWrapUp" type="radio" name="wrapUp" value="${item.label}">
                    <label class="form-check-label col-md-11" for="exampleRadios1">
                      ${item.label}
                    </label></div>`)
                })
                $("#myInput").on("keyup", function () {
                    var value = $(this).val().toLowerCase();
                    $("#wrapList label").filter(function () {
                        $(this).parent().toggle($(this).text().toLowerCase().indexOf(value) > -1)
                    });
                });
            } else {
            }
        })
    })
    // button apply wrap up
    $('#btn-apply').on('click', function (event) {

        var label = $("input[name='wrapUp']:checked").val();
        if (!event.detail || event.detail == 1) {//activate on first click only to avoid hiding again on multiple clicks
            window._finesse.getDialogs(getCookie('_agentId'), function (_11, _12, data) {
                let response = JSON.parse(xml2json(data && data.responseText));
                if (response && response.Dialogs && response.Dialogs.Dialog) {
                    console.log('response', response);

                    let dialog = response.Dialogs.Dialog;
                    window._finesse.wrapUp(dialog.id, label, function (_11, _12, data) {
                        console.log("Thanfh cong", data)
                        $('#dropDownWrapUp').addClass('btnActive')
                        $('#dropDownWrapUp').trigger('click')
                    })
                } else {

                }
            })
        }
    })
    // cancel wrap up reason
    $('#btn-cancel').on('click', function () {
        $('.checkWrapUp').each(function () {
            this.checked = false;
        });
        $('#dropDownWrapUp').trigger('click')
    })

    // search in dropdown wrap up
    $("#myInput").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#wrapList li").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });

});

