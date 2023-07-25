var DFT = function ($) {


    var bindClick = function () {
        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
        // Làm mới trang
        $(document).on('click', '#updateSurvey', function () {
            let _survey = $('#survey').val();
            let _id = $(this).attr('data-id')
            console.log('_survey', _survey);

            let formData = new FormData();
            formData.append('survey', _survey);
            formData.append('_id', _id);

            _AjaxData('/config-system/update', 'PUT', formData, function (res) {
                if (res.code == 200) {
                    swal({
                        title: 'Cập nhật thành công',
                        text: '',
                        type: "success",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Xác nhận",
                        closeOnConfirm: true
                    }, function () {
                        window.location.reload();

                    });
                } else {
                    swal({
                        title: 'Đã có lỗi xảy ra',
                        text: JSON.stringify(res.message),
                        type: "error",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    });
                }
            })
        });


        $(document).on('click', '#updateTelehubCiscoAPI', function () {
            // console.log('clikkkkk');
            let ipCiscoReport = _.clean($('#ipCiscoReport').val());
            let ipRecording = _.clean($('#ipRecording').val());
            let tokenDefault = _.clean($('#tokenDefault').val());
            let prefix = _.clean($('#prefix').val());
            let Agent_Team = _.clean($('#Agent_Team').val());
            let _id = $(this).attr('data-id');

            if(!ipRecording || !tokenDefault || !ipCiscoReport || !prefix || !Agent_Team) return  swal({
                title: 'Thông báo',
                text: 'Vui lòng điền đủ thông tin',
                type: "warning",
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Quay lại!",
                closeOnConfirm: true
            });

            let formData = new FormData();
            formData.append('tokenDefault', tokenDefault);
            formData.append('ipRecording', ipRecording);
            formData.append('ipCiscoReport', ipCiscoReport);
            formData.append('prefix', prefix);
            formData.append('Agent_Team', Agent_Team);
            formData.append('_id', _id);

            _AjaxData('/config-system/update', 'PUT', formData, function (res) {
                if (res.code == 200) {
                    swal({
                        title: 'Cập nhật thành công',
                        text: '',
                        type: "success",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Xác nhận",
                        closeOnConfirm: true
                    }, function () {
                        window.location.reload();
                    });
                } else {
                    swal({
                        title: 'Đã có lỗi xảy ra',
                        text: JSON.stringify(res.message),
                        type: "error",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    });
                }
            })
        });
    };




    return {
        init: function () {
            $('.container').attr('class', 'container-fluid');
            window.onbeforeunload = null;
            // bindValueChat();
            bindClick();
        },
        uncut: function () {
        }
    };
}(jQuery);