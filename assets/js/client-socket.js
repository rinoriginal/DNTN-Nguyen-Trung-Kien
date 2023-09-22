String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
}

var DFTSOCKET = function ($) {
    function logout(msg) {
        $.get('/logout', function (data) {
            window.onbeforeunload = null;
            alert(msg);
            history.replaceState({}, document.title, "/");
            window._finesse = null;
            setCookie('_username', null);
            setCookie('_password', null);
            setCookie('_extension', null);
            setCookie('_agentId', null);
            window.location.reload();
        });
    }

    function retryConnectOnFailure() {
        if (window._socket) {
            $.get('/ping', function (result) {
                if (result.userId && result.userId == window.user) {
                    // to do fix
                    window._socket.connect();
                } else {
                    // User session is out of date ?????
                    logout('Hệ thống phát hiện bạn đã đăng xuất, vui lòng đăng nhập lại!');
                }
            });
        }
    }

    return {
        init: function (socket) {
            socket.on('LogOutUser', function (data) {
                logout("Bạn bị chiếm quyền đăng nhập !");
            });

            socket.on('IncommingCall', function (data) {
                console.log('cuoc call den', data);
                VoiceContainer.open(data.id, data.title);
            });

            socket.on('IncommingCallOut', function (data) {
                console.log('IncommingCallOut ', data);
                swal({
                    title: 'Gọi ra thành công',
                    text: ''
                });
            });

            socket.on('MakeCallRes', function (data) {
                swal({
                    title: 'Gọi ra thất bại',
                    text: data.resultExp
                });
            });

            socket.on('DisconnectByLeader', function (data) {
                swal({
                    title: 'Kết thúc cuộc gọi',
                    text: 'Ngắt kết nối bởi quản trị viên'
                });
            });


            socket.on('AccountIsUse', function () {
                console.log("this is multi tab")
            });

            socket.on('disconnect', function () {
                retryConnectOnFailure();
            });

            // cuonngm
            socket.on('agentOnline', function (data) {
                if (window.location.hash === "#agent-monitor") {

                    // m-s : mail status
                    // m-t : mail time
                    $("tr#" + data._id).removeClass("offline");
                    $("tr#" + data._id + " #m-s-" + data._id).val(data.emailStatus.status);
                    if (data.emailStatus.status == 1) {
                        $("tr#" + data._id + " #m-s-" + data._id).closest("td").removeClass("offline");
                        $("tr#" + data._id + " #m-t-" + data._id).attr("time", data.emailStatus.statusChange);
                    }


                    // c-s : chat status
                    // c-t : chat time
                    $("tr#" + data._id + " #c-s-" + data._id).val(data.chatStatus.status);
                    if (data.chatStatus.status == 1) {
                        $("tr#" + data._id + " #c-s-" + data._id).closest("td").removeClass("offline");
                        $("tr#" + data._id + " #c-t-" + data._id).html(moment.unix(moment().unix() - data.chatStatus.statusChange).format('mm:ss'));
                    }
                    $("tr#" + data._id + " #c-s-" + data._id).selectpicker('refresh');


                    // c-s : voice status
                    // c-t : voice time
                    $("tr#" + data._id).removeClass("offline");
                    $("tr#" + data._id + " #v-s-" + data._id).val(data.voiceStatus ? data.voiceStatus.status : '');
                    $("tr#" + data._id + " #v-s-" + data._id).selectpicker('refresh');
                    $("#v-t-" + data.id).attr("time", data.statusChange);

                }
            });

            socket.on('agentOffline', function (id) {
                if (window.location.hash === "#agent-monitor") {
                    $("tr#" + id).addClass("offline");

                    // m-s : mail status
                    // m-t : mail time
                    $("tr#" + id + " #m-s-" + id).val(1).closest("td").addClass("offline");
                    $("tr#" + id + " #m-t-" + id).attr("time", 0).addClass("offline").html("");

                    // c-s : chat status
                    // c-t : chat time
                    $("tr#" + id + " #c-s-" + id).val(1).closest("td").addClass("offline");
                    $("tr#" + id + " #c-t-" + id).attr("time", 0).addClass("offline").html("");
                    $("tr#" + id + " #c-s-" + id).selectpicker('refresh');

                    // v-s : voice status
                    // v-t : voice time
                    $("tr#" + id + " #v-s-" + id).val("");
                    $("tr#" + id + " #v-t-" + id).attr("time", 0).html("");
                    $("tr#" + id + " #v-s-" + id).selectpicker('refresh');
                }
            });

            socket.on('agentChangeMailStatus', function (data) {
                if (window.location.hash === "#agent-monitor") {
                    switch (data.status) {
                        case 0:
                            $("#m-s-" + data.id).closest("td").addClass("offline");
                            break;
                        case 1:
                            $("#m-s-" + data.id).closest("td").removeClass("offline");
                            break;
                    }
                    $("#m-t-" + data.id).attr("time", moment().unix());
                }
                if (data.id === window.user) $("#tw-switch").prop("checked", Boolean(data.status));
            });

            socket.on('agentChangeChatStatus', function (data) {
                if (window.location.hash === "#agent-monitor") {
                    switch (data.status) {
                        case 0:
                            $("#c-s-" + data.id).closest("td").addClass("offline");
                            $("#c-s-" + data.id).val(0);
                            $("#c-s-" + data.id).selectpicker('refresh');
                            break;
                        case 1:
                            $("#c-s-" + data.id).closest("td").removeClass("offline");
                            $("#c-s-" + data.id).val(1);
                            $("#c-s-" + data.id).selectpicker('refresh');
                            break;
                    }
                    $("#c-t-" + data.id).attr("time", moment().unix());
                }

                if (!!data && data.id == user) {
                    var htmlText = '<i class="zmdi zmdi-account m-r-5"></i>' + "Offline" + ' <span class="caret"></span>';
                    if (data.status == 1) {
                        htmlText = '<i class="zmdi c-green zmdi-account m-r-5"></i>' + "Sẵn sàng phục vụ" + ' <span class="caret"></span>';
                    }
                    $(('#chat-status-info')).html(htmlText);
                }
            });

            socket.on('agentChangeVoiceStatus', function (data) {
                if (window.location.hash === "#agent-monitor") {
                    $("#v-s-" + data.id).val(data.status);
                    $("#v-s-" + data.id).selectpicker('refresh');
                    $("#v-t-" + data.id).attr("time", data.statusChange);
                }
            });
        }
    };
}(jQuery);