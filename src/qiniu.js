/*global plupload ,mOxie*/
/*global ActiveXObject */
/*exported QiniuJsSDK */

function QiniuJsSDK() {

    this.isImage = function(url) {
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


    this.URLSafeBase64Encode = function(v) {
        v = mOxie.btoa(v);
        return v.replace(/\//g, '_').replace(/\+/g, '-');
    };

    this.createAjax = function(argument) {
        var xmlhttp = {};
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        return xmlhttp;
    };

    this.parseJSON = function(data) {
        // Attempt to parse using the native JSON parser first
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data);
        }

        if (data === null) {
            return data;
        }
        if (typeof data === "string") {

            // Make sure leading/trailing whitespace is removed (IE can't handle it)
            data = this.trim(data);

            if (data) {
                // Make sure the incoming data is actual JSON
                // Logic borrowed from http://json.org/json2.js
                if (/^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g, "@").replace(/"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {

                    return (function() {
                        return data;
                    })();
                }
            }
        }
    };

    this.trim = function(text) {
        return text === null ? "" : this.trim.call(text);
    };

    //Todo ie7 handler / this.parseJSON bug;

    var that = this;

    this.uploader = function(op) {
        if (!op.domain) {
            throw 'uptoken_url or domain is required!';
        }

        if (!op.browse_button) {
            throw 'browse_button is required!';
        }

        var option = {};

        var _Error_Handler = op.init && op.init.Error;
        var _FileUploaded_Handler = op.init && op.init.FileUploaded;

        op.init.Error = function() {};
        op.init.FileUploaded = function() {};

        that.uptoken_url = op.uptoken_url;
        that.token = '';
        that.key_handler = typeof op.init.Key === 'function' ? op.init.Key : '';
        this.domain = op.domain;
        var ctx = '';
        var up_host = window.location.protocol + '//up.qbox.me';

        var reset_chunk_size = function() {
            var BLOCK_BITS, MAX_CHUNK_SIZE, chunk_size;
            var isOldIE = mOxie.Env.browser === "IE" && mOxie.Env.version <= 9;
            if (isOldIE && op.chunk_size && op.runtimes.indexOf('flash') >= 0) {
                //  link: http://www.plupload.com/docs/Frequently-Asked-Questions#when-to-use-chunking-and-when-not
                //  when plupload chunk_size setting is't null ,it cause bug in ie8/9  which runs  flash runtimes (not support html5) .
                op.chunk_size = 0;

            } else {
                BLOCK_BITS = 20;
                MAX_CHUNK_SIZE = 4 << BLOCK_BITS; //4M

                chunk_size = plupload.parseSize(op.chunk_size);
                if (chunk_size > MAX_CHUNK_SIZE) {
                    op.chunk_size = MAX_CHUNK_SIZE;
                }
                // qiniu service  max_chunk_size is 4m
                // reset chunk_size to max_chunk_size(4m) when chunk_size > 4m
            }
        };
        reset_chunk_size();

        var getUpToken = function() {
            if (!op.uptoken) {
                var ajax = that.createAjax();
                ajax.open('GET', that.uptoken_url, true);
                ajax.setRequestHeader("If-Modified-Since", "0");
                ajax.onreadystatechange = function() {
                    if (ajax.readyState === 4 && ajax.status === 200) {
                        var res = that.parseJSON(ajax.responseText);
                        that.token = res.uptoken;
                    }
                };
                ajax.send();
            } else {
                that.token = op.uptoken;
            }
        };

        var getOption = function(up, option) {
            var val = up.getOption && up.getOption(option);
            val = val || (up.settings && up.settings[option]);
            return val;
        };

        var getFileKey = function(up, file, func) {
            var key = '',
                unique_names = false;
            if (!op.save_key) {
                unique_names = getOption(up, 'unique_names');
                if (unique_names) {
                    var ext = mOxie.Mime.getFileExtension(file.name);
                    key = ext ? file.id + '.' + ext : file.id;
                } else if (typeof func === 'function') {
                    key = func(up, file);
                } else {
                    key = file.name;
                }
            }
            return key;
        };

        plupload.extend(option, op, {
            url: up_host,
            multipart_params: {
                token: ''
            }
        });

        var uploader = new plupload.Uploader(option);

        uploader.bind('Init', function(up, params) {
            getUpToken();
        });
        uploader.init();

        uploader.bind('FilesAdded', function(up, files) {

            var auto_start = getOption(up, 'auto_start');
            if (auto_start) {
                $.each(files, function(i, file) {
                    up.start();
                });
            }
            up.refresh(); // Reposition Flash/Silverlight
        });

        uploader.bind('BeforeUpload', function(up, file) {

            ctx = '';

            var directUpload = function(up, file, func) {

                var multipart_params_obj;
                if (op.save_key) {
                    multipart_params_obj = {
                        'token': that.token
                    };
                } else {
                    multipart_params_obj = {
                        'key': getFileKey(up, file, func),
                        'token': that.token
                    };
                }

                var x_vars = op.x_vars;
                if (x_vars !== undefined && typeof x_vars === 'object') {
                    for (var x_key in x_vars) {
                        if (x_vars.hasOwnProperty(x_key)) {
                            if (typeof x_vars[x_key] === 'function') {
                                multipart_params_obj['x:' + x_key] = x_vars[x_key](up, file);
                            } else if (typeof x_vars[x_key] !== 'object') {
                                multipart_params_obj['x:' + x_key] = x_vars[x_key];
                            }
                        }
                    }
                }
                //todo setXvars

                up.setOption({
                    'url': up_host,
                    'multipart': true,
                    'chunk_size': undefined,
                    'multipart_params': multipart_params_obj
                });
            };

            var makeBlock = function(up, file) {
                var localFileInfo = localStorage.getItem(file.name);
                var blockSize = chunk_size;
                if (localFileInfo) {
                    localFileInfo = JSON.parse(localFileInfo);
                    var now = (new Date()).getTime();
                    var before = localFileInfo.time || 0;
                    var aDay = 24 * 60 * 60 * 1000; //  milliseconds
                    if (now - before < aDay) {
                        if (localFileInfo.percent !== 100) {
                            file.percent = localFileInfo.percent;
                            file.loaded = localFileInfo.offset;
                            ctx = localFileInfo.ctx;
                            if (localFileInfo.offset + blockSize > file.size) {
                                blockSize = file.size - localFileInfo.offset;
                            }
                        } else {
                            // 进度100%时，删除对应的localStorage，避免 499 bug
                            localStorage.removeItem(file.name);
                        }
                    } else {
                        localStorage.removeItem(file.name);
                    }
                }
                up.setOption({
                    'url': up_host + '/mkblk/' + blockSize,
                    'multipart': false,
                    'chunk_size': chunk_size,
                    'required_features': "chunks",
                    'headers': {
                        'Authorization': 'UpToken ' + that.token
                    },
                    'multipart_params': {}
                });
            };

            var chunk_size = getOption(up, 'chunk_size');
            if (uploader.runtime === 'html5' && chunk_size) {
                if (file.size < chunk_size) {
                    directUpload(up, file, that.key_handler);
                } else {
                    makeBlock(up, file);
                }
            } else {
                directUpload(up, file, that.key_handler);
            }
        });

        uploader.bind('ChunkUploaded', function(up, file, info) {
            var saveUploadInfo = function(file) {
                localStorage.setItem(file.name, JSON.stringify({
                    ctx: ctx,
                    percent: file.percent,
                    total: info.total,
                    offset: info.offset,
                    time: (new Date()).getTime()
                }));
            };

            var res = that.parseJSON(info.response);

            ctx = ctx ? ctx + ',' + res.ctx : res.ctx;
            var leftSize = info.total - info.offset;
            var chunk_size = getOption(up, 'chunk_size');
            if (leftSize < chunk_size) {
                up.setOption({
                    'url': up_host + '/mkblk/' + leftSize
                });
            }
            saveUploadInfo(file);
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
                        var max_file_size = getOption(up, 'max_file_size');
                        errTip = '浏览器最大可上传' + max_file_size + '。更大文件请使用命令行工具。';
                        break;
                    case plupload.FILE_EXTENSION_ERROR:
                        errTip = '文件验证失败。请稍后重试。';
                        break;
                    case plupload.HTTP_ERROR:
                        var errorObj = that.parseJSON(err.response);
                        var errorText = errorObj.error;
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
                                try {
                                    errorObj = that.parseJSON(errorObj.error);
                                    errorText = errorObj.error || 'file exists';
                                } catch (e) {
                                    errorText = errorObj.error || 'file exists';
                                }
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
                        errTip = errTip + '(' + err.status + '：' + errorText + ')';
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
                if (_Error_Handler) {
                    _Error_Handler(up, err, errTip);
                }
            }
            up.refresh(); // Reposition Flash/Silverlight
        });

        uploader.bind('FileUploaded', function(up, file, info) {

            var makeFile = function(that) {
                var key = '';
                if (!op.save_key) {
                    key = getFileKey(up, file, that.key_handler);
                    key = key ? '/key/' + that.URLSafeBase64Encode(key) : '';
                }

                var x_vars_url = getXVarsURL();
                var url = up_host + '/mkfile/' + file.size + key + x_vars_url;
                var ajax = that.createAjax();
                ajax.open('POST', url, true);
                ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
                ajax.setRequestHeader('Authorization', 'UpToken ' + that.token);
                ajax.onreadystatechange = function() {
                    if (ajax.readyState === 4) {
                        localStorage.removeItem(file.name);
                        if (ajax.status === 200) {
                            var info = ajax.responseText;
                            finish(up, file, info);
                        } else {
                            uploader.trigger('Error', {
                                status: ajax.status,
                                response: ajax.responseText,
                                file: file,
                                code: -200
                            });
                        }
                    }
                };
                ajax.send(ctx);
            };

            var getXVarsURL = function() {
                var x_vars = op.x_vars,
                    x_val = '',
                    x_vars_url = '';
                if (x_vars !== undefined && typeof x_vars === 'object') {
                    for (var x_key in x_vars) {
                        if (x_vars.hasOwnProperty(x_key)) {
                            if (typeof x_vars[x_key] === 'function') {
                                x_val = that.URLSafeBase64Encode(x_vars[x_key](up, file));
                            } else if (typeof x_vars[x_key] !== 'object') {
                                x_val = that.URLSafeBase64Encode(x_vars[x_key]);
                            }
                            x_vars_url += '/x:' + x_key + '/' + x_val;
                        }
                    }
                }
                return x_vars_url;
            };

            var finish = function(up, file, info) {
                if (op.downtoken_url) {
                    getDownloadURL(that);
                } else if (_FileUploaded_Handler) {
                    _FileUploaded_Handler(up, file, info);
                }
            };

            var getDownloadURL = function(that) {
                var ajax_downtoken = that.createAjax();
                ajax_downtoken.open('POST', op.downtoken_url, true);
                ajax_downtoken.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                ajax_downtoken.onreadystatechange = function() {
                    if (ajax_downtoken.readyState === 4) {
                        if (ajax_downtoken.status === 200) {
                            var res_downtoken;
                            try {
                                res_downtoken = that.parseJSON(ajax_downtoken.responseText);
                            } catch (e) {
                                throw ('invalid json format');
                            }
                            var info_extended = {};
                            plupload.extend(info_extended, that.parseJSON(info), res_downtoken);
                            if (_FileUploaded_Handler) {
                                _FileUploaded_Handler(up, file, JSON.stringify(info_extended));
                            }
                        } else {
                            uploader.trigger('Error', {
                                status: ajax_downtoken.status,
                                response: ajax_downtoken.responseText,
                                file: file,
                                code: plupload.HTTP_ERROR
                            });
                        }
                    }
                };
                ajax_downtoken.send('key=' + that.parseJSON(info).key + '&domain=' + op.domain);
            };

            var res = that.parseJSON(info.response);
            ctx = ctx ? ctx : res.ctx;
            if (ctx) {
                makeFile(that);
            } else {
                finish(up, file, info.response);
            }

        });

        return uploader;
    };

    this.getUrl = function(key) {
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



}
