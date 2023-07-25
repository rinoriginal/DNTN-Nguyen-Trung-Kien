
var DFT = function ($) {

    var voiceCampaignAgents = [];
    var voiceServiceAgents = [];
    var chatServiceAgents = [];
    var mailServiceAgents = [];



    var filter = {
        company: null,
        voiceCampaign: null,
        voiceService: null,
        chatService: null,
        mailService: null
    };

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {

        // nút "Tìm kiếm"
        $(document).on('click', '#btn-search', function (e) {
            e.preventDefault();

            filter.company = $("#idCompany").val();
            filter.voiceCampaign = $("#idVoiceCampaign").val();
            filter.voiceService = $("#idVoiceService").val();
            filter.chatService = $("#idChatService").val();
            filter.mailService = $("#idMailService").val();

            $('#total-tab').html('');

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
            var __voiceCampaigns = [];
            var __voiceServices = [];
            var __chatServices = [];
            var __mailServices = [];

            if (_.isEmpty($(this).val())) {
                delete filter['company'];
                __voiceCampaigns = _voiceCampaigns;
                __voiceServices = _voiceServices;
                __chatServices = _chatServices;
                __mailServices = _mailServices;
            } else {
                var value = $(this).val();
                filter['company'] = value;

                __voiceCampaigns = _.filter(_voiceCampaigns, function (el) {
                    return value.indexOf(el.idCompany) >= 0;
                });

                __voiceServices = _.filter(_voiceServices, function (el) {
                    return value.indexOf(el.idCompany) >= 0;
                });

                __chatServices = _.filter(_chatServices, function (el) {
                    var idCompany = !!el.channel ? el.channel.idCompany : null;
                    return !!idCompany && value.indexOf(idCompany) >= 0;
                });

                __mailServices = _.filter(_mailServices, function (el) {
                    return value.indexOf(el.idCompany) >= 0;
                });
            }

            $('#idVoiceCampaign').empty();
            delete filter['voiceCampaign'];
            _.each(__voiceCampaigns, function (el) {
                $('#idVoiceCampaign').append('<option value=' + el._id + '>' + el.name + '</option>');
            });
            $('#idVoiceCampaign').selectpicker('refresh');

            $('#idVoiceService').empty();
            delete filter['voiceService'];
            _.each(__voiceServices, function (el) {
                $('#idVoiceService').append('<option value=' + el._id + '>' + el.name + '</option>');
            });
            $('#idVoiceService').selectpicker('refresh');

            $('#idChatService').empty();
            delete filter['chatService'];
            _.each(__chatServices, function (el) {
                $('#idChatService').append('<option value=' + el._id + '>' + el.name + '</option>');
            });
            $('#idChatService').selectpicker('refresh');

            $('#idMailService').empty();
            delete filter['mailService'];
            _.each(__mailServices, function (el) {
                $('#idMailService').append('<option value=' + el._id + '>' + el.name + '</option>');
            });
            $('#idMailService').selectpicker('refresh');
        });
    };

    var bindSocket = function (client) {
        // Nhận dữ liệu monitor khi có thay đổi từ server
        client.on('VoiceMonitor', function (data) {
            voiceCampaignAgents = data.campaigns;
            voiceServiceAgents = data.services;
            updateAgents();
        });

        client.on('ChatMonitor', function (data) {
            chatServiceAgents = data;
            updateAgents();
        });

        client.on('MailMonitor', function (data) {
            mailServiceAgents = data;
            updateAgents();
        });
    }

    var updateAgents = function () {
        var voiceCampaignArr = [];
        var voiceServiceArr = [];
        var chatServiceArr = [];
        var mailServiceArr = [];
        var voiceArr = {};
        var chatArr = {};
        var mailArr = {};
        var totalArr = {};
        var tabArr = {
            slAgentVoiceOnline: 0,
            slAgentVoiceOffline: 0,
            slAgentDangVoice: 0,
            slCuocGoi: 0,
            slCuocGoiDangPhucVu: 0,
            slCuocGoiBiNho: 0,
            tiLePhucVuVoice: 0,

            slAgentChatOnline: 0,
            slAgentChatOffline: 0,
            slAgentDangChat: 0,
            slChatThoiDiemHienTai: 0,
            slChatChoPhucVu: 0,
            slChatDangPhucVu: 0,
            slChatDaPhucVu: 0,
            slChatNho: 0,
            slChat: 0,
            slMessage: 0,
            tiLePhucVuChat: 0,

            slAgentMailOnline: 0,
            slAgentMailOffline: 0,
            slAgentDangXuLyMail: 0,
            slEMailNhan: 0,
            slEmailGuiDi: 0,
            slEmailDangXuLy: 0,
            slEmailTraLoi: 0,
            tiLePhucVuMail: 0,
        };

        // lọc kết quả khi lọc voice campaign
        voiceCampaignArr = _.filter(voiceCampaignAgents, function (el) {
            if (!!filter.company && filter.company.indexOf(el.idCompany) < 0) return false;
            if (!filter.voiceCampaign && !filter.voiceService && !filter.chatService && !filter.mailService) return true;
            if (!filter.voiceCampaign) return false;

            return filter.voiceCampaign.indexOf(el.idCampaign) >= 0;
        });

        // lọc kết quả khi lọc voice service
        voiceServiceArr = _.filter(voiceServiceAgents, function (el) {
            if (!!filter.company && filter.company.indexOf(el.idCompany) < 0) return false;
            if (!filter.voiceCampaign && !filter.voiceService && !filter.chatService && !filter.mailService) return true;
            if (!filter.voiceService) return false;

            return filter.voiceService.indexOf(el.idService) >= 0;
        });

        // lọc kết quả khi lọc chat service
        chatServiceArr = _.filter(chatServiceAgents, function (el) {
            if (!!filter.company && filter.company.indexOf(el.idCompany) < 0) return false;
            if (!filter.voiceCampaign && !filter.voiceService && !filter.chatService && !filter.mailService) return true;
            if (!filter.chatService) return false;

            return filter.chatService.indexOf(el.idServiceChat) >= 0;
        });

        // lọc kết quả khi lọc mail service
        mailServiceArr = _.filter(mailServiceAgents, function (el) {
            if (!!filter.company && filter.company.indexOf(el.idCompany) < 0) return false;
            if (!filter.voiceCampaign && !filter.voiceService && !filter.chatService && !filter.mailService) return true;
            if (!filter.mailService) return false;

            return filter.mailService.indexOf(el.idService) >= 0;
        });

        // kết xuất dữ liệu danh sách thông tin theo chiến dịch mail
        _.each(mailServiceArr, function (el) {
            var _id = el.idService;
            if (!_id) return;
            if (!totalArr[_id]) {
                var name = "";
                var company = "";
                _.each(_mailServices, function (el2) {
                    if (_id == el2._id) name = el2.name;
                });
                _.each(_companies, function (el2) {
                    if (el.idCompany == el2._id) company = el2.name;
                });

                totalArr[_id] = {
                    _id: _id,
                    mailService: _id,
                    idCompany: el.idCompany,
                    slAgentMailOnline: 0,
                    slAgentMailOffline: 0,
                    name: name,
                    company: company
                };
            }

            totalArr[_id].slAgentMailOnline += el.isOnline == 1 ? 1 : 0;
            totalArr[_id].slAgentMailOffline += el.isOnline == 1 ? 0 : 1;
        });

        // kết xuất dữ liệu danh sách thông tin theo chiến dịch chat
        _.each(chatServiceArr, function (el) {
            var _id = el.idServiceChat;
            if (!_id) return;
            if (!totalArr[_id]) {
                var name = "";
                var company = "";
                _.each(_chatServices, function (el2) {
                    if (_id == el2._id) name = el2.name;
                });
                _.each(_companies, function (el2) {
                    if (el.idCompany == el2._id) company = el2.name;
                });

                totalArr[_id] = {
                    _id: _id,
                    chatService: _id,
                    idCompany: el.idCompany,
                    slAgentChatOnline: 0,
                    slAgentChatOffline: 0,
                    name: name,
                    company: company
                };
            }

            totalArr[_id].slAgentChatOnline += el.isOnline == 1 ? 1 : 0;
            totalArr[_id].slAgentChatOffline += el.isOnline == 1 ? 0 : 1;
        });

        // kết xuất dữ liệu danh sách thông tin theo chiến dịch voice gọi ra
        _.each(voiceCampaignArr, function (el) {
            var _id = el.idCampaign;
            if (!_id) return;
            if (!totalArr[_id]) {
                var name = "";
                var company = "";

                _.each(_voiceCampaigns, function (el2) {
                    if (_id == el2._id) name = el2.name;
                });
                _.each(_companies, function (el2) {
                    if (el.idCompany == el2._id) company = el2.name;
                });

                totalArr[_id] = {
                    _id: _id,
                    voiceCampaign: _id,
                    idCompany: el.idCompany,
                    slAgentVoiceOnline: 0,
                    slAgentVoiceOffline: 0,
                    name: name,
                    company: company
                };
            }

            totalArr[_id].slAgentVoiceOnline += el.isOnline == 1 ? 1 : 0;
            totalArr[_id].slAgentVoiceOffline += el.isOnline == 1 ? 0 : 1;
        });

        // kết xuất dữ liệu danh sách thông tin theo chiến dịch voice gọi vào
        _.each(voiceServiceArr, function (el) {
            var _id = el.idService;
            if (!_id) return;
            if (!totalArr[_id]) {
                var name = "";
                var company = "";
                _.each(_voiceServices, function (el2) {
                    if (_id == el2._id) name = el2.name;
                });
                _.each(_companies, function (el2) {
                    if (el.idCompany == el2._id) company = el2.name;
                });

                totalArr[_id] = {
                    _id: _id,
                    voiceService: _id,
                    idCompany: el.idCompany,
                    slAgentVoiceOnline: 0,
                    slAgentVoiceOffline: 0,
                    name: name,
                    company: company
                };
            }

            totalArr[_id].slAgentVoiceOnline += el.isOnline == 1 ? 1 : 0;
            totalArr[_id].slAgentVoiceOffline += el.isOnline == 1 ? 0 : 1;
        });

        // đưa dữ liệu chi tiết chiến dịch lên màn hình 
        _.each(totalArr, function (el) {
            if (!!$('#main-chien-dich-' + el._id).length) return updateAgent(el);
            addAgent(el);
        });

        // nhóm dữ liệu mỗi agent voice
        voiceArr = _.chain([].concat(voiceCampaignArr, voiceServiceArr)).reduce(function (memo, el) {
            if (!memo[el._id]) {
                memo[el._id] = _.clone(el);
                memo[el._id].idUser = el._id;
                return memo;
            }

            memo[el._id].idUser = el._id;
            memo[el._id].slCuocGoi += el.slCuocGoi;
            memo[el._id].slCuocGoiBiNho += el.slCuocGoiBiNho;
            memo[el._id].isPhucVu += el.isPhucVu;
            return memo;

        }, {}).value();

        // nhóm dữ liệu mỗi agent chat
        chatArr = _.chain(chatServiceArr).reduce(function (memo, el) {
            if (!memo[el._id]) {
                memo[el._id] = _.clone(el);
                memo[el._id].idUser = el._id;
                return memo;
            }

            memo[el._id].idUser = el._id;
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

        // nhóm dữ liệu mỗi agent mail
        mailArr = _.chain(mailServiceArr).reduce(function (memo, el) {
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

        // kết xuất dữ liệu cho tab chat
        _.each(chatArr, function (el) {
            tabArr.slAgentChatOnline += !!el.isOnline ? 1 : 0;
            tabArr.slAgentChatOffline += !!el.isOnline ? 0 : 1;
            tabArr.slAgentDangChat += !!el.isChatting ? 1 : 0;
            tabArr.slChatThoiDiemHienTai += el.slChatTrongHeThong;
            tabArr.slChatChoPhucVu += el.slChatChoPhucVu;
            tabArr.slChatDangPhucVu += el.slChatDangPhucVu;
            tabArr.slChatDaPhucVu += el.slChatDaPhucVu;
            tabArr.slChatNho += el.slChatNho;
            tabArr.slChat += el.total;
            tabArr.slMessage += el.slMessage;

            if (!el._id) {
                tabArr.slChatNho += el.total;
                return;
            }
        });

        // kết xuất dữ liệu cho tab voice
        _.each(voiceArr, function (el) {
            tabArr.slAgentVoiceOnline += !!el.isOnline ? 1 : 0;
            tabArr.slAgentVoiceOffline += !!el.isOnline ? 0 : 1;
            tabArr.slAgentDangVoice += !!el.isVoice ? 1 : 0;
            tabArr.slCuocGoi += el.slCuocGoi;
            tabArr.slCuocGoiBiNho += el.slCuocGoiBiNho;
            tabArr.slCuocGoiDangPhucVu += !!el.isPhucVu ? 1 : 0;
        });

        // kết xuất dữ liệu cho tab mail
        _.each(mailArr, function (el) {
            tabArr.slAgentMailOnline += !!el.isOnline ? 1 : 0;
            tabArr.slAgentMailOffline += !!el.isOnline ? 0 : 1;
            tabArr.slAgentDangXuLyMail += !!el.isTuongTac ? 1 : 0;
            tabArr.slEMailNhan += el.slEMailNhan;
            tabArr.slEmailGuiDi += el.slEmailGuiDi;
            tabArr.slEmailDangXuLy += el.slEmailDangXuLy;
            tabArr.slEmailTraLoi += el.slEmailTraLoi;
        });

        $('#voice-sl-agent-online').html(tabArr.slAgentVoiceOnline);
        $('#voice-sl-agent-offline').html(tabArr.slAgentVoiceOffline);
        $('#voice-sl-agent-dang-voice').html(tabArr.slAgentDangVoice);
        $('#voice-sl-cuoc-goi-tinh-den-thoi-diem-hien-tai').html(tabArr.slCuocGoi);
        $('#voice-sl-cuoc-goi-dang-phuc-vu').html(tabArr.slCuocGoiDangPhucVu);
        $('#voice-sl-cuoc-goi-bi-nho').html(tabArr.slCuocGoiBiNho);
        $('#voice-ti-le-phuc-vu').html(tilephucvu((tabArr.slCuocGoi - tabArr.slCuocGoiBiNho), tabArr.slCuocGoi));

        $('#chat-sl-agent-online').html(tabArr.slAgentChatOnline);
        $('#chat-sl-agent-offline').html(tabArr.slAgentChatOffline);
        $('#chat-sl-agent-dang-chat').html(tabArr.slAgentDangChat);
        $('#chat-sl-chat-thoi-diem-hien-tai').html(tabArr.slChatThoiDiemHienTai);
        $('#chat-sl-chat-dang-cho-phuc-vu').html(tabArr.slChatChoPhucVu);
        $('#chat-sl-chat-dang-phuc-vu').html(tabArr.slChatDangPhucVu);
        $('#chat-sl-chat-bi-nho').html(tabArr.slChatNho);
        $('#chat-ti-le-phuc-vu').html(tilephucvu(tabArr.slChatDaPhucVu, tabArr.slChat));

        $('#mail-sl-agent-online').html(tabArr.slAgentMailOnline);
        $('#mail-sl-agent-offline').html(tabArr.slAgentMailOffline);
        $('#mail-sl-agent-dang-xu-ly-mail').html(tabArr.slAgentDangXuLyMail);
        $('#mail-sl-email-nhan').html(tabArr.slEMailNhan);
        $('#mail-sl-email-gui-di').html(tabArr.slEmailGuiDi);
        $('#mail-sl-email-dang-xu-ly').html(tabArr.slEmailDangXuLy);
        $('#mail-ti-le-phuc-vu').html(tilephucvu(tabArr.slEmailTraLoi, tabArr.slEMailNhan));

    }

    var updateAgent = function (data) {
        var _id = data._id;

        $('#main-chien-dich-' + _id).html(data.name);
        $('#main-cong-ty-' + _id).html(data.company);
        $('#main-sl-agent-voice-online-' + _id).html(!!data.slAgentVoiceOnline ? data.slAgentVoiceOnline : "0");
        $('#main-sl-agent-voice-offline-' + _id).html(!!data.slAgentVoiceOffline ? data.slAgentVoiceOffline : "0");
        $('#main-sl-agent-chat-online-' + _id).html(!!data.slAgentChatOnline ? data.slAgentChatOnline : "0");
        $('#main-sl-agent-chat-offline-' + _id).html(!!data.slAgentChatOffline ? data.slAgentChatOffline : "0");
        $('#main-sl-agent-mail-online-' + _id).html(!!data.slAgentMailOnline ? data.slAgentMailOnline : "0");
        $('#main-sl-agent-mail-offline-' + _id).html(!!data.slAgentMailOffline ? data.slAgentMailOffline : "0");
    }

    var addAgent = function (data) {
        $('#total-tab').append(
            '<tr class="text-center">' +
            '<td id="main-chien-dich-' + data._id + '">' + data.name + '</td>' +
            '<td id="main-cong-ty-' + data._id + '">' + data.company + '</td>' +
            '<td id="main-agent-voice-online-' + data._id + '">' + (!!data.slAgentVoiceOnline ? data.slAgentVoiceOnline : "0") + '</td>' +
            '<td id="main-agent-voice-offline-' + data._id + '">' + (!!data.slAgentVoiceOffline ? data.slAgentVoiceOffline : "0") + '</td>' +
            '<td id="main-agent-chat-online-' + data._id + '">' + (!!data.slAgentChatOnline ? data.slAgentChatOnline : "0") + '</td>' +
            '<td id="main-agent-chat-offline-' + data._id + '">' + (!!data.slAgentChatOffline ? data.slAgentChatOffline : "0") + '</td>' +
            '<td id="main-agent-mail-online-' + data._id + '">' + (!!data.slAgentMailOnline ? data.slAgentMailOnline : "0") + '</td>' +
            '<td id="main-agent-mail-offline-' + data._id + '">' + (!!data.slAgentMailOffline ? data.slAgentMailOffline : "0") + '</td>' +
            '</tr>'
        );
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
        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '#btn-chat-setting-edit');
            $(document).off('click', '#btn-chat-setting-save');
        }
    };
}(jQuery);

