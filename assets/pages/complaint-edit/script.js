var DFT = function ($) {

    var lastSearch = {},
        pagingObject = {},
        lastPagingData = {},
        ticketStatus = {
            NOT_PROCESS: 'Chờ xử lý',
            PROCESSING: 'Đang xử lý',
            COMPLETE: 'Hoàn thành'
        };


    //thêm option nhà hàng
    var optionRestaurant = function (resp) {
        $('#restaurantId').empty()
        $('#restaurantId').append('<option value="" >---- Chọn ----</option>')
        resp.forEach(function (item) {
            $('#restaurantId').append(newOption(item, data.restaurantId));
        })
        $('#restaurantId').selectpicker('refresh');

    }
    var optionProblem = function (resp) {
        $('#problemId').append('<option value="" >---- Chọn ----</option>')
        resp.forEach(function (item) {

            $('#problemId').append('<option ' + ((JSON.stringify(item._id) == JSON.stringify(data.problemId)) ? "selected" : "") + ' value="' + item._id + '" data-sla2="' + item.slaProblem + '">' + item.nameProblem + '</option>');
        })
        $('#problemId').selectpicker('refresh');

    }
    var optionSubCategory = function (resp) {
        $('#subCategoryComplaintId').empty()
        $('#subCategoryComplaintId').append('<option value="" >---- Chọn ----</option>')
        resp.forEach(function (item) {
            $('#subCategoryComplaintId').append(newOptionSubCategory(item, data.subCategoryComplaintId));
        })
        $('#subCategoryComplaintId').selectpicker('refresh');

    }
    var optionCategory = function (resp) {
        $('#categoryComplaintId').empty()
        $('#categoryComplaintId').append('<option value="" >---- Chọn ----</option>')
        resp.forEach(function (item) {
            $('#categoryComplaintId').append('<option value="' + item._id + '">' + item.category + '</option>');
        })
        $('#categoryComplaintId').selectpicker('refresh');

    }
    var newOption = function (obj, selected) {
        var tag = {};
        if (!_.isUndefined(selected) && !_.isNull(selected)) {
            if (_.isEqual(selected, obj._id)) {
                tag = {
                    tag: 'option',
                    attr: { class: 'option-g', value: obj._id },
                    sattr: ['selected'],
                    content: obj.name
                };
            } else {
                tag = { tag: 'option', attr: { class: 'option-g', value: obj._id }, content: obj.name };
            }
        } else {
            tag = { tag: 'option', attr: { class: 'option-g', value: obj._id }, content: obj.name };
        }
        return _.Tags([
            tag
        ]);
    };
    var newOptionSubCategory = function (obj, selected) {
        var tag = {};
        if (!_.isUndefined(selected) && !_.isNull(selected)) {
            if (_.isEqual(selected, obj._id)) {
                tag = {
                    tag: 'option',
                    attr: { class: 'option-g', value: obj._id },
                    sattr: ['selected'],
                    content: obj.subCategory
                };
            } else {
                tag = { tag: 'option', attr: { class: 'option-g', value: obj._id }, content: obj.subCategory };
            }
        } else {
            tag = { tag: 'option', attr: { class: 'option-g', value: obj._id }, content: obj.subCategory };
        }
        return _.Tags([
            tag
        ]);
    };

    var bindChange = function () {
        //hiển thị tên cửa hàng
        $('#brandId').on('change', function () {
            $('#restaurantId').empty()
            $('#restaurantId').val('')
            $('#restaurantId').selectpicker('refresh');
            let idBrand = $(this).val()
            let idProvince = $('#provinceId').val()
            if (idBrand != '' && idProvince != '') {
                _AjaxData('restaurants?idBrand=' + idBrand + '&scope=search-in-brand-manager&idProvince=' + idProvince, 'GET', {}, function (resp) {
                    if (resp.code == 200 && resp.message.length > 0) {
                        optionRestaurant(resp.message)
                    }
                })
            }

        })
        $('#provinceId').on('change', function () {
            $('#restaurantId').empty()
            $('#restaurantId').val('')
            $('#restaurantId').selectpicker('refresh');
            let idBrand = $('#brandId').val()
            let idProvince = $(this).val()
            if (idBrand != '' && idProvince != '') {
                _AjaxData('restaurants?idBrand=' + idBrand + '&scope=search-in-brand-manager&idProvince=' + idProvince, 'GET', {}, function (resp) {
                    if (resp.code == 200 && resp.message.length > 0) {
                        optionRestaurant(resp.message)

                    }
                })
            }

        })
        //sự kiện chọn loại khiếu nại
        $('#typeComplaintId').on('change', function () {
            $('#appointmentDate').val('')
            $('#problemId').val('')
            $('#problemId').empty()
            $('#problemId').selectpicker('refresh');
            let complaintId = $(this).val()
            let slaComplaint = +$(this).find(":selected").data('sla')

            if (slaComplaint !== '') {
                $('#appointmentDate').val(moment(data.created).add(slaComplaint, 'h').format('DD/MM/YYYY HH:mm'));
            }
            if (complaintId != '') {
                _AjaxData('problem-categories?idComplaint=' + complaintId, 'GET', {}, function (resp) {
                    if (resp.code == 200 && resp.message.length > 0) {
                        optionProblem(resp.message)
                    }
                })
            }
        })
        //chọn loại vấn đề gặp phải
        $('#problemId').on('change', function () {
            let slaProblem = $(this).find(":selected").data('sla2')

            $('#appointmentDate').val('')
            if (slaProblem != '') {
                $('#appointmentDate').val(moment(data.created).add(slaProblem, 'h').format('DD/MM/YYYY HH:mm'));
            }
        })
        //chọn category
        $('#categoryComplaintId').on('change', function () {
            $('#subCategoryComplaintId').val('')
            $('#subCategoryComplaintId').empty()
            $('#subCategoryComplaintId').selectpicker('refresh')
            let idCategory = $(this).val()
            if (idCategory != '') {
                _AjaxData('sub-categories?idCategory=' + idCategory, 'GET', {}, function (resp) {
                    if (resp.code == 200 && resp.message.length > 0) {
                        optionSubCategory(resp.message)
                    }
                })
            }
        })

    }

    var bindSubmit = function () {
        $('#form-edit-complaint').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {

                if (status) {
                    const _file = document.querySelectorAll('.lstUploadFile');
                    let uploadHandle = []
                    let filesRecord = []
                    let lengthRecord = $('.scales:checkbox:checked').length

                    if (lengthRecord > 0) {
                        for (var i = 0; i < (+lengthRecord); i++) {

                            filesRecord.push({
                                source: $('.scales:checkbox:checked')[i].attributes[3].value,
                                recordPath: $('.scales:checkbox:checked')[i].attributes[4].value
                            })
                        }
                    }

                    _file.forEach(e => {
                        uploadHandle.push(
                            {
                                idUpload: e.getAttribute('data-id'),
                                urlUpload: e.getAttribute('data-url'),
                                nameUpload: e.getAttribute('data-name'),
                            }
                        )
                    })
                    // var files = $('#fupload')[0].files;


                    var formData = $(form).getData();
                    formData.append('files', JSON.stringify(uploadHandle));
                    formData.append('filesRecord', JSON.stringify(filesRecord));
                    // Display the key/value pairs
                    for (var pair of formData.entries()) {
                        console.log(pair[0] + ', ' + pair[1]);
                    }
                    let id = $('#btnSave').attr('data-id')
                    _AjaxData('complaint/' + id, 'PUT', formData, function (resp) {
                        console.log('resp', resp);

                        if (_.isEqual(resp.code, 200)) {
                            swal({
                                title: 'Thông báo',
                                text: resp.message,
                                type: "success",
                                confirmButtonColor: "#74B23B",
                                closeOnConfirm: true
                            },
                                function () {
                                    window.history.back()
                                });
                        } else {
                            swal({ title: 'Thông báo!', text: resp.message, type: "error" });
                        }
                    });

                }
            }
        });

        $('#update-order').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {

                if (status) {

                    const _file = document.querySelectorAll('.lstUploadFileFeedback');
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

                    var feedback = CKEDITOR.instances['feedback'].getData();
                    if (feedback == '') {
                        swal({ title: 'Có lỗi', text: 'Vui lòng nhập nội dung hoặc chọn file để gửi phản hồi', type: 'error' });
                        return null;
                    }
                    var formData = $(form).getData();
                    formData.append('feedback', feedback);
                    formData.append('update-feedback', 'ok');
                    formData.append('files', JSON.stringify(uploadHandle));
                    // Display the key/value pairs
                    for (var pair of formData.entries()) {
                        console.log(pair[0] + ', ' + pair[1]);
                    }
                    let id = $('#btnSave').attr('data-id')
                    _AjaxData('manage-ticket-complaint/' + id, 'PUT', formData, function (resp) {
                        console.log('resp', resp);

                        if (_.isEqual(resp.code, 200)) {
                            swal({
                                title: 'Thông báo',
                                text: resp.message,
                                type: "success",
                                confirmButtonColor: "#74B23B",
                                closeOnConfirm: true
                            },
                                function () {
                                    window.history.back()
                                });
                        } else {
                            swal({ title: 'Thông báo!', text: resp.message, type: "error" });
                        }
                    });
                }
            }
        })
    }

    var bindclick = function () {

        $(document).on('click', '#btnSave', function (e) {
            $('#form-edit-complaint').submit();
        });

        $(document).on('click', '.search', function () {

            let _phoneNumber = $('#searchPhone').val()
            if (_phoneNumber != '') {
                _AjaxData('/complaint' + '?phoneNumber=' + _phoneNumber, 'GET', null, function (resp) {
                    console.log('resp', resp);

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
        $(document).on('click', '#back', function () {
            window.history.back()
        })
        $(document).on('click', '.removeFile', function () {
            var index = $(this).closest('li').data('index');
            totalFiles.splice(index, 1);
            $(this).closest('li').remove();
            $('#fileinput-label').text('Đã chọn ' + totalFiles.length + ' file');
        })
        // Lọc dữ liệu báo cáo
        $(document).on('click', '#btn-search', function () {
            console.log('filter')
            var formId = $(this).closest('form').attr('id');
            queryFilter(formId);
        });

        // Chuyển trang
        $(document).on('click', '.zpaging', function () {
            var formId = $(this).closest('form').attr('id');
            window.location.obj['page'] = $(this).attr('data-link');
            queryFilter(formId);
        });

        // Nhấn phím enter
        $(document).on('keyup', '.filter', function (e) {
            if (e.keyCode == 13) {
                var formId = $(this).closest('form').attr('id');
                queryFilter(formId);
            }
        });

        // Thay đổi cột hiển thị báo cáo
        $(document).on('change', '.column-display', function (e) {
            var dataIndex = $(this).attr('data-index');
            var checked = $(this).is(":checked");

            _.each($('th'), function (el) {
                var index = $(el).index();

                if (index == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            });

            _.each($('td'), function (el) {
                var index = $(el).index();
                if (index == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            })
        });

        // Download file báo cáo
        $(document).on('click', '#download-excel', function () {
            queryFilter('frm-report-call-monitor', true, true, lastPagingData['frm-report-call-monitor'].totalResult);
        });

        // Nghe file ghi âm
        $(document).on('click', '.playAudio', function () {
            var $this = $(this);
            var audio = $this.closest('td').find('audio')[0];

            audio.onended = function () {
                $(this).closest('td').find('.zmdi-play').show();
                $(this).closest('td').find('.zmdi-pause').hide();
            };

            _.each($('audio'), function (el) {
                var __audio = $(el)[0];
                if (__audio != audio && !__audio.paused) {
                    __audio.pause();
                    $(el).closest('td').find('.zmdi-play').show();
                    $(el).closest('td').find('.zmdi-pause').hide();
                }
            });

            if (audio.paused) {
                audio.play();
                $this.find('.zmdi-play').hide();
                $this.find('.zmdi-pause').show();
            } else {
                audio.pause();
                $this.find('.zmdi-play').show();
                $this.find('.zmdi-pause').hide();
            }
        });
    }

    function bindSocket(client) {
        // Nhận dữ liệu phân trang từ server
        client.on('responseReportCallMonitorPagingData', function (resp) {
            console.log('resp nay', resp);

            var index = _.indexOf(pagingObject[resp.formId], Number(resp.dt));
            if (_.has(pagingObject, resp.formId) && index >= 0) {
                pagingObject[resp.formId] = _.reject(pagingObject[resp.formId], function (el, i) {
                    return i <= index;
                });

                if (resp.code == 200) {
                    lastPagingData[resp.formId] = resp.message;
                    $('#' + resp.formId + ' #ticket-paging').html(createPaging(resp.message));
                    $('#ticket-total').html('<b>' +
                        '<span class="TXT_TOTAL"></span>: ' +
                        '<span class="bold c-red" id="ticket-total">' + resp.message.totalResult + '</span>' +
                        '</b>');
                    $('.TXT_TOTAL').html(_config.MESSAGE.REPORT_CALL_MONITOR.TXT_TOTAL);
                    $('#download-excel').show();
                } else {
                    $('#' + resp.formId + ' #ticket-paging').html('');
                    $('#ticket-total').html('');
                    $('#download-excel').hide();
                }
            }
        });
    };
    // Hiển thị tên cột theo file config
    function bindTextValue() {
        var temp = [];
        _.each(_.allKeys(_config.MESSAGE.REPORT_CALL_MONITOR), function (item) {
            var obj = $('.' + item);
            if (obj.prop('tagName')) {
                obj.html(_config.MESSAGE.REPORT_CALL_MONITOR[item]);

                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.REPORT_CALL_MONITOR[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });

        $('#showHideFields').append(temp.join(''));
    };
    // Lấy dữ liệu lọc báo cáo và truy vấn server
    function queryFilter(formId, ignoreSearch, downloadExcel, totalResult) {
        var filter = _.chain($('#' + formId + ' .searchColumn'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '')) {
                    memo[el.name] = $(el).val();
                }
                return memo;
            }, {}).value();

        var sort = _.chain($('#' + formId + ' thead tr th').not('[data-sort="none"]'))
            .map(function (el) {
                return $(el).attr('sortName') ? $(el).attr('sortName') + ':' + $(el).attr('data-sort') : '';
            })
            .compact()
            .value();
        sort = _.isEmpty(sort) || _.isEqual(sort.length, 0) ? '' : '&sort=' + sort[0];
        var paging = _.has(window.location.obj, 'page') ? '&page=' + window.location.obj.page : '';
        console.log('paging', paging);

        var dateTime = (new Date()).getTime();
        var custom = '&socketId=' + _socket.id
            + '&formId=' + formId
            + '&dt=' + dateTime
            + '&ignoreSearch='
            + (ignoreSearch ? 1 : 0)
            + '&download=' + (downloadExcel ? 1 : 0)
            + '&totalResult=' + (totalResult ? totalResult : 0);
        var url = (newUrl('report-call-monitor', filter) + sort + paging + custom).replace('#', '');
        console.log(193, url);
        if (downloadExcel) {
            downloadExcelReport(url);
        } else {
            requestTickets(formId, dateTime, url, ignoreSearch);
        }
    };

    // Tải file báo cáo
    function downloadExcelReport(url) {
        $('.page-loader').show();
        $.get(url, function (resp) {
            $('.page-loader').hide();

            if (resp.code == 500) {
                swal({
                    title: 'Đã có lỗi xảy ra',
                    text: resp.message,
                    type: "error"
                });
            } else {
                downloadFromUrl(window.location.origin + resp.message);
            }
        });
    };
    // Truy vấn dữ liệu ticket
    function requestTickets(formId, dateTime, url, ignoreSearch) {
        if (!_.has(pagingObject, formId)) pagingObject[formId] = [];
        pagingObject[formId].push(dateTime);
        createLoadingPaging(formId);

        _AjaxData(url, 'GET', null, function (resp) {
            console.log('resppp', resp);

            if (resp.code == 500 || (resp.message.length == 0 && !ignoreSearch)) {
                swal({
                    title: 'Không tìm thấy kết quả với khoá tìm kiếm',
                    text: resp.message,
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Xác nhận!",
                    closeOnConfirm: true
                }, function () {
                    reverseSearchValue();
                    reversePagingData(formId);
                });
            } else {
                loadData(formId, resp);
            }
        });
    };

    // Cập nhật lại các tiêu chí tìm kiếm lên màn hình
    function setValueLastSearch() {
        _.each($(' .searchColumn'), function (el) {
            var name = $(el).attr('name');
            var value = $(el).val();
            lastSearch[name] = value;
        });
    };

    function reverseSearchValue() {
        _.each($('.searchColumn'), function (el) {
            var name = $(el).attr('name');
            var value = lastSearch[name] ? lastSearch[name] : '';
            $(el).val(value);
        });

        $('.selectpicker').selectpicker('refresh');
        $('.tag-select').trigger("chosen:updated");
    };

    function reversePagingData(formId) {
        if (!_.has(lastPagingData, formId) || _.isEmpty(lastPagingData[formId])) return '';
        $('#' + formId + ' #ticket-paging').html(createPaging(lastPagingData[formId]));
    };
    // Hiển thị phân trang lên giao diện
    function createPaging(paging) {
        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="zpaging" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="zpaging" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
            if (paging.range[i] == paging.current) {
                pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
            } else {
                pageNum += '<li><a class="zpaging" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
            }
        }
        var pageNext = paging.next ? '<li><a class="zpaging" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="zpaging" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };

    // Hiển thị màn hình chờ khi truy vấn
    function createLoadingPaging(formId) {
        var htmlCode = '<div class="paginate text-center">' +
            '<ul class="pagination">' +
            '<li>' +
            '<img src="assets/images/loading.gif"/>' +
            '</div> ' +
            '</li>' +
            '</ul></div>';
        $('#' + formId + ' #ticket-paging').html(htmlCode);
    };
    // Hiển thị dữ liệu lên màn hình
    function loadData(formId, resp) {
        var template = '<tr>' +
            '<td>{0}</td>' +
            '<td>{1}</td>' +
            '<td>{2}</td>' +
            '<td>{3}</td>' +
            '<td class="text-center">{4}</td>' +
            '</tr>';

        var rows = '';
        console.log('_urlBinding', _urlBinding);

        resp.message.forEach(function (el) {
            if (_.isEmpty(el)) return;
            var checked = ''

            data.filesRecord.forEach(function (item) {

                if (item.source == path && item.callId == el.callId) {
                    checked = 'checked'
                }
            })
            var buttonAction = `<audio id="${el._id}" class="myAudio" preload="none">` +
                `<source  src="${el.recordPath}" type="audio/wav">` +
                //'<source src="'+ el.recordPath +'" type="audio/ogg; codecs=vorbis">' +
                'Your user agent does not support the HTML5 Audio element.' +
                '</audio>' +
                '<button class="btn btn-default playAudio" type="button">' +
                '<i class="zmdi zmdi-play f-25" ></i>' +
                '<i class="zmdi zmdi-pause f-25" style="display: none;"></i>' +
                '</button>' +
                '<button class="btn btn-default m-l-10" type="button">' +
                '<input type="checkbox" ' + checked + ' class="scales" name="id" src="' + el.recordPath + '" data-record="' + el.callId + '">' +
                '</button>';

            rows += template.str(el.transType == 1 || el.transType == 7 ? 'Gọi vào' : 'Gọi ra',
                moment(el.startTime).format("DD/MM/YYYY"),
                moment(el.startTime).format("HH:mm:ss DD/MM/YYYY"),
                el.user,
                buttonAction
            );

            setValueLastSearch();
            $('#' + formId + ' #ticket-body').html(rows);
            // setTimeout(() => {
            //     document.getElementById(res.data.sessionId).load();
            // }, 100);
            $('.selectpicker').selectpicker('refresh');
            $('.tag-select').trigger("chosen:updated");
            window.MainContent.loadTooltip();
        }
        });
};



function updateView() {
    // resize chosen picker
    $(".chosen-container").each(function () {
        $(this).attr('style', 'width: 100%');
    });

    // Setup date range picker
    // $('.daterangepicker').daterangepicker({
    //     autoUpdateInput: false,
    //     opens: "center",
    //     locale: {
    //         format: 'DD/MM/YYYY',
    //         cancelLabel: 'Clear'
    //     }
    // })
    //     .on('apply.daterangepicker', function (ev, picker) {
    //         $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
    //     })
    //     .on('cancel.daterangepicker', function (ev, picker) {
    //         $(this).val('');
    //     });
};


var getValueEdit = function () {
    console.log('branch', $('#brandId').val());
    if ($('#brandId').val() != '' && $('#provinceId').val() != '') {
        _AjaxData('restaurants?idBrand=' + $('#brandId').val() + '&scope=search-in-brand-manager&idProvince=' + $('#provinceId').val(), 'GET', {}, function (resp) {
            if (resp.code == 200 && resp.message.length > 0) {
                optionRestaurant(resp.message)
            }
        })
    }
    if ($('#typeComplaintId').val() != '') {
        _AjaxData('problem-categories?idComplaint=' + $('#typeComplaintId').val(), 'GET', {}, function (resp) {
            console.log('val', resp);

            if (resp.code == 200 && resp.message.length > 0) {
                optionProblem(resp.message)
            }
        })
    }
    if ($('#categoryComplaintId').val() != '') {
        _AjaxData('sub-categories?idCategory=' + $('#categoryComplaintId').val(), 'GET', {}, function (resp) {
            if (resp.code == 200 && resp.message.length > 0) {
                optionSubCategory(resp.message)
            }
        })
    }
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
    //feedback
    $(document).on('change', '.blue', function () {
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
                renderFileFeedback(srcFile, idFile)
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
                // '<a href="' + src[i].url + '" download><i class="zmdi zmdi-download f-20 c-grey"></i></a>'+
                '<a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=' + src[i]._id + '></i></a>' +
                '<input class="lstUploadFile" data-id=' + src[i]._id + ' data-url=' + src[i].url + ' data-name=' + JSON.stringify(src[i].name) + ' type="hidden">' +
                '</div>'
        }
        output.append(htmlFile);
    }
    //render file feedback
    renderFileFeedback = (src, id) => {

        let output = $(".preview-files-zone-" + id);

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

            htmlFile += '<div id=' + src[i]._id.replace(/\./g, '_') + ' class="set-p full-width col-sm-12 col-md-12 m-t-1 m-b-1 border bgm-white flex-box" style=" height: 25px">' +
                // '<a class="set-w flex-box-align c-red" href=' + src[i].url + ' download>' +
                _url(src[i]) +
                // '<a href="' + src[i].url + '" download><i class="zmdi zmdi-download f-20 c-grey"></i></a>'+
                '<a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=' + src[i]._id + '></i></a>' +
                '<input class="lstUploadFileFeedback" data-id=' + src[i]._id + ' data-url=' + src[i].url + ' data-name=' + JSON.stringify(src[i].name) + ' type="hidden">' +
                '</div>'
        }
        console.log('htmlFile', htmlFile);

        output.append(htmlFile);
    }

    //xử lý xóa upload
    $(document).on('click', '.zmdi-tag-close', function () {
        let idRemove = $(this).attr('data-remove').toString().replace(/\./g, '_');
        console.log('idremove', idRemove);

        swal({
            title: "Bạn muốn xoá mục này ?",
            text: "Tất cả các đường dẫn tới file này sẽ không còn sử dụng được",
            type: "warning", showCancelButton: true, confirmButtonColor: "#DD6B55", confirmButtonText: "Có, chắc chắn !", closeOnConfirm: false
        }, function () {
            _AjaxObject('uploadFile/' + idRemove, 'DELETE', {}, function (resp) {
                console.log('yolo', resp, typeof resp, resp.code);
                if (_.isEqual(resp.code, 200)) {
                    swal({ title: 'Thành công', text: 'Tất cả đường dẫn tới file đều không còn hiệu lực', type: "success" });
                    $('#' + idRemove).remove();
                } else {
                    swal({ title: 'Thất bại!', text: 'Có lỗi xảy ra!' });
                }
            });
        });
    });
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
            // '<a href="' + src[i].urlUpload + '" download><i class="zmdi zmdi-download f-20 c-grey"></i></a>'+
            '<a class="flex-box c-grey"><i class="zmdi zmdi-tag-close f-20 m-r-10" data-remove=' + src[i].idUpload + '></i></a>' +
            '<input class="lstUploadFile" data-id=' + src[i].idUpload + ' data-url=' + src[i].urlUpload + ' data-name=' + JSON.stringify(src[i].nameUpload) + ' type="hidden">' +
            '</div>'
    }
    output.append(htmlFile);
}
//render ra view sau khi upload
var renderFileFeedEdit = function (src, id) {
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
// disable edit
function disableEdit() {
    $('#form-edit-complaint *').attr('disabled', true)
    $('#boxButton').attr('style', 'display:none')
}
return {
    init: function () {
        // $('.container').attr('class', 'container m-b-10')
        attachment();
        bindSubmit();
        bindChange();
        bindclick();
        getValueEdit();
        renderFileEdit(data.files, 'uploadFile')
        CKEDITOR.document.getById('feedback');
        CKEDITOR.replace('feedback');
        setValueLastSearch();
        bindSocket(_socket);
        updateView();
        bindTextValue();

        if (!isEdit) {
            disableEdit()
        }
    },
    uncut: function () {

    }
};
}(jQuery);