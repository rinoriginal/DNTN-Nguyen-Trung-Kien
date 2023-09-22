
var DFT = function ($) {

    var bindClick = function () {
        // Hiển thị password
        $(document).on('mousedown', '.showPwd', function (e) {
            //$('.showPwd').mousedown(function(){
            $(this).parent().find(' :input').attr("type", "text");
        })

        // Ẩn password
        $(document).on('mouseup', '.showPwd', function (e) {
            //.mouseup(function(){
            $(this).parent().find(' :input').attr("type", "password");
        });

        $(document).on('click', '.showPwd', function (e) {
            e.preventDefault();
        });
        // Cậu nhật giao diện khi chọn role PM
        $("#pmRole").chosen().change(function(){
            var role = $(this).val().split('-')[0];

            $(".companyRole").each(function() {
                if (role && $(this).val().length > 0 && role.indexOf($(this).val().split('-')[0]) >= 0 ){
                    $(this).val('');
                    $(this).trigger('chosen:updated');
                }
            });
        });

        // Cập nhật giao diện khi thay đổi company Role
        $(".companyRole").chosen().change(function(){
            var role = $(this).val().split('-')[0];
            if (role && $('#pmRole').val().length > 0 && role.indexOf($('#pmRole').val().split('-')[0]) >= 0 ){
                $('#pmRole').val('');
                $('#pmRole').trigger('chosen:updated');
            }
        });
    };

    var bindSubmit = function () {

        $('#add-new-user').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger:'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    _AjaxData('users', 'POST', form.getData(), function (resp) {
                        console.log('resp', resp);
                        // if (_.isEqual(resp.code, 200)) {
                        //     window.location.hash = 'users';
                        // } else {
                        //     swal({title: 'Thông báo !', text: resp.message});
                        // }
                    });
                }
            }
        });
    };

    // Hiển thị tên trường theo file config
    var bindTextValue = function () {
        $('#text_user_name').html(_config.MESSAGE.USER_MANAGER.TXT_USER_NAME + '<span class=\"required\">*</span>');
        $('#text_pass_word').html(_config.MESSAGE.USER_MANAGER.TXT_PASS_WORD + '<span class=\"required\">*</span>');
        $('#text_re_pass_word').html(_config.MESSAGE.USER_MANAGER.TXT_RE_PASS_WORD + '<span class=\"required\">*</span>');
        $('#text_account_code').html(_config.MESSAGE.USER_MANAGER.TXT_ACCOUNT_CODE);
        $('#text_display_name').html(_config.MESSAGE.USER_MANAGER.TXT_DISPLAY_NAME + '<span class=\"required\">*</span>');
        $('#text_email').html(_config.MESSAGE.USER_MANAGER.TXT_EMAIL + '<span class=\"required\">*</span>');
        $('#text_status').html(_config.MESSAGE.USER_MANAGER.TXT_STATUS);
        $('#txt_user_name_desc').html(_config.MESSAGE.USER_MANAGER.TXT_USER_NAME_DESC);
        $('#txt_pass_word_desc').html(_config.MESSAGE.USER_MANAGER.TXT_PASS_WORD_DESC);
        $('#txt_re_pass_word_desc').html(_config.MESSAGE.USER_MANAGER.TXT_RE_PASS_WORD_DESC);
        $('#text_display_name_desc').html(_config.MESSAGE.USER_MANAGER.TXT_DISPLAY_NAME_DESC);
        $('#text_account_code_desc').html(_config.MESSAGE.USER_MANAGER.TXT_ACCOUNT_CODE_DESC);
        $('#text_role').html(_config.MESSAGE.USER_MANAGER.TXT_ROLE);
    }

    return {
        init: function () {

            bindClick();
            bindSubmit();
            bindTextValue();

            $(".role-select").chosen({'.role-select'  : {allow_single_deselect:true}});
            $.validationEngineLanguage.allRules['userNameCheck'] = {
                "url": "/users/validate",
                "extraData": "type=new",
                "extraDataDynamic": ['#name'],
                "alertText": "* Tên người dùng này đã được sử dụng",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };
        },
        uncut: function () {
            // Disable sự kiện khi đóng trang
            $(document).off('mousedown', '.showPwd');
            $(document).off('mouseup', '.showPwd');
            $(document).off('click', '.showPwd');
            $('#add-new-user').validationEngine('detach');
        }
    };
}(jQuery);

function checkSpaceInString(field, rules, i, options){
    if (field.val().indexOf(' ') >= 0) {
        // this allows the use of i18 for the error msgs
        return '* ' + _config.MESSAGE.USER_MANAGER.ALERT_SPACE_NOT_ALLOW;
    }
}