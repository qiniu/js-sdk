function Qiniu(op) {

    var option = {}

    // var chunk_size = op.chunk_size;
    // TODO  CHUNK_size > 4m set to 4m

    var Error_Handler = op.init && op.init.Error;
    var FileUploaded_Handler = op.init && op.init.FileUploaded;
    var uptoken_url = op.uptoken_url;

    plupload.extend(option, op, {
        url: 'http://up.qiniu.com',
        multipart_params: {
            token: ''
        }
    });



    op.init.Error = function() {};
    op.init.FileUploaded = function() {};

    var uploader = new plupload.Uploader(option);
    this.uploader = uploader;

    var token = '';
    var ctx = '';
    var BLOCK_BITS = 20;
    var BLOCK_SIZE = 4 << BLOCK_BITS; //4M

    var getUpToken = function() {
        var ajax = createAjax();
        ajax.open('GET', uptoken_url, true);
        ajax.send();
        ajax.onreadystatechange = function() {
            if (ajax.readyState == 4 && ajax.status == 200) {
                var res = parseJSON(ajax.responseText);
                token = res.uptoken;
            }
        }
    }

    uploader.bind('Init', function(up, params) {
        getUpToken();
    });
    uploader.init();

    uploader.bind('FilesAdded', function(up, files) {
        up.start();
        up.refresh(); // Reposition Flash/Silverlight
    });

    uploader.bind('BeforeUpload', function(up, file) {
        // var progress = new FileProgress(file, 'fsUploadProgress');
        if (uploader.runtime === 'html5') {
            ctx = '';
            var blockSize = file.size > BLOCK_SIZE ? BLOCK_SIZE : file.size
            up.setOption({
                'url': 'http://up.qiniu.com/mkblk/' + blockSize,
                'multipart': false,
                'headers': {
                    'Authorization': 'UpToken ' + token
                },
                'multipart_params': {}
            });
        } else {
            up.setOption({
                'url': 'http://up.qiniu.com/',
                'multipart': true,
                'chunk_size': undefined,
                'multipart_params': {
                    'token': token,
                    'key': file.name
                }
            });
        }
    });

    uploader.bind('ChunkUploaded', function(up, file, info) {
        var res = parseJSON(info.response);
        console.log(info);

        ctx = ctx ? ctx + ',' + res.ctx : res.ctx;
        var leftSize = info.total - info.offset;
        if (leftSize < BLOCK_SIZE) {
            up.settings.url = 'http://up.qiniu.com/mkblk/' + leftSize;
        }

    });

    uploader.bind('Error', function(up, err) {
        var errTip = '';
        var file = err.file;
        if (file) {
            switch (err.code) {
                case plupload.FAILED:
                    errTip = '上传失败。请稍后再试。';
                    break;
                case plupload.FILE_SIZE_ERROR:
                    errTip = '浏览器最大可上传' + up.getOption('max_file_size') + '。更大文件请使用命令行工具。';
                    break;
                case plupload.FILE_EXTENSION_ERROR:
                    errTip = '文件验证失败。请稍后重试。';
                    break;
                case plupload.HTTP_ERROR:
                    switch (err.status) {
                        case 400:
                            errTip = "请求报文格式错误。";
                            break;
                        case 401:
                            errTip = "客户端认证授权失败。请重试或提交反馈。";
                            break;
                        case 405:
                            errTip = "客户端请求错误。请重试或提交反馈。";
                            break;
                        case 579:
                            errTip = "资源上传成功，但回调失败。";
                            break;
                        case 599:
                            errTip = "网络连接异常。请重试或提交反馈。";
                            break;
                        case 614:
                            errTip = "文件已存在。";
                            break;
                        case 631:
                            errTip = "指定空间不存在。";
                            break;
                        case 701:
                            errTip = "上传数据块校验出错。请重试或提交反馈。";
                            break;
                        default:
                            errTip = "未知错误。";
                            break;
                    }
                    var errorObj = $.parseJSON(err.response);
                    errTip = errTip + '(' + err.status + '：' + errorObj.error + ')';
                    break;
                case plupload.SECURITY_ERROR:
                    errTip = '安全配置错误。请联系网站管理员。';
                    break;
                case plupload.GENERIC_ERROR:
                    errTip = '上传失败。请稍后再试。';
                    break;
                case plupload.IO_ERROR:
                    errTip = '上传失败。请稍后再试。';
                    break;
                case plupload.INIT_ERROR:
                    errTip = '网站配置错误。请联系网站管理员。';
                    uploader.destroy();
                    break;
                default:
                    errTip = err.message + err.details;
                    break;
            }
            if (Error_Handler) {
                Error_Handler(up, err, errTip);
            }
        }
        up.refresh(); // Reposition Flash/Silverlight

    });

    uploader.unbind('FileUploaded', op.init.FileUploaded);

    uploader.bind('FileUploaded', function(up, file, info) {
        console.log("-----------sssssss", info);
        var res = parseJSON(info.response);
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
                    var info = ajax.responseText;
                    if (FileUploaded_Handler) {
                        FileUploaded_Handler(up, file, info);
                    }
                }
            }
        } else {
            if (FileUploaded_Handler) {
                FileUploaded_Handler(up, file, info.response);
            }
        }

    });

    return this;
}
var ij = 0;


var Q = new Qiniu({
    runtimes: 'html5,flash,html4',
    browse_button: 'pickfiles',
    container: 'container',
    drop_element: 'container',
    max_file_size: '100mb',
    flash_swf_url: 'js/plupload/Moxie.swf',
    silverlight_xap_url: 'js/plupload/Moxie.xap',
    // max_retries: 1,
    //required_features: true,
    dragdrop: true,
    chunk_size: '4mb',
    uptoken_url: '/token',
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
        'UploadProgress': function(up, file) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setProgress(file.percent + "%", up.total.bytesPerSec);
        },
        'UploadComplete': function() {
            $('#success').show();
        },
        'FileUploaded': function(up, file, info) {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setComplete(parseJSON(info));
        },
        'Error': function(up, err, errTip) {
            $('table').show();
            var progress = new FileProgress(err.file, 'fsUploadProgress');
            progress.setError();
            progress.setStatus(errTip);
            progress.setCancelled();
        },
        'UploadComplete': function() {
            console.log('hello world2');
        }
    }
});

Q.uploader.bind('UploadComplete', function() {
    // console.log('hello world');
});
