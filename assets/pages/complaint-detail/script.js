var DFT = function ($) {

    $('#back').on('click',function(){
        window.history.back();
    })
    //render ra view sau khi upload
    var renderFileEdit = function (src, id) {
        console.log('src',src);
        
        let output = $(".preview-files-zone-" + id);

        // $(".preview-files-zone-" + id).empty();
        $('.preview-files-zone-' + id).attr("style", "display:block");
        let htmlFile = ''
        for (let i = 0; i < src.length; i++) {
            htmlFile += '<div id=' + src[i].idUpload.replace(/\./g, '_') + ' class="set-p full-width col-sm-12 col-md-12 m-t-1 m-b-1 border bgm-white flex-box" style=" height: 25px">' +
                '<a class="set-w flex-box-align c-red" href=' + src[i].urlUpload + ' download>' +
                // '   <i class="zmdi zmdi-file-text f-20 m-r-10 m-l-20 c-blue"></i>' +
                '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                src[i].nameUpload +
                '   </div>' +
                // '   <i class="zmdi zmdi-download f-20"></i>' +
                '</a>' +
                '<input class="lstUploadFile" data-id=' + src[i].idUpload + ' data-url=' + src[i].urlUpload + ' data-name=' + JSON.stringify(src[i].nameUpload) + ' type="hidden">' +
                '</div>'
        }
        output.append(htmlFile);
    }

    return {
        init: function () {
            $('.container').attr('class', 'container m-b-10')
            renderFileEdit(data.files, 'uploadFile')
        },
        uncut: function () {

        }
    };
}(jQuery);