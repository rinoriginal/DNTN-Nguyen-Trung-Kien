/**
 * 18.Mar.2023 kiennt
 * @type {{init, uncut}}
 */
var DFT = function($) {

    // Bắt sự kiện click
    var bindClick = function() {

    };
    var intervalCisco = null;
    // Gắn sự kiện submit
    var bindSubmit = function() {
        // Xác nhận tạo mới subreason
        $('#ticket-import-by-phone').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            onValidationComplete: function(form, status) {
                if (status) {
                    _AjaxData('/ticket-import-by-phone', 'POST', form.getData(), function(resp) {
                        if (_.isEqual(resp.code, 200)) {
                            let idCampain = (resp.campaign && resp.campaign._id.toString())
                            let idCompany = (resp.campaign && resp.campaign.idCompany)
                            let phone = resp.phoneNumber
                            window._finesse.makeCall(phone, getCookie('_extension'), function(_1, _2, xhr) {
                                if (xhr && xhr.status === 202) {
                                    intervalCisco = setInterval(function() {
                                        getDialogsFromCisco(resp.ticketId, idCompany, idCampain, phone);
                                    }, 1000);
                                }
                            }, _makeCallHandler);
                            window.location.hash = 'ticket-edit?ticketID=' + resp.ticketId;
                        } else {
                            swal({ title: 'Thông báo !', text: resp.message });
                        }
                    });
                }
            }
        });
    };
    function getDialogsFromCisco(currentTicketId, companyId, campainId, callNumber ) {
        window._finesse.getDialogs(getCookie('_agentId'), function(_11, _22, data) {
            let response = JSON.parse(xml2json(data.responseText));
            if (response && response.Dialogs && response.Dialogs.Dialog){
                let dialog = response.Dialogs.Dialog;
                let queryParams = `?type=create&ticketId=${currentTicketId}&companyId=${companyId}&campainId=${campainId}`
                _Ajax('/voice-subscribe-cisco' + queryParams, 'POST', [{
                    data: JSON.stringify({
                        fromAddress: getCookie('_extension'),
                        toAddress: callNumber,
                        participants: dialog.participants,
                        id: dialog.id
                    })
                }], function(resp) {
                    clearInterval(intervalCisco);
                });
            }
        });
    }
    return {
        init: function() {
            bindClick();
            bindSubmit();
        },
        uncut: function() {
            $('#ticket-import-by-phone').validationEngine('detach');
        }
    };
}(jQuery);