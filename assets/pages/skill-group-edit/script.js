var DFT = function ($) {



    // Sự kiện click
    var bindClick = function () {


    };

    // Sự kiện submit
    var bindSubmit = function () {
        $('#add-new-article').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    _AjaxData(window.location.hash.replace('/edit', '').replace('#', ''), 'PUT', form.getData(), function (resp) {
                        console.log({ resp });
                        if (_.isEqual(resp.code, 200)) {
                            swal({ title: 'Thông báo !', text: 'Chỉnh sửa nhóm kỹ năng thành công!' }, function () {
                                window.location.hash = 'manage-skill-groups';
                            });
                        } else {
                            swal({ title: 'Thông báo !', text: resp.message });
                        }
                    });
                }
            }
        });
    };
    return {
        init: function () {
            if (results && results.data && results.data.listIdAgent && results.data.listIdAgent.length) {
                $('#members').val(results.data.listIdAgent.toString())
            }
            bindClick();
            bindSubmit();
        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('change', '#group');
            $('#add-new-article').validationEngine('detach');
        }
    };
}(jQuery);