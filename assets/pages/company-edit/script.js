
var DFT = function ($) {

    // Sự kiện click
    var bindClick = function () {
        // Thay đổi trạng thái công ty
        $(document).on('change', '#status', function () {
            $(this).val(Number($(this).is(':checked')));
        });

        $(document).on('click', '#cancelInput', function () {
        //$("#cancelInput").click(function(){
            window.history.back();
        });
    };

    // Sự kiện submit
    var bindSubmit = function () {
        // Click xác nhận sửa thông tin
        $('#edit-company').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger:'keyup',
            onValidationComplete: function (form, status) {
                form.on('submit', function (e) {
                    e.preventDefault();
                });
                if (status) {

                    var diff= [];
                    _AjaxData(window.location.hash.replace('edit','').replace('#', ''), 'PUT', $(form).getData(), function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            window.location.hash = 'company';
                        } else {
                            swal({title: 'Thông báo !', text: resp.message});
                        }
                    });
                }
            }
        });
    };

    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindTextValue = function(){
        //$('#company-profile-text').val(_config.MESSAGE.COMPANY.COMPANY_PROFILE + '<span class="required">*</span>');
        $('#txt_company_name').html(_config.MESSAGE.COMPANY.TEXT_COMPANY_NAME + "<span class='required'>*</span>");
        $('#txt_company_profile').html(_config.MESSAGE.COMPANY.TEXT_COMPANY_PROFILE + "<span class='required'>*</span>");
        $('#txt_company_leader').html(_config.MESSAGE.COMPANY.TEXT_COMPANY_LEADER + "<span class='required'>*</span>");
        $('#txt_recipe_SLA').html(_config.MESSAGE.COMPANY.TEXT_RECIPE_SLA);
        $('#txt_recipe_SLA_Chat').html(_config.MESSAGE.COMPANY.TEXT_RECIPE_SLA_CHAT);
        $('#txt_company_agent').html(_config.MESSAGE.COMPANY.TEXT_COMPANY_AGENT_GROUP);
        $('#txt_company_status').html(_config.MESSAGE.COMPANY.TEXT_STATUS);
    }

    // Cấu hình nhận socket từ server
    var bindSocket= function(client){
        $('#socketId').val(_socket.id);
        // Nhận dữ liệu Trunk
    }

    return {
        init: function () {
            $.fn.serializeObject = function() {
                var o = {};
                var a = this.serializeArray();
                $.each(a, function() {
                    if (o[this.name]) {
                        if (!o[this.name].push) {
                            o[this.name] = [o[this.name]];
                        }
                        o[this.name].push(this.value || '');
                    } else {
                        o[this.name] = this.value || '';
                    }
                });
                return o;
            };

            // Cấu hình thẻ dual list box
            var dualList = $('select[name="managerId[]"]').bootstrapDualListbox({
                filterTextClear: 'Filter',
                infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
                infoText: "<a class='c-blue' ><b>Số lượng user: {0}</b></a>"
            });

            var dualListAgent = $('select[name="agentId[]"]').bootstrapDualListbox({
                filterTextClear: 'Filter',
                infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
                infoText: "<a class='c-blue' ><b>Số lượng AgentGroup: {0}</b></a>"
            });

            $(".bootstrap-duallistbox-container").find(".moveall").parent().remove();
            $(".bootstrap-duallistbox-container").find(".removeall").parent().remove();


            // Cấu hình validation
            $.validationEngineLanguage.allRules['CompanyNameCheck'] = {
                "url": "/company/validate",
                "extraData": '',
                "extraDataDynamic": ['#name'],
                "alertText": "* Trùng tên công ty",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };

            bindClick();
            bindSubmit();
            bindTextValue();
            bindSocket(_socket);
            initTrunk();
        },
        uncut: function(){
            // Disable sự kiện khi đóng trang
            $(document).off('change', '#status');
            $(document).off('click', '#cancelInput');
            $('#edit-company').validationEngine('detach');
        }
    };
}(jQuery);