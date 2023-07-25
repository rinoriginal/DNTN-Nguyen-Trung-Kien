var DFT = function($) {
    var _oldTicketLeft = $('#tab-old-ticket .left-side');
    var _oldTicketRight = $('#tab-old-ticket .right-side');
    var detailTicketReasonCategory = {};
    var detailTicket = {};
    var _curCallLabel = null;
    var intervalCisco = null;
    var bindSocket = function(client) {
        client.on('ChangeAgentCallStatus', function(data) {
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
        }
    };
    var bindClick = function() {
        // Hiển thị dữ liệu ticket liên quan
        $(document).on('click', '.btn-detail', function() {
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
            _oldTicketLeft.fadeOut(function() {
                _Ajax('ticket-edit', 'POST', [{ _id: button.attr('data-id') }], function(resp) {
                    if (resp.code == 500) return swal({ title: 'Đã có lỗi xảy ra', text: resp.message });
                    _oldTicketRight.fadeIn();
                    var formId = '#frm-ticket-detail-crm ';

                    detailTicket = resp.message.ticket;
                    detailTicketReasonCategory = resp.message.info.ticketReasonCategory;

                    $(formId + '#title').html(resp.message.serviceName);
                    $(formId + '#ticket-detail-properties').html(zoka.showTicketInfo(
                        resp.message.ticket,
                        resp.message.info.ticketReasonCategory,
                        resp.message.info.assign,
                        resp.message.info.statisfy,
                        3
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


                    $('#detail-survey-form').html(zoka.createSurvey(resp.message.survey, resp.message.surveyResult, 'detail-survey-form', resp.message));

                    if (!resp.message.info.isEdit) {
                        disableEditTicket(formId);
                    }

                    refreshComponent();
                });
            });
        });

        // Nhấn nút lưu ticket
        $(document).on('click', '.btn-save', function() {
            $($(this).attr('data-target')).trigger('submit');
        });

        // Chuyển trang
        $(document).on('click', '.zpaging', function() {
            var parent = $(this).closest('.list-view');
            var queryLink = $(this).attr('data-link');

            _Ajax(queryLink, 'GET', {}, function(resp) {
                if (resp.code == 200) {
                    var ticketBody = zoka.showTicketListBody(resp.message.data, parent.hasClass('view-detail'));
                    var ticketPage = zoka.createPaging(resp.message.paging);

                    parent.find('#ticket-history-list').html(ticketBody);
                    parent.find('.paging-list').html(ticketPage);
                    $("#frm-edit-ticket-customer-chat").html(zoka.showTicketListCustomerJourney(null, resp.message.data, true));
                    $(".paging-list-chat").html(zoka.createPaging(resp.message.paging));
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

        $(document).on('click', '#cancelInput', function() {
            window.history.back();
        });

        // Hiển thị dữ liệu lịch sử ticket
        $(document).on('click', '#tab-old-ticket .right-side .btn-back', function() {
            $(MainContent.prefix('#save-ticket-detail-crm')).attr('data-id', '');
            _oldTicketRight.fadeOut(function() {
                _oldTicketLeft.fadeIn();
            });
        });

        // Tìm kiếm lịch sử ticket
        $(document).on('click', '#searchTicket', function() {
            var parent = $(this).closest('.left-side');
            var searchObj = '/ticket-chat-edit?search=1&idCustomer=' + $(this).attr('data-id') + '&tId=' + $(this).attr('data-ticket-id');
            $('#searchRelateTicket .searchColumn').each(function() {
                var obj = $(this);
                if (obj.attr('name') && !_.isEmpty(obj.val())) {
                    searchObj += ('&' + obj.attr('name') + '=' + obj.val());
                }
            });
            _Ajax(searchObj, 'GET', {}, function(resp) {
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

        // Tải lại trang
        $(document).on('click', '#refreshPage', function() {
            _.LoadPage(window.location.hash);
        });

        // Gọi ra trực tiếp từ giao diện
        $(document).on('click', '.clickToCall', function() {
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
                if (currentTicket.idService && currentTicket.idService.idChannel && currentTicket.idService.idChannel.idCompany) {
                    companyId = currentTicket.idService.idChannel.idCompany._id;
                }

                let campainId = undefined;

                let serviceId = undefined;
                if (currentTicket.idService) {
                    serviceId = currentTicket.idService._id;
                }
                // 21.Mar.2017 hoangdv Thực hiện gọi ra trên ticket gọi vào, hỏi có tạo ticket hay không?
                if (currentTicket && currentTicket.idService) {
                    // là ticket gọi vào - confirm tạo ticket
                    swal({
                        title: "Thông báo",
                        text: "Bạn đang gọi ra trên ticket  chát!",
                        type: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Tạo ticket gọi ra!",
                        cancelButtonText: "Thực hiện gọi ra!",
                        closeOnConfirm: true,
                        closeOnCancel: true,
                    }, function(isConfirm) {
                        if (isConfirm) {
                            createTicketByPhone(callNumber);
                        } else {
                            getDialogsFromCisco(callNumber, currentTicket)
                        }
                    }, _handler);
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
                        
                        // Khi có cuộc call kết nối thực hiện call api tạo ticket
                        let data = {
                            id: dialog && dialog.id,
                            ticketId: currentTicket && currentTicket._id
                        }
                        jQuery.post('/api/v1/voice/update-ticket', data
                            , function (resp) {
                                if (resp && resp.code == 200) {
                                    $.LoadingOverlay("hide");
                                } else {
                                    $.LoadingOverlay("hide");
                                    return swal({
                                        title: "Thông báo",
                                        text: "Tạo thông tin khách hàng và ticket thất bại!",
                                        type: "warning",
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: "OK",
                                        closeOnConfirm: true,
                                    });
                                }
                                
                            });
                    })
                }
            }, _makeCallHandler);
        }
        /**
         * Sự kiện click yêu cầu tạo ticket theo số điện thoại ở ô input
         */
        $(document).on('click', '.clickToCreateTicket', function() {
            var phoneNumber = $(this).attr('data-phone-number') ? $(this).attr('data-phone-number') : $(this).prev('input').val();
            if (!phoneNumber) {
                phoneNumber = $(this).prev('input').val();
            }
            createTicketByPhone(phoneNumber);
        });

        /**
         * 22.Mar.2017 hoangdv Mở cửa newtab thực hiện tạo ticket dựa trên số điện thoại
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

        // Cập nhật giao diện khi thay đổi nhóm tình trạng ticket
        $(document).on('change', '.ticketReasonCategory', function() {
            setTicketReason($(this).val(), $(this).closest('form').attr('id'));

            //var changeValue = $(this).val();
            //var parentForm = $(this).closest('form').attr('id');
            //var trc = {}, childTicket = {};
            //if ( _.isEqual(parentForm, 'frm-edit-ticket')){
            //    trc = ticketReasonCategory;
            //    childTicket = currentTicket;
            //}else{
            //    trc = detailTicketReasonCategory;
            //    childTicket = detailTicket;
            //}
            //
            //var htmlChange = _.Tags(zoka.createTicketSubReasonRows(childTicket, trc, changeValue));
            //$('#' + parentForm + ' .ticketSubreason').html(htmlChange).trigger('chosen:updated');
        });
    };


    function _makeCallHandler(data, statusText, xhr) {
        console.log("Make call RESPONSE", statusText);

        //Validate success.
        if (statusText === "success") {

        }
    }

    function _handler(data, statusText, xhr) {
        if (xhr) {
            console.log("RESPONSE", xhr.status);
        } else {
            console.log("RESPONSE", data);
        }
    }

    var bindSubmit = function() {
        // Xác nhận cập nhật thông tin khách hàng
        $('#frm-update-customer').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function(form, status) {
                let facebook = $("#edit_field_facebook").val();
                let zalo = $("#edit_field_zalo").val();
                let query = `?field_facebook=${facebook}&field_zalo=${zalo}`
                if (status) {
                    _AjaxData('/ticket-chat-edit/customer-' + $('#save-customer').attr('data-id')+ query, 'PUT', $(form).getData(), function(resp) {
                        if (resp.code == 200) {
                            swal({
                                title: 'Cập nhật thành công',
                                text: '',
                                type: "success",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Xác nhận",
                                closeOnConfirm: true
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
            // Xác nhận cập nhật thông tin ticket
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function(form, status) {
                if (status) {
                    _AjaxData('/ticket-chat-edit/editTicket-' + $('#save-new-ticket').attr('data-id'), 'PUT', $(form).getData(), function(resp) {

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
                                title: 'Đã có lỗi xảy ra',
                                text: resp.message,
                                type: "error",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Quay lại!",
                                closeOnConfirm: true
                            });
                        };
                    });
                }
            }
        });

        $('#frm-ticket-detail-crm').validationEngine('attach', {
            // Xác nhận cập nhật dữ liệu ticket liên quan
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function(form, status) {
                if (status) {
                    _AjaxData('/ticket-chat-edit/editTicket-' + $('#save-ticket-detail-crm').attr('data-id'), 'PUT', $(form).getData(), function(resp) {
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
            // Xác nhận cập nhật dữ liệu câu hỏi khảo sát
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function(form, status) {
                if (status) {
                    var dataLink = $('#current-survey-form #save-survey').attr('data-link');
                    _AjaxData('/survey-result/' + dataLink, 'PUT', $(form).getData(), function(resp) {
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
            // Xác nhận cập nhật câu hỏi khảo sát của ticket liên quan
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function(form, status) {
                if (status) {
                    var dataLink = $('#detail-survey-form #save-survey').attr('data-link');
                    _AjaxData('/survey-result/' + dataLink, 'PUT', $(form).getData(), function(resp) {
                        if (resp.code == 200) {
                            swal({ title: 'Lưu thông tin thành công', text: resp.message });
                        } else {
                            swal({ title: 'Đã có lỗi xảy ra', text: resp.message });
                        }
                    });
                }
            }
        });
    };

    // Hiển thị tên cột theo file config
    var bindValue = function() {
        _.each(_.allKeys(_config.MESSAGE.CUSTOMER_INFO), function(item) {
            $('.' + item).html(_config.MESSAGE.CUSTOMER_INFO[item]);
        });
    };

    // Cập nhật dữ liệu tình trạng ticket
    var setTicketReason = function(changeValue, parentForm) {
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

    // Hiển thị dữ liệu ticket lên giao diện
    var showTicket = function() {
        var parent = $(this).closest('#frm-edit-ticket');
        var currentTicketId = '#frm-edit-ticket ';
        $(currentTicketId + '#ticket-info').html(zoka.showTicketInfo(currentTicket, ticketReasonCategory, assign, statisfy, 3));
        setTicketReason(currentTicket.ticketReasonCategory, 'frm-edit-ticket');
        $('.selectpicker').selectpicker('refresh');
        $(currentTicketId + '#edit-ticket-history .ticket-history').html(zoka.showTicketList(currentTicket, ticketHistory.data, false));
        $(currentTicketId + '#edit-ticket-history .paging-list').html(zoka.createPaging(ticketHistory.paging));
        parent.find('#edit-ticket-history1 .ticket-history1').html(zoka.showTicketListBody(ticketCustomerJourney.data, true));
        // $('#edit-ticket-history1 .ticket-history1').html(zoka.showTicketListBody(ticketCustomerJourney.data, true));
        $('#edit-ticket-history1 .paging-list1').html(zoka.createPaging(ticketCustomerJourney.paging));

        $(currentTicketId + '#current-survey-form').html(zoka.createSurvey(survey, surveyResult, 'current-survey-form', currentTicket));

        if (!isEdit) {
            disableEditTicket(currentTicketId);
        }

        var ticketHistoryId = '#edit-ticket-history ';
        $(ticketHistoryId + '.ticket-history').html(zoka.showTicketList(currentTicket, ticketHistory.data, false));
        $(ticketHistoryId + '.paging-list').html(zoka.createPaging(ticketHistory.paging));

        var relateTicketId = '#tab-old-ticket ';
        $(relateTicketId + '#ticket-info').html(zoka.showTicketList(currentTicket, tickets.data, true));
        $(relateTicketId + '.paging-list').html(zoka.createPaging(tickets.paging));
        $(relateTicketId + '#ticket-detail-properties').html(zoka.showTicketInfo(null, ticketReasonCategory, null, 3));
        $(relateTicketId + '#ticket-list').html(zoka.showTicketList(null, null, false));

        refreshComponent();
    };

    // Khóa chức năng cập nhật ticket
    var disableEditTicket = function(formId) {
        $(formId + '*').attr('readonly', true);
        $(formId + '.selectpicker').attr('disabled', true).selectpicker('refresh');
        $(formId + '.tag-select').attr('disabled', true).trigger('chosen:updated');
        $(formId + 'button').attr('disabled', true);
    };

    var refreshComponent = function() {
        bindValue();

        $('.selectpicker').selectpicker();
        $('.tag-select').chosen();
        $('.chosen-container').css('width', '100%');
        $('.date-time-picker').datetimepicker();
    };

    return {
        init: function() {
            var closest = $('.selectpicker').closest('div');
            closest.addClass('validate-select-picker');
            closest.css('position', 'relative');
            $('.datepicker').datepicker({
                format: 'HH:mm DD/MM/YYYY'
            });
            bindSocket(_socket);
            bindClick();
            bindSubmit();
            bindValue();
            showTicket();
            //zoka.ticketReasonEvent($, '#frm-edit-ticket', '#ticketReasonCategory', '#ticketSubreason', '.tReason', {});
            //$('.testthoima').html('<select class="select-picker form-control" id="123conma">' +
            //    '<option>123123123</option>' +
            //    '<option>123123123</option>' +
            //    '<option>123123123</option>' +
            //    '<option>123123123</option>' +
            //    '<option>123123123</option>' +
            //    '</select>');
            //
            //$('#123conma').selectpicker()
        },
        uncut: function() {
            // Disable sự kiện khi đóng trang
            $(document).off('click', '.btn-detail');
            $(document).off('click', '.btn-save');
            $(document).off('click', '.zpaging');
            $(document).off('click', '#tab-old-ticket .right-side .btn-back');
            $(document).off('click', '#searchTicket');
            $(document).off('click', '#refreshPage');
            $(document).off('click', '#cancelInput');
            $(document).off('click', '.clickToCall');
            $(document).off('change', '.ticketReasonCategory');
            $('#frm-update-customer').validationEngine('detach');
            $('#frm-edit-ticket').validationEngine('detach');
            $('#frm-ticket-detail-crm').validationEngine('detach');
            $('#current-survey-form').validationEngine('detach');
            $('#detail-survey-form').validationEngine('detach');
        }
    };
}(jQuery);