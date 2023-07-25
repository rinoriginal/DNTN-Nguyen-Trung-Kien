var DFT = function ($) {
    var newOption = function(obj){
        return _.Tags([
            {tag: 'option', attr: {class: 'option-g', value: obj._id}, content: obj.name}
        ]);
    };

    var newOption_s = function(obj){
        return _.Tags([
            {tag: 'option', attr: {class: 'option-s', value: obj._id}, content: obj.skillName}
        ]);
    };

    var bindClick = function () {
//        $(document).on('change', '#idCompany', function () {
//            console.log($('#idCompany').val());
//        });
        // Cập nhật lại kỹ năng khi thay đổi công ty
        $(document).on('change', '#idCompany', function(e){
            var $this = $(this);
            $('#idChannel').empty().selectpicker('refresh');
            $('.option-g').remove();
            var url = (_.isEqual($this.find(":checked").val(), '0')) ? '/company-channel?status=1' : ('/company-channel?status=1&idCompany=' + $this.find(":checked").val());
            $.get(url, function(res){
                _.each(res.channel, function(g, i){
                    $('#idChannel').append(newOption(g)).selectpicker('refresh');
                });
            });

            $('#idSkill').empty().selectpicker('refresh');
            $('.option-s').remove();
            $.get('/skills-mail?status=1&idCompany=' + $this.find(":checked").val(), function(res){
                _.each(res, function(g, i){
                    $('#idSkill').append(newOption_s(g)).selectpicker('refresh');
                });
            });
        });
        $(document).on('change', '#typeServiceMail', function(e){
            var $this = $(this);
            let typeServiceMail = $('#typeServiceMail').val()
            if (typeServiceMail){
                $('#send_host').removeClass("validate[required]")
                $('#send_port').removeClass("validate[required]")
                $('#send_user').removeClass("validate[required, ajax[validateSendUser]]")
                $('#send_pass').removeClass("validate[required]")
                $('#send_sercure').removeClass("validate[required]")
                $('#send_protocol').removeClass("validate[required]")
                $('#send_limit').removeClass("validate[required]")
                $('#receive_host').removeClass("validate[required]")
                $('#receive_port').removeClass("validate[required]")
                $('#receive_user').removeClass("validate[required, ajax[validateReceiveUser]]")
                $('#receive_pass').removeClass("validate[required]")
                $('#receive_sercure').removeClass("validate[required]")
                $('#receive_protocol').removeClass("validate[required]")
                $('#receive_delay').removeClass("validate[required]")
                $('#sla').removeClass("validate[required]")
            }else{
                $('#send_host').addClass("validate[required]")
                $('#send_port').addClass("validate[required]")
                $('#send_user').addClass("validate[required, ajax[validateSendUser]]")
                $('#send_pass').addClass("validate[required]")
                $('#send_sercure').addClass("validate[required]")
                $('#send_protocol').addClass("validate[required]")
                $('#send_limit').addClass("validate[required]")
                $('#receive_host').addClass("validate[required]")
                $('#receive_port').addClass("validate[required]")
                $('#receive_user').addClass("validate[required, ajax[validateReceiveUser]]")
                $('#receive_pass').addClass("validate[required]")
                $('#receive_sercure').addClass("validate[required]")
                $('#receive_protocol').addClass("validate[required]")
                $('#receive_delay').addClass("validate[required]")
                $('#sla').addClass("validate[required]")
            }
        });

    };

    var bindSubmit = function () {
        // Xác nhận cập nhật service
        $('#add-new-service').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true,
            onValidationComplete: function (form, status) {
                if (status) {
                    var data= $('#add-new-service').serializeObject();
                    data.isSave= 1;

                    _socket.emit('sendTestConnection', data);

                    $('.page-loader').show();
                    if ($('#typeServiceMail').val()) {
                        console.log('hoangkem')
                        _AjaxData('/services-mail', 'POST', $(form).getData(), function (resp) {
                            if (_.isEqual(resp.code, 200)) {
                                window.location.hash = 'services-mail';
                            } else {
                                swal({title: 'Thông báo !', text: resp.message});
                            }
                        });
                    }
                }
            }
        });
    };
    var bindSocket= function(client){
        $('#socketId').val(_socket.id);
        // Kiểm tra kết nối với server
        client.on('testConnectionResponse', function(data){
            //console.log(data);
            var result=data;


            var status=0;
            var reason= "";
            if(result.send_status != 0){
                status=1;

                reason= reason+ "Cấu hình gửi mail: \n"+ result.send_status_message+"\n";
            }
            if(result.receive_status != 0){
                status=1;
                reason= reason+"Cấu hình nhận mail: \n"+ result.receive_status_message+"\n";
            }

            if(_.has(result, 'otherError')){
                status=1;
                reason= reason+ result.otherError;
            }

            if(status==0){
                if(result.isSave==0){
                    swal({title: 'Thành công', text: 'Kết nối thành công', type: "success"}, function(){
                        $('.page-loader').hide();
                        //$('#submit').show();
                        //$('')
                    });
                }else{
                        _AjaxData('/services-mail', 'POST', $('#add-new-service').getData(), function (resp) {
                                if (_.isEqual(resp.code, 200)) {
                                    window.location.hash = 'services-mail';
                                } else {
                                    swal({title: 'Thông báo !', text: resp.message});
                                }
                            });
                    window.location.hash = 'services-mail';
                }

            }else{
                swal({title: 'Thất bại', text: reason, type: "error"}, function(){
                    $('.page-loader').hide();
                });
            }
        })
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

            // Cấu hình validation
            $.validationEngineLanguage.allRules['ServiceCheck'] = {
                "url": "/services-mail/validate",
                "extraData": "",
                "extraDataDynamic": ['#name', '#idCompany'],
                "alertText": "* Chiến dịch đã tồn tại",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };
            // Cấu hình validation
            $.validationEngineLanguage.allRules['validateServiceName'] = {
                "url": "/mail-setting/validate",
                "extraData": '',
                "extraDataDynamic": ['#name'],
                "alertText": "* Tên service đã được sử dụng",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };
            // Cấu hình validation
            $.validationEngineLanguage.allRules['validateSendUser'] = {
                "url": "/mail-setting/validate",
                "extraData": '',
                "extraDataDynamic": '',
                "alertText": "* Tên đăng nhập đã được sử dụng",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };
            // Cấu hình validation
            $.validationEngineLanguage.allRules['validateReceiveUser'] = {
                "url": "/mail-setting/validate",
                "extraData": '',
                "extraDataDynamic": '',
                "alertText": "* Tên đăng nhập đã được sử dụng",
                "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
            };
            //Fill skill select picker
            $('#idSkill').empty().selectpicker('refresh');
            $('.option-s').remove();
            if ($('#idCompany').find(":checked").val().length > 0){
                $.get('/skills-mail?status=1&idCompany=' + $('#idCompany').find(":checked").val(), function(res){
                    _.each(res, function(g, i){
                        $('#idSkill').append(newOption_s(g)).selectpicker('refresh');
                    });
                });
            }

            bindClick();
            bindSubmit();
            bindSocket(_socket);
        },
        uncut: function(){
            // Disable sự kiện khi đóng trang
            $(document).off('change', '#idCompany');
            delete _socket.off('testConnectionResponse');
            $(document).off('change', '#status');
            $(document).off('change', '#status');
            $(document).off('click', '#cancelInput');
            delete _socket.off('testConnectionResponse');
            $('#add-new-service').validationEngine('detach');
        }
    };
}(jQuery);