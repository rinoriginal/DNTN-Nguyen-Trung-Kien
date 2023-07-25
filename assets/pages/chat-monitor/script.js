
var DFT = function ($) {

    var agents = [];
    var filter = {
        company: null,
        service: null
    };
    var warning = {};

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // nút "THAY ĐỔI" - Chat
        $(document).on('click', '#btn-warning-edit', function (e) {
            e.preventDefault();
            $("input[id^='input-chat-monitor-warning']").removeClass('disabled');
            $("#btn-warning-save").removeClass('disabled');
            $(this).addClass("hide");
            $('#btn-warning-save').removeClass("hide");
        });

        // nút "LƯU" - Chat
        $(document).on('click', '#btn-warning-save', function (e) {
            e.preventDefault();

            warning = {
                idUser: user,
                thoiGianChat: Number($("#input-chat-monitor-warning-tgc").val()),
                soLuongMessage: Number($("#input-chat-monitor-warning-slm").val()),
                soLuongAgentOffline: Number($("#input-chat-monitor-warning-slao").val()),
                soLuongTinNhanDoVaoHeThong: Number($("#input-chat-monitor-warning-sltndvht").val()),
                soLuongChatCho: Number($("#input-chat-monitor-warning-slcc").val()),
                tylePhucVu: Number($("#input-chat-monitor-warning-tlpv").val())
            };

            _socket.emit("updateChatMonitorWarning", warning);

            $("input[id^='input-chat-monitor-warning']").addClass('disabled');
            $("#btn-warning-save").addClass('disabled');

            updateAgents();

            $('#btn-warning-edit').removeClass("hide");
            $(this).addClass("hide");
        });

        // nút "Tìm kiếm"
        $(document).on('click', '#btn-search', function (e) {
            e.preventDefault();
            filter.company = $("#idCompany").val();
            filter.service = $("#idService").val();
            $('#tbl-chat-monitor-detail').html('');

            updateAgents();
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
        $(document).on('change', '#idCompany', function () {
            var _services = [];
            if (_.isEmpty($(this).val())) {
                delete filter['company'];
                _services = services;
            } else {
                var value = $(this).val();
                filter['company'] = value;

                _services = _.filter(services, function (el) {
                    var idCompany = !!el.channel ? el.channel.idCompany : null;
                    return !!idCompany && value.indexOf(idCompany) >= 0;
                });
            }

            $('#idService').empty();
            delete filter['service'];
            _.each(_services, function (el) {
                $('#idService').append('<option value=' + el._id + '>' + el.name + '</option>');
            });
            $('#idService').selectpicker('refresh');
        });
    };

    var bindSocket = function (client) {
        // Nhận dữ liệu monitor khi có thay đổi từ server
        client.on('ChatMonitor', function (data) {
            agents = data;
            updateAgents();
        });
    }

    var updateAgents = function () {
        var filerArr = [];

        // lọc kết quả khi chọn filter
        filerArr = _.filter(agents, function (el) {
            var isPass1 = 1;
            var isPass2 = 1;

            if (!!filter.company) isPass1 = filter.company.indexOf(el.idCompany) >= 0 ? 1 : 0;
            if (!!filter.service) isPass2 = filter.service.indexOf(el.idServiceChat) >= 0 ? 1 : 0;

            return !!isPass1 && !!isPass2;
        });

        // gộp dữ liệu của 1 agent làm việc ở nhiều công ty 
        filerArr = _.chain(filerArr).reduce(function (memo, el) {
            if (!memo[el._id]) {
                memo[el._id] = _.clone(el);
                memo[el._id].idUser = el._id;
                return memo;
            }

            memo[el._id].idUser = el._id;
            memo[el._id].isChatting += el.isChatting;
            memo[el._id].slChatTrongHeThong += el.slChatTrongHeThong;
            memo[el._id].slChatChoPhucVu += el.slChatChoPhucVu;
            memo[el._id].slChatDangPhucVu += el.slChatDangPhucVu;
            memo[el._id].slChatNho += el.slChatNho;
            memo[el._id].slChatDaPhucVu += el.slChatDaPhucVu;
            memo[el._id].total += el.total;
            memo[el._id].thoiGianChat += el.thoiGianChat;
            memo[el._id].slMessageMotPhienChat += el.slMessageMotPhienChat;
            memo[el._id].slMessage += el.slMessage;
            return memo;

        }, {}).value();




        var total = {
            slAgentOnline: 0,
            slAgentOffline: 0,
            slAgentDangChat: 0,
            slChatTrongHeThong: 0,
            slChatChoPhucVu: 0,
            slChatDaPhucVu: 0,
            slChatDangPhucVu: 0,
            slChatNho: 0,
            total: 0,
            slMessage: 0
        };

        filerArr = _.sortBy(filerArr, function (el) {
            return !el.isOnline;
        });

        // tính toán dữ liệu báo cáo tổng hợp
        _.each(filerArr, function (el) {
            total.slAgentOnline += !!el.isOnline && !!el._id ? 1 : 0;
            total.slAgentOffline += !!el.isOnline ? 0 : (!!el._id ? 1 : 0);
            total.slAgentDangChat += !!el.isChatting ? 1 : 0;
            total.slChatTrongHeThong += el.slChatTrongHeThong;
            total.slChatChoPhucVu += el.slChatChoPhucVu;
            total.slChatDangPhucVu += el.slChatDangPhucVu;
            total.slChatDaPhucVu += el.slChatDaPhucVu;
            total.slChatNho += el.slChatNho;
            total.total += el.total;
            total.slMessage += el.slMessage;

            if (!el._id) {
                total.slChatNho += el.total;
                return;
            }

            if (!!$('#thoi-gian-chat-' + el._id).length) return updateAgent(el);
            addAgent(el);
        });

        $('#sl-agent-online').html(total.slAgentOnline);
        $('#sl-agent-offline').html(total.slAgentOffline);
        $('#sl-agent-dang-chat').html(total.slAgentDangChat);
        $('#sl-chat-trong-he-thong').html(total.slChatTrongHeThong);
        $('#sl-chat-cho-phuc-vu').html(total.slChatChoPhucVu);
        $('#sl-chat-dang-phuc-vu').html(total.slChatDangPhucVu);
        $('#sl-chat-da-phuc-vu').html(total.slChatDaPhucVu);
        $('#sl-chat-bi-nho').html(total.slChatNho);
        $('#ti-le-phuc-vu').html(tilephucvu(total.slChatDaPhucVu, total.total));

        warningAll(total);
    }

    var updateAgent = function (agent) {
        var _id = agent._id;

        $('#thoi-gian-chat-' + _id).html(hms(agent.thoiGianChat));
        $('#display-name-' + _id).html('<b>' + agent.displayName + (!!agent.isOnline ? " (Online)" : "") + '</b>');
        $('#sl-message-' + _id).html(soLuongMessageTrungBinh(agent.slMessage, agent.total));

        warningAgent(agent);
    }

    var addAgent = function (agent) {
        $('#tbl-chat-monitor-detail').append(
            '<tr class="text-center filter ' + (agent.isOnline ? '' : 'offline') + '" id="agent-chat-' + agent._id + '">' +
            '<td id="display-name-' + agent._id + '"><b>' + agent.displayName + (!!agent.isOnline ? " (Online)" : "") + '</b></td>' +
            '<td id="thoi-gian-chat-' + agent._id + '">' + hms(agent.thoiGianChat) + '</td>' +
            '<td id="sl-message-' + agent._id + '">' + soLuongMessageTrungBinh(agent.slMessage, agent.total) + '</td>' +
            '</tr>'
        );

        warningAgent(agent);
    }

    function warningAgent(agent) {
        if (!!agent.total && (agent.slMessage / agent.total) >= warning.soLuongMessage) $('#sl-message-' + agent.idUser).addClass('warning-1')
        else $('#sl-message-' + agent.idUser).removeClass('warning-1');

        if (agent.thoiGianChat >= warning.thoiGianChat * 60 * 1000) $('#thoi-gian-chat-' + agent.idUser).addClass('warning-2')
        else $('#thoi-gian-chat-' + agent.idUser).removeClass('warning-2');
    }

    function warningAll(data) {
        if (data.slAgentOffline >= warning.soLuongAgentOffline) $('#sl-agent-offline').addClass('warning-3')
        else $('#sl-agent-offline').removeClass('warning-3');

        if (data.slChatTrongHeThong >= warning.soLuongTinNhanDoVaoHeThong) $('#sl-chat-trong-he-thong').addClass('warning-3')
        else $('#sl-chat-trong-he-thong').removeClass('warning-3');

        if (data.slChatChoPhucVu >= warning.soLuongChatCho) $('#sl-chat-cho-phuc-vu').addClass('warning-3')
        else $('#sl-chat-cho-phuc-vu').removeClass('warning-3');

        if (!!data.total && (100 * data.slChatDaPhucVu / data.total) < warning.tylePhucVu) $('#ti-le-phuc-vu').addClass('warning-3')
        else $('#ti-le-phuc-vu').removeClass('warning-3');

    }

    function pad(num) {
        return ("0" + num).slice(-2);
    }

    function hms(secs) {
        if (isNaN(secs)) return "00:00:00"
        var sec = Math.ceil(secs / 1000);
        var minutes = Math.floor(sec / 60);
        sec = sec % 60;
        var hours = Math.floor(minutes / 60)
        minutes = minutes % 60;
        return hours + ":" + pad(minutes) + ":" + pad(sec);
    }

    function soLuongMessageTrungBinh(messages, threads) {
        if (!threads) return "0.00";
        return (messages / threads).toFixed(2);
    }

    function tilephucvu(v1, v2) {
        if (!v2) return "0%";
        return (100 * v1 / v2).toFixed(2) + "%";
    }

    return {
        init: function () {
            bindClick();
            bindSubmit();
            bindChange();

            bindSocket(_socket);

            agents = _agents;
            warning = _settings;
            updateAgents();

        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '#btn-chat-setting-edit');
            $(document).off('click', '#btn-chat-setting-save');
            $(document).off('change', '#idCompany');
        }
    };
}(jQuery);

