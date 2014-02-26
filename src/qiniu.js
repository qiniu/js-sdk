var detectIEVersion = function() {
    var v = 4,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');
    while (
        div.innerHTML = '<!--[if gt IE ' + v + ']><i></i><![endif]-->',
        all[0]
    ) {
        v++;
    }
    return v > 4 ? v : false;
};

var isImage = function(url) {
    var res, suffix = "";
    var imageSuffixes = ["png", "jpg", "jpeg", "gif", "bmp"];
    var suffixMatch = /\.([a-zA-Z0-9]+)(\?|\@|$)/;

    if (!url || !suffixMatch.test(url)) {
        return false;
    }
    res = suffixMatch.exec(url);
    suffix = res[1].toLowerCase();
    for (var i = 0, l = imageSuffixes.length; i < l; i++) {
        if (suffix === imageSuffixes[i]) {
            return true;
        }
    }
    return false;
};
var utf8_encode = function(argString) {
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

var base64_encode = function(data) {
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

    data = utf8_encode(data + '');

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

var URLSafeBase64Encode = function(v) {
    v = base64_encode(v);
    return v.replace(/\//g, '_').replace(/\+/g, '-');
};

var createAjax = function(argument) {
    if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    return xmlhttp;
};

var parseJSON = function(data) {
    // Attempt to parse using the native JSON parser first
    if (window.JSON && window.JSON.parse) {
        return window.JSON.parse(data);
    }

    if (data === null) {
        return data;
    }
    if (typeof data === "string") {

        // Make sure leading/trailing whitespace is removed (IE can't handle it)
        data = trim(data);

        if (data) {
            // Make sure the incoming data is actual JSON
            // Logic borrowed from http://json.org/json2.js
            if (/^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g, "@").replace(/"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {

                return (new Function("return " + data))();
            }
        }
    }
};

var trim = function(text) {
    return text === null ? "" : trim.call(text);
};



function Qiniu(op) {
    if (!op.uptoken_url || !op.domain) {
        return false;
    }
    var option = {};

    var Error_Handler = op.init && op.init.Error;
    var FileUploaded_Handler = op.init && op.init.FileUploaded;

    op.init.Error = function() {};
    op.init.FileUploaded = function() {};

    var uptoken_url = op.uptoken_url;
    this.domain = op.domain;

    //Todo ie7 handler / parseJson bug;


    var ie = detectIEVersion();
    if (ie && ie <= 9 && op.chunk_size && op.runtimes.indexOf('flash') >= 0) {
        /*
        link: http://www.plupload.com/docs/Frequently-Asked-Questions#when-to-use-chunking-and-when-not
        when plupload chunk_size setting is't null ,it cause bug in ie8/9  which runs  flash runtimes (not support html5) .
        */
        op.chunk_size = 0;

    } else {
        var BLOCK_BITS = 20;
        var MAX_CHUNK_SIZE = 4 << BLOCK_BITS; //4M

        var chunk_size = plupload.parseSize(op.chunk_size);
        if (chunk_size > MAX_CHUNK_SIZE) {
            op.chunk_size = MAX_CHUNK_SIZE;
        }
        //qiniu service  max_chunk_size is 4m
        //reset chunk_size to max_chunk_size(4m) when chunk_size > 4m
    }


    var token = '';
    var ctx = '';

    plupload.extend(option, op, {
        url: 'http://up.qiniu.com',
        multipart_params: {
            token: ''
        }
    });

    var uploader = new plupload.Uploader(option);
    this.uploader = uploader;


    var getUpToken = function() {
        var ajax = createAjax();
        ajax.open('GET', uptoken_url, true);
        ajax.setRequestHeader("If-Modified-Since", "0");
        ajax.onreadystatechange = function() {
            if (ajax.readyState === 4 && ajax.status === 200) {
                var res = parseJSON(ajax.responseText);
                token = res.uptoken;
            }
        };
        ajax.send();
    };

    uploader.bind('Init', function(up, params) {
        getUpToken();
    });
    uploader.init();

    // uploader.Error_Handler = Error_Handler;
    // uploader.FileUploaded_Handler = FileUploaded_Handler;


    uploader.bind('FilesAdded', function(up, files) {
        if (up.getOption('auto_start')) {
            $.each(files, function(i, file) {
                up.start();
            });
        }
        up.refresh(); // Reposition Flash/Silverlight
    });

    uploader.bind('BeforeUpload', function(up, file) {

        ctx = '';

        function directUpload() {
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
        var chunk_size = up.getOption('chunk_size');

        if (uploader.runtime === 'html5' && chunk_size) {
            if (file.size < chunk_size) {
                directUpload();
            } else {
                var blockSize = chunk_size;
                ctx = '';
                up.setOption({
                    'url': 'http://up.qiniu.com/mkblk/' + blockSize,
                    'multipart': false,
                    'chunk_size': chunk_size,
                    'headers': {
                        'Authorization': 'UpToken ' + token
                    },
                    'multipart_params': {}
                });
            }
        } else {
            directUpload();
        }
    });

    uploader.bind('ChunkUploaded', function(up, file, info) {
        var res = parseJSON(info.response);

        ctx = ctx ? ctx + ',' + res.ctx : res.ctx;
        var leftSize = info.total - info.offset;
        var chunk_size = up.getOption('chunk_size');
        if (leftSize < chunk_size) {
            up.setOption({
                'url': 'http://up.qiniu.com/mkblk/' + leftSize
            });
        }

    });

    uploader.bind('Error', (function(Error_Handler) {
        return function(up, err) {
            var errTip = '';
            var file = err.file;
            // console.log('file', file);
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
                        var errorObj = parseJSON(err.response);
                        console.log(errorObj);
                        errTip = errTip + '(' + err.status + '：' + errorObj.error.error + ')';
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
        };
    })(Error_Handler));



    uploader.bind('FileUploaded', (function(FileUploaded_Handler) {
        return function(up, file, info) {
            var res = parseJSON(info.response);
            // console.log(info.response);
            // console.log(this === uploader);
            ctx = ctx ? ctx : res.ctx;
            // console.log('FileUploaded_Handler', uploader.Error_Handler);
            if (ctx) {
                var url = 'http://up.qiniu.com/mkfile/' + file.size + '/key/' + URLSafeBase64Encode(file.name);
                var ajax = createAjax();
                ajax.open('POST', url, true);
                ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                ajax.setRequestHeader('Authorization', 'UpToken ' + token);
                ajax.send(ctx);
                ajax.onreadystatechange = function() {
                    if (ajax.readyState === 4 && ajax.status === 200) {
                        var info = ajax.responseText;
                        if (FileUploaded_Handler) {
                            // console.log('FileUploaded_Handler');
                            FileUploaded_Handler(up, file, info);
                        }
                    }
                };
            } else {
                // console.log('FileUploaded_Handler', FileUploaded_Handler);
                if (FileUploaded_Handler) {
                    FileUploaded_Handler(up, file, info.response);
                }
            }

        };
    })(FileUploaded_Handler));

    return this;
}


/* global URLSafeBase64Encode */
/* global Qiniu */
/* global createAjax */

Qiniu.prototype.getUrl = function(key) {
    if (!key) {
        return false;
    }
    key = encodeURI(key);
    var domain = this.domain;
    if (domain.slice(domain.length - 1) !== '/') {
        domain = domain + '/';
    }
    return domain + key;
};

Qiniu.prototype.imageView2 = function(op, key) {
    var mode = op.mode || '',
        w = op.w || '',
        h = op.h || '',
        q = op.quality || '',
        format = op.format || '';
    if (!mode) {
        return false;
    }
    if (!w && !h) {
        return false;
    }

    var imageUrl = 'imageView2/' + mode;
    imageUrl += w ? '/w/' + w : '';
    imageUrl += h ? '/h/' + h : '';
    imageUrl += q ? '/q/' + q : '';
    imageUrl += format ? '/format/' + format : '';
    if (key) {
        imageUrl = this.getUrl(key) + '?' + imageUrl;
    }
    return imageUrl;
};


Qiniu.prototype.imageMogr2 = function(op, key) {

    // mageMogr2/auto-orient
    //           /thumbnail/<imageSizeGeometry>
    //           /strip
    //           /gravity/<gravityType>
    //           /crop/<imageSizeAndOffsetGeometry>
    //           /quality/<imageQuality>
    //           /rotate/<rotateDegree>
    //           /format/<destinationImageFormat>

    var auto_orient = op['auto-orient'] || '',
        thumbnail = op.thumbnail || '',
        strip = op.strip || '',
        gravity = op.gravity || '',
        crop = op.crop || '',
        quality = op.quality || '',
        rotate = op.rotate || '',
        format = op.format || '';
    if (!auto_orient) {
        return false;
    }

    //Todo check option

    var imageUrl = auto_orient ? 'imageMogr2' + '/auto-orient' : '';
    imageUrl += thumbnail ? '/thumbnail/' + thumbnail : '';
    imageUrl += strip ? '/strip' : '';
    imageUrl += gravity ? '/gravity/' + gravity : '';
    imageUrl += quality ? '/quality/' + quality : '';
    imageUrl += crop ? '/crop/' + crop : '';
    imageUrl += rotate ? '/rotate/' + rotate : '';
    imageUrl += format ? '/format/' + format : '';

    if (key) {
        imageUrl = this.getUrl(key) + '?' + imageUrl;
    }
    return imageUrl;
};

Qiniu.prototype.watermark = function(op, key) {

    var mode = op.mode;
    if (!mode) {
        return false;
    }

    var imageUrl = 'watermark/' + mode;

    if (mode === 1) {
        var image = op.image || '';
        if (!image) {
            return false;
        }
        imageUrl += image ? '/image/' + URLSafeBase64Encode(image) : '';
    } else if (mode === 2) {
        var text = op.text ? op.text : '',
            font = op.font ? op.font : '',
            fontsize = op.fontsize ? op.fontsize : '',
            fill = op.fill ? op.fill : '';
        if (!text) {
            return false;
        }
        imageUrl += text ? '/text/' + URLSafeBase64Encode(text) : '';
        imageUrl += font ? '/font/' + URLSafeBase64Encode(font) : '';
        imageUrl += fontsize ? '/fontsize/' + fontsize : '';
        imageUrl += fill ? '/fill/' + URLSafeBase64Encode(fill) : '';
    } else {
        // Todo mode3
        return false;
    }

    var dissolve = op.dissolve || '',
        gravity = op.gravity || '',
        dx = op.dx || '',
        dy = op.dy || '';

    imageUrl += dissolve ? '/dissolve/' + dissolve : '';
    imageUrl += gravity ? '/gravity/' + gravity : '';
    imageUrl += dx ? '/dx/' + dx : '';
    imageUrl += dy ? '/dy/' + dy : '';

    if (key) {
        imageUrl = this.getUrl(key) + '?' + imageUrl;
    }
    return imageUrl;

};

Qiniu.prototype.imageInfo = function(key) {
    if (!key) {
        return false;
    }
    var url = this.getUrl(key) + '?imageInfo';
    var xhr = createAjax();
    var info;
    xhr.open('GET', url, false);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            info = $.parseJSON(xhr.responseText);
        }
    };
    xhr.send();
    return info;
};


Qiniu.prototype.exif = function(key) {
    if (!key) {
        return false;
    }
    var url = this.getUrl(key) + '?exif';
    var xhr = createAjax();
    var info;
    xhr.open('GET', url, false);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            info = $.parseJSON(xhr.responseText);
        }
    };
    xhr.send();
    return info;
};

Qiniu.prototype.get = function(type, key) {
    if (!key || !type) {
        return false;
    }
    if (type === 'exif') {
        return this.exif(key);
    } else if (type === 'imageInfo') {
        return this.imageInfo(key);
    }
    return false;
};


Qiniu.prototype.pipeline = function(arr, key) {

    var isArray = Object.prototype.toString.call(arr) === '[object Array]';
    var option, errOp, imageUrl = '';
    if (isArray) {
        for (var i = 0, len = arr.length; i < len; i++) {
            option = arr[i];
            if (!option.fop) {
                return false;
            }
            switch (option.fop) {
                case 'watermark':
                    imageUrl += this.watermark(option) + '|';
                    break;
                case 'imageView2':
                    imageUrl += this.imageView2(option) + '|';
                    break;
                case 'imageMogr2':
                    imageUrl += this.imageMogr2(option) + '|';
                    break;
                default:
                    errOp = true;
                    break;
            }
            if (errOp) {
                return false;
            }
        }
        if (key) {
            imageUrl = this.getUrl(key) + '?' + imageUrl;
            var length = imageUrl.length;
            if (imageUrl.slice(length - 1) === '|') {
                imageUrl = imageUrl.slice(0, length - 1);
            }
        }
        return imageUrl;
    }
    return false;
};
