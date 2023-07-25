
var DFT = function ($) {

    var agents = [];
    var filter = {
        company: null,
        agent: null
    };
    var warning = {};

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // nút "THAY ĐỔI" - Email
        $(document).on('click', '#btn-warning-edit', function (e) {
            e.preventDefault();
            $("input[id^='input-mail-monitor-warning']").removeClass('disabled');
            $("#btn-warning-save").removeClass('disabled');

            $(this).addClass("hide");
            $('#btn-warning-save').removeClass("hide");
        });

        // nút "LƯU" - Email
        $(document).on('click', '#btn-warning-save', function (e) {
            e.preventDefault();

            warning = {
                idUser: user,
                thoiGianPhanHoiMail: Number($("#input-mail-monitor-warning-tgphm").val()),
                soLuongKyTuTrongMail: Number($("#input-mail-monitor-warning-slkttm").val()),
                soLuongAgentOffline: Number($("#input-mail-monitor-warning-slao").val())
            };

            _socket.emit("updateEmailMonitorWarning", warning);

            $("input[id^='input-mail-monitor-warning']").addClass('disabled');
            $("#btn-warning-save").addClass('disabled');

            updateAgents();

            $('#btn-warning-edit').removeClass("hide");
            $(this).addClass("hide");
        });

        // nút "Tìm kiếm"
        $(document).on('click', '#btn-search', function (e) {
            e.preventDefault();
            filter.company = $("#idCompany").val();
            filter.agent = $("#idAgent").val();
            $('#tbl-agent-monitor-detail').html('');

            updateAgents();
        });

        // bắt sự kiện click vào thẻ có cảnh báo quá số ký tự trong mail
        $(document).on('click', "tr[id^='agent-']", function (e) {
            e.preventDefault();
            if (!$(this).hasClass('warning-2')) return;

            _Ajax(newUrl('mail-monitor', {
                agent: $(this).attr('id').replace('agent-', ''),
                bodyLength: warning.soLuongKyTuTrongMail
            }).replace('#', '/'), 'GET', {}, function (str) {
                var _body = '';
                var resp = JSON.parse(str);
                if (resp.code != 200) _body = "Đã có lỗi xảy ra";
                else {
                    _body = '<table class="table f-10" id="tbl-agent-monitor">' +
                        '<thead>' +
                        '<tr>' +
                        '<th class="bgm-orange c-white text-center text-uppercase">Người gửi</th>' +
                        '<th class="bgm-orange c-white text-center text-uppercase">Người nhận</th>' +
                        '<th class="bgm-orange c-white text-center text-uppercase">Tiêu đề</th>' +
                        '<th class="bgm-orange c-white text-center text-uppercase">Nội dung</th>' +
                        '<th class="bgm-orange c-white text-center text-uppercase">ID</th>' +
                        '</tr>' +
                        '</thead>' +
                        '<tbody>';

                    _.each(resp.message, function (el) {
                        _body += '<tr class="text-center" id=' + el._id + '>';
                        _body += '<td alt="' + el.from + '" title="' + el.from + '">' + el.from + '</td>';
                        _body += '<td alt="' + el.to + '" title="' + el.to + '">' + el.to + '</td>';
                        _body += '<td alt="' + el.subject + '" title="' + el.subject + '">' + el.subject + '</td>';
                        _body += '<td alt="' + el.body + '" title="' + el.body + '">' + el.body + '</td>';
                        _body += '<td alt="' + el._id + '" title="' + el._id + '">' + el._id + '</td>';
                        _body += '</tr>';
                    });

                    _body += '</tbody></table>';
                }

                $('#warning-detail-body').html(_body);
            });
            $('#warning-detail').modal('toggle');
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
            var _items = [];
            if (_.isEmpty($(this).val())) {
                delete filter['company'];
                _items = _agents;
            } else {
                var value = $(this).val();
                filter['company'] = value;

                _items = _.filter(_agents, function (el) {
                    var pass = 0;
                    _.each(value, function (el2) {
                        if (!!el.idCompany && el.idCompany.indexOf(el2) >= 0) pass = 1;
                    });
                    return !!pass;
                });
            }

            $('#idAgent').empty();
            delete filter['agent'];
            _.each(_items, function (el) {
                $('#idAgent').append('<option value=' + el._id + '>' + el.displayName + '</option>');
            });
            $('#idAgent').selectpicker('refresh');
        });
    };

    var bindSocket = function (client) {
        // Nhận dữ liệu monitor khi có thay đổi từ server
        client.on('MailMonitor', function (data) {
            console.log(data);
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
            if (!!filter.agent) isPass2 = filter.agent.indexOf(el._id) >= 0 ? 1 : 0;

            return !!isPass1 && !!isPass2;
        });


        // gộp dữ liệu của 1 agent làm việc ở nhiều công ty 
        filerArr = _.chain(filerArr).reduce(function (memo, el) {

            if (!memo[el._id]) {
                memo[el._id] = _.clone(el);
                return memo;
            }

            memo[el._id].idUser = el._id;

            memo[el._id].slEMailNhan += el.slEMailNhan;
            memo[el._id].slEmailGuiDi += el.slEmailGuiDi;
            memo[el._id].slEmailChuaXuLy += el.slEmailChuaXuLy;
            memo[el._id].slEmailDangXuLy += el.slEmailDangXuLy;
            memo[el._id].slEmailTraLoi += el.slEmailTraLoi;
            memo[el._id].thoiGianPhanHoiMail += el.thoiGianPhanHoiMail;
            memo[el._id].slKyTuTrongMail = el.slKyTuTrongMail > memo[el._id].slKyTuTrongMail ? el.slKyTuTrongMail : memo[el._id].slKyTuTrongMail;
            return memo;

        }, {}).value();


        var total = {
            slAgentOnline: 0,
            slAgentOffline: 0,
            slAgentDangXuLyMail: 0,
            slEMailNhan: 0,
            slEmailGuiDi: 0,
            slEmailDangXuLy: 0,
            slEmailTraLoi: 0
        };

        // tính toán dữ liệu báo cáo tổng hợp
        _.each(filerArr, function (el) {
            total.slAgentOnline += !!el.isOnline && !!el._id ? 1 : 0;
            total.slAgentOffline += !!el.isOnline ? 0 : (!!el._id ? 1 : 0);
            total.slAgentDangXuLyMail += el.isTuongTac == 1 ? 1 : 0;
            total.slEMailNhan += el.slEMailNhan;
            total.slEmailGuiDi += el.slEmailGuiDi;
            total.slEmailDangXuLy += el.slEmailDangXuLy;
            total.slEmailTraLoi += el.slEmailTraLoi;

            if (!el._id) return;

            if (!!$('#thoi-gian-phan-hoi-mail-' + el._id).length) return updateAgent(el);
            addAgent(el);
        });

        $('#sl-agent-online').html(total.slAgentOnline);
        $('#sl-agent-online').attr('title', total.slAgentOnline);

        $('#sl-agent-offline').html(total.slAgentOffline);
        $('#sl-agent-offline').attr('title', total.slAgentOffline);

        $('#sl-agent-dang-xu-ly-mail').html(total.slAgentDangXuLyMail);
        $('#sl-agent-dang-xu-ly-mail').attr('title', total.slAgentDangXuLyMail);

        $('#sl-email-nhan').html(total.slEMailNhan);
        $('#sl-email-nhan').attr('title', total.slEMailNhan);

        $('#sl-email-gui-di').html(total.slEmailGuiDi);
        $('#sl-email-gui-di').attr('title', total.slEmailGuiDi);

        $('#sl-email-dang-xu-ly').html(total.slEmailDangXuLy);
        $('#sl-email-dang-xu-ly').attr('title', total.slEmailDangXuLy);

        $('#ti-le-phuc-vu').html(tilephucvu(total.slEmailTraLoi, total.slEMailNhan));
        $('#ti-le-phuc-vu').attr('title', tilephucvu(total.slEmailTraLoi, total.slEMailNhan));

        warningAll(total);
    }

    var updateAgent = function (agent) {
        var _id = agent._id;

        $('#thoi-gian-phan-hoi-mail-' + _id).html(hms(agent.thoiGianPhanHoiMail / agent.slEmailTraLoi));
        $('#sl-email-nhan-' + _id).html(agent.slEMailNhan);
        $('#sl-email-gui-di-' + _id).html(agent.slEmailGuiDi);
        $('#sl-email-chua-xu-ly-' + _id).html(agent.slEmailChuaXuLy);
        $('#sl-email-dang-xu-ly-' + _id).html(agent.slEmailDangXuLy);
        $('#ti-le-phuc-vu-' + _id).html(tilephucvu(agent.slEmailTraLoi, agent.slEMailNhan));
        $('#display-name-' + _id).html('<b>' + agent.displayName + (!!agent.isOnline ? " (Online)" : "") + '</b>');

        warningAgent(agent);
    }

    var addAgent = function (agent) {
        $('#tbl-agent-monitor-detail').append(
            '<tr class="text-center filter ' + (agent.isOnline ? '' : 'offline') + '" id="agent-' + agent._id + '">' +
            '<td id="display-name-' + agent._id + '"><b>' + agent.displayName + (!!agent.isOnline ? " (Online)" : "") + '</b></td>' +
            '<td id="thoi-gian-phan-hoi-mail-' + agent._id + '">' + hms(agent.thoiGianPhanHoiMail / agent.slEmailTraLoi) + '</td>' +
            '<td id="sl-email-nhan-' + agent._id + '">' + agent.slEMailNhan + '</td>' +
            '<td id="sl-email-gui-di-' + agent._id + '">' + agent.slEmailGuiDi + '</td>' +
            '<td id="sl-email-chua-xu-ly-' + agent._id + '">' + agent.slEmailChuaXuLy + '</td>' +
            '<td id="sl-email-dang-xu-ly-' + agent._id + '">' + agent.slEmailDangXuLy + '</td>' +
            '<td id="ti-le-phuc-vu-' + agent._id + '">' + tilephucvu(agent.slEmailTraLoi, agent.slEMailNhan) + '</td>' +
            '</tr>'
        );

        warningAgent(agent);
    }

    function warningAgent(agent) {
        var thoiGianPhanHoiMail = (agent.thoiGianPhanHoiMail / agent.slEmailTraLoi) / (1000 * 60);

        if (thoiGianPhanHoiMail >= warning.thoiGianPhanHoiMail) $('#thoi-gian-phan-hoi-mail-' + agent._id).addClass('warning-1')
        else $('#thoi-gian-phan-hoi-mail-' + agent._id).removeClass('warning-1');
        if (agent.slKyTuTrongMail >= warning.soLuongKyTuTrongMail) $('#agent-' + agent._id).addClass('warning-2')
        else $('#agent-' + agent._id).removeClass('warning-2');
    }

    function warningAll(data) {
        if (data.slAgentOffline >= warning.soLuongAgentOffline) $('#sl-agent-offline').addClass('warning-3')
        else $('#sl-agent-offline').removeClass('warning-3');
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
            $(document).off('click', '#btn-warning-edit');
            $(document).off('click', '#btn-warning-save');
            $(document).off('click', '#btn-search');
            $(document).off('click', "tr[id^='agent-']");
            $(document).off('change', '#idCompany');
        }
    };
}(jQuery);

