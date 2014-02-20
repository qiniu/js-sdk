var Q = new Qiniu({
    runtimes: 'html5,flash,html4',
    browse_button: 'pickfiles',
    container: 'container',
    drop_element: 'container',
    max_file_size: '100mb',
    flash_swf_url: 'js/plupload/Moxie.swf',
    // max_retries: 3,
    dragdrop: true,
    chunk_size: '4mb',
    uptoken_url: '/token',
    domain: 'http://qiniu-plupload.qiniudn.com/',
    auto_start: true,
    // filters: {
    //     mime_types: [{
    //         title: "Image files",
    //         extensions: "jpg,gif,png,jpeg"
    //     }]
    //     // }, {
    //     //     title: "Zip files",
    //     //     extensions: "zip"
    //     // }]
    // },
    init: {
        'FilesAdded': function(up, files) {
            $('table').show();
            $('#success').hide();
            console.log(up.runtime);
            plupload.each(files, function(file) {
                var progress = new FileProgress(file, 'fsUploadProgress');
                progress.setStatus("等待...");
            });
        },
        'BeforeUpload': function(up, file) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            var chunk_size = plupload.parseSize(this.getOption('chunk_size'));
            if (up.runtime === 'html5' && chunk_size) {
                progress.setChunkProgess(chunk_size);
            }
        },
        'UploadProgress': function(up, file) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            var chunk_size = plupload.parseSize(this.getOption('chunk_size'));
            progress.setProgress(file.percent + "%", up.total.bytesPerSec, chunk_size);

        },
        'UploadComplete': function() {
            $('#success').show();
        },
        'FileUploaded': function(up, file, info) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setComplete(up, parseJSON(info));
        },
        'Error': function(up, err, errTip) {
            $('table').show();
            var progress = new FileProgress(err.file, 'fsUploadProgress');
            progress.setError();
            progress.setStatus(errTip);
            // progress.setCancelled();
        }
    }
});

// console.log(Q.imageInfo('x.jpg'));
// console.log(Q.watermark({
//     mode: 1,
//     image: 'http://www.b1.qiniudn.com/images/logo-2.png',
//     dissolve: 50,
//     gravity: 'SouthWest',
//     dx: 100,
//     dy: 100
// }, 'x.jpg'));
// console.log(Q.imageMogr2({
//     // mageMogr2/auto-orient
//     //           /thumbnail/<imageSizeGeometry>
//     //           /strip
//     //           /gravity/<gravityType>
//     //           /crop/<imageSizeAndOffsetGeometry>
//     //           /quality/<imageQuality>
//     //           /rotate/<rotateDegree>
//     //           /format/<destinationImageFormat>
//     'auto-orient': true,
//     'strip': true,
//     'thumbnail': '1000x1000',
//     'crop': '!300x400a10a10',
//     'quality': 40,
//     'rotate': 20,
//     'format': 'png'
// }, 'x.jpg'));
// console.log(Q.watermark({

//     mode: 2,
//     text: 'http://www.b1.qiniudn.com/images/logo-2.png',
//     dissolve: 50,
//     gravity: 'SouthWest',
//     fontsize: 500,
//     dx: 100,
//     dy: 100,
//     fill: '#FFF000'
// }, 'x.jpg'));

// console.log(Q.pipeline([{
//     fop: 'imageView2',
//     mode: 2,
//     w: 1000,
//     text: 'http://www.b1.qiniudn.com/images/logo-2.png',
//     dissolve: 50,
//     gravity: 'SouthWest',
//     fontsize: 500,
//     dx: 100,
//     dy: 100,
//     fill: '#FFF000'
// }, {
//     fop: 'watermark',
//     mode: 1,
//     image: 'http://www.b1.qiniudn.com/images/logo-2.png',
//     dissolve: 50,
//     gravity: 'SouthWest',
//     dx: 100,
//     dy: 100
// }], 'x.jpg'));


// console.log(Q.pipeline([{
//     fop: 'watermark',
//     mode: 2,
//     text: 'http://www.b1.qiniudn.com/images/logo-2.png',
//     dissolve: 50,
//     gravity: 'SouthWest',
//     fontsize: 500,
//     dx: 100,
//     dy: 100,
//     fill: '#FFF000'
// }, {
//     fop: 'imageView2',
//     mode: 2,
//     w: 1000,
//     image: 'http://www.b1.qiniudn.com/images/logo-2.png',
//     dissolve: 50,
//     gravity: 'SouthWest',
//     dx: 100,
//     dy: 100
// }], 'x.jpg'));


$(function() {
    $('#container').on(
        'dragenter',
        function(e) {
            e.preventDefault();
            $('#container').addClass('draging');
            e.stopPropagation();
        }
    ).on('drop', function(e) {
        e.preventDefault();
        $('#container').removeClass('draging');
        e.stopPropagation();
    }).on('dragleave', function(e) {
        e.preventDefault();
        $('#container').removeClass('draging');
        e.stopPropagation();
    }).on('dragover', function(e) {
        e.preventDefault();
        $('#container').addClass('draging');
        e.stopPropagation();
    });
    $('#show_code').on('click', function() {
        $('pre').toggle();
    });
    $('pre code').each(function(i, e) {
        hljs.highlightBlock(e);
    });

    $('body').on('click', 'table button.btn', function() {
        $(this).parents('tr').next().toggle();
    });

    $('#myModal').find('.modal-body-footer').find('a').on('click', function() {
        $(this).addClass('disabled').siblings().removeClass('disabled');
    });
});
