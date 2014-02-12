    var Local = window.Local || {};

    Local.storageUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
    Local.storageHex = 1024;

    Local.utf8_encode = function(argString) {
        // http://kevin.vanzonneveld.net
        // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   improved by: sowberry
        // +    tweaked by: Jack
        // +   bugfixed by: Onno Marsman
        // +   improved by: Yves Sucaet
        // +   bugfixed by: Onno Marsman
        // +   bugfixed by: Ulrich
        // +   bugfixed by: Rafal Kukawski
        // +   improved by: kirilloid
        // +   bugfixed by: kirilloid
        // *     example 1: utf8_encode('Kevin van Zonneveld');
        // *     returns 1: 'Kevin van Zonneveld'

        if (argString === null || typeof argString === 'undefined') {
            return '';
        }

        var string = (argString + ''); // .replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var utftext = '',
            start, end, stringl = 0;

        start = end = 0;
        stringl = string.length;
        for (var n = 0; n < stringl; n++) {
            var c1 = string.charCodeAt(n);
            var enc = null;

            if (c1 < 128) {
                end++;
            } else if (c1 > 127 && c1 < 2048) {
                enc = String.fromCharCode(
                    (c1 >> 6) | 192, (c1 & 63) | 128
                );
            } else if (c1 & 0xF800 ^ 0xD800 > 0) {
                enc = String.fromCharCode(
                    (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
                );
            } else { // surrogate pairs
                if (c1 & 0xFC00 ^ 0xD800 > 0) {
                    throw new RangeError('Unmatched trail surrogate at ' + n);
                }
                var c2 = string.charCodeAt(++n);
                if (c2 & 0xFC00 ^ 0xDC00 > 0) {
                    throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
                }
                c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
                enc = String.fromCharCode(
                    (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
                );
            }
            if (enc !== null) {
                if (end > start) {
                    utftext += string.slice(start, end);
                }
                utftext += enc;
                start = end = n + 1;
            }
        }

        if (end > start) {
            utftext += string.slice(start, stringl);
        }

        return utftext;
    };

    Local.base64_encode = function(data) {
        // http://kevin.vanzonneveld.net
        // +   original by: Tyler Akins (http://rumkin.com)
        // +   improved by: Bayron Guevara
        // +   improved by: Thunder.m
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   bugfixed by: Pellentesque Malesuada
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // -    depends on: utf8_encode
        // *     example 1: base64_encode('Kevin van Zonneveld');
        // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
        // mozilla has this native
        // - but breaks in 2.0.0.12!
        //if (typeof this.window['atob'] == 'function') {
        //    return atob(data);
        //}
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
            ac = 0,
            enc = '',
            tmp_arr = [];

        if (!data) {
            return data;
        }

        data = Local.utf8_encode(data + '');

        do { // pack three octets into four hexets
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);

            bits = o1 << 16 | o2 << 8 | o3;

            h1 = bits >> 18 & 0x3f;
            h2 = bits >> 12 & 0x3f;
            h3 = bits >> 6 & 0x3f;
            h4 = bits & 0x3f;

            // use hexets to index into b64, and append result to encoded string
            tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);

        enc = tmp_arr.join('');

        switch (data.length % 3) {
            case 1:
                enc = enc.slice(0, -2) + '==';
                break;
            case 2:
                enc = enc.slice(0, -1) + '=';
                break;
        }

        return enc;
    };

    Local.URLSafeBase64Encode = function(v) {
        v = Local.base64_encode(v);
        return v.replace(/\//g, '_').replace(/\+/g, '-');
    };
    Local.format = function(num, hex, units, dec, forTable) {
        num = num || 0;
        dec = dec || 0;
        forTable = forTable || false;
        var level = 0;

        // 详细报表中表格数据的最小单位为 KB 和 万次
        if (forTable) {
            num /= hex;
            level++;
        }
        while (num >= hex) {
            num /= hex;
            level++;
        }

        if (level === 0) {
            dec = 0;
        }

        return {
            'base': num.toFixed(dec),
            'unit': units[level],
            'format': function(sep) {
                sep = sep || '';
                return this.base + sep + this.unit;
            }
        };
    };
    var uploader
    //$(function() {
    uploader = new plupload.Uploader({
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
        $.ajax({
            url: '/token',
            type: 'GET',
            cache: false,
            // headers: {
            //     'Cache-Control': 'no-cache',
            //     'Pragma': 'no-cache'
            // },
            success: function(data) {
                if (data && data.uptoken) {
                    token = data.uptoken;
                }
            },
            error: function(error) {
                console.log(error);
            }
        });
    });
    uploader.init();

    uploader.bind('FilesAdded', function(up, files) {
        $('table').show();
        $('#success').hide();
        console.log(up.runtime)
        $.each(files, function(i, file) {
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
            var url = 'http://up.qiniu.com/mkfile/' + file.size + '/key/' + Local.URLSafeBase64Encode(file.name);
            $.ajax({
                url: url,
                type: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'Authorization': 'UpToken ' + token
                },
                data: ctx,
                success: function(data) {
                    var progress = new FileProgress(file, 'fsUploadProgress');
                    progress.setComplete(data);
                    // progress.setStatus("上传完成");
                    // progress.toggleCancel(false);
                }
            });
        } else {
            var progress = new FileProgress(file, 'fsUploadProgress');
            progress.setComplete($.parseJSON(info.response));
        }
    });
    uploader.bind('UploadComplete', function() {
        $('#success').show();
    });
    //});

    var cancelUpload = function() {
        uploader.destroy();
    };
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
    });
