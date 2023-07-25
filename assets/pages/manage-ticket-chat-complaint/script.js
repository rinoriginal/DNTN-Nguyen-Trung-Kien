/* { author: haivh } */
var DFT = function ($) {

    var body = document.querySelector("#container");
    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {

        // Click nút Lọc/Search
        $('a.btn.btn-success.uppercase.c-white').click(function () {
            queryFilterComplaint(true);
        });

        // Load lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
        $(document).on('click', '.pagination li a', function (e) {
            e.preventDefault();
            queryFilterComplaint(false, $(this).attr('data-link'));
        });


        // fix lỗi search 
        // $(document).on('click', '.pagination li a', function (e) {
        //     e.preventDefault();
        //     var page = !_.isNaN(parseInt($(this).data('page'))) ? parseInt($(this).data('page')) : 1;
        //     console.log('search: ' + page);
        //     queryFilterComplaint(page);
        // });


    };

    // Lấy dữ liệu search và gửi lên server
    var queryFilterComplaint = function (load, page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        if (page) {
            filter.page = page;
        }
        console.log("/manage-ticket-chat-complaint?" + $.param(filter));
        
        if (load == true) {
            _Ajax("/manage-ticket-chat-complaint?" + $.param(filter), 'GET', {}, function (resp) {
                console.log({resp});
                
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {

                        loadDataComplaint(resp);
                        $('#paging').html(createPaging(resp.paging));
                    } 
                    else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy các trường phù hợp",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        });
                    }
                } else {
                    swal({ title: 'Cảnh báo !', text: resp.message });
                }
            })
        }
        if (!load) {
            _Ajax("/manage-ticket-chat-complaint?" + $.param(filter), 'GET', {}, function (resp) {
                console.log('resp',resp);
                
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {

                        loadDataComplaint(resp);
                        $('#paging').html(createPaging(resp.paging));
                    }
                }
            })
        }


    };


    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindValue = function () {
        var temp = [];
        _.each(_.allKeys(_config.MESSAGE.RESTA_TABLE), function (item) {
            var obj = $('.' + item);

            if (obj.prop('tagName')) {

                obj.html(_config.MESSAGE.RESTA_TABLE[item]);

                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.RESTA_TABLE[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });
        $('#showHideFields').append(temp.join(''));
    };
    function createPaging(paging, classPaging) {
        console.log(paging);

        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="' + classPaging + '" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="' + classPaging + '" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
            if (paging.range[i] == paging.current) {
                pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
            } else {
                pageNum += '<li><a class="' + classPaging + '" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
            }
        }
        var pageNext = paging.next ? '<li><a class="' + classPaging + '" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="' + classPaging + '" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };
    //hiển thị dữ liệu lên giao diện
    var loadDataComplaint = function (resp) {
        var rows = '';
        resp.data.forEach(function (el, i) {

            if (_.isEmpty(el)) return;
            var warnClass = "";
            var template = '<tr id="{10}" class={11} style="height:35px !important;">' +
                '<td class="text-center" style="width:40px" title="{0}">{0}</td>' +
                '<td class="text-center" style="width:100px" title="{1}">{1}</td>' +
                '<td class="text-center" style="width:240px" title="{2}">{2}</td>' +
                '<td class="text-center" style="width:1px" title="{3}">{3}</td>' +
                '<td class="text-center" style="width:50px" title="{4}">{4}</td>' +
                '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
                '<td class="text-center" style="width:140px" title="{6}">{6}</td>' +
                '<td class="text-center" style="width:140px" title="{7}">{7}</td>' +
                '<td class="text-center" style="width:140px" title="{8}">{8}</td>' +
                '<td class="text-center" style="width:140px" title="{9}">{9}</td>' +
                '<td class="text-center"><a role="button" data-id="{10}" data-form="complaint" href="/#manage-ticket-complaint/{10}/edit" class="p-t-3 btn-flat-bg btn-edit" data-toggle="tooltip" data-placement="top" data-original-title="Sửa"><i class="zmdi zmdi-edit c-green f-17"></i></a> </td>' +
                '</tr>';

            // sum += (el.priceRelease.reduce((a, b) => a + b, 0) - el.priceOriginal.reduce((a, b) => a + b, 0))
            if (!_.isNull(el.deadline) && !_.isEqual(el.status, 2)) {
                var minutesEnd = moment.duration(moment(el.deadline).diff(moment(new Date()))).asMinutes();
                var sla = el.slaProblem ? el.slaProblem : (el.slaComplaint ? el.slaComplaint : 0)

                if (minutesEnd > 0) {
                    if (minutesEnd / 60 < +sla * 2 / 3) {
                        warnClass = "warning-deadline";
                    }
                    else {
                        //chua den han xu ly nhung da den luc canh bao
                        warnClass = "new-ticket";
                    }
                }
                else {
                    warnClass = "over-deadline";
                }
            }

            rows += template.str(
                (el.complaintType ? el.complaintType : ''),
                (el.problem ? el.problem : ''),
                (el.content ? el.content : ''),
                (el.customerName ? el.customerName : ''),
                (el.customerPhone ? el.customerPhone : ''),
                (el.agent ? el.agent : ''),
                (el.restaurant ? el.restaurant : ''),
                (el.status == 0 ? 'Đang xử lý' : (el.status == 1 ? 'Tạm dừng xử lý' : 'Đã xử lý')),
                (moment(el.created).format('DD/MM/YYYY HH:mm')),
                (moment(el.deadline).format('DD/MM/YYYY HH:mm')),
                (el._id),
                warnClass

            );
        })
        if (body){
            body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)
        }
        $('#tbBody').html(rows);
    };

    // disable form
    function disableEdit(){
        $('#btn-addTicketComplaint').attr('style','display:none')
    }


    return {
        init: function () {
            if(!isEdit){
                disableEdit()
            }
            queryFilterComplaint(true);
            bindValue();
            bindClick();

            // Hiển thị thông báo khi không tìm thấy kết quả
            // console.log('hihi',Object.keys(window.location.obj).length);
            
            // if (Object.keys(window.location.obj).length > 0) {
            //     delete window.location.obj['sort'];
            //     swal({
            //         title: 'Không tìm thấy kết quả',
            //         text: 'Không có kết quả',
            //         type: "warning",
            //         confirmButtonColor: "#DD6B55",
            //         confirmButtonText: "Quay lại!",
            //         closeOnConfirm: true
            //     }, function () {
            //         window.history.back();
            //     });
            // };


            $('.selectpicker').selectpicker('refresh');

            // Hiển thị dữ liệu sắp xếp
            if (_.has(window.location.obj, 'sort')) {
                var _sort = window.location.obj.sort.split(':');
                $('th[sortName="' + _sort[0] + '"]').attr('data-sort', _sort[1]);
            }

            window.onbeforeunload = null;
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });

            $('#btn-new-complaint').attr("style","display:none")

        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '.sort');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zmdi-refresh');
            $(document).off('click', '.pagination li a');

            $(document).off('click', '.btn-edit');

        }
    };

}(jQuery);