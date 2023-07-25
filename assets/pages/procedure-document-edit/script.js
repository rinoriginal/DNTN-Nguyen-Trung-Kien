var DFT = function ($) {

    var lstRemove = []

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
            let output = $("#showListFile");
            // $(".preview-files-zone-" + id).empty();
            // $('.preview-files-zone-' + id).attr("style", "display:block");
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
                htmlFile += `<tr id="${src[i]._id.replace(/\./g, '_')}">` +
                    `<td style="width:31%">${src[i].name}</td>` +
                    `<td style="width:20%" class="text-center">${moment(src[i].created).format('HH:mm DD/MM/YYYY')}</td>` +
                    `<td style="width:40%">${_url(src[i])}` +
                    `<input class="lstUploadFile" data-id=${src[i]._id} data-url=${src[i].url} data-name=${JSON.stringify(src[i].name)} type="hidden"></td>` +
                    `<td style="width:6%" class="text-center"><a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=${src[i]._id}></i></a></td>` +
                    + `</tr>`
            }
            output.append(htmlFile);
        }

        //xử lý xóa upload
        $(document).on('click', '.zmdi-tag-close', function () {
            let idRemove = $(this).attr('data-remove').toString().replace(/\./g, '_');
            lstRemove.push(idRemove);
            $('#' + idRemove).remove();
        });
    }
    // xóa danh sách file
    var removeUploadFile = function (lstRemove) {
        _.each(lstRemove, function (el) {
            _AjaxObject('uploadFile/' + el, 'DELETE', {}, function (resp) {
            });
        })
    }
    //render ra view sau khi upload
    renderFileEdit = (src, id) => {
        let output = $("#showListFile");
        // $(".preview-files-zone-" + id).empty();
        // $('.preview-files-zone-' + id).attr("style", "display:block");
        let htmlFile = ''
        var fileType = ['xlsx', 'xls', 'docx', 'doc']
        var _url = function (f) {
            var extendfile = f.urlUpload.split('.').pop()
            var _tag = '';
            switch (fileType.indexOf(extendfile) == -1) {
                case false:
                    _tag = '' +
                        // '<a class="set-w flex-box-align c-red" href=#view-upload?idFile=' + f._id + ' target="_blank">' +
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
        for (let i = 0; i < src.length; i++) {
            htmlFile += `<tr id="${src[i]._id.replace(/\./g, '_')}">` +
                `<td style="width:31%">${src[i].nameUpload}</td>` +
                `<td style="width:20%" class="text-center">${moment(src[i].created).format('HH:mm DD/MM/YYYY')}</td>` +
                `<td style="width:40%" class="text-center">${_url(src[i])}` +
                `<input class="lstUploadFile" data-id=${src[i]._id} data-url=${src[i].urlUpload} data-name=${JSON.stringify(src[i].nameUpload)} type="hidden"></td>` +
                `<td style="width:6%" class="text-center"><a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=${src[i]._id}></i></a></td>` +
                + `</tr>`
        }
        output.append(htmlFile);
    }

    let CKEDITOR_NAME = {
        content: "content",
    };

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {

        $(document).on('click', '#btnUpdateNew', handleEventClickBtnUpdateNew);

        function handleEventClickBtnUpdateNew(e) {
            e.preventDefault();
            let target = $(e.currentTarget);
            let ID = target.attr("data-id");
            let data = {
                title: $("#title").val(),
                content: CKEDITOR.instances[CKEDITOR_NAME.content].getData(),
            }
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

            if (!ID) return swal({ title: "không thể thực hiện lúc này!" });

            var formData = new FormData();
            formData.append("title", data.title);
            formData.append("content", data.content);
            formData.append('files', JSON.stringify(uploadHandle));

            $.ajax({
                url: "/manage-procedure-document/" + ID,
                data: formData,
                processData: false,
                contentType: false,
                type: "PUT",
                success: function (data) {
                    if (data.code != 200) {
                        swal({
                            title: "Thông báo",
                            text: data.message,
                            type: "error"
                        })
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Cập nhật thành công"
                        }, () => {
                            window.history.back();
                        })

                    }

                },
                error: function (data) {
                    console.log("ERROR - " + data.responseText);
                }
            });
        }
    };



    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindValue = function () {
        _.each(_.allKeys(_config.MESSAGE.ARTICLE), function (item) {
            $('.' + item).html(_config.MESSAGE.ARTICLE[item]);
        });
    };


    return {
        init: function () {

            bindClick();
            bindValue();
            attachment();
            // var url = '/brands' + (_.has(window.location.obj, 'page') ? ('?page=' + window.location.obj['page']) : '');
            // $('.page-loader').show();

            // init text-editor
            CKEDITOR.document.getById(CKEDITOR_NAME.content);
            CKEDITOR.replace(CKEDITOR_NAME.content);

            renderFileEdit(filesData, 'uploadFile')
        },
        uncut: function () {
            // xóa sự kiện khi rời trang hoặc load lại trang khi dùng _.LoadPage(window.location.hash)
            // nếu không, có thể sẽ bị load lại nhiều lần khi sử dụng trên trang này
            $(document).off('click', '.orange');
            $(document).off('click', '.zmdi-tag-close');
            $(document).off('click', '#btnUpdateNew');

        }
    };
}(jQuery);