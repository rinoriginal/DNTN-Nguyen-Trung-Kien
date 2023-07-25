;
(function ($) {

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
    var countUpTimer = function (type) {
        var minutesLabel = document.getElementById("minutes"+type);
        var secondsLabel = document.getElementById("seconds"+type);
        var hourLabel = document.getElementById("hour"+type);
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
            --time;
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

    var state = getCookie('_agentState');

    var _this = function (s) {
        return 'body > .tab-content > .tab-pane#tab-voice ' + s;
    };

    var VoiceInit = function () {

        $(_this('.ui-widget-header .zmdi-minus')).tooltip();
        $(_this('.ui-widget-header .zmdi-close')).tooltip();

        bindClick();
    };

    var bindClick = function () {
        $(document).on('click', _this('.zmdi-close'), function () {
            var ticketId = $(this).attr('tid');
            _.each($('iframe'), function (el) {
                if ($(el).attr('id') === ('if-' + ticketId)) {
                    $(el).prop('contentWindow').DFT.showCloseAlert(ticketId);
                }
            });
        });

        $(document).on('click', _this('.ui-widget-header .zmdi-minus'), function () {
            var $this = $(this).closest('.voice-dialog');

            console.log(26, $this.position().top);

            var tid = $(this).attr('tid');
            var currentPosition = $this.position();

            $(this).attr('p-top', $this.position().top);
            $(this).attr('p-left', currentPosition.left);

            $this.effect('transfer', {
                to: '#voice-bars-container li[tid="' + tid + '"]',
                className: "ui-effects-transfer"
            },
                500,
                function () {
                    $(_this('#voice-bars-container li[tid="' + tid + '"]'))
                        .attr('i-u', false);
                })
                .dequeue()
                .effect('fade', {});
        });

        $(document).on('click', _this('ul#voice-bars-container li'), function () {
            var $this = $(this);
            var tid = $this.attr('tid');
            var $dialog = $('.voice-dialog[id="v-' + tid + '"]');
            var cLeft = $dialog.attr('p-left') + ' px';
            var cTop = $dialog.attr('p-top') + ' px';
            VoiceContainer.topIndex++;

            $this.attr('i-u', true).siblings().attr('i-u', false);

            $dialog.css({ top: cTop, left: cLeft, 'z-index': VoiceContainer.topIndex }).fadeIn();
        });
    };

    var VoiceContainer = window.VoiceContainer = Object.create({
        topIndex: 0,
        childs: {},
        container: null,
        tabCounter: null,
        barcontainer: null,
        counter: 0,
        childTop: 60,
        childLeft: 10,


        init: function () {
            this.container = $('.tab-pane#tab-voice');
            this.tabCounter = $('a[href="#tab-voice"] i.tmn-counts');
            this.barcontainer = $('.tab-pane#tab-voice #voice-bars-container');

            VoiceInit();

            return this;
        },
        updateCounter: function (add) {
            var self = this;
            add ? self.counter++ : self.counter--;
            self.tabCounter.text(self.counter);
            _.isEqual(self.counter, 0) ? self.tabCounter.hide() : self.tabCounter.show();
            return self;
        },
        open: function (tid, title) {
            $(_this('ul#voice-bars-container li')).attr('i-u', false);

            var self = this;
            self.topIndex++;

            self.childTop = _.random(60, 100);
            self.childLeft = _.random(10, 100);

            var height = window.height * 0.6;

            var _w = $(_.Tags([{
                tag: 'div',
                attr: {
                    class: 'voice-dialog ui-widget-content p-0',
                    id: 'v-' + tid,
                    style: 'width: calc(100vw - 100px) !important; height: calc(100vh - 150px) !important; top: ' + self.childTop + 'px; left: ' + self.childLeft + 'px; position: absolute; z-index:' + self.topIndex
                },
                childs: [{
                    tag: 'h5',
                    attr: {
                        class: 'ui-widget-header m-0 p-5 bgm-white c-black'
                    },
                    content: title,
                    childs: [{
                        tag: 'i',
                        attr: {
                            class: 'zmdi zmdi-minus zmdi-hc-fw p-absolute f-20 t-5 r-30 f-20',
                            tid: tid,
                            'data-toggle': 'tooltip',
                            title: 'Thu nhỏ xuống khay!'
                        }
                    },
                    {
                        tag: 'i',
                        attr: {
                            class: 'zmdi zmdi-close zmdi-hc-fw p-absolute t-5 r-10 f-20',
                            tid: tid,
                            'data-toggle': 'tooltip',
                            title: 'Close ticket'
                        }
                    }
                    ]
                },
                {
                    tag: 'div',
                    attr: { class: 'content' },
                    childs: [{
                        tag: 'iframe',
                        attr: {
                            id: 'if-' + tid,
                            frameborder: '0',
                            height: '100%',
                            width: '100%',
                            scrolling: 'no',
                            src: '/customer-info?ticketID=' + tid
                        }
                    }]
                }
                ]
            }]));

            _w.appendTo(self.container);
            _w.draggable({
                snap: false,
                handle: '.ui-widget-header',
                iframeFix: true,
                containment: "parent",
                refreshPositions: true
            }).find('.ui-widget-header').bind('mousedown', function () {
                self.topIndex++;
                $(this).closest('.voice-dialog').css('z-index', self.topIndex);

                var viewId = $(this).closest('.voice-dialog').attr('id');
                var tid = viewId.split('-')[1];
                $(_this('ul#voice-bars-container li[tid="' + tid + '"]')).attr('i-u', true).siblings().attr('i-u', false);
            });

            var _wb = $(_.Tags([{
                tag: 'li',
                attr: {
                    'i-u': true,
                    'i-c': false,
                    class: 'p-relative',
                    tid: tid
                },
                childs: [{
                    tag: 'i',
                    attr: {
                        class: 'zmdi zmdi-phone-in-talk zmdi-hc-fw'
                    }
                },
                {
                    tag: 'span m-l-5',
                    content: title
                }
                ]
            }]));

            _wb.appendTo(self.barcontainer);

            return self.updateCounter(true);
        },
        close: function (tid) {
            var self = this;

            async.parallel({
                fadeOutDialog: function (callback) {
                    $(_this('#v-' + tid)).fadeOut(callback);
                },
                fadeOutTaskBar: function (callback) {
                    $(_this('ul#voice-bars-container li[tid="' + tid + '"]')).fadeOut(callback);
                }
            }, function () {
                $(_this('#v-' + tid)).remove();
                $(_this('ul#voice-bars-container li[tid="' + tid + '"]')).remove();
            });

            return self.updateCounter();
        }
    });

    var getStatusColor = function (status) {
        switch (status) {
            case -1:
                return '#33dcff';
                break;
            case 2:
                return '#33dcff';
                break;
            case 3:
                return '#33dcff';
                break;
            case 4:
                return '#92f538';
                break;
            case 5:
                return '#f8f8f8';
                break;
            default:
                return 'yellow';
                break;
        }
    }

    var getCallStatus = function (status) {
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
        }
    };


    function getUserState(user) {
        switch (user && user.state) {
            case 'LOGOUT':
                return 'ĐÃ ĐĂNG XUẤT';
            case 'NOT_READY':
                if (user && user.reasonCode) {
                    return user.reasonCode.label
                }
                return 'Not Ready';
            case 'READY':
                return 'Ready';
            case 'RESERVED':
                return 'RESERVED';
            case 'RESERVED_OUTBOUND':
                return 'RESERVED OUTBOUND';
            case 'RESERVED_OUTBOUND_PREVIEW':
                return 'RESERVED OUTBOUND PREVIEW';
            case 'TALKING':
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

    var getStatusColor = function (user) {
        switch (user && user.state) {
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

    var _changeStateHandler = function (data, statusText, xhr) {
        if (xhr && xhr.status === 202) {
            // if (state) {
            //     $('#call-status-info').html('<i class="zmdi zmdi-phone m-r-5"></i>' + getUserState(state));
            //     $('#call-status-info').css('background-color', getStatusColor(state));
            //     if (state === 'NOT_READY') {
            //         $('#call-status-info').css('color', 'black');
            //     }
            // }
        }
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
    var getStatusAgent = function (data) {
        window._finesse.getReasonCodeListByUser(getCookie('_agentId'), function (_11, _22, data) {
            let userResult = JSON.parse(xml2json(data.responseText));
            console.log(`------- userResult ------- getUserDetail`);
            console.log(userResult);
            console.log(`------- userResult ------- getUserDetail`);
            let dataStatus = [
                {
                    name: 'Ready',
                    reasonCodeId: 0,
                    status: 'READY'
                }
            ]
            if (userResult && userResult.ReasonCodes && userResult.ReasonCodes.ReasonCode && userResult.ReasonCodes.ReasonCode && userResult.ReasonCodes.ReasonCode.length > 0) {
                let reasonCodes = userResult.ReasonCodes.ReasonCode
                for (let item of reasonCodes) {
                    // Lấy id của reasonCode dựa vào uri
                    // Tìm kiếm ký tự '/ cuối cùng '
                    let last = item.uri.lastIndexOf("/")
                    let reasionCode = item.uri.slice(last + 1)
                    let itemStatus = {
                        name: item.label,
                        status: 'NOT_READY',
                        reasonCodeId: reasionCode
                    }
                    dataStatus.push(itemStatus)
                }

            } else {
                let itemStatus = {
                    name: 'Not ready',
                    status: 'NOT_READY',
                    reasonCodeId: -1
                }
                dataStatus.push(itemStatus)
            }
            console.log(dataStatus)
            $(_this('#voice-status-container')).append('' +
                '<a id="status-info" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' +
                '<i class="zmdi zmdi-account m-r-5"></i>Trạng thái ' +
                '<span class="caret"></span>' +
                '</a>');

            var newMenu = '<ul class="dropdown-menu" role="menu">';
            //var newMenu = '<ul class="" role="menu">';
            _.each(dataStatus, function (status) {
                newMenu += `<li role="presentation"><a class="voice-status" role="button" data-voice-status="${status.reasonCodeId}"><i class="zmdi zmdi-circle m-r-7 ${status.status === 'READY' ? 'text-success' : 'c-red'}"></i>${status.name}</a></li>`;
            });
            $(_this('#voice-status-container')).append(newMenu);
            $(_this('.voice-status')).click(function () {
                console.log("change status ")
                let currentStateCall = $('#call-status-info td:nth-child(2)').html()
                console.log('currentStateCall',currentStateCall);
                if(currentStateCall.toLowerCase().includes('talking')){
                    return swal({title: 'Cảnh báo !',
                    text: 'Không được chuyển trạng thái khi đang trò chuyện',
                    type: "error"});
                }

                $('#dropDownWrapUp').attr('style', 'display:none')
                $('#sideCallVariable').attr('style', 'display:none')
                console.log('clickkk');
                if ($(this).attr('data-voice-status') === '0') {
                    setCookie('_agentState', $(this).html());
                    window._finesse.changeState(getCookie('_agentId'), "READY", null, _changeStateHandler, _changeStateHandler);
                } else if ($(this).attr('data-voice-status') === '-1'){
                    setCookie('_agentState', $(this).html());
                    window._finesse.changeState(getCookie('_agentId'), "NOT_READY", null, _changeStateHandler, _changeStateHandler);
                } else {
                    console.log($(this).html())
                    let reasonCodeId = $(this).attr('data-voice-status')
                    setCookie('_agentState', $(this).html());
                    window._finesse.changeState(getCookie('_agentId'), "NOT_READY", reasonCodeId, _changeStateHandler, _changeStateHandler);
                }
            })
        })
    }
    var bindSocket = function (client) {
        client.on('ChangeAgentCallStatus', function (data) {
            var status = getCallStatus(Number(data.callStatusType));
            $(_this('#call-status-info')).html('<i class="zmdi zmdi-phone m-r-5"></i>' + status);
            $(_this('#call-status-info')).css('background-color', getStatusColor(Number(data.callStatusType)));
        });

        client.on('VoiceChangeAgentStatus', function (data) {
            if (Number(data) == 4) {
                $(_this('#status-info')).html('<i class="zmdi zmdi-account m-r-5"></i>' + 'Not Answering' + ' <span class="caret"></span>');
            } else {
                $.map($(_this('.voice-status')), function (n, i) {
                    if ($(n).attr('data-voice-status') == Number(data)) {
                        $(_this('#status-info')).html('<i class="zmdi zmdi-account m-r-5"></i>' + $(n).html() + ' <span class="caret"></span>');
                    }
                });
            }
        });

        client.on('GetAgentStatus', function (data) {
            // debugger
            console.log('GetAgentStatu5y45y45y4ys', data)
            $(_this('#voice-status-container')).empty();
            $(_this('#voice-status-container')).append('' +
                '<a id="status-info" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' +
                '<i class="zmdi zmdi-account m-r-5"></i>Trạng thái ' +
                '<span class="caret"></span>' +
                '</a>');

            var newMenu = '<ul class="dropdown-menu" role="menu">';
            //var newMenu = '<ul class="" role="menu">';
            _.each(data.data, function (status) {
                newMenu += '<li role="presentation"><a class="voice-status" role="button" data-voice-status=' + status.statusCode + '>' + status.name + '</a></li>';
            });
            $(_this('#voice-status-container')).append(newMenu);
            $.map($(_this('.voice-status')), function (n, i) {
                if ($(n).attr('data-voice-status') == data.curStatus) {
                    $(_this('#status-info')).html('<i class="zmdi zmdi-account m-r-5"></i>' + $(n).html() + ' <span class="caret"></span>');
                }
            });

            // cập nhật trạng thái chat từ server
            var htmlText = '<i class="zmdi zmdi-account m-r-5"></i>' + "Offline" + ' <span class="caret"></span>';
            if (data.chatStatus == 1) {
                htmlText = '<i class="zmdi c-green zmdi-account m-r-5"></i>' + "Sẵn sàng phục vụ" + ' <span class="caret"></span>';
            }
            $(('#chat-status-info')).html(htmlText);


            $("#tw-switch").prop("checked", Boolean(data.emailStatus));
        });
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
    function handleTransferButton() {
        // Thực hiện transfer
        $(document).on('click', "#transferCall", function () {
            let _username = getCookie('_username');
            let _password = getCookie('_password');
            let _extension = getCookie('_extension');
            let _domain = getCookie('_domain');
            let _urlBinding = getCookie('_urlBinding');
            let _agentId = getCookie('_agentId');
            if (!window._finesse) {
                _finesse = new Finesse(_agentId, _password);
                window._finesse = _finesse;
            }

            if (_agentId !== 'null') {
                // Check status user 
                window._finesse.getUserDetail(_agentId, function (_11, _22, data) {
                    console.log(`------- data status user ------- getUserDetail`);
                    console.log(data);
                    console.log(`------- data ------- getUserDetail`);
                    let userResult = JSON.parse(xml2json(data.responseText));
                    console.log(`------- userResult ------- getUserDetail`);
                    console.log(userResult);
                    console.log(`------- userResult ------- getUserDetail`);

                    if (userResult.User.state == "TALKING") {
                        window._finesse.getDialogs(getCookie('_agentId'), function (_11, _22, data) {
                            let response = JSON.parse(xml2json(data.responseText));

                            if (data.status == 200) {
                                if (response && response.Dialogs && response.Dialogs.Dialog) {
                                    console.log(`------- response.Dialogs.Dialog ------- getDialogs`);
                                    console.log(response.Dialogs.Dialog);
                                    console.log(`------- response.Dialogs.Dialog ------- getDialogs`);
                                    dialog = response.Dialogs.Dialog;
                                    if (dialog.mediaProperties.callType == "PREROUTE_ACD_IN") {
                                        $.ajax({
                                            url: '/api/v1/voice/get-survey-code',
                                            method: 'GET',
                                        }).done(function (resp) {
                                            console.log(`------- resp survey code ------- `);
                                            console.log(resp);
                                            console.log(`------- resp survey code ------- `);

                                            if (resp.code == 200 && resp.surveyCode) {
                                                // thực hiện transfer
                                                window._finesse.makeTransferCall(_extension, resp.surveyCode, dialog.id, function (_11, _22, data) {
                                                    console.log(`------- data ------- makeTransferCall`);
                                                    console.log(data);
                                                    console.log(`------- data ------- makeTransferCall`);
                                                    if (data.status == 202) {
                                                        return swal({
                                                            title: 'Thông báo!',
                                                            text: 'Cuộc gọi được transfer thành công!',
                                                            type: "success",
                                                            confirmButtonColor: "#DD6B55",
                                                            confirmButtonText: "Quay lại!",
                                                            closeOnConfirm: true
                                                        });
                                                    }
                                                });
                                            } else {
                                                console.log(`------- không tìm thấy survey code ------- `);
                                                console.log('không tìm thấy survey code');
                                                console.log(`------- không tìm thấy survey code ------- `);
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                });
            }

        });

    }


    $(document).ready(function () {
        // Get trạng thái agent
        window._finesse.getState(getCookie('_agentId'), function (_11, _22, data) {
            let userResult = JSON.parse(xml2json(data.responseText));
            console.log('status agent', userResult)
            $('#call-status-info').html('<table>' +
                '<tr>' +
                '   <td class="p-r-10" rowspan="2"><img style="width:60px;height:40px" src="' + getImageState(userResult && userResult.User) + '"></td>' +
                '   <td>' + getUserState(userResult && userResult.User) + '</td>' +
                '</tr>' +
                '<tr>' +
                '   <td><label id="hour">00</label>:<label id="minutes">00</label>:<label id="seconds">00</label></td>' +
                '</tr>' +
                '</table>');
            $('#call-status-info').css('background-color', getStatusColor(userResult && userResult.User));
            countUpTimer('')
        })
        // Ẩn nút transfer
        $("#transferCall").hide();

        VoiceContainer.init();
        bindSocket(_socket);
        getStatusAgent()
        $(_this('#call-status-info')).on('click', function () {
            $('#call-status-menu').show();
        });

        $(_this('#disconnect-call')).on('click', function () {
            $('#call-status-menu').hide();
            _socket.emit('GroupCallControl', { _id: user, type: '1', agentID: user });
        });

        $('#crm-tab-nav-bar > li > a').click(function () {
            if ($(this).attr('href') == '#tab-voice') {
                handleTransferButton();
            }

            console.log('Trang thais agent ', $(this).attr('href'))
            console.log('Trang thais agent ', window._finesse)
            var agentId = getCookie('_agentId');
            if ($(this).attr('href') !== '#tab-voice' ||
                window._finesse === undefined || window._finesse === null || agentId === 'undefined') {
                return;
            }
        })
    });
})(jQuery);