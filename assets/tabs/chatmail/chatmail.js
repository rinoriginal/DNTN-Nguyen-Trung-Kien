;
(function ($) {
    var _customer = {}

    function loadTicketChat(_phoneNumber, _name, _email, id, idChannelCisco, activityId) {
        console.log('load ticket chat')
        async.waterfall([
            function (next) {
                _Ajax(`/chat-subscribe-cisco?idCallDialog=${id}&idChannelCisco=${idChannelCisco}&phoneNumber=${_phoneNumber}&email=${_email}&name=${_name}&activityId=${activityId}`, 'POST', [],
                    function (res) {
                        if (res) {
                            if (res.code == 200) {
                                var chatThread = res.result
                                _customer['threadId'] = chatThread._id
                                _customer['idService'] = chatThread.idServiceChat
                                next()
                            }
                        }
                    });
            },
            function (next) {
                _AjaxObject(`/chat-client?queryCustomer=1&phoneNumber=${_phoneNumber}&name=${_name}&email=${_email}&idCallDialog=${id}&type=chat&mode=2`, 'GET', [],
                    function (res) {
                        if (res) {
                            if (res.code == 200) {
                                _customer['idCustomer'] = res.customer._id
                                _customer['ticketId'] = res.ticket
                                _customer['threadId'] = res.threadId
                                _customer['email'] = _email
                                _customer['idCallDialog'] = id
                                next()
                            }
                        }
                    });
            }

        ], function (error, result) {
            loadFormTicket(_customer)
        })

    }

    function loadTicketMail(id, email, subject, queueNumber, queueName, activityId) {
        console.log('load ticket mail')
        async.waterfall([
            function (next) {
                let queryString = `idMailCisco=${id}&email=${email}&queueNumber=${queueNumber}&queueName=${queueName}&activityId=${activityId}&subject=${subject}`
                console.log('query', queryString)
                _Ajax(`/chat-subscribe-cisco?` + queryString, 'POST', [],
                    function (res) {
                        if (res) {
                            if (res.code == 200) {
                                console.log("email thread", res)
                                var emailThread = res.result
                                _customer['mailId'] = emailThread._id
                                _customer['idServiceMail'] = emailThread.service
                                next()
                            }
                        }
                    });
            },
            function (next) {
                let queryParams = `queryCustomer=1&idMailCisco=${id}&email=${email}&subject=${subject}&queueNumber=${queueNumber}&queueName=${queueName}`
                _AjaxObject(`/chat-client?` + queryParams, 'GET', [],
                    function (res) {
                        console.log('res mail', res);
                        if (res) {
                            if (res.code == 200) {
                                _customer['idCustomer'] = res.customer._id
                                _customer['ticketId'] = res.ticket
                                _customer['mailId'] = res.mailId
                                _customer['idMailCisco'] = id
                            }
                        }
                    });
            }

        ], function (error, result) {
            loadFormTicket(_customer)
        })
    }

    function loadFormTicket(customer) {
        $('#frm-update-ticket').empty();
        var ticketId = customer && customer.ticketId;
        var mailId = customer && customer.mailId ? customer.mailId : "";
        var ticketParam = (ticketId != null && ticketId != undefined) ? ('&ticketId=' + ticketId) : '';

        if (_.has(customer, 'idCustomer') && customer.idCustomer != null) {
            ticketParam = ticketParam + '&CustomerId=' + customer.idCustomer;
        } else {
            if (_.has(customer, 'field_so_dien_thoai') && customer['field_so_dien_thoai'].length) {
                ticketParam = ticketParam + '&field_so_dien_thoai=' + customer['field_so_dien_thoai'][0];
            }
            if (_.has(customer, 'field_e_mail') && customer['field_e_mail'].length) {
                ticketParam = ticketParam + '&field_e_mail=' + customer['field_e_mail'];
            }
        }
        if (mailId) {
            $('#frm-update-ticket').append('<iframe id="frm-ticket" width="100%" height="100%" border="none" src="/ticket?type=mail&mailId=' + mailId + '&service=' + customer.idServiceMail + '&threadId=' + customer.threadId + '&dialogId=' + ticketParam + '&idMailCisco=' + customer.idMailCisco + '"></iframe>');
        } else {
            $('#frm-update-ticket').append('<iframe  id="frm-ticket" width="100%" height="100%" border="none" src="/ticket?type=chat&mailId=' + mailId + '&service=' + customer.idService + '&threadId=' + customer.threadId + '&dialogId=' + ticketParam + '&email=' + customer.email + '&idCallDialog=' + customer.idCallDialog + '"></iframe>');
        }
    }
    $(document).ready(function () {
        // _socket.on('EventChat', function (data) {
        //     if (data.state == 2) {
        //         $('#accordion').show();
        //         loadTicketChat(data.sdt, data.name, data.email, data.id, data.idChannelCisco, data.activityId);
        //     }
        // });

        // _socket.on('EventMail', function (data) {
        //     if (data.state == 2 || data.state == 3) {
        //         $('#accordion').show();
        //         loadTicketMail(data.id, data.email, data.subject, data.queueNumber, data.queueName, data.activityId);
        //     }
        // });
    });

})(jQuery);