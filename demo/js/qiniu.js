/*global plupload ,mOxie*/
/*global ActiveXObject */
/*exported QiniuJsSDK */

function QiniuJsSDK(op) {
    if (!op.domain) {
        throw 'domain is required!';
    }

    if (!op.browse_button) {
        throw 'browse_button is required!';
    }

    var util = {
        trim: function(text) {
            return text === null ? "" : this.trim.call(text);
            // todo have bug in trim
        },
        parseJSON: function(data) {
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
        },
        createAjax: function(argument) {
            var xmlhttp = {};
            if (window.XMLHttpRequest) {
                xmlhttp = new XMLHttpRequest();
            } else {
                xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
            }
            return xmlhttp;
        },
        URLSafeBase64Encode: function(v) {
            v = mOxie.btoa(v);
            return v.replace(/\//g, '_').replace(/\+/g, '-');
        }
    };

    var constant = {
        // BLOCK_BITS: 20,
        MAX_CHUNK_SIZE: 4 << 20, //4m
        HTTPS_UP_HOST: 'https://up.qbox.me',
        HTTP_UP_HOST: 'http://up.qiniu.com'
    };
    //Todo ie7 handler / this.parseJSON bug;

    var that = this,
        option = {},
        uptoken_url = op.uptoken_url,
        uptoken = '',
        domain = op.domain,
        ctx = '',
        up_host = '',
        uploader = '';

    var key_handler = (function() {
            if (typeof op.init === 'object') {
                return typeof op.init.Key === 'function' ? op.init.Key : '';
            }
            return '';
        })(),
        file_uploaded_hanlder = (function() {
            if (typeof op.init === 'object') {
                return typeof op.init.FileUploaded === 'function' ? op.init.FileUploaded : '';
            }
            return '';
        })();

    var getUpHost = function() {
        if (op.up_host) {
            return op.up_host;
        } else {
            var protocol = window.location.protocol;
            if (protocol !== 'https') {
                return constant.HTTP_UP_HOST;
            } else {
                return constant.HTTPS_UP_HOST;
            }
        }
    };

    var reset_chunk_size = function() {
        var chunk_size,
            isOldIE = mOxie.Env.browser === "IE" && mOxie.Env.version <= 9;
        if (isOldIE && op.chunk_size && op.runtimes.indexOf('flash') >= 0) {
            //  link: http://www.plupload.com/docs/Frequently-Asked-Questions#when-to-use-chunking-and-when-not
            //  when plupload chunk_size setting is't null ,it cause bug in ie8/9  which runs  flash runtimes (not support html5) .
            op.chunk_size = 0;

        } else {
            chunk_size = plupload.parseSize(op.chunk_size);
            if (chunk_size > constant.MAX_CHUNK_SIZE) {
                op.chunk_size = constant.MAX_CHUNK_SIZE;
            }
            // qiniu service  max_chunk_size is 4m
            // reset chunk_size to max_chunk_size(4m) when chunk_size > 4m
        }
    };

    var reset_file_uploaded_handler = function() {
        if (typeof op.init === 'object') {
            op.init.FileUploaded = typeof op.init.FileUploaded === 'function' ? null : '';
        }
        return '';
    };

    var getUpToken = function() {
        if (!op.uptoken) {
            var ajax = util.createAjax();
            ajax.open('GET', uptoken_url, true);
            ajax.setRequestHeader("If-Modified-Since", "0");
            ajax.onreadystatechange = function() {
                if (ajax.readyState === 4 && ajax.status === 200) {
                    var res = util.parseJSON(ajax.responseText);
                    uptoken = res.uptoken;
                }
            };
            ajax.send();
        } else {
            uptoken = op.uptoken;
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

    this.getUrl = function(key) {
        // todo ,may be should removed some day
        if (!key) {
            return false;
        }
        key = encodeURI(key);
        if (domain.slice(domain.length - 1) !== '/') {
            domain = domain + '/';
        }
        return domain + key;
    };
    //export getUrl func

    var init = function() {
        up_host = getUpHost();
        reset_chunk_size();
        reset_file_uploaded_handler();
        plupload.extend(option, op, {
            url: up_host,
            multipart_params: {
                token: ''
            }
        });
    };

    init();

    uploader = new plupload.Uploader(option);

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
                    'token': uptoken
                };
            } else {
                multipart_params_obj = {
                    'key': getFileKey(up, file, func),
                    'token': uptoken
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
                    'Authorization': 'UpToken ' + uptoken
                },
                'multipart_params': {}
            });
        };

        var chunk_size = getOption(up, 'chunk_size');
        if (uploader.runtime === 'html5' && chunk_size) {
            if (file.size < chunk_size) {
                directUpload(up, file, key_handler);
            } else {
                makeBlock(up, file);
            }
        } else {
            directUpload(up, file, key_handler);
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

        var res = util.parseJSON(info.response);

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
        var error = '';
        var file = err.file;
        if (file) {
            switch (err.code) {
                case plupload.FAILED:
                    error = '上传失败。请稍后再试。';
                    break;
                case plupload.FILE_SIZE_ERROR:
                    var max_file_size = getOption(up, 'max_file_size');
                    error = '浏览器最大可上传' + max_file_size + '。更大文件请使用命令行工具。';
                    break;
                case plupload.FILE_EXTENSION_ERROR:
                    error = '文件验证失败。请稍后重试。';
                    break;
                case plupload.HTTP_ERROR:
                    var errorObj = util.parseJSON(err.response);
                    var errorText = errorObj.error;
                    switch (err.status) {
                        case 400:
                            error = "请求报文格式错误。";
                            break;
                        case 401:
                            error = "客户端认证授权失败。请重试或提交反馈。";
                            break;
                        case 405:
                            error = "客户端请求错误。请重试或提交反馈。";
                            break;
                        case 579:
                            error = "资源上传成功，但回调失败。";
                            break;
                        case 599:
                            error = "网络连接异常。请重试或提交反馈。";
                            break;
                        case 614:
                            error = "文件已存在。";
                            try {
                                errorObj = util.parseJSON(errorObj.error);
                                errorText = errorObj.error || 'file exists';
                            } catch (e) {
                                errorText = errorObj.error || 'file exists';
                            }
                            break;
                        case 631:
                            error = "指定空间不存在。";
                            break;
                        case 701:
                            error = "上传数据块校验出错。请重试或提交反馈。";
                            break;
                        default:
                            error = "未知错误。";
                            break;
                    }
                    error = error + '(' + err.status + '：' + errorText + ')';
                    break;
                case plupload.SECURITY_ERROR:
                    error = '安全配置错误。请联系网站管理员。';
                    break;
                case plupload.GENERIC_ERROR:
                    error = '上传失败。请稍后再试。';
                    break;
                case plupload.IO_ERROR:
                    error = '上传失败。请稍后再试。';
                    break;
                case plupload.INIT_ERROR:
                    error = '网站配置错误。请联系网站管理员。';
                    uploader.destroy();
                    break;
                default:
                    error = err.message + err.details;
                    break;
            }
            up.setOption('error', error);
        }
        up.refresh(); // Reposition Flash/Silverlight
    });

    uploader.bind('FileUploaded', function(up, file, info) {

        var makeFile = function(that) {
            var key = '';
            if (!op.save_key) {
                key = getFileKey(up, file, key_handler);
                key = key ? '/key/' + util.URLSafeBase64Encode(key) : '';
            }

            var x_vars_url = getXVarsURL();
            var url = up_host + '/mkfile/' + file.size + key + x_vars_url;
            var ajax = util.createAjax();
            ajax.open('POST', url, true);
            ajax.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
            ajax.setRequestHeader('Authorization', 'UpToken ' + uptoken);
            ajax.onreadystatechange = function() {
                if (ajax.readyState === 4) {
                    localStorage.removeItem(file.name);
                    if (ajax.status === 200) {
                        var info = ajax.responseText;
                        getDownloadURL(that, info);
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
                            x_val = util.URLSafeBase64Encode(x_vars[x_key](up, file));
                        } else if (typeof x_vars[x_key] !== 'object') {
                            x_val = util.URLSafeBase64Encode(x_vars[x_key]);
                        }
                        x_vars_url += '/x:' + x_key + '/' + x_val;
                    }
                }
            }
            return x_vars_url;
        };


        var getDownloadURL = function(that, info) {
            // Todo 在分块上传和私有空间下载的时候仍然会有后面绑定的事件先执行的情况
            if (op.downtoken_url) {

                var infoObj = util.parseJSON(info);
                var ajax_downtoken = util.createAjax();
                ajax_downtoken.open('POST', op.downtoken_url, false);
                ajax_downtoken.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
                ajax_downtoken.onreadystatechange = function() {
                    if (ajax_downtoken.readyState === 4) {
                        if (ajax_downtoken.status === 200) {
                            var res_downtoken;
                            try {
                                res_downtoken = util.parseJSON(ajax_downtoken.responseText);
                            } catch (e) {
                                throw ('invalid json format');
                            }

                            plupload.extend(infoObj, res_downtoken);

                            info = JSON.stringify(infoObj); // maybe have some bug in ie

                            // console.log(info);
                            // up.setOption('info', info);

                            file_uploaded_hanlder(up, file, info);
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
                ajax_downtoken.send('key=' + infoObj.key + '&domain=' + op.domain);
            } else {
                info = util.parseJSON(info);
                file_uploaded_hanlder(up, file, info);
            }
        };

        var res = util.parseJSON(info.response);
        ctx = ctx ? ctx : res.ctx;
        if (ctx) {
            makeFile(that);
        } else {
            getDownloadURL(that, info.response);
        }

    });

    return uploader;

}
