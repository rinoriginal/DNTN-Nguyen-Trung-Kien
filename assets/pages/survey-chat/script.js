var DFT = function ($) {

    var addCount=0;
    var bindClick = function () {
        //Bắt sự kiện click vào button search
        $(document).on('click', '#btn-search', function (e) {
            e.preventDefault();
            if ($('#find-name').val().length > 0 ){
                window.location.obj['name'] = $('#find-name').val();
            }
            else{
                delete window.location.obj['name'];
            }

            if ($('#find-website').val().length > 0 ){
                window.location.obj['website'] = $('#find-website').val();
            }
            else{
                delete window.location.obj['website'];
            }

            if (!_.isEqual($('#find-status').val(), '-1')){
                window.location.obj['status'] = $('#find-status').val();
            }
            else{
                delete window.location.obj['status'];
            }

            window.location.hash = newUrl('survey-chat', window.location.obj);

        });



        $(document).on('click', '.btn-remove', function () {
            //Xóa 1 bản ghi
            var _id = $(this).attr('data-id');
            var name= $(this).attr('data-display-name');
            //Hiện alert cảnh báo
            swal({
                    title: "XOÁ BỘ ĐÁNH GIÁ",
                    text: "Bộ khảo sát "+name+" sẽ bị xoá!",
                    type: "warning", showCancelButton: true, confirmButtonColor: "#DD6B55", confirmButtonText: "Có, chắc chắn !", closeOnConfirm: false
                },
                function () {
                    _AjaxObject('/survey-chat/' + _id, 'DELETE', {}, function (resp) {
                        swal({title: 'Thành công', text: "Đã xoá "+name+" thành công", type: "success"}, function(){
                            _.LoadPage(window.location.hash);
                        });
                    });
                });
        });





        $(document).on('click', '#btn-refresh', function(){
            //reload lại trang
            _.LoadPage(window.location.hash);
        });


        $(document).on('click', '#add-choice', function(){
            console.log(64);
            $("#choice-new").append("<div class=\"col-sm-8\" style=\"margin-bottom: 5px;\">\n" +
                "                                <input type=\"text\" value=\"\" class=\" form-control input-sm\" id=\"question\" name=\"question[]\">\n" +
                "                            </div>\n" +
                "                            <div class=\"col-sm-2\" style=\"margin-bottom: 5px;\">\n" +
                "                                <input type=\"number\" value=\"\" class=\" form-control input-sm \" id=\"question-value\" name=\"value[]\">\n" +
                "                            </div>")
        })

        $('#frm-add-survey').on('hidden.bs.modal', function () {
            //clear popup
            $('#dlg-name').val('');
            $('#dlg-website').prop('selectedIndex',0);
            $('#dlg-website').selectpicker('refresh');
            $("#choice-new").empty();
            $("#choice-new").append("<label class=\"col-sm-8\" >Ý kiến đánh giá</label> <label class=\"col-sm-2 dialog-control\" style=\" float: left\">Value</label>\n" +
                "                            <div class=\"col-sm-8\" style=\"margin-bottom: 5px;\">\n" +
                "                                <input type=\"text\" value=\"\" class=\" form-control input-sm validate[required]\" id=\"question\" name=\"question[]\">\n" +
                "                            </div>\n" +
                "                            <div class=\"col-sm-2\" style=\"margin-bottom: 5px;\">\n" +
                "                                <input type=\"number\" value=\"\" class=\" form-control input-sm validate[required]\" id=\"question-value\" name=\"value[]\">\n" +
                "                            </div>");
        })

        $(document).on('click', '#add-choice-edit', function(){
            console.log(90);
            $("#edit-choice-new").append("<div class=\"col-sm-8\" style=\"margin-bottom: 5px;\">\n" +
                "                                <input type=\"text\" value=\"\" class=\" form-control input-sm\" id=\"question\" name=\"question[]\">\n" +
                "                            </div>\n" +
                "                            <div class=\"col-sm-2\" style=\"margin-bottom: 5px;\">\n" +
                "                                <input type=\"number\" value=\"\" class=\" form-control input-sm \" id=\"question-value\" name=\"value[]\">\n" +
                "                            </div>")
        })

        $('#frm-edit-survey').on('hidden.bs.modal', function () {
            //clear popup
            $('#edit-name').val('');
            $('#edit-website').prop('selectedIndex',0);
            $('#edit-website').selectpicker('refresh');
            $("#edit-choice-new").empty();

        })


        $('.btn-edit').on('click', function(){
            var index = $(this).attr('data-index');
            var id = $(this).attr('data-id');
            console.log(surveys[index]);

            _AjaxObject('/survey-chat/' + id, 'GET', {}, function (resp) {
                console.log(resp);

                $("#edit-id:text").val(resp.data.survey._id);
                $("#edit-name:text").val(resp.data.survey.name);
                $("#edit-name-original:text").val(resp.data.survey.name);
                var i;
                for(i=0; i< $('#edit-website > option').length ;i++){
                    console.log(i, $('#edit-website > option')[i].value, resp.data.survey.idCompanyChannel);
                    if($('#edit-website > option')[i].value== resp.data.survey.idCompanyChannel){
                        $('#edit-website').prop('selectedIndex',i);
                        $('#edit-website').selectpicker('refresh');
                    }
                }
                resp.data.survey.status==1?$("#edit-status").prop('checked', true):$("#edit-status").prop('checked', false);

                $("#edit-choice-new").empty();
                $("#edit-choice-new").append("<label class=\"col-sm-8\" >Ý kiến đánh giá</label> <label class=\"col-sm-2 dialog-control\" style=\" float: left\">Value</label>\n");
                _.chain(resp.data.questions).sortBy('unitId').each(function(question, index, list){

                    $("#edit-choice-new").append(
                        "                            <div class=\"col-sm-8\" style=\"margin-bottom: 5px;\">\n" +
                        "                                 <input type=\"text\" style='display: none' value=\""+question._id+"\" class=\" form-control input-sm\" id=\"question-id\" name=\"questionid[]\">\n" +
                        "                                <input type=\"text\" value=\""+question.content+"\" class=\" form-control input-sm \" id=\"question\" name=\"question[]\">\n" +
                        "                            </div>\n" +
                        "                            <div class=\"col-sm-2\" style=\"margin-bottom: 5px;\">\n" +
                        "                                <input type=\"number\" value=\""+question.value+"\" class=\" form-control input-sm \" id=\"question-value\" name=\"value[]\">\n" +
                        "                            </div>");
                })
            });
        })
    };

    var bindSubmit = function () {

        $('#frm-add-survey form').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger:'keyup',
            onValidationComplete: function (form, status) {
                console.log(92, status);
                if (status) {
                    _AjaxData("/survey-chat", "POST", form.getData(), function (resp) {
                        _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({title: 'Thông báo !', text: resp.message});
                    });
                }
            }
        });


        $('#frm-edit-survey form').validationEngine('attach', {
            validateNonVisibleFields: true,
            autoPositionUpdate: true,
            validationEventTrigger:'keyup',
            onValidationComplete: function (form, status) {
                console.log(149, status);
                if (status) {
                    _AjaxData("/survey-chat/"+$('#edit-id'), "PUT", form.getData(), function (resp) {
                        _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({title: 'Thông báo !', text: resp.message});
                    });
                }
            }
        });
    }

    var bindValidate= function () {
        // Cấu hình validation
        $.validationEngineLanguage.allRules['NewCheck'] = {
            "url": "/survey-chat/validate",
            "extraData": "type=1",
            "extraDataDynamic": ['#dlg-name'],
            "alertText": "* Đã tồn tại chiến dịch",
            "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
        };

        $.validationEngineLanguage.allRules['EditCheck'] = {
            "url": "/survey-chat/validate",
            "extraData": "type=2",
            "extraDataDynamic": ['#edit-name', '#edit-name-original'],
            "alertText": "* Đã tồn tại chiến dịch",
            "alertTextLoad": "<i class='fa fa-spinner fa-pulse m-r-5'></i> Đang kiểm tra, vui lòng đợi."
        };



    }

    return {
        init: function () {
            bindClick();
            bindValidate();
            bindSubmit();



            //bind các giá trị vào ô tìm kiếm từ url đang load
            if (_.has(window.location.obj, 'name')){
                $('#name').val(window.location.obj.name);
            }

            if (_.has(window.location.obj, 'company')){
                $('#company').val(window.location.obj.company);
            }

            if (_.has(window.location.obj, 'status')){
                $('#status').val(window.location.obj.status);
            }

            $('.selectpicker').selectpicker('refresh'); //refresh 1 lần duy nhất khi load trang

        },
        uncut: function(){
            $('#btn-search').off('click');
            $('.select-box-all').off('change');
            $('.select-box-cell').off('change');
            $('.btn-remove').off('click');
            $('#btn-delSelection').off('click');

            $(document).off('click', '.btn-remove');

            $(document).off('click', '#add-choice');
            $('#frm-add-survey').off('hidden.bs.modal');
            $('#frm-add-survey form').validationEngine('detach');

            $(document).off('click', '#add-choice-edit');
            $('#frm-edit-survey').off('hidden.bs.modal');
            $('#frm-edit-survey form').validationEngine('detach');
        }
    };
}(jQuery);