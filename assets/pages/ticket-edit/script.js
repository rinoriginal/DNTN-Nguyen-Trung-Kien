var DFT = function ($) {
    var _oldTicketLeft = $('#tab-old-ticket .left-side');
    var _oldTicketRight = $('#tab-old-ticket .right-side');
    var detailTicketReasonCategory = {};
    var detailTicket = {};
    var _curCallLabel = null;
    var body = document.querySelector("#container");
    var createCallInfo = function () {
        var intervalCisco = null;

    }
    var bindClick = function () {
        $(document).on('click', '.btn-detail', function () {
            let type_channel = $(this).find('input').val();
            if (type_channel) {
                if (type_channel == "Mail") {
                    return window.location.hash = 'ticket-mail-edit?ticketID=' + $(this).attr('data-id');
                } else if (type_channel == "Outbound" || type_channel == "Inbound") {
                    return window.location.hash = 'ticket-edit?ticketID=' + $(this).attr('data-id');
                } else {
                    return window.location.hash = 'ticket-chat-edit?ticketID=' + $(this).attr('data-id');
                }
            }
            $('.nav-tabs a[href="#profile-v"]').tab('show');
            var button = $(this);
            var dataId = $(this).attr('data-id');
            $('#save-ticket-detail-crm').attr('data-id', dataId);
            _oldTicketLeft.fadeOut(function () {
                _Ajax('ticket-edit', 'POST', [{ _id: button.attr('data-id') }], function (resp) {
                    if (resp.code == 500) return swal({ title: 'Đã có lỗi xảy ra', text: resp.message });
                    _oldTicketRight.fadeIn();
                    var formId = '#frm-ticket-detail-crm ';
                    var surveyFormId = '#detail-survey-form ';

                    detailTicket = resp.message.ticket;
                    detailTicketReasonCategory = resp.message.info.ticketReasonCategory;

                    $(formId + '#title').html(resp.message.serviceName);
                    $(formId + '#ticket-detail-properties').html(zoka.showTicketInfo(
                        resp.message.ticket,
                        resp.message.info.ticketReasonCategory,
                        resp.message.info.assign,
                        resp.message.info.statisfy
                    ));

                    $(formId + '#ticket-history-list').html(zoka
                        .showTicketListBody(
                            zoka.validObject(resp.message, 'info', 'ticketHistory', 'data'),
                            false
                        ));

                    $(formId + '.paging-list').html(zoka
                        .createPaging(
                            zoka.validObject(resp.message, 'info', 'ticketHistory', 'paging')
                        ));


                    $(surveyFormId).html(zoka
                        .createSurvey(resp.message.info.survey,
                            resp.message.info.surveyResult,
                            'detail-survey-form',
                            resp.message.ticket
                        ));

                    if (!resp.message.info.isEdit) {
                        disableEditTicket(formId);
                        disableSurveyEdit(surveyFormId);
                    }

                    refreshComponent();
                });
            });
        });

        $(document).on('click', '.btn-save', function () {
            $($(this).attr('data-target')).trigger('submit');
        });

        $(document).on('click', '.zpaging', function () {
            var parent = $(this).closest('.list-view');
            var queryLink = $(this).attr('data-link');
            _Ajax(queryLink, 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    if (queryLink.indexOf('getCallLogs') >= 0) {
                        var callLogsId = '#edit-ticket-callLogs ';
                        $(callLogsId + '.ticket-call-logs').html(zoka.showCallLogs(resp.message.data));
                        $(callLogsId + '.paging-list').html(zoka.createPaging(resp.message.paging));
                    } else {
                        var ticketBody = zoka.showTicketListBody(resp.message.data, parent.hasClass('view-detail'));
                        var ticketPage = zoka.createPaging(resp.message.paging);
                        parent.find('#ticket-history-list').html(ticketBody);
                        parent.find('.paging-list').html(ticketPage);
                    }
                    $("#frm-edit-ticket-customer").html(zoka.showTicketListCustomerJourney(null, resp.message.data, true));
                    $(".paging-list-customer").html(zoka.createPaging(resp.message.paging));
                } else {
                    swal({
                        title: 'Đã có lỗi xảy ra',
                        text: JSON.stringify(resp.message),
                        type: "error",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    });
                }
            });
        });

        $(document).on('click', '#cancelInput', function () {
            window.history.back();
        });

        $(document).on('click', '#tab-old-ticket .right-side .btn-back', function () {
            $(MainContent.prefix('#save-ticket-detail-crm')).attr('data-id', '');
            _oldTicketRight.fadeOut(function () {
                _oldTicketLeft.fadeIn();
            });
        });

        $(document).on('click', '#searchTicket', function () {
            var parent = $(this).closest('.left-side');
            var searchObj = '/ticket-edit?search=1&idCustomer=' + $(this).attr('data-id') + '&tId=' + $(this).attr('data-ticket-id');
            $('#searchRelateTicket .searchColumn').each(function () {
                var obj = $(this);
                if (obj.attr('name') && !_.isEmpty(obj.val())) {
                    searchObj += ('&' + obj.attr('name') + '=' + obj.val());
                }
            });
            _Ajax(searchObj, 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    var str = zoka.showTicketListBody(resp.message.data, true);
                    parent.find('#ticket-history-list').html(str);
                    parent.find('.paging-list').html(zoka.createPaging(resp.message.paging));
                } else {
                    swal({
                        title: 'Đã có lỗi xảy ra',
                        text: JSON.stringify(resp.message),
                        type: "error",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    });
                }
            });
        });

        $(document).on('click', '#refreshPage', function () {
            _.LoadPage(window.location.hash);
        });

        $(document).on('click', '.clickToCall', function (e) {
            e.preventDefault();
            //Cảnh báo khi outbound
            if (getCookie('_agentState') == "READY"){
               return  swal({
                    title: "Thông báo",
                    text: "Bạn cần chuyển trạng thái không sẵn sàng để thực hiện cuộc gọi!",
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "OK",
                    closeOnConfirm: true,
                });
            }
            var callNumber = $(this).attr('data-phone-number') ? $(this).attr('data-phone-number') : $(this).prev('input').val();
            if (callNumber) {
                if (!_curCallLabel) {
                    _curCallLabel = $(this).parent().parent().parent().children('label');
                    _curCallLabel.attr('id', 'outbound-status-call');
                    if (!_curCallLabel.attr("data-name")) {
                        _curCallLabel.attr("data-name", _curCallLabel.html());
                    }
                }
                let companyId;
                if (currentTicket.idCampain && currentTicket.idCampain.idCompany) {
                    companyId = currentTicket.idCampain.idCompany._id;
                } else if (currentTicket.idService && currentTicket.idService.idCompany) {
                    companyId = currentTicket.idService.idCompany._id;
                }

                let campainId;
                if (currentTicket.idCampain) {
                    campainId = currentTicket.idCampain._id;
                }

                let serviceId;
                if (currentTicket.idService) {
                    serviceId = currentTicket.idService._id;
                }
                // 21.Mar.2023 kiennt Thực hiện gọi ra trên ticket gọi vào, hỏi có tạo ticket hay không?
                if (currentTicket && currentTicket.idService && !currentTicket.idCampain) {
                    // là ticket gọi vào - confirm tạo ticket
                    swal({
                        title: "Thông báo",
                        text: "Bạn đang gọi ra trên ticket gọi vào!",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Tạo ticket gọi ra!",
                        cancelButtonText: "Thực hiện gọi ra!",
                        closeOnConfirm: true,
                        closeOnCancel: true
                    }, function (isConfirm) {
                        if (isConfirm) {
                            createTicketByPhone(callNumber, currentTicket);
                        } else {
                            getDialogsFromCisco(callNumber, currentTicket);
                        }
                    }, _handler);
                } else {
                    getDialogsFromCisco(callNumber, currentTicket);

                }
            }
        });
        function getDialogsFromCisco(callNumber, currentTicket) {
            $.LoadingOverlay("show");
            window._finesse.makeCall(callNumber, getCookie('_extension'), function (_1, _2, xhr) {
                if (xhr && xhr.status === 202) {
                    let finished = false
                    let countCallApi = 0
                    let dialog = ""
                    async.until(function (params) {
                        return finished == true
                    }, function iter(next) {
                        window._finesse.getDialogs(getCookie('_agentId'), function (_11, _22, data) {
                            countCallApi++
                            let response = JSON.parse(xml2json(data.responseText));
                            if (response && response.Dialogs && response.Dialogs.Dialog) {
                                console.log("response", response.Dialogs.Dialog)
                                finished = true
                                dialog = response.Dialogs.Dialog;
                                next()
                            } else {
                                finished = false
                                next()
                            }
                        });
                    }, function done(err) {
                        $.LoadingOverlay("hide");
                    })
                }
            }, _makeCallHandler);
        }
        /**
         * Sự kiện click yêu cầu tạo ticket theo số điện thoại ở ô input
         */
        $(document).on('click', '.clickToCreateTicket', function () {
            var phoneNumber = $(this).attr('data-phone-number') ? $(this).attr('data-phone-number') : $(this).prev('input').val();
            if (!phoneNumber) {
                phoneNumber = $(this).prev('input').val();
            }
            createTicketByPhone(phoneNumber);
        });

        /**
         * 22.Mar.2023 kiennt Mở cửa newtab thực hiện tạo ticket dựa trên số điện thoại
         * Nếu không có số điện thoại -> mở tab mới với thông tin số điện thoại trống
         * @param phoneNumber Số điện thoại
         */
        function createTicketByPhone(phoneNumber) {
            var url = '/#ticket-import-by-phone';
            if (phoneNumber) {
                url += '?phone=' + phoneNumber;
            }
            var win = window.open(url, '_blank');
            win.focus();
        }

        $(document).on('change', '.ticketReasonCategory', function () {
            setTicketReason($(this).val(), $(this).closest('form').attr('id'));
            //var changeValue = $(this).val();
            //var parentForm = $(this).closest('form').attr('id');
            //var trc = {}, childTicket = {};
            //if (_.isEqual(parentForm, 'frm-edit-ticket')) {
            //    trc = ticketReasonCategory;
            //    childTicket = currentTicket;
            //} else {
            //    trc = detailTicketReasonCategory;
            //    childTicket = detailTicket;
            //}
            //
            //var htmlChange = _.Tags(zoka.createTicketSubReasonRows(childTicket, trc, changeValue));
            //$('#' + parentForm + ' .ticketSubreason').html(htmlChange).trigger('chosen:updated');
        });

        $(document).on('click', '.btn-next', function () {
            _isDone = false;
            _.each($('.survey-tab'), function (el) {
                if ($(el).hasClass('active') && !_isDone) {
                    _isDone = true;
                    var nextQuestion = $(el).attr('data-next-question');
                    if (nextQuestion) {
                        $('.' + nextQuestion + ' a').tab('show');
                        if ($('.survey-tab.' + nextQuestion).attr('data-next-question')) {
                            $('.btn-next').show();
                        } else {
                            $('.btn-next').hide();
                        }
                    }
                }
            });
        });

        $(document).on('click', '.survey-tab', function () {
            var self = $(this);
            if (self.attr('data-next-question')) {
                $('.btn-next').show();
            } else {
                $('.btn-next').hide();
            }
        });

        $(document).on('click', '.playAudio', function () {
            var $this = $(this);
            var audio = $this.closest('td').find('audio')[0];

            audio.onended = function () {
                $(this).closest('td').find('.zmdi-play').show();
                $(this).closest('td').find('.zmdi-pause').hide();
            };

            _.each($('audio'), function (el) {
                var __audio = $(el)[0];
                if (__audio != audio && !__audio.paused) {
                    __audio.pause();
                    $(el).closest('td').find('.zmdi-play').show();
                    $(el).closest('td').find('.zmdi-pause').hide();
                }
            });

            if (audio.paused) {
                audio.play();
                $this.find('.zmdi-play').hide();
                $this.find('.zmdi-pause').show();
            } else {
                audio.pause();
                $this.find('.zmdi-play').show();
                $this.find('.zmdi-pause').hide();
            }
        });


        // phiếu khiếu nại - haivh
        // start
        // Click nút Lọc/Search
        $('a.btn.btn-success.uppercase.c-white').click(function () {
            queryFilterComplaint(true);
        });
        $(document).on('click', '.pagination li a', function (e) {
            e.preventDefault();
            queryFilterComplaint(false, $(this).attr('data-link'));
        });
        //end

    };

    // Lấy dữ liệu search và gửi lên server -haivh
    //start
    var queryFilterComplaint = function (load, page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        filter.customerId = currentTicket.idCustomer

        if (page) {
            filter.page = page;
        }
        if (load == true) {
            _Ajax("/manage-ticket-complaint?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {

                        loadDataComplaint(resp);
                        $('#paging').html(createPaging(resp.paging));
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy các trường phù hợp",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        });
                    }
                } else {
                    swal({ title: 'Cảnh báo !', text: resp.message });
                }
            })
        }
        if (!load) {
            _Ajax("/manage-ticket-complaint?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {

                        loadDataComplaint(resp);
                        $('#paging').html(createPaging(resp.paging));
                    }
                }
            })
        }


    };
    function createPaging(paging, classPaging) {
        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="' + classPaging + '" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="' + classPaging + '" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
            if (paging.range[i] == paging.current) {
                pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
            } else {
                pageNum += '<li><a class="' + classPaging + '" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
            }
        }
        var pageNext = paging.next ? '<li><a class="' + classPaging + '" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="' + classPaging + '" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };
    //hiển thị dữ liệu lên giao diện
    var loadDataComplaint = function (resp) {

        var template = '<tr style="height:35px !important">' +
            '<td class="text-center" style="width:40px" title="{0}">{0}</td>' +
            '<td class="text-center" style="width:100px" title="{1}">{1}</td>' +
            '<td class="text-center" style="width:240px" title="{2}">{2}</td>' +
            '<td class="text-center" style="width:1px" title="{3}">{3}</td>' +
            '<td class="text-center" style="width:50px" title="{4}">{4}</td>' +
            '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
            '<td class="text-center" style="width:140px" title="{6}">{6}</td>' +
            '<td class="text-center" style="width:140px" title="{7}">{7}</td>' +
            '<td class="text-center" style="width:140px" title="{8}">{8}</td>' +
            '<td class="text-center" style="width:140px" title="{9}">{9}</td>' +
            '<td class="text-center"><p data-target="#editComlaintPopup" data-id="{10}" class="p-t-3 btn-flat-bg btn-edit btn-edit-complaint" data-toggle="modal" data-placement="top" data-original-title="Chỉnh sửa"><i class="zmdi zmdi-edit c-orange f-17"></i></a> </td>' +
            '</tr>';
        var rows = '';
        resp.data.forEach(function (el, i) {
            if (_.isEmpty(el)) return;

            // sum += (el.priceRelease.reduce((a, b) => a + b, 0) - el.priceOriginal.reduce((a, b) => a + b, 0))

            rows += template.str(
                (el.complaintType ? el.complaintType : ''),
                (el.problem ? el.problem : ''),
                (el.content ? el.content : ''),
                (el.customerName ? el.customerName : ''),
                (el.customerPhone ? el.customerPhone : ''),
                (el.agent ? el.agent : ''),
                // (el.restaurant ? el.restaurant : ''),
                (el.status == 0 ? 'Đang xử lý' : (el.status == 1 ? 'Tạm dừng xử lý' : 'Đã xử lý')),
                (moment(el.created).format('DD/MM/YYYY HH:mm A')),
                (moment(el.deadline).format('DD/MM/YYYY HH:mm A')),
                (el._id)

            );
        })
        if (body){
            body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)
        }
       
        $('#tbBody').html(rows);
    };
    //end

    var setTicketReason = function (changeValue, parentForm) {
        var trc = {},
            childTicket = {};
        if (_.isEqual(parentForm, 'frm-edit-ticket')) {
            trc = ticketReasonCategory;
            childTicket = currentTicket;
        } else {
            trc = detailTicketReasonCategory;
            childTicket = detailTicket;
        }
        var htmlChange = _.Tags(zoka.createTicketSubReasonRows(childTicket, trc, changeValue));
        $('#' + parentForm + ' .ticketSubreason').html(htmlChange).trigger('chosen:updated');
    };

    var bindSubmit = function () {
        $('#frm-update-customer').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    _AjaxData('/ticket-edit/customer-' + $('#save-customer').attr('data-id'), 'PUT', $(form).getData(), function (resp) {
                        if (resp.code == 200) {
                            swal({
                                title: 'Cập nhật thành công',
                                text: '',
                                type: "success",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Xác nhận",
                                closeOnConfirm: true
                            }, function () {
                                $(".clickToCall").each(function () {
                                    var value = $(this).prev('input').val();
                                    $(this).attr('data-phone-number', value);
                                })
                            });
                        } else {
                            swal({
                                title: 'Đã có lỗi xảy ra',
                                text: resp.message,
                                type: "error",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Quay lại!",
                                closeOnConfirm: true
                            });
                        }
                    });
                }
            }
        });

        $('#frm-edit-ticket').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                //Albert: if 'Trạng Thái' is 'Đang Xử Lý' => 'Ngày Hẹn Xử Lý' !== null/""
                if ($('#status').val() == 1 && (($('#deadline').val().length == 0) || ($('#deadline').val() == ""))) {
                    return swal({
                        title: 'Đã có lỗi xảy ra',
                        text: 'Thiếu Ngày Hẹn Xử Lý',
                        type: "error",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    });
                }

                // ALbert: 'Ngày hẹn xử lý' >= 'Current date' nếu trạng thái là 'Đang xử lý'
                if (($('#status').val() == 1) && ($('#deadline').val().length != 0)) {
                    var currentDate = new Date();
                    var deadline = $('#deadline').val();

                    var dateParts = deadline.split(' ')[1].split("/");
                    var dateObject = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]); // month is 0-based

                    if ((currentDate.getTime() > new Date(dateObject.toString()).getTime() + 60 * 60 * 1000 * 23)) {
                        return swal({
                            title: 'Đã có lỗi xảy ra',
                            text: 'Ngày hẹn xử lý không được nhỏ hơn ngày hiện tại',
                            type: "error",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Quay lại!",
                            closeOnConfirm: true
                        });
                    }

                }

                if (status) {
                    var fcrVal = $('#frm-edit-ticket-fcr-value').val();
                    if (!!callLogs.data && callLogs.data.length > 0) $('#frm-edit-ticket-fcr-value').val(1);
                    _AjaxData('/ticket-edit/editTicket-' + $('#save-new-ticket').attr('data-id'), 'PUT', $(form).getData(), function (resp) {
                        if($('#errorTransferIcarHandle').val() == ''){
                            swal({
                                title: 'Có lỗi xảy ra',
                                text: 'Vui lòng nhập lỗi Chuyển ICALL Xủ Lý',
                                type: "warning",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Xác nhận!",
                                closeOnConfirm: true
                            }, function () {
            
                            });
                        }else{
                            if (resp.code == 200) {
                                swal({
                                    title: 'Cập nhật thành công',
                                    text: '',
                                    type: "success",
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: "Xác nhận",
                                    closeOnConfirm: true
                                });
                                $('#tab-edit-ticket').find('#ticket-history-list').html(zoka.showTicketListBody(resp.message.data, false));
                                $('#tab-edit-ticket').find('.paging-list').html(zoka.createPaging(resp.message.paging));
                            } else {
                                swal({
                                    title: 'Thiếu Ngày hẹn xử lý',
                                    text: resp.message,
                                    type: "error",
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: "Quay lại!",
                                    closeOnConfirm: true
                                });
                            }
                        }
                    });
                }
            }
        });

        $('#frm-ticket-detail-crm').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    _AjaxData('/ticket-edit/editTicket-' + $('#save-ticket-detail-crm').attr('data-id'), 'PUT', $(form).getData(), function (resp) {
                        if (resp.code == 200) {
                            swal({
                                title: 'Cập nhật thành công',
                                text: '',
                                type: "success",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Xác nhận",
                                closeOnConfirm: true
                            });
                            $('#ticket-detail-history').find('#ticket-history-list').html(zoka.showTicketListBody(resp.message.data, false));
                            $('#ticket-detail-history').find('.paging-list').html(zoka.createPaging(resp.message.paging));
                        } else {
                            swal({
                                title: 'Đã có lỗi xảy ra',
                                text: resp.message,
                                type: "error",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Quay lại!",
                                closeOnConfirm: true
                            });
                        }
                    });
                }
            }
        });

        $('#current-survey-form').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    var dataLink = $('#current-survey-form #save-survey').attr('data-link');
                    _AjaxData('/ticket-edit/survey-' + dataLink, 'PUT', $(form).getData(), function (resp) {
                        if (resp.code == 200) {
                            swal({ title: 'Lưu thông tin thành công', text: resp.message });
                        } else {
                            swal({ title: 'Đã có lỗi xảy ra', text: resp.message });
                        }
                    });
                }
            }
        });

        $('#detail-survey-form').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            onValidationComplete: function (form, status) {
                if (status) {
                    var dataLink = $('#detail-survey-form #save-survey').attr('data-link');
                    _AjaxData('/ticket-edit/survey-' + dataLink, 'PUT', $(form).getData(), function (resp) {
                        if (resp.code == 200) {
                            swal({ title: 'Lưu thông tin thành công', text: resp.message });
                        } else {
                            swal({ title: 'Đã có lỗi xảy ra', text: resp.message });
                        }
                    });
                }
            }
        });

        $('#frm-update-order').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    _AjaxData('/ticket-edit/order', 'PUT', $(form).getData(), function (resp) {
                        if (resp.code == 200) {
                            swal({ title: 'Lưu thông tin thành công', text: resp.message });
                        } else {
                            swal({ title: 'Đã có lỗi xảy ra', text: resp.message });
                        }
                    });
                }
            }
        })
    };

    var bindValue = function () {
        _.each(_.allKeys(_config.MESSAGE.CUSTOMER_INFO), function (item) {
            $('.' + item).html(_config.MESSAGE.CUSTOMER_INFO[item]);
        });
    };

    var showTicket = function () {
        var currentTicketId = '#frm-edit-ticket ';
        $(currentTicketId + '#ticket-info').html(zoka.showTicketInfo(currentTicket, ticketReasonCategory, assign, statisfy));
        setTicketReason(currentTicket.ticketReasonCategory, 'frm-edit-ticket');
        $('.selectpicker').selectpicker('refresh');
        $(currentTicketId + '#edit-ticket-history .ticket-history').html(zoka.showTicketList(currentTicket, ticketHistory.data, false));
        $(currentTicketId + '#edit-ticket-history .paging-list').html(zoka.createPaging(ticketHistory.paging));
        $('#current-survey-form').html(zoka.createSurvey(survey, surveyResult, 'current-survey-form', currentTicket));

        if (!isEdit) {
            disableEditTicket(currentTicketId);
            disableSurveyEdit('#current-survey-form');
        }

        var ticketHistoryId = '#edit-ticket-history ';
        $(ticketHistoryId + '.ticket-history').html(zoka.showTicketList(currentTicket, ticketHistory.data, false));
        $(ticketHistoryId + '.paging-list').html(zoka.createPaging(ticketHistory.paging));

        var callLogsId = '#edit-ticket-callLogs ';
        $(callLogsId + '.ticket-call-logs').html(zoka.showCallLogs(callLogs.data));
        $(callLogsId + '.paging-list').html(zoka.createPaging(callLogs.paging));

        var relateTicketId = '#tab-old-ticket ';
        $(relateTicketId + '#ticket-info').html(zoka.showTicketList(currentTicket, tickets.data, true));
        $(relateTicketId + '.paging-list').html(zoka.createPaging(tickets.paging));
        $(relateTicketId + '#ticket-detail-properties').html(zoka.showTicketInfo(null, ticketReasonCategory, null));
        $(relateTicketId + '#ticket-list').html(zoka.showTicketList(null, null, false));

        _.each($('.survey-tab'), function (el) {
            if ($(el).hasClass('active')) {
                if ($(el).attr('data-next-question')) {
                    $('.btn-next').show();
                } else {
                    $('.btn-next').hide();
                }
            }
        });

        refreshComponent();
    };

    var disableEditTicket = function (formId) {
        $(formId + '*').attr('readonly', true);
        $(formId + '.selectpicker').attr('disabled', true).selectpicker('refresh');
        $(formId + '.tag-select').attr('disabled', true).trigger('chosen:updated');
        $(formId + 'button').attr('disabled', true);
    };

    var disableSurveyEdit = function (formId) {
        $(formId + '.tab-content *').attr('readonly', true);
        $(formId + ' #save-survey').attr('disabled', true);
    };

    var refreshComponent = function () {
        bindValue();

        $('.selectpicker').selectpicker();
        $('.tag-select').chosen();
        $('.chosen-container').css('width', '100%');
        $('.date-time-picker').datetimepicker();
    };

    var bindSocket = function (client) {
        client.on('ChangeAgentCallStatus', function (data) {
            var status = Number(data.callStatusType);
            if (_curCallLabel) {
                var text = _curCallLabel.attr("data-name") + "(" + getCallStatus(status) + ")";
                _curCallLabel.html(text.toLocaleLowerCase());

                if (status == 5) {
                    _curCallLabel = null;
                };
            };
        });
    };


    //Load iframe tạo mới phiếu
    $('#newComlaintPopup').on('shown.bs.modal', function (e) {
        // $("#loaderIframeComplaint").show();
        // $("#new-complaint").hide();
        var idCustomer = $('#save-customer').attr('data-id') ? $('#save-customer').attr('data-id') : '';
        // var idCompany = currentTicket.idService.idCompany._id
        $(this).find('iframe').attr('src', '/#complaint?customerId=' + idCustomer);
    });
    //Get id ticket complaint khi click edit
    $(document).on('click', '.btn-edit-complaint', function () {
        $('#editComlaintPopup').attr('data-id', $(this).attr('data-id'))
    })
    //Load iframe chỉnh sửa phiếu khiếu nại
    $('#editComlaintPopup').on('shown.bs.modal', function (e) {
        var idTicket = $(this).attr('data-id')

        $(this).find('iframe').attr('src', '/#complaint/' + idTicket + '/edit');
    });

    //Đóng iframe
    $('#newComlaintPopup').on('hide.bs.modal', function (e) {
        $(this).find('iframe').attr('src', '');
        $("#tab-complaint-transaction").click();
    });
    $('#editComlaintPopup').on('hide.bs.modal', function (e) {
        $(this).find('iframe').attr('src', '');
        $("#tab-complaint-transaction").click();
    });

    $('#new-complaint').load(function () {
        $(this).show();
        try {
            $("#new-complaint").contents().find("#header").remove()
            $("#new-complaint").contents().find("#crm-tab-nav-bar").html("")
            $("#new-complaint").contents().find("body > .tab-content > #tab-crm > #main  > .container").css("padding", "0").css("width", "100%").removeClass("m-b-50");
            $("#new-complaint").contents().find("#main > div > div > div.card-body.card-padding").css("padding", "10px");
            $("#new-complaint").contents().find("#tab-crm").css("margin-top", "-123px")
            $("#new-complaint").contents().find("#main > div > div").css("margin-bottom", "0px")
        } catch (e) {
            console.log('ERROR_IFRAME_COMPLAINT: ', e);
        }
        $("#loaderIframeComplaint").hide();

    });

    $('#edit-complaint').load(function () {
        $(this).show();
        try {
            $("#edit-complaint").contents().find("#header").remove()
            $("#edit-complaint").contents().find("#crm-tab-nav-bar").html("")
            $("#edit-complaint").contents().find("body > .tab-content > #tab-crm > #main  > .container").css("padding", "0").css("width", "100%").removeClass("m-b-50");
            $("#edit-complaint").contents().find("#main > div > div > div.card-body.card-padding").css("padding", "10px");
            $("#edit-complaint").contents().find("#tab-crm").css("margin-top", "-123px")
            $("#edit-complaint").contents().find("#main > div > div").css("margin-bottom", "0px")
        } catch (e) {
            console.log('ERROR_IFRAME_COMPLAINT: ', e);
        }
        $("#loaderIframeComplaintEdit").hide();

    });
    //Tạo global function để đóng modal từ iframe
    window.closeModalComplaint = function () {
        $('#newComlaintPopup').modal('hide');
        queryFilterComplaint(false)
    };
    window.closeModalComplaintEdit = function () {
        $('#editComlaintPopup').modal('hide');
        queryFilterComplaint(false)
    };





    // //Load iframe tạo mới phiếu tư vấn
    $('#newAdvisoryPopup').on('shown.bs.modal', function (e) {
        // $("#loaderIframeAdvisory").show();
        // $("#new-advisory").hide();
        var idCustomer = $('#save-customer').attr('data-id') ? $('#save-customer').attr('data-id') : '';
        // var idCompany = currentTicket.idService.idCompany._id
        $(this).find('iframe').attr('src', '/#ticket-advisory/new?idCustomer=' + idCustomer + '&checkVoice=true');
    });
    // Đóng iframe
    $('#newAdvisoryPopup').on('hide.bs.modal', function (e) {
        $(this).find('iframe').attr('src', '');
        $("#tab-advisory-transaction").click();
    });
    $('#new-advisory').load(function () {
        $(this).show();
        try {
            $("#new-advisory").contents().find("#header").remove()
            $("#new-advisory").contents().find("#crm-tab-nav-bar").html("")
            $("#new-advisory").contents().find("body > .tab-content > #tab-crm > #main  > .container").css("padding", "0").css("width", "100%").removeClass("m-b-50");
            $("#new-advisory").contents().find("#main > div > div > div.card-body.card-padding").css("padding", "10px");
            $("#new-advisory").contents().find("#tab-crm").css("margin-top", "-123px")
            $("#new-advisory").contents().find("#main > div > div").css("margin-bottom", "0px")
        } catch (e) {
            console.log('ERROR_IFRAME_ADVISORY: ', e);
        }
        $("#loaderIframeAdvisory").hide();

    });
    //Tạo global function để đóng modal từ iframe
    window.closeModalAdvisory = function () {
        $('#newAdvisoryPopup').modal('hide');
        getFilterAdvisoryTicket(false);
    };


    var bindValueAdvisory = function () {
        _.each(_.allKeys(_config.MESSAGE.TICKET_ADVISORY), function (item) {
            $('.' + item).html(_config.MESSAGE.TICKET_ADVISORY[item]);
        });
    };


    // Hiển thị dữ liệu lên giao diện
    var loadDataAdvisory = function (resp) {

        var template = '<tr>' +
            '<td>{0}</td>' +
            '<td>{1}</td>' +
            '<td>{2}</td>' +
            '<td>{3}</td>' +
            '<td>{4}</td>' +
            '<td>{5}</td>' +
            '<td class="text-center"><p class="p-t-3 btn btn-flat-bg btn-edit-Advisory" data-target="#editAdvisoryPopup" data-toggle="modal" data-placement="top" data-id="{6}"><i class="zmdi zmdi-edit c-green f-17"></i></p></td>' +
            '</tr>';

        var rows = '';
        resp.data.forEach(function (el) {
            if (_.isEmpty(el)) return;

            rows += template.str(
                el.advisoryTypeId ? el.advisoryTypeId.nameAdvice : '',
                el.content ? el.content : '',
                el.idCustomer ? el.idCustomer.field_ho_ten ? el.idCustomer.field_ho_ten : '' : '',
                el.idCustomer ? el.idCustomer.field_so_dien_thoai : '',
                el.createBy ? el.createBy.displayName : '',
                el.created ? moment(el.created).format('DD/MM/YYYY HH:mm') : '',
                el ? el._id : ''
            );
        });

        $('#body-table').html(rows);
        window.MainContent.loadTooltip();
    };

    //Get id ticket advisory khi click edit
    $(document).on('click', '.btn-edit-Advisory', function () {
        $('#editAdvisoryPopup').attr('data-id', $(this).attr('data-id'))
    })
    // //Load iframe tạo mới phiếu tư vấn
    $('#editAdvisoryPopup').on('shown.bs.modal', function (e) {
        // var idCompany = currentTicket.idService.idCompany._id
        var idTicket = $(this).attr('data-id')
        $(this).find('iframe').attr('src', '/#ticket-advisory/' + idTicket + '/edit?checkVoice=true');
    });
    // Đóng iframe
    $('#editAdvisoryPopup').on('hide.bs.modal', function (e) {
        $(this).find('iframe').attr('src', '');
        $("#tab-advisory-transaction").click();
    });
    $('#edit-advisory').load(function () {
        $(this).show();
        try {
            $("#edit-advisory").contents().find("#header").remove()
            $("#edit-advisory").contents().find("#crm-tab-nav-bar").html("")
            $("#edit-advisory").contents().find("body > .tab-content > #tab-crm > #main  > .container").css("padding", "0").css("width", "100%").removeClass("m-b-50");
            $("#edit-advisory").contents().find("#main > div > div > div.card-body.card-padding").css("padding", "10px");
            $("#edit-advisory").contents().find("#tab-crm").css("margin-top", "-123px")
            $("#edit-advisory").contents().find("#main > div > div").css("margin-bottom", "0px")
        } catch (e) {
            console.log('ERROR_IFRAME_EDIT_ADVISORY: ', e);
        }
        $("#loaderIframeAdvisoryEdit").hide();

    });
    //Tạo global function để đóng modal từ iframe
    window.closeModalAdvisoryEdit = function () {
        $('#editAdvisoryPopup').modal('hide');
        getFilterAdvisoryTicket(false);
    };


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
    function disableComplaint() {
        $('#btn-new-complaint').attr('style', 'display:none')
    }
    return {
        init: function () {
            if (!isEditComplaint) {
                disableComplaint()
            }
            var closest = $('.selectpicker').closest('div');
            closest.addClass('validate-select-picker');
            closest.css('position', 'relative');
            $('.datepicker').datepicker({
                format: 'HH:mm DD/MM/YYYY',
            });

            $('#edit_field_order_card').attr('autocomplete', 'off').typeahead({
                source: orderCards,
                hint: true,
                highlight: true,
                /* Enable substring highlighting */
                minLength: 1 /* Specify minimum characters required for showing suggestions */
            });

            survey = JSON.parse(survey);
            surveyResult = JSON.parse(surveyResult);
            createCallInfo();
            bindClick();
            bindSubmit();
            bindValue();
            bindSocket(_socket);
            showTicket();
            $('#khachhang').attr('style', 'display:none')
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
            $('.selectpicker').selectpicker('refresh');
            queryFilterComplaint(false);
            $('#btn-addTicketComplaint').attr('style', 'display:none')
        },
        uncut: function () {
            $(document).off('click', '.btn-detail');
            $(document).off('click', '.btn-save');
            $(document).off('click', '.zpaging');
            $(document).off('click', '#tab-old-ticket .right-side .btn-back');
            $(document).off('click', '#searchTicket');
            $(document).off('click', '#refreshPage');
            $(document).off('click', '#cancelInput');
            $(document).off('click', '.clickToCall');
            $(document).off('click', '.btn-next');
            $(document).off('click', '.survey-tab');

            $('#frm-update-customer').validationEngine('detach');
            $('#frm-edit-ticket').validationEngine('detach');
            $('#frm-ticket-detail-crm').validationEngine('detach');
            $('#current-survey-form').validationEngine('detach');
            $('#detail-survey-form').validationEngine('detach');
            $('#frm-update-order').validationEngine('detach');
        }
    };
}(jQuery);