var DFT = function ($) {

    //Tạo mới tư vấn
    var createTicketComplaint = function () {
        $('#frm-mail-complaint').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    var formData = $(form).serializeJSON();
                    formData.idRestaurant = $('#btnSave').attr('data-id');
                    console.log(55, formData);
                    _Ajax('/mail-complaint', 'POST', [{ data: JSON.stringify(formData) }], function (res) {
                        // _AjaxObject('/mail-complaint', 'POST', formData, function (res) {
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
            createTicketComplaint();
        },
        uncut: function () {

        }
    };
}(jQuery);