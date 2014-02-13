function Qiniu(op) {
    //var
    //  get_token_url \
    var uploader = new plupload.Uploader({
        runtimes: 'html5,flash,silverlight,html4',
        browse_button: 'pickfiles',
        container: 'container',
        drop_element: 'container',
        max_file_size: '100mb',
        url: 'http://up.qiniu.com',
        flash_swf_url: 'js/plupload/Moxie.swf',
        silverlight_xap_url: 'js/plupload/Moxie.xap',
        // max_retries: 1,
        //required_features: true,
        dragdrop: true,
        chunk_size: '4mb',
        multipart_params: {
            token: ''
        }
    });

    var token = '';
    var ctx = '';
    var BLOCK_BITS = 22;
    var BLOCK_SIZE = 1 << BLOCK_BITS; //4M

    uploader.bind('Init', function(up, params) {
        //显示当前上传方式，调试用
        ajax = createAjax();
        ajax.open('GET', '/token', true);
        // ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
        // ajax.setRequestHeader('Authorization', 'UpToken ' + token);
        ajax.send();
        ajax.onreadystatechange = function() {
            if (ajax.readyState == 4 && ajax.status == 200) {
                // var progress = new FileProgress(file, 'fsUploadProgress');
                // progress.setComplete(ajax.responseText);
                var log = $.parseJSON(ajax.responseText);
                // console.log(ajax.responseText);
                // console.log(log.uptoken);
                token = data.uptoken;
            }
        }
        // $.ajax({
        //     url: '/token',
        //     type: 'GET',
        //     cache: false,
        //     // headers: {
        //     //     'Cache-Control': 'no-cache',
        //     //     'Pragma': 'no-cache'
        //     // },
        //     success: function(data) {
        //         if (data && data.uptoken) {
        //             token = data.uptoken;
        //         }
        //     },
        //     error: function(error) {
        //         console.log(error);
        //     }
        // });
    });
    uploader.init();

    uploader.bind('FilesAdded', function(up, files) {
        $('table').show();
        $('#success').hide();
        console.log(up.runtime)
        plupload.each(files, function(file) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setStatus("等待...");
            progress.toggleCancel(true, uploader);
            up.start();
        });
        up.refresh(); // Reposition Flash/Silverlight
    });

    uploader.bind('BeforeUpload', function(up, file) {
        var progress = new FileProgress(file, 'fsUploadProgress');
        if (uploader.runtime === 'html5') {
            ctx = '';
            var blockSize = file.size > BLOCK_SIZE ? BLOCK_SIZE : file.size
            // up.settings.chunk_size = '4mb';
            up.settings.url = 'http://up.qiniu.com/mkblk/' + blockSize;
            up.settings.multipart = false;
            up.settings.headers = {
                'Authorization': 'UpToken ' + token,
            };
            up.settings.multipart_params = {};
        } else {
            up.settings.url = 'http://up.qiniu.com/';
            up.settings.multipart = true;
            up.settings.chunk_size = undefined;
            up.settings.multipart_params.token = token;
            up.settings.multipart_params.key = file.name;
        }
    });

    uploader.bind('UploadProgress', function(up, file) {
        var progress = new FileProgress(file, 'fsUploadProgress');
        progress.setProgress(file.percent + "%", up.total.bytesPerSec);
    });

    uploader.bind('ChunkUploaded', function(up, file, info) {
        var res = $.parseJSON(info.response);
        console.log(info);

        ctx = ctx ? ctx + ',' + res.ctx : res.ctx;
        var leftSize = info.total - info.offset;
        if (leftSize < BLOCK_SIZE) {
            up.settings.url = 'http://up.qiniu.com/mkblk/' + leftSize;
        }

    });

    uploader.bind('Error', function(up, err) {
        var file = err.file;
        var errTip = '';
        console.log(err);
        $('table').show();
        if (file) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setError();
            switch (err.code) {
                case plupload.FAILED:
                    errTip = '上传失败';
                    break;
                case plupload.FILE_SIZE_ERROR:
                    errTip = '超过100M的文件请使用命令行或其他工具上传';
                    break;
                case plupload.FILE_EXTENSION_ERROR:
                    errTip = '非法的文件类型';
                    break;
                case plupload.HTTP_ERROR:
                    switch (err.status) {
                        case 400:
                            errTip = "请求参数错误";
                            break;
                        case 401:
                            errTip = "认证授权失败";
                            break;
                        case 405:
                            errTip = "请求方式错误，非预期的请求方式";
                            break;
                        case 579:
                            errTip = "文件上传成功，但是回调（callback app-server）失败";
                            break;
                        case 599:
                            errTip = "服务端操作失败";
                            break;
                        case 614:
                            errTip = "文件已存在";
                            break;
                        case 631:
                            errTip = "指定的存储空间（Bucket）不存在";
                            break;
                        default:
                            errTip = "其他HTTP_ERROR";
                            break;
                    }
                    break;
                case plupload.SECURITY_ERROR:
                    errTip = '安全错误';
                    break;
                case plupload.GENERIC_ERROR:
                    errTip = '通用错误';
                    break;
                case plupload.IO_ERROR:
                    errTip = '上传失败。请稍后重试';
                    break;
                case plupload.INIT_ERROR:
                    errTip = '配置错误';
                    uploader.destroy();
                    break;
                default:
                    errTip = err.message + err.details;
                    break;
            }
            progress.setStatus(errTip);
            progress.setCancelled();
        }
        up.refresh(); // Reposition Flash/Silverlight
    });


    uploader.bind('FileUploaded', function(up, file, info) {
        console.log("-----------sssssss", info);
        var res = $.parseJSON(info.response);
        ctx = ctx ? ctx : res.ctx;
        if (ctx) {
            var url = 'http://up.qiniu.com/mkfile/' + file.size + '/key/' + URLSafeBase64Encode(file.name);
            var ajax = createAjax();
            ajax.open('POST', url, true);
            ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
            ajax.setRequestHeader('Authorization', 'UpToken ' + token);
            ajax.send(ctx);
            ajax.onreadystatechange = function() {
                if (ajax.readyState == 4 && ajax.status == 200) {
                    var progress = new FileProgress(file, 'fsUploadProgress');
                    progress.setComplete(ajax.responseText);
                }
            }
            // $.ajax({
            //     url: url,
            //     type: 'POST',
            //     headers: {
            //         'Content-Type':
            //     },
            //     data: ctx,
            //     success: function(data) {
            //         // progress.setStatus("上传完成");
            //         // progress.toggleCancel(false);
            //     }
            // });
        } else {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setComplete($.parseJSON(info.response));
        }
    });
    uploader.bind('UploadComplete', function() {
        $('#success').show();
    });
    uploader.bind('UploadComplete', function() {
        console.log('hello world');
    });
}

Qiniu({});
