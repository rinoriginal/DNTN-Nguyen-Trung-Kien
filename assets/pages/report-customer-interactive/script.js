var DFT = function ($) {

    var filter = {};

    var bindClick = function () {
        $(document).on('change', 'select[name=filter-company]', function () {

            var _voiceCampaigns = [];
            var _voiceServices = [];
            var _chatServices = [];
            var _mailServices = [];

            if (_.isEmpty($(this).val())) {
                delete filter['company'];
                _voiceCampaigns = voiceCampaigns;
                _voiceServices = voiceServices;
                _chatServices = chatServices;
                _mailServices = mailServices;

            } else {
                var value = $(this).val();
                filter['company'] = value;

                _voiceServices = _.filter(voiceServices, function (el) {
                    return el.idCompany == value;
                });

                _voiceCampaigns = _.filter(voiceCampaigns, function (el) {
                    return el.idCompany == value;
                });

                _chatServices = _.filter(chatServices, function (el) {
                    return el.idCompany == value;
                });

                _mailServices = _.filter(mailServices, function (el) {
                    return el.idCompany == value;
                });
            }


            $('select[name=filter-voice-campaign]').empty();
            delete filter['voice-campaign'];
            $('select[name=filter-voice-campaign]').append('<option value="">- Tất cả -</option>');
            _.each(_voiceCampaigns, function (g) {
                $('select[name=filter-voice-campaign]').append('<option value=' + g._id + '>' + g.name + '</option>');
            });
            $('select[name=filter-voice-campaign]').selectpicker('refresh');

            $('select[name=filter-voice-service]').empty();
            delete filter['voice-service'];
            $('select[name=filter-voice-service]').append('<option value="">- Tất cả -</option>');
            _.each(_voiceServices, function (g) {
                $('select[name=filter-voice-service]').append('<option value=' + g._id + '>' + g.name + '</option>');
            });
            $('select[name=filter-voice-service]').selectpicker('refresh');

            $('select[name=filter-chat-service]').empty();
            delete filter['chat-service'];
            $('select[name=filter-chat-service]').append('<option value="">- Tất cả -</option>');
            _.each(_chatServices, function (g) {
                $('select[name=filter-chat-service]').append('<option value=' + g._id + '>' + g.name + '</option>');
            });
            $('select[name=filter-chat-service]').selectpicker('refresh');

            $('select[name=filter-mail-service]').empty();
            delete filter['mail-service'];
            $('select[name=filter-mail-service]').append('<option value="">- Tất cả -</option>');
            _.each(_mailServices, function (g) {
                $('select[name=filter-mail-service]').append('<option value=' + g._id + '>' + g.name + '</option>');
            });
            $('select[name=filter-mail-service]').selectpicker('refresh');
        });

        $(document).on('change', 'select[name=filter-voice-campaign]', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['voice-campaign'];
                return;
            }

            filter['voice-campaign'] = $(this).val();
        });

        $(document).on('change', 'select[name=filter-voice-service]', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['voice-service'];
                return;
            }

            filter['voice-service'] = $(this).val();
        });

        $(document).on('change', 'select[name=filter-chat-service]', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['chat-service'];
                return;
            }

            filter['chat-service'] = $(this).val();
        });

        $(document).on('change', 'select[name=filter-mail-service]', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['mail-service'];
                return;
            }

            filter['mail-service'] = $(this).val();
        });

        $(document).on('dp.change', '#filter-start-date', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['start-date'];
                return;
            }

            filter['start-date'] = $(this).val();
        });

        $(document).on('dp.change', '#filter-end-date', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['end-date'];
                return;
            }

            filter['end-date'] = $(this).val();
        });

        $(document).on('click', '#filter-btn', function () {
            delete filter['detail-company'];
            delete filter['detail-service'];
            requestFilter();
        });

        // Nhấn phím enter
        $(document).on('keyup', function (e) {
            if (e.keyCode == 13) {
                requestFilter();
            }
        });

        $(document).on('click', '#filter-detail-company', function () {
            filter['detail-company'] = $(this).attr('data-detail');
            requestFilter();
        });


        $(document).on('click', '#filter-detail-service', function () {
            filter['detail-service'] = $(this).attr('data-detail');
            if (!!window.location.obj.page) filter['pageCompany'] = window.location.obj.pageCompany;
            if (!!window.location.obj.rows) filter['rowsCompany'] = window.location.obj.rowsCompany;
            requestFilter();
        });
    };

    var requestFilter = function () {
        window.location.hash = newUrl(window.location.hash, filter);
    };

    var initChart = function (data) {
        //data[i].voiceConnected + data[i].voiceNotConnected + data[i].chatConnected + data[i].chatNotConnected + data[i].mailConnected + data[i].mailNotConnected
        var _tuongTacVoice = 0;
        var _tuongTacChat = 0;
        var _tuongTacMail = 0;

        _.each(data, function (el) {
            _tuongTacVoice += el.voiceConnected;
            _tuongTacVoice += el.voiceNotConnected;
            _tuongTacChat += el.chatConnected;
            _tuongTacChat += el.chatNotConnected;
            _tuongTacMail += el.mailConnected;
            _tuongTacMail += el.mailNotConnected;
        });

        var arrayValue = [];
        arrayValue.push({
            name: 'Voice',
            y: _tuongTacVoice
        });
        arrayValue.push({
            name: 'Chat',
            y: _tuongTacChat
        });
        arrayValue.push({
            name: 'Mail',
            y: _tuongTacMail
        });
        var options = {
            chart: {
                type: 'pie'
            },
            xAxis: {

            },
            yAxis: {

            },
            series: [{
                data: arrayValue
            }]
        };
        $('#container').highcharts(options);
    }

    return {
        init: function () {
            bindClick();

            if (!!window.location.obj['detail-service']) $("html, body").animate({ scrollTop: $(document).height() }, 1000);

            filter['start-hour'] = $('input[name=filter-start-hour]').val();
            filter['end-hour'] = $('input[name=filter-end-hour]').val();

            // Hiển thị lại tiêu chí đã lọc
            _.each(window.location.obj, function (v, k) {
                if (k.indexOf('detail-company') >= 0) {
                    filter['detail-company'] = v;
                    return;
                }
                if (k.indexOf('detail-service') >= 0) {
                    filter['detail-service'] = v;
                    return;
                }

                var el = $('#filter-' + k.replace(['[]'], '').replace('.', '\\.'));
                if (el[0]) {
                    filter[k] = v;
                    switch (el.prop('tagName')) {
                        case 'INPUT':
                            el.val(v);
                            break;
                        case 'SELECT':
                            el.val(v);
                            if (el.is('.selectpicker')) {
                                el.val(v).selectpicker('refresh');
                            }
                            break;
                    }
                }
            });

            initChart(dataChart);
        },
        uncut: function () {
            $(document).off('change', 'select[name=filter-company]');
            $(document).off('click', '#filter-detail-company');
            $(document).off('click', '#filter-detail-service');
            $(document).off('click', '#filter-btn');
            $(document).off('change', 'select[name=filter-voice-service]');
            $(document).off('change', 'select[name=filter-chat-service]');
            $(document).off('change', 'select[name=filter-voice-campaign]');
            $(document).off('change', 'select[name=filter-mail-service]');
            $(document).off('dp.change', '#filter-start-date');
            $(document).off('dp.change', '#filter-end-date');

        }
    };
}(jQuery);