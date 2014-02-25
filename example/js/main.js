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
        // $('pre').toggle();
        $('#myModal-code').modal();
    });
    $('pre code').each(function(i, e) {
        hljs.highlightBlock(e);
    });

    $('body').on('click', 'table button.btn', function() {
        $(this).parents('tr').next().toggle();
    });


    var getRotate = function(url) {
        if (!url) {
            return 0;
        }
        var arr = url.split('/');
        console.log(arr);
        for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === 'rotate') {
                return parseInt(arr[i + 1], 10);
            }
        }
        return 0;
    };

    $('#myModal-img .modal-body-footer').find('a').on('click', function() {
        var img = $('#myModal-img').find('.modal-body img');
        var key = img.data('key');
        var oldUrl = img.attr('src');
        var originHeight = parseInt(img.data('h'), 10);
        var fopArr = [];
        var rotate = getRotate(oldUrl);
        if (!$(this).hasClass('no-disable-click')) {
            $(this).addClass('disabled').siblings().removeClass('disabled');
            if (!$(this).data('imagemogr') !== 'no-rotate') {
                fopArr.push({
                    'fop': 'imageMogr2',
                    'auto-orient': true,
                    'strip': true,
                    'rotate': rotate,
                    'format': 'png'
                });
            }
        } else {
            $(this).siblings().removeClass('disabled');
            var imageMogr = $(this).data('imagemogr');
            if (imageMogr === 'left') {
                rotate = rotate - 90 < 0 ? rotate + 270 : rotate - 90;
            } else if (imageMogr === 'right') {
                rotate = rotate + 90 > 360 ? rotate - 270 : rotate + 90;
            }
            console.log(rotate, 'rotate');
            fopArr.push({
                'fop': 'imageMogr2',
                'auto-orient': true,
                'strip': true,
                'rotate': rotate,
                'format': 'png'
            });
        }

        // console.log(rotate, 'rotate');


        $('#myModal-img .modal-body-footer').find('a.disabled').each(function() {

            var watermark = $(this).data('watermark');
            var imageView = $(this).data('imageview');
            var imageMogr = $(this).data('imagemogr');

            if (watermark) {
                fopArr.push({
                    fop: 'watermark',
                    mode: 1,
                    image: 'http://www.b1.qiniudn.com/images/logo-2.png',
                    dissolve: 100,
                    gravity: watermark,
                    dx: 100,
                    dy: 100
                });
            }
            var height;
            if (originHeight < $(window).height()) {
                switch (imageView) {
                    case 'large':
                        height = originHeight * 0.5;
                        break
                    case 'middle':
                        height = originHeight * 0.3;
                        break;
                    case 'small':
                        height = originHeight * 0.1;
                        break;
                    default:
                        height = originHeight;
                        break;
                };
            } else {
                switch (imageView) {
                    case 'large':
                        height = originHeight * 0.4;
                        break
                    case 'middle':
                        height = originHeight * 0.2;
                        break;
                    case 'small':
                        height = originHeight * 0.05;
                        break;
                    default:
                        height = originHeight;
                        break;
                };
            }
            console.log(height);
            fopArr.push({
                fop: 'imageView2',
                mode: 3,
                h: parseInt(height, 10),
                q: 100,
                format: 'png'
            });


            if (imageMogr === 'no-rotate') {
                fopArr.push({
                    'fop': 'imageMogr2',
                    'auto-orient': true,
                    'strip': true,
                    'rotate': 0,
                    'format': 'png'
                });
            }
        });

        var newUrl = Q.pipeline(fopArr, key);

        var newImg = new Image();
        img.attr('src', 'loading.gif');
        newImg.onload = function() {
            img.attr('src', newUrl);
            img.parent('a').attr('href', newUrl);
        }
        newImg.src = newUrl;



        // console.log(Q.pipeline(fopArr, key));

    });

    // $('table').on('click', '.progressName .imageMogr', function() {
    //     $('#myModal-img').modal();
    //     var modalBody = $('#myModal-img').find('.modal-body');
    //     var url = Q.imageMogr2({
    //         'auto-orient': true,
    //         'strip': true,
    //         'thumbnail': '500x500',
    //         // 'crop': '!150x200a10a10',
    //         'quality': 40,
    //         'rotate': 20,
    //         'format': 'png'
    //     }, $(this).data('href'));
    //     modalBody.find('img').attr('src', url);
    //     modalBody.find('.modal-body-wrapper').find('a').attr('href', url);
    //     return false;
    // }).on('click', '.watermark', function() {
    //     var modalBody = $('#myModal-img').find('.modal-body');
    //     var url = Q.watermark({
    //         mode: 1,
    //         image: 'http://www.b1.qiniudn.com/images/logo-2.png',
    //         dissolve: 100,
    //         gravity: 'SouthEast',
    //         dx: 100,
    //         dy: 100
    //     }, $(this).data('href'));
    //     $('#myModal-img').modal();
    //     modalBody.find('img').attr('src', url);
    //     modalBody.find('.modal-body-wrapper').find('a').attr('href', url);

    //     return false;
    // });
    // $('.imgWrapper').on('mouseover', '.imgWrapper', function() {
    //     linkWrapper.show();
    // }).on('mouseout', '.imgWrapper', function() {
    //     linkWrapper.hide();
    // })
});
