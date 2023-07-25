var DFT = function ($) {

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {

        // Nhấn nút back
        $(document).on('click', '#btn-back', function () {
            window.location.hash = 'manage-skill-groups';
        });

        // Khi thay đổi giá trị của danh sách trưởng nhóm
        $(document).on('change', '#leaders', function () {
            var leaders = $(this).val();
            var members = $('#members').val();
            $('#members').bootstrapDualListbox().val(_.difference(members, leaders));
            $('#members').bootstrapDualListbox('refresh');

        });

        // Khi thay đổi giá trị của thành viên trong nhóm
        $(document).on('change', '#members', function () {
            var members = $(this).val();
            var leaders = $('#leaders').val();
            $('#leaders').bootstrapDualListbox().val(_.difference(leaders, members));
            $('#leaders').bootstrapDualListbox('refresh');
        });

    };

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

        $('#update-group').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    // Display the key/value pairs
                    for (var pair of $(form).getData()) {
                        console.log(pair[0] + ', ' + pair[1]);
                    }
                    console.log('url', window.location.hash.replace('/edit', '').replace('#', ''));
                    _AjaxData(window.location.hash.replace('/edit', '').replace('#', ''), 'PUT', $(form).getData(), function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            swal({ title: 'Thông báo !', text: 'Cập nhật skill group thành công' }, function () {
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

    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindtextValue = function () {
        $('#edit_agent_lits_agent').html(_config.MESSAGE.AGENT_GROUPS.EDIT_TEXT_AGENT_LIST_AGENT);


    };
    return {
        init: function () {
            // Cấu hình thẻ dual list box
            var dualListLeader = $('select[name="leaders[]"]').bootstrapDualListbox({
                filterTextClear: 'Filter',
                infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
                infoText: "<a class='c-blue' ><b>Số lượng leader: {0}</b></a>"
            });

            var dualListAgent = $('select[name="members[]"]').bootstrapDualListbox({
                filterTextClear: 'Filter',
                infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
                infoText: "<a class='c-blue' ><b>Số lượng agent: {0}</b></a>"
            });

            $(".bootstrap-duallistbox-container").find(".moveall").parent().remove();
            $(".bootstrap-duallistbox-container").find(".removeall").parent().remove();

            // Cấu hình validation
            $.validationEngineLanguage.allRules['GroupAvailCheck'] = {
                "url": "/agent-groups/validate",
                "extraData": "type=update",
                "extraDataDynamic": ['#name,#cName'],
                "alertText": "* Nhóm này đã tồn tại",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };

            bindClick();
            bindSubmit();
            bindtextValue();

            //addProfile($('#idParent').val());

            // map những agent đã được lưu
            $('#members').bootstrapDualListbox().val(agentsList);
            $('#members').bootstrapDualListbox('refresh');
            $('.selectpicker').selectpicker('refresh'); //refresh 1 lần duy nhất khi load trang

        },
        // xóa sự kiện khi rời trang
        uncut: function () {
            $(document).off('change', '#status');
            $(document).off('change', '#idParent');
            $(document).off('change', '#leaders');
            $(document).off('change', '#members');
            $(document).off('click', '#btn-back');
            $('#update-group').validationEngine('detach');
        }
    };
}(jQuery);