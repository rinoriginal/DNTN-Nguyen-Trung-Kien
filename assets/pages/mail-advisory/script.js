var DFT = function ($) {

    //Tạo mới tư vấn
    var createTicketAdvisory = function () {
        $('#frm-mail-advisory').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {

                    // var formData = form.getData()
                    console.log(11111111);

                    var getData = $(form).serializeJSON();
                    var lstMail = []
                    let str = '';
                    lstMail.push({ type: 1, email: getData['tuyendung'] })
                    lstMail.push({ type: 2, email: getData['dexuat'] })
                    str += getData['khac1']
                    str += ',' + getData['khac2']
                    lstMail.push({ type: 3, email: str })

                    // var _lstMail = _.chain(Object.keys(getData))
                    //     .reduce(function (memo, el) {
                    //         console.log(11111, el);
                    //         let str = '';
                    //         if (_.isEqual('tuyendung', el)) lstMail.push({ type: 1, email: getData[el] })
                    //         if (_.isEqual('dexuat', el)) lstMail.push({ type: 2, email: getData[el] })
                    //         if (_.isEqual('khac1', el)) str += getData[el]
                    //         if (_.isEqual('khac2', el)) str += ',' + getData[el]
                    //         lstMail.push({ type: 3, email: str })
                    //         return memo = lstMail;
                    //     }, {}).value();
                    console.log(5555555, lstMail);






                    var formData = {
                        emails: lstMail,
                        note: getData.note,
                    }
                    console.log(55, formData);
                    _Ajax('/mail-advisory', 'POST', [{ data: JSON.stringify(formData) }], function (res) {
                        // _AjaxObject('/mail-advisory', 'POST', formData, function (res) {
                        if (res.code == 200) {
                            swal({
                                title: 'Tạo mới thành công',
                                text: '',
                                type: "success",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Xác nhận",
                                closeOnConfirm: true
                            }, function () {

                            }
                            );
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
                    })




                }
            }
        })
    }

    var bindclick = function () {

    }


    return {
        init: function () {
            $('.container').attr('class', 'container m-b-10')
            bindclick();
            createTicketAdvisory();

        },
        uncut: function () {

        }
    };
}(jQuery);