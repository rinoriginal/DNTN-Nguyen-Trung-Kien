var DFT = function ($) {

}(jQuery);

(function ($) {
    var _currentSignature = {}
    var decodeEntities = (function () {
        var element = document.createElement('div');

        function decodeHTMLEntities(str) {
            if (str && typeof str === 'string') {
                // strip script/html tags
                str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
                str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
                element.innerHTML = str;
                str = element.textContent;
                element.textContent = '';
            }

            return str;
        }

        return decodeHTMLEntities;
    })();
    var updateId = "";
    var nameSignature = "";
    $(document).ready(function () {
        CKEDITOR.replace('signature-modal');
        CKEDITOR.replace('signature-modal-update');


        var dropdownMenu;
        $('#submit_signature').on('click', function () {
            console.log('submit_signature click --------------- ');
            if ($('#mail_picker option:selected').val() !== "" && $('#name_signature').val() !== "" && $('#name_signature')) {
                _currentSignature.mail_picker = $('#mail_picker option:selected').val();
                _currentSignature.name = $('#name_signature').val();
                _currentSignature.mail_name = $('#mail_picker option:selected')[0].label;
                _currentSignature.active = $('#active-signature').is(':checked');
                _currentSignature.body = decodeEntities(_.trim(_.stripTags(CKEDITOR.instances['signature-modal'].document.getBody().getHtml())));
                _currentSignature.body_raw = CKEDITOR.instances['signature-modal'].getData();
                var formData = new FormData();
                $.each(_currentSignature, function (i, o) {
                    formData.append(i, o);
                });
                _AjaxData('/signature', 'POST', formData, function (resp) {
                    if (resp === 'error') swal({ title: 'Thông báo !', text: 'Đã có lỗi xảy ra!' })
                    else {
                        swal({ title: 'Thông báo !', text: 'Tạo chữ ký thành công' });
                        $('#submit_signature').modal('hide');
                    }
                });
            }
            else
                swal({ title: 'Thông báo !', text: 'Chưa chọn mail hoặc chưa nhập tên bộ chữ ký!' });


        })
        $('#update_signature').on('hidden.bs.modal', function (e) {
            // console.log('update_signature hidden.bs.modal --------------- ');
            // location.reload();
        })
        $('table > tbody > tr').click(function (row) {
            console.log('table > tbody > tr --------------- ');
            var target = row.currentTarget;
            updateId = target.getAttribute('id');
            nameSignature = target.getAttribute('name')
            $('#update_signature').on('shown.bs.modal', function (e) {


                $('#name_signature_update').val(target.getAttribute('name') + '');
                $('select[name=select-mail-update]').val(target.getAttribute('mail_picker') + '');
                $('.selectpicker').selectpicker('refresh');
                $('#active-signature-update').prop('checked', target.getAttribute('active') == 'true' ? true : false);
                var index = target.getAttribute('index')
                var td = $("#signature-index tr .body_raw")[parseInt(index)]

                CKEDITOR.instances['signature-modal-update'].setData(td.innerHTML + '')

            })

        })
        $('#updateSignatureBtn').on('click', function () {
            console.log('updateSignatureBtn  --------------- ');
            _currentSignature = {};
            if ($('#mail_picker_update option:selected').val() !== "" && $('#name_signature_update').val() !== "" && $('#name_signature_update')) {
                _currentSignature.mail_picker = $('#mail_picker_update option:selected').val();
                _currentSignature.name = $('#name_signature_update').val();
                _currentSignature.mail_name = $('#mail_picker_update option:selected')[0].label;
                _currentSignature.active = $('#active-signature-update').is(':checked');
                _currentSignature.body = decodeEntities(_.trim(_.stripTags(CKEDITOR.instances['signature-modal-update'].document.getBody().getHtml())));
                _currentSignature.body_raw = CKEDITOR.instances['signature-modal-update'].getData();
                var formData = new FormData();
                $.each(_currentSignature, function (i, o) {
                    formData.append(i, o);
                });
                _AjaxData('/signature/' + updateId, 'PUT', formData, function (resp) {
                    if (resp === 'error') swal({ title: 'Thông báo !', text: 'Đã có lỗi xảy ra!' })
                    else {
                        swal({ title: 'Thông báo !', text: 'Chỉnh sửa chữ ký thành công' });
                        $('#submit_signature').modal('hide');
                    }
                });
                console.log(_currentSignature)
            }
            else
                swal({ title: 'Thông báo !', text: 'Chưa chọn mail hoặc chưa nhập tên bộ chữ ký!' });


        })
        $('#delete_signature').on('shown.bs.modal', function () {
            console.log('delete_signature --------------- ');
            $('#content-delete-signature').text('Xác nhận xóa chữ ký ' + nameSignature + ' ?')
            $('#delete_signature_accept').on('click', function () {
                _AjaxData('/signature/' + updateId, 'DELETE', {}, function (resp) {
                    swal({ title: 'Thông báo !', text: resp });
                    $('#submit_signature').modal('hide');
                    location.reload();
                });
            })
        })
        $('#submit_signature').on('hide.bs.modal', function () {
            // console.log('submit_signature hide.bs.modal --------------- ');
            // location.reload();
        });
        $('.table-body').on('show.bs.dropdown', function (e) {
            console.log('.table-body --------------- ');
            dropdownMenu = $(e.target).find('.dropdown-menu');
            $('body').append(dropdownMenu.detach());
            var eOffset = $(e.target).offset();
            dropdownMenu.css({
                'display': 'block',
                'top': eOffset.top + $(e.target).outerHeight(),
                'left': eOffset.left,
                'width': '184px',
                'font-size': '14px'
            });
            dropdownMenu.addClass("mobPosDropdown");
        });

        $('.table-body').on('hide.bs.dropdown', function (e) {
            console.log('.table-body --------------- ');
            $(e.target).append(dropdownMenu.detach());
            dropdownMenu.hide();
        });
    })

})(jQuery);