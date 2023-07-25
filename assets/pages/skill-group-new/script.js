var DFT = function ($) {



    // Sự kiện click
    var bindClick = function () {


    };

    // Sự kiện submit
    var bindSubmit = function () {
        $('#add-new-article').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true,validationEventTrigger:'keyup',
            onValidationComplete: function (form, status) {
                for ( instance in CKEDITOR.instances )
                    CKEDITOR.instances[instance].updateElement();
                if (status) {
                    _AjaxData('/manage-skill-groups', 'POST', form.getData(), function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            swal({title: 'Thông báo !', text: 'Tạo mới nhóm kỹ năng thành công!'},function(){
                                window.location.hash = 'manage-skill-groups';
                            });
                        } else {
                            swal({title: 'Thông báo !', text: resp.message});
                        }
                    });
                }
            }
        });
    };
    return {
        init: function () {
            bindClick();
            bindSubmit();
        },
        uncut: function(){
            // xóa sự kiện khi rời trang
            $(document).off('change', '#group');
            $('#add-new-article').validationEngine('detach');
        }
    };
}(jQuery);