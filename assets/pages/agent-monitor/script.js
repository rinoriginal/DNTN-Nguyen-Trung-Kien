var DFT = function ($) {

    var _previousVoiceStatus = {};

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // nút "THAY ĐỔI" - Email
        $(document).on('click', '#btn-mail-setting-edit', function (e) {
            e.preventDefault();
            $("input[id^='input-mail-setting']").removeClass('disabled');
            $("#btn-mail-setting-save").removeClass('disabled');
            console.log('enabled');
        });

        $(document).on('click', '#btn-chat-setting-edit', function (e) {
            e.preventDefault();
            $("input[id^='input-chat-setting']").removeClass('disabled');
            $("#btn-chat-setting-save").removeClass('disabled');
            console.log('chat setting enabled');
        });

        $(document).on('click', '#btn-voice-setting-edit', function (e) {
            e.preventDefault();
            $("input[id^='input-voice-setting']").removeClass('disabled');
            $("#btn-voice-setting-save").removeClass('disabled');
            console.log('voice setting enabled');
        });

        // nút "LƯU" - Email
        $(document).on('click', '#btn-mail-setting-save', function (e) {
            e.preventDefault();

            _socket.emit("updateEmailSetting", {
                agent: $("#input-mail-setting-agent").val(),
                online: $("#input-mail-setting-online").val(),
                offline: $("#input-mail-setting-offline").val()
            });

            $("input[id^='input-mail-setting']").addClass('disabled');
            $("#btn-mail-setting-save").addClass('disabled');

        });

        $(document).on('click', '#btn-chat-setting-save', function (e) {
            e.preventDefault();

            _socket.emit("updateChatSetting", {
                agent: $("#input-chat-setting-agent").val(),
                online: $("#input-chat-setting-online").val(),
                offline: $("#input-chat-setting-offline").val()
            })

            $("input[id^='input-chat-setting']").addClass('disabled');
            $("#btn-chat-setting-save").addClass('disabled');

        });

        $(document).on('click', '#btn-voice-setting-save', function (e) {
            e.preventDefault();

            _socket.emit("updateVoiceSetting", {
                agent: $("#input-voice-setting-agent").val(),
                san_sang_phuc_vu: $("#input-voice-setting-san_sang_phuc_vu").val(),
                khong_san_sang_phuc_vu: $("#input-voice-setting-khong_san_sang_phuc_vu").val(),
                nghi_trua: $("#input-voice-setting-nghi_trua").val(),
                meeting: $("#input-voice-setting-meeting").val(),
                autodialing: $("#input-voice-setting-autodialing").val()
            })

            $("input[id^='input-voice-setting']").addClass('disabled');
            $("#btn-voice-setting-save").addClass('disabled');

        });
    };

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

    };

    /**
     * Bắt sự kiện dropdown
     */
    var bindChange = function () {
        // Chọn dropdown Email
        $(document).on('change', 'select[name=mail-status]', function () {
            var v = +$(this).val();
            // Kiểm tra và đổi trạng thái + màu
            switch (v) {
                case 0:
                    $(this).closest("td").addClass("offline");
                    break;
                case 1:
                    $(this).closest("td").removeClass("offline");
                    break;
            }

            // Xoá vi phạm
            $(this).closest("td").next().removeClass("c-red");
            // Gửi lên server
            _socket.emit("changeEmailStatus", {
                id: $(this).closest("tr").attr("id"),
                value: v
            });
        });

        // Chọn dropdown Chat
        $(document).on('change', 'select[name=chat-status]', function () {
            var v = +$(this).val();
            // Kiểm tra và đổi trạng thái + màu
            switch (v) {
                case 0:
                    $(this).closest("td").addClass("offline");
                    break;
                case 1:
                    $(this).closest("td").removeClass("offline");
                    break;
            }

            // Xoá vi phạm
            $(this).closest("td").next().removeClass("c-red");
            // Gửi lên server
            _socket.emit("changeChatStatus", {
                id: $(this).closest("tr").attr("id"),
                value: v
            });
        });

        // Chọn dropdown Voice

        $(document).on('change', 'select[name=voice-status]', function () {
            var v = +$(this).val();
            var _userId = $(this).attr('id').replace('v-s-', '');
            if (!v) {
                $(this).val(_previousVoiceStatus[_userId]);
                $(this).selectpicker('refresh');
                return;
            }

            _previousVoiceStatus[_userId] = v;

            _socket.emit('ChangeAgentStatus', {
                changeBy: user,
                user: _userId,
                status: v,
                sid: _socket.id
            });
        });


    };

    var getVoiceStatusThreshold = function (statusCode) {
        switch (statusCode) {
            case 1:
                return $("#input-voice-setting-san_sang_phuc_vu").val() * 60;
                break;
            case 2:
                return $("#input-voice-setting-khong_san_sang_phuc_vu").val() * 60;
                break;
            case 3:
                return $("#input-voice-setting-nghi_trua").val() * 60;
                break;
            case 21:
                return $("#input-voice-setting-autodialing").val() * 60;
                break;
        }
    };

    return {
        init: function () {
            bindClick();
            bindSubmit();
            bindChange();

            $("select[id^='v-s']").each(function (i, e) {
                var v = $(e).val();
                if(!v) return;
                var _userId = $(e).attr('id').replace('v-s-', '');
                _previousVoiceStatus[_userId] = Number(v);
            });

            setInterval(function () {
                var online = +$('#input-mail-setting-online').val();
                var offline = +$('#input-mail-setting-offline').val();
                $("td[id^='m-t']").each(function (i, e) {
                    var _time = $(e).attr('time');
                    var _status = $(e).closest("tr").hasClass("offline") ? 0 : 1;
                    var _mailStatus = $(e).closest("td").prev().hasClass("offline") ? 0 : 1;

                    if (typeof _time !== typeof undefined && _time !== false && +_time > 0 && _status === 1) {
                        $(e).html(moment.unix(moment().unix() - +_time).format('mm:ss'));
                        // kiểm tra
                        moment().unix() - +_time > (_mailStatus ? online : offline) * 60 ? $(e).addClass("c-red") : $(e).removeClass("c-red");
                    }
                });
            }, 1000);

            setInterval(function () {
                var online = +$('#input-chat-setting-online').val();
                var offline = +$('#input-chat-setting-offline').val();
                $("td[id^='c-t']").each(function (i, e) {
                    var _time = $(e).attr('time');
                    var _status = $(e).closest("tr").hasClass("offline") ? 0 : 1;
                    var _chatStatus = $(e).closest("td").prev().hasClass("offline") ? 0 : 1;

                    if (typeof _time !== typeof undefined && _time !== false && +_time > 0 && _status === 1) {
                        $(e).html(moment.unix(moment().unix() - +_time).format('mm:ss'));
                        // kiểm tra
                        moment().unix() - +_time > (_chatStatus ? online : offline) * 60 ? $(e).addClass("c-red") : $(e).removeClass("c-red");
                    }
                });
            }, 1000);

            setInterval(function () {
                var _notAvailableAgentThreshold = +$('#input-voice-setting-agent').val();
                var _curNotAvailableAgent = 0;

                $("td[id^='v-t']").each(function (i, e) {
                    var _time = $(e).attr('time');
                    var _onlineStatus = $(e).closest("tr").hasClass("offline") ? 0 : 1;
                    var _userId = $(e).attr('id').replace('v-t-', '');
                    var _status = $("#v-s-" + _userId).val();

                    if (typeof _time !== typeof undefined && _time !== false && +_time > 0 && _onlineStatus === 1) {
                        $(e).html(moment.unix(moment().unix() - +_time).format('mm:ss'));
                        // kiểm tra
                        var _statusThreshold = getVoiceStatusThreshold(Number(_status));
                        var statusTime = moment().unix() - +_time;
                        !!_statusThreshold && statusTime > _statusThreshold ? $(e).addClass("c-red") : $(e).removeClass("c-red");

                        if (_status.toString().substr(0, 1) == "2") _curNotAvailableAgent++;
                    }
                });

                _curNotAvailableAgent >= _notAvailableAgentThreshold ? $('#input-voice-setting-agent').closest("tr").addClass("c-red") : $('#input-voice-setting-agent').closest("tr").removeClass("c-red");
            }, 1000);
        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '#btn-mail-setting-edit');
            $(document).off('click', '#btn-mail-setting-save');
            $(document).off('change', 'select[name=mail-status]');
            $(document).off('click', '#btn-chat-setting-edit');
            $(document).off('click', '#btn-chat-setting-save');
            $(document).off('change', 'select[name=chat-status]');
        }
    };
}(jQuery);