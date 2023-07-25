var DFT = function ($) {
    var lstRemove = [];
    //xử lý upload
    var attachment = () => {
        $(document).on('change', '.orange', function () {
            let idFile = $(this).attr('data-show')
            let formData = new FormData();
            _.each(this.files, function (file) {
                formData.append('files', file);
            })
            $(this).val('');
            _AjaxData('uploadFile', 'POST', formData, function (resp) {

                if (resp.code == 500)
                    swal({ title: 'Thất bại!', text: resp.message, type: "error" });
                else {
                    let srcFile = resp.message;
                    renderFile(srcFile, idFile)
                }
            })
        })

        //render ra view sau khi upload
        renderFile = (src, id) => {
            let output = $(".preview-files-zone-" + id);
            console.log(777, JSON.stringify(src));
            console.log(id);
            // $(".preview-files-zone-" + id).empty();
            $('.preview-files-zone-' + id).attr("style", "display:block");
            let htmlFile = ''
            var fileType = ['xlsx', 'xls', 'docx', 'doc']
            var _url = function (f) {
                var extendfile = f.url.split('.').pop()
                var _tag = '';
                switch (fileType.indexOf(extendfile) == -1) {
                    case false:
                        _tag = '' +
                            // '<a class="set-w flex-box-align c-red" href=#view-upload?idFile=' + f._id + ' target="_blank">' +
                            '<a class="set-w flex-box-align c-red" href=https://docs.google.com/viewer?embedded=true&url=' + _urlUpload + f.url + ' target="_blank">' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.name +
                            '   </div>' +
                            '</a>';
                        break;
                    case true:
                        if (extendfile == 'pdf') {
                            _tag = '' +
                                '<a class="set-w flex-box-align c-red" href=' + f.url + ' target="_blank">' +
                                '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                                f.name +
                                '   </div>' +
                                '</a>';
                        } else {
                            _tag = '' +
                                '<a class="set-w flex-box-align c-red" href=' + f.url + ' download>' +
                                '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                                f.name +
                                '   </div>' +
                                '</a>';
                        }
                        break;
                }
                return _tag;
            }
            for (let i = 0; i < src.length; i++) {
                // _url(src[i].url)
                htmlFile += '<div id=' + src[i]._id.replace(/\./g, '_') + ' class="set-p full-width col-sm-12 col-md-12 m-t-1 m-b-1 border bgm-white flex-box" style=" height: 25px">' +
                    // '<a class="set-w flex-box-align c-red" href=' + src[i].url + ' download>' +
                    _url(src[i]) +
                    '<a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=' + src[i]._id + '></i></a>' +
                    '<input class="lstUploadFile" data-id=' + src[i]._id + ' data-url=' + src[i].url + ' data-name=' + JSON.stringify(src[i].name) + ' type="hidden">' +
                    '</div>'
            }
            output.append(htmlFile);
        }

        //xử lý xóa upload
        $(document).on('click', '.zmdi-tag-close', function () {
            let idRemove = $(this).attr('data-remove').toString().replace(/\./g, '_');
            lstRemove.push(idRemove);
            $('#' + idRemove).remove();
            // swal({
            //     title: "Bạn muốn xoá mục này ?",
            //     text: "Tất cả các đường dẫn tới file này sẽ không còn sử dụng được",
            //     type: "warning", showCancelButton: true, confirmButtonColor: "#DD6B55", confirmButtonText: "Có, chắc chắn !", closeOnConfirm: false
            // }, function () {
            //     _AjaxObject('uploadFile/' + idRemove, 'DELETE', {}, function (resp) {
            //         console.log('yolo', resp, typeof resp, resp.code);
            //         if (_.isEqual(resp.code, 200)) {
            //             swal({ title: 'Thành công', text: 'Tất cả đường dẫn tới file đều không còn hiệu lực', type: "success" });
            //             $('#' + idRemove).remove();
            //         } else {
            //             swal({ title: 'Thất bại!', text: 'Có lỗi xảy ra!' });
            //         }
            //     });
            // });
        });
    }

    var removeUploadFile = function (lstRemove) {
        _.each(lstRemove, function (el) {
            _AjaxObject('uploadFile/' + el, 'DELETE', {}, function (resp) {
                console.log('yolo', resp, typeof resp, resp.code);
            });
        })
    }

    //Tạo mới tư vấn
    var createTicketAdvisory = function () {
        $('#frm-advisory').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    const _file = document.querySelectorAll('.lstUploadFile');
                    let uploadHandle = []
                    _file.forEach(e => {
                        uploadHandle.push(
                            {
                                idUpload: e.getAttribute('data-id'),
                                urlUpload: e.getAttribute('data-url'),
                                nameUpload: e.getAttribute('data-name'),
                            }
                        )
                    })

                    var formData = form.getData()
                    formData.append('fileUpload', JSON.stringify(uploadHandle));

                    var strMail = '';
                    _.each($('#emailTo').val(), function (el) {
                        if (strMail == '') {
                            strMail += el
                        } else {
                            strMail += ',' + el
                        }
                    })
                    formData.delete('emailTo');
                    formData.append('emailTo', strMail);

                    var check = false;
                    if (customerAdvisory && customerAdvisory != undefined) {
                        formData.append('idCustomer', customerAdvisory._id);
                        check = true;
                    } else if ($('#btnSave').attr('data-id') != '') {
                        formData.append('idCustomer', $('#btnSave').attr('data-id'))
                        check = true;
                    } else {
                        swal({
                            title: 'Thông báo!',
                            text: 'Chưa có thông tin khách hàng',
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Quay lại!",
                            closeOnConfirm: true
                        });
                    }
                    console.log('check', check);


                    for (var pair of formData.entries()) {
                        console.log(pair[0] + ', ' + pair[1]);
                    }
                    console.log(55, formData);
                    if (check) {
                        _AjaxObject('/ticket-advisory', 'POST', formData, function (res) {
                            if (res.code == 200) {
                                removeUploadFile(lstRemove)
                                swal({
                                    title: 'Tạo mới thành công',
                                    text: '',
                                    type: "success",
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: "Xác nhận",
                                    closeOnConfirm: true
                                }, function () {
                                    // $('#addCase').modal('hide');
                                    // $('#newAdvisoryPopup').modal('hide');
                                    // $('#newAdvisoryPopup').attr('style',"display:none");
                                    if (checkVoice) {
                                        window.parent.closeModalAdvisory();
                                    } else {
                                        window.history.back()
                                    }
                                });
                            } else {
                                swal({
                                    title: 'Đã có lỗi xảy ra',
                                    text: resp.message,
                                    type: "error",
                                    confirmButtonColor: "#DD6B55",
                                    confirmButtonText: "Quay lại!",
                                    closeOnConfirm: true
                                });
                            }
                        })
                    }




                }
            }
        })
    }

    var getType = function (id) {

    }

    var getMail = function (id) {
        console.log(id);

        if (id) {
            var advice = adviceCategory.filter(item => item._id == id)
            var type = advice[0].type
            var str = '';
            var _email = emailAdvisory.filter(item => item.type == type)[0].email.split(',')
            _.each(_email, function (el, index) {
                if (el != '') {
                    str += '<option value=' + JSON.stringify(el) + (index == 0 ? ' selected' : '') + '>' + el + '</option>'
                }
            })
            console.log(9999999999, str);

            $('#emailTo').empty();
            $('#emailTo').append(str);
            $('.selectpicker').selectpicker('refresh');
        }
    }

    var bindclick = function () {

        // let splitEmailType3 = function (n) {
        //     let email = n.filter(function (o) { return o.type == 3 })[0].email
        //     return email.split(',')
        // }


        $(document).on('change', '#advisoryTypeId', function (e) {
            var id = $(this).val()
            getMail(id);
        })

        $(document).on('click', '.search', function () {

            let _phoneNumber = $('#searchPhone').val()
            console.log(111111, _phoneNumber);
            if (_phoneNumber != '') {
                _AjaxData('/ticket-advisory' + '?search=phone&phoneNumber=' + _phoneNumber, 'GET', null, function (resp) {
                    if (resp.code == 500) {
                        swal({
                            title: 'Đã có lỗi xảy ra',
                            text: resp.message,
                            type: "error",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Quay lại!",
                            closeOnConfirm: true
                        });
                    } else {
                        // alert('ái chà cha')
                        // console.log(111111111111, resp.data);
                        $('#btnSave').attr('data-id', resp.customer._id);
                        $('#renderCustomer').empty();
                        $('#renderCustomer').append(resp.data);
                        dateRefresh();
                        $('.selectpicker').selectpicker('refresh');

                    }
                });
            } else {
                swal({
                    title: 'Lỗi!',
                    text: 'Chưa nhập số điện thoại',
                    type: "error",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Quay lại!",
                    closeOnConfirm: true
                });
            }

        })
    }

    var dateRefresh = function () {
        $(".date-picker").datetimepicker({
            format: "DD/MM/YYYY",
            locale: "vi",
            icons: {
                time: "fa fa-clock-o",
                date: "fa fa-calendar",
                up: "fa fa-arrow-up",
                down: "fa fa-arrow-down"
            }
        })
    }


    return {
        init: function () {
            $('.container').attr('class', 'container m-b-10')
            bindclick();
            attachment();
            createTicketAdvisory();
            getMail($('#advisoryTypeId').val())
        },
        uncut: function () {

        }
    };
}(jQuery);