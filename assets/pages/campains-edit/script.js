var DFT = function ($) {

    // Tạo thẻo option cho thẻ selectpicker
    var newOption = function(obj){
        return _.Tags([
            {tag: 'option', attr: {class: 'option-s', value: obj._id}, content: obj.name}
        ]);
    };

    // Sự kiện click
    var bindClick = function () {
        // Thay đổi loại chiến dịch
        $(document).on('change', '#type', function () {
            if(!_.isEqual($(this).val(), '1')){
                $.map($('.auto-dialing'), function(n, i){
                    $(n).removeClass('hidden');
                });
            }else {
                $.map($('.auto-dialing'), function(n, i){
                    $(n).addClass('hidden');
                });
            }
        });
        if(_.isEqual($('#type').val(), '1')){
            $.map($('.auto-dialing'), function(n, i){
                $(n).addClass('hidden');
            });
            $.map($('.auto-dialing-cisco'), function(n, i){
                $(n).addClass('hidden');
            });
            $('#campaignPrefix').removeClass("validate[required]")
            $('#dialedNumber').removeClass("validate[required]")
            $('#autoDialingMode').removeClass("validate[required]")
            $('#idSkillGroup').removeClass("validate[required]")
            $('#startTime').removeClass("validate[required]")
            $('#endTime').removeClass("validate[required]")
        }
        if(_.isEqual($('#type').val(), '2')){
            $.map($('.auto-dialing-cisco'), function(n, i){
                $(n).removeClass('hidden');
            });
            $.map($('.auto-dialing'), function(n, i){
                $(n).removeClass('hidden');
            });
            $('#campaignPrefix').addClass("validate[required]")
            $('#dialedNumber').addClass("validate[required]")
            $('#autoDialingMode').addClass("validate[required]")
            $('#idSkillGroup').addClass("validate[required]")
            $('#startTime').addClass("validate[required]")
            $('#endTime').addClass("validate[required]")
        }
        if(_.isEqual($('#type').val(), '3')){
            $.map($('.auto-dialing'), function(n, i){
                $(n).removeClass('hidden');
            });
            $.map($('.auto-dialing-cisco'), function(n, i){
                $(n).addClass('hidden');
            });
            $('#campaignPrefix').removeClass("validate[required]")
            $('#dialedNumber').removeClass("validate[required]")
            $('#autoDialingMode').removeClass("validate[required]")
            $('#idSkillGroup').removeClass("validate[required]")
            $('#startTime').removeClass("validate[required]")
            $('#endTime').removeClass("validate[required]")
        }

        // Thay đổi công ty
        $('#idCompany').on('change', function(){
            changeCompany();
        });

        // Thay đổi trạng thái
        $(document).on('click', '#status', function(){
            //$('#status').click(function(event) {
            if(this.checked) {
                $(this).val(1);
            }
            else {
                $(this).val(0);
            }
        });
    };

    // Thay đổi công ty
    var changeCompany = function(){
        var params= {};
        params.status=1;
        params.idCompany= $('#idCompany').find(":selected").val();

        $('#agents').empty();

        _Ajax('/campains'+ '?type=getAgent&idCompany='+params.idCompany, 'GET', {}, function (resp) {
            _.each(resp.message, function(g, i){
                $('#agents').append('<option class="duallist-option" value='+g._id+'>'+ g.displayName+'</option>').bootstrapDualListbox('refresh');
            });
            $('#agents').bootstrapDualListbox().val(campaignAgents);
            $('#agents').bootstrapDualListbox('refresh');
        });
    };

    // Sự kiện submit
    var bindSubmit = function () {
        $('#edit-campaign').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger:'keyup',
            onValidationComplete: function (form, status) {
                console.log(form.getData())
                if (status) {
                    _AjaxData(window.location.hash.replace('/edit', '').replace('#',''), 'PUT', form.getData(), function (resp) {
                        if(_.isEqual(resp.code, 200)){
                            swal({
                                title: 'Thông báo !',
                                text: "Cập nhật chiến dịch thành công.",
                                type: 'success'
                            }, function(){
                                window.location.hash = 'campains';
                            }); 
                        } else{
                            swal({title: 'Thông báo !', text: resp.message, type: 'warning'});
                        }
                    });
                }
            }
        });
    };

    return {
        init: function () {
            // Cấu hình validation
            $.validationEngineLanguage.allRules['EditCheck'] = {
                "url": "/campains/validate",
                "extraDataDynamic": ['#name', '#idCompany', '#updateId'],
                "alertText": "* Đã tồn tại chiến dịch",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };

            $.validationEngineLanguage.allRules['DurHighCheck'] = {
                "func": function(){
                    return moment($('#startDate').val(),"MM/DD/YYYY h:mm a")._d <= moment($('#endDate').val(),"MM/DD/YYYY h:mm a")._d;
                },
                "alertText": "* Giá trị ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc"
            };

            // Cấu hình dual list box
            var dualListAgent = $('select[name="agents[]"]').bootstrapDualListbox({
                filterTextClear: 'Filter',
                infoTextEmpty: "<a class='c-red' ><b>Chưa chọn giá trị</b></a>",
                infoText: "<a class='c-blue' ><b>Số lượng agent: {0}</b></a>"
            });
            $(".bootstrap-duallistbox-container").find(".moveall").parent().remove();
            $(".bootstrap-duallistbox-container").find(".removeall").parent().remove();

            changeCompany();
            if(!_.isEqual($('#type').val(), '1')){
                $.map($('.auto-dialing'), function(n, i){
                    $(n).removeClass('hidden');
                });
            }else {
                $.map($('.auto-dialing'), function(n, i){
                    $(n).addClass('hidden');
                });
            }
            $('#startTime').datetimepicker({
                format: 'HH:mm'
            });
            $('#endTime').datetimepicker({
                format: 'HH:mm'
            });
            bindClick();
            bindSubmit();
        },
        uncut: function(){
            // Disable sự kiện khi đóng trang
            $(document).off('change', '#status');
            $(document).off('change', '#idCompany');
            $('#edit-campaign').validationEngine('detach');
        }
    };
}(jQuery);