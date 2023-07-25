var DFT = function ($) {
    // sự kiên click
    var bindClick = function () {
        // Click nút upload file
        $('input[type="file"][name="upload"]').on('change.bs.fileinput', function () {

            $('#add-new-customer').validationEngine('hide');
            var self = this;
            if (self.files.length > 0) {
                var _extension = _.trim(self.files[0].name.split('.').pop());
                if (['xls', 'xlsx'].indexOf(_extension) < 0) {
                    swal({ title: 'Thông báo', text: 'Tệp tin không hợp lệ !' });
                    $('.close.fileinput-exists').trigger('click');
                    return false;
                }
            }
        });
        $('input[type="file"][name="files"]').on('shown.bs.fileinput,hide.bs.fileinput', function () {
            $('#add-new-customer').validationEngine('hide');
        });
    };

    var bindSubmit = function () {
        // Xác nhận import khách hàng
        $('#add-new-customer').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, prettySelect: true, useSuffix: "_chosen",
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    _AjaxData('/customer-import', 'POST', form.getData(), (resp) => {
                        if (resp && resp.code == 200) {
                            swal({
                                title: "Import dữ liệu từ file excel",
                                text: "Import thành công!",
                                type: "success",
                                confirmButtonText: "Ok",
                                closeOnConfirm: true
                            }, function () {
                                window.location.href = '/#customer-import-history';
                            });
                        } else {
                            swal("Đã xảy ra lỗi !", resp.message, "error");
                        }
                    })
                }
            }
        });
    };

    return {
        init: function () {

            bindClick();
            bindSubmit();
        },
        uncut: function () {
            $('#add-new-customer').validationEngine('detach');
        }
    };
}(jQuery);