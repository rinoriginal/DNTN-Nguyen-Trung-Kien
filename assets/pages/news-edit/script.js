var DFT = function ($) {

    var _options = { id: '', url: '/brands', method: 'POST', data: {} };
    let modalName = {
        create_brand: "modal_create_brand",
        update_brand: "modal_update_brand",
        create_restaurant: "modal_create_restaurant",
        update_restaurant: "modal_update_restaurant",
        create_category: "modal_create_category",
        update_category: "modal_update_category",
    };

    var convertUrlForQuery = function (url) {
        return url.replace('#', '');
    }

    // Lấy dữ liệu từ url
    var getUrlParams = function(url){
        var obj = {};
        for (var i, o = /\+/g, a = /([^&=]+)=?([^&]*)/g, r = function(e) {
            return decodeURIComponent(e.replace(o, " "))
        }, c = url.split("?")[1]; i = a.exec(c);) {

            obj[r(i[1])] = r(i[2]);
        }
        delete obj.undefined;
        return obj;
    }

    var searchObj = {};
    var oldQuery = {};
    var listFilter = [];

    let filesToUpload = [];
    let CKEDITOR_NAME = {
        content: "content",
    };

    /**
     * Lấy dữ liệu search và gửi lên server
     * @param msg
     */
    var queryFilter = function (msg) {
        var _data = _.pick($('#form-articles').serializeJSON(), _.identity);
        async.waterfall([
            function (cb) {
                if (_.has(msg, 'filter')) {
                    listFilter = _.chain($('.filter'))
                        .map(function (el) {
                            return _.has(_data, $(el).attr('id')) ? _.object([$(el).attr('id')], [_data[$(el).attr('id')]]) : null;
                        })
                        .compact()
                        .reduce(function (memo, item) {
                            memo[_.keys(item)] = _.values(item)[0];
                            return memo;
                        }, {})
                        .value();
                }
                cb();
            }
        ], function (err) {
            var listSort = _.chain($('thead tr th').not('[data-sort="none"]'))
                .map(function (el) {
                    return $(el).attr('data-field') ? $(el).attr('data-field') + ':' + $(el).attr('data-sort') : '';
                })
                .compact()
                .value();
            listSort = _.isEmpty(listSort) ? '' : '&sort=' + listSort[0];
            $('.page-loader').show();
            $.get(convertUrlForQuery(newUrl('articles', listFilter) + listSort + (_.has(window.location.obj, 'ticket-href') ? ('&' + window.location.obj['ticket-href']) : '')), function (resp) {
                $('.page-loader').hide();
                if (resp.data.length == 0 && Object.keys(window.location.obj).length > 0) {
                    swal({
                        title: _config.MESSAGE.ARTICLE.SEARCH_NOT_FOUND_TITLE,
                        text: _config.MESSAGE.ARTICLE.SEARCH_NOT_FOUND_TEXT,
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    }, function () {
                        _.each(oldQuery, function (v, k) {
                            var el = $('#' + k);
                            if (el[0]) {
                                switch (el.prop('tagName')) {
                                    case 'INPUT':
                                        el.val(v);
                                        break;
                                    case 'SELECT':
                                        el.val(v);
                                        if (el.is('.selectpicker')) el.selectpicker('refresh');
                                        break;
                                }
                            }
                        });
                    });
                } else {
                    oldQuery = listFilter;
                    refreshArticles(resp);
                }
            });
        });
    };


    /**
     * Bắt sự kiện khởi tạo trang
     */

    var bindData = function (data) {
        
        // fill data vào các trường liên quan.
        console.log({dataInit: data});
    }
    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // Nút Lọc/Search
        $(document).on('click', '#btn-search', function (e) {
            e.preventDefault();
            if ($('#title').val().length > 0) {
                window.location.obj['title'] = $('#title').val();
            }
            else {
                delete window.location.obj['title'];
            }

            if ($('#raw').val().length > 0) {
                window.location.obj['raw'] = $('#raw').val();
            }
            else {
                delete window.location.obj['raw'];
            }

            if (!_.isEqual($('#category').val(), '0')) {
                window.location.obj['category'] = $('#category').val();
            }
            else {
                if (!_.isEqual($('#group').val(), '0')) {
                    window.location.obj['category'] = $('#category').val();
                }
                else {
                    delete window.location.obj.category;
                }
            }

            if ($('#author').val().length > 0) {
                window.location.obj['author'] = $('#author').val();
            }
            else {
                delete window.location.obj.author;
            }

            if ($('#updater').val().length > 0) {
                window.location.obj['updater'] = $('#updater').val();
            }
            else {
                delete window.location.obj.updater;
            }

            if ($('#created').val().length > 0) {
                window.location.obj['created'] = $('#created').val();
            }
            else {
                delete window.location.obj.created;
            }

            var tmpString = '?';
            searchObj = {};
            _.each(window.location.obj, function (obj, i) {
                tmpString = tmpString + i + '=' + obj + '&';
                searchObj[i] = obj;
            });
            queryFilter({ filter: true });
        });

        // click category-parent
        $(document).on('click', '#importFile', function (e) {
            e.preventDefault();
            $("#file").click();
        });

        $(document).on('click', '#btnUpdateNew', handleEventClickBtnUpdateNew);
        $(document).on("click", ".delete-file", handleEventClickDeleteFile);

        function handleEventClickBtnUpdateNew(e) {
            e.preventDefault();
            let target = $(e.currentTarget);
            let newsID = target.attr("data-id");
            let data = {
                title: $("#title").val(),
                content: CKEDITOR.instances[CKEDITOR_NAME.content].getData(),
                status: $(`#create_new_status`).val(),
            }

           if(!newsID) return swal({title: "không thể thực hiện lúc này!"});

            var formData = new FormData();
            formData.append("title", data.title);
            formData.append("content", data.content);
            formData.append("status", data.status);

            for (var i = 0, len = filesToUpload.length; i < len; i++) {
                if(filesToUpload[i].file._id){
                  console.log("ko up load");
                }else {
                  formData.append("files", filesToUpload[i].file);
                }
              }
            //   return console.log({newsID, data, filesToUpload});

            $.ajax({
                url: window.location.hash.replace("#", "").replace("/edit", ""),
                data: formData,
                processData: false,
                contentType: false,
                type: "PUT",
                success: function (data) {
                    console.log("DONE", data);

                    if (data.code != 200) {
                        swal({
                            title: "Thông báo",
                            text: data.message,
                            type: "error"
                        })
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Thành công"
                        }, () => {
                            _.LoadPage(window.location.hash);
                        })
                        
                    }

                },
                error: function (data) {
                    console.log("ERROR - " + data.responseText);
                }
            });
        }

        function handleEventClickDeleteFile(e) {
            e.preventDefault();
            let target = $(e.currentTarget);
            let eleID = target.attr("data-id");
            let mapFiles = {};
            let fileObjectID;
      
            filesToUpload.filter((i, index) => {
              if(i.id != eleID) {
                mapFiles[index] = i.file;
                return true;
              }
              if(i.file._id) fileObjectID = i.file._id;
              return false;
            });
            filesToUpload = [];
      
            if(fileObjectID){
              _AjaxDataCustom(`/news/`+ newsCurrentID, "PUT", JSON.stringify({deleteFileID: fileObjectID}), {
                contentType: "application/json",
                }, function (resp) {
                    console.log({resp});
                });
            }
            
      
            // $("#file").val(mapFiles);
            renderFileToContent(mapFiles);
          }
    };

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

    };

    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindValue = function () {
        _.each(_.allKeys(_config.MESSAGE.ARTICLE), function (item) {
            $('.' + item).html(_config.MESSAGE.ARTICLE[item]);
        });
    };

    var bindChange = function () {

        // Nút changeStatus modal_create_category
        $(document).on('change', '#create_new_status', e => handleEventChangeStatus(e, "create_new"));
        $(document).on('change', '#file', handleEventChangeImportFile);

        function handleEventChangeStatus(e, type) {
            e.preventDefault();
            let $this = $(e.currentTarget);
            let isChecked = $this.is(":checked");
            renderStatusBrand(type, isChecked);
        }

        function handleEventChangeImportFile(e) {
            e.preventDefault();
            let $this = $(e.currentTarget);
            let files = $this.prop("files");
            let lastIndex = filesToUpload.length;
            if(lastIndex > 0) {
              filesToUpload.forEach((i, index) => {
                files[Object.keys(files).length + i] = i.file
              });
      
            }
            filesToUpload = [];

            renderFileToContent(files);
        }
    };

    var bindModal = function () {

        /**
         * shown.bs.modal: bật phát ăn luôn
         * shown.bs.modal: đợi hết css mới ăn
         * hide.bs.modal: tắt phát ăn luôn
         * hidden.bs.modal: đợi hết css mới ăn
         */

        $('#modal_update_brand').on('shown.bs.modal', function () {

        });

        $('#modal_update_brand').on('hide.bs.modal', function () {
            $("#listBrand li").removeClass("active");
        });
    };

    function renderStatusBrand(modalName, status) {
        $(`#${modalName}_status`).val(status ? "on" : "off");
        return $(`#${modalName}_status_text`).html(status ? "Active" : "Not Active");
    }

    /**
     * validate form tự làm để hiển thị trên modal, do validate engin đang dùng không hỗ trợ trên modal
     * @param {String} formName Tên form
     * @param {Object} data các giá trị của form cần check
     */
    function validateFormCustomize(formName, data) {
        let pass = false;

        for (let i = 0; i < Object.keys(data).length; i++) {
            const ele = Object.keys(data)[i];
            let fieldCheck = $(`#${formName}_${ele}`);
            let fieldValidate = $(`#${formName}_${ele}_validate`);
            console.log({ ele, val: fieldCheck.val() })
            if (fieldCheck.hasClass("required")) {

                if (fieldCheck.val() != "") {
                    pass = true;
                    fieldValidate.removeClass("active");
                } else {
                    pass = false;
                    fieldValidate.addClass("active");
                    break;
                }
            }
        }

        return pass;
    }

    function renderFileToContent(files) {
        /**
         * name: "js.png"
         * lastModified: 1592758038016
         * lastModifiedDate: Sun Jun 21 2020 23:47:18 GMT+0700 (Indochina Time)
         * webkitRelativePath: "",
         * size: 2609
         * type: "image/jpeg"
         */
        console.log({ files })
        $("#tblListFile tbody").html(
            Object.keys(files).map((i, index) => {
                filesToUpload.push({
                    id: index,
                    file: files[i],
                })
                return "<tr>" + [
                    `<td>Tên tài liệu</td>`,
                    `<td class="text-center">${moment(i.lastModifiedDate|| i.created).format('HH:mm DD/MM/YYYY')}</td>`,
                    `<td>${files[i].name}</td>`,
                    `<td class="text-center"><i class="zmdi zmdi-close-circle text-danger delete-file"  data-id="${filesToUpload.length - 1 }"></i></td>`,
                ].join("") + "</tr>"
            }).join("")
        )
    }

    return {
        init: function () {

            bindClick();
            bindSubmit();
            bindValue();
            bindChange();
            bindModal();
            // var url = '/brands' + (_.has(window.location.obj, 'page') ? ('?page=' + window.location.obj['page']) : '');
            // $('.page-loader').show();

            // init text-editor
            CKEDITOR.document.getById(CKEDITOR_NAME.content);
            CKEDITOR.replace(CKEDITOR_NAME.content);

            if(filesData) {
                filesData.forEach((item, index) => {
                  filesToUpload.push({
                    id: index,
                    file: item,
                  });
                });
              }
        },
        uncut: function () {
            // xóa sự kiện khi rời trang hoặc load lại trang khi dùng _.LoadPage(window.location.hash)
            // nếu không, có thể sẽ bị load lại nhiều lần khi sử dụng trên trang này
            $(document).off('click', '#btn-search');
            $(document).off('change', '.select-box-all');
            $(document).off('change', '.select-box-cell');
            $(document).off('click', '#form-articles .pagination li a');
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('click', '.sort');
            $(document).off('change', '#group-select');
            $(document).off('click', '#btnCreateCategory');
            $(document).off('change', '#create_new_status');
            $(document).off('click', '.create-new-by-category');
            $(document).off('click', '.category-parent');
            $(document).off('click', '.category-child');
            $(document).off('click', '.add-menu');
            $(document).off('click', '#importFile');
            $(document).off('click', '#btnUpdateNew');
            $(document).off('change', '#file');

        }
    };
}(jQuery);