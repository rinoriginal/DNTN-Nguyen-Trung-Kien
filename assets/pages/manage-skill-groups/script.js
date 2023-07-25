var DFT = function ($) {


    /**
     * Lấy dữ liệu search và gửi lên server
     * @param msg
     */
    //Lấy dữ liệu lọc và truy vấn lên server
    var queryFilter = function (page) {

        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        if (page) {
            filter.page = page;
        }

        _Ajax("/manage-skill-groups?" + $.param(filter), 'GET', {}, function (resp) {
            console.log({ resp });
            if (resp.code == 200) {
                $('#sum').remove();
                $('#tbBody').empty();
                if (resp.data.length) {
                    loadData(resp);
                    $('#paging').html(createPaging(resp.paging));
                }
            }
        })
    };

    /**
     * Bắt sự kiện click
     */
    let bindClick = function () {
        let _page = 1
        // Click sang trang khác
        $(document).on('click', '.pagination li a', function (e) {
            e.preventDefault();
            queryFilter($(this).attr('data-link'));
        });

         // Xóa phần tử hiện tại
         $(document).on('click', '.btn-remove', function () {
            var id = $(this).attr('data-id');
            swal({
                title: 'Xác nhận xóa',
                text: 'Bạn có chắc là xóa nhóm kỹ năng này trên hệ thống?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Có, chắc chắn!",
                closeOnConfirm: false
            },
                function () {
                    _AjaxObject('/manage-skill-groups/' + id, 'DELETE', {}, function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            swal({
                                title: 'Thành công',
                                text: 'Nhóm kỹ năng đã được xóa thành công!',
                                type: 'success',
                                html: true
                            }, function () {
                                _.LoadPage(window.location.hash);
                            });
                        } else {
                            swal({ title: 'Thất bại!', text: resp.message });
                        }
                    });
                }
            );
        });

        $(document).on('click', '.zmdi-refresh', function(){
            _.LoadPage(window.location.hash);
        });

    }

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

    };

    //hiển thị dữ liệu lên giao diện
    var loadData = function (resp) {

        var template = '<tr>' +
            '<td class="text-center" style="width:140px" title="{0}">{0}</td>' +
            '<td class="text-center task" style="width:140px">' +
            '<a role="button" class="p-t-3 btn-flat-bg" ' +
            'href="#manage-skill-groups/{1}/edit" ' +
            'data-toggle="tooltip" data-placement="top" title="Chỉnh sửa">' +
            '<i class="zmdi zmdi-edit green f-17"></i></a>' +
            '<a role="button" href="#manage-agent-skills/{1}-{2}/edit" class="p-t-3 btn-flat-bg addAgent" data-toggle="tooltip" data-placement="top" title="Phân công"><i class="zmdi zmdi-accounts-add green f-17"></i></a>' +
            '<a role="button" title="Xóa" type="click" class="p-t-3 btn-flat-bg btn-remove" data-id="{1}"><i class="zmdi zmdi-close red f-17"></i></a>' +
            '</td>' +
            '</tr>'

        var rows = '';


        resp.data.forEach(function (el) {

            rows += template.str(
                el.name ? el.name : '',
                el._id,
                el.listSkills.toString()
            )
        })

        $('#tbBody').html(rows);
    };

    function createPaging(paging, classPaging) {

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
        if (!!pageNum) {
            $('#paging').attr('style', 'display:block')
        }
        else {
            $('#paging').attr('style', 'display:none')
        }
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };

    return {
        init: function () {
            bindClick();
            bindSubmit();
            queryFilter()
        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '#btn-search');
            $(document).off('change', '.select-box-all');
            $(document).off('change', '.select-box-cell');
            $(document).off('click', '#form-articles .pagination li a');
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('click', '.sort');
            $(document).off('change', '#group-select');
        }
    };
}(jQuery);