var DFT = function ($) {
    var lstRemove = [];
    var lstMail = [];
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
                    console.log(555555, resp);

                    let srcFile = resp.message;
                    renderFile(srcFile, idFile)
                }
            })
        })

        //render ra view sau khi upload
        renderFile = (src, id) => {
            let output = $(".preview-files-zone-" + id);
            console.log(777, src);
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
    var editTicketAdvisory = function () {
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
                    formData.append('idCustomer', ticketAdvisory[0].idCustomer._id);
                    for (var pair of formData.entries()) {
                        console.log(pair[0] + ', ' + pair[1]);
                    }
                    console.log(55, formData);

                    _AjaxData('/ticket-advisory/' + $('#btnSave').attr('data-id'), 'PUT', formData, function (res) {
                        if (res.code == 200) {
                            removeUploadFile(lstRemove)
                            swal({
                                title: 'Cập nhật thành công',
                                text: '',
                                type: "success",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Xác nhận",
                                closeOnConfirm: true
                            }, function () {
                                if (checkVoice) {
                                    window.parent.closeModalAdvisoryEdit();
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
        })
    }
    var getType = function (id) {
        var advice = adviceCategory.filter(item => item._id == id)
        return advice[0].type
    }

    var getMail = function (type) {
        console.log(2222222222222222, emailAdvisory);
        console.log(2222222222222222, type);
        var str = '';
        var _email = emailAdvisory.filter(item => item.type == type)[0].email.split(',')
        _.each(_email, function (el) {
            if (el != '') {
                str += '<option value=' + JSON.stringify(el) + '>' + el + '</option>'
            }
        })
        $('#emailTo').empty();
        $('#emailTo').append(str);
        $('.selectpicker').selectpicker('refresh');
    }

    var loadMail = function (type) {
        var lstMail = ticketAdvisory[0].emailTo ? ticketAdvisory[0].emailTo.split(',') : [];
        var str = '';
        var _email = emailAdvisory.filter(item => item.type == type)[0].email.split(',')
        _.each(_email, function (el) {
            console.log(323232323, lstMail, el, _.indexOf(lstMail, el));

            if (el != '') {
                str += '<option ' + (_.indexOf(lstMail, el) > -1 ? 'selected ' : '') + ' value=' + JSON.stringify(el) + '>' + el + '</option>'
            }
        })
        $('#emailTo').empty();
        $('#emailTo').append(str);
        $('.selectpicker').selectpicker('refresh');
    }

    var bindclick = function () {

        $(document).on('change', '#advisoryTypeId', function (e) {
            var type = getType($(this).val())
            getMail(type);
        })

        //tìm kiếm khách hàng
        $(document).on('click', '.search', function () {
            let _phoneNumber = $('#searchPhone').val()
            _AjaxData('/ticket-advisory' + '?phoneNumber=' + _phoneNumber, 'GET', null, function (resp) {
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
                    $('#renderCustomer').empty();
                    $('#renderCustomer').append(resp.data);
                }
            });
        })
    }



    //render ra view sau khi upload
    var renderFileEdit = function (src, id) {
        let output = $(".preview-files-zone-" + id);

        // $(".preview-files-zone-" + id).empty();
        $('.preview-files-zone-' + id).attr("style", "display:block");
        var fileType = ['xlsx', 'xls', 'docx', 'doc']
        var _url = function (f) {
            var extendfile = f.urlUpload.split('.').pop()
            var _tag = '';
            switch (fileType.indexOf(extendfile) == -1) {
                case false:
                    _tag = '' +
                        // '<a class="set-w flex-box-align c-red" href=#view-upload?idFile=' + f.idUpload + ' target="_blank">' +
                        '<a class="set-w flex-box-align c-red" href=https://docs.google.com/viewer?embedded=true&url=' + _urlUpload + f.urlUpload + ' target="_blank">' +
                        '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                        f.nameUpload +
                        '   </div>' +
                        '</a>';
                    break;
                case true:
                    if (extendfile == 'pdf') {
                        _tag = '' +
                            '<a class="set-w flex-box-align c-red" href=' + f.urlUpload + ' target="_blank">' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.nameUpload +
                            '   </div>' +
                            '</a>';
                    } else {
                        _tag = '' +
                            '<a class="set-w flex-box-align c-red" href=' + f.urlUpload + ' download>' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.nameUpload +
                            '   </div>' +
                            '</a>';
                    }

                    break;
            }
            return _tag;
        }
        let htmlFile = ''
        for (let i = 0; i < src.length; i++) {
            htmlFile += '<div id=' + src[i].idUpload.replace(/\./g, '_') + ' class="set-p full-width col-sm-12 col-md-12 m-t-1 m-b-1 border bgm-white flex-box" style=" height: 25px">' +
                _url(src[i]) +
                '<a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=' + src[i].idUpload + '></i></a>' +
                '<input class="lstUploadFile" data-id=' + src[i].idUpload + ' data-url=' + src[i].urlUpload + ' data-name=' + JSON.stringify(src[i].nameUpload) + ' type="hidden">' +
                '</div>'
        }
        output.append(htmlFile);
    }

    return {
        init: function () {
            $('.container').attr('class', 'container m-b-10')
            bindclick();
            attachment();
            editTicketAdvisory();
            renderFileEdit(ticketAdvisory[0].files, 'uploadFile')
            loadMail(getType($('#advisoryTypeId').val()))
        },
        uncut: function () {

        }
    };
}(jQuery);