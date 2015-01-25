/*global plupload */
/*global FileProgress */
/*global hljs */


$(function() {
    var Q = new Qiniu({
        runtimes: 'html5,flash,html4',
        browse_button: 'pickfiles',
        container: 'container',
        drop_element: 'container',
        max_file_size: '100mb',
        flash_swf_url: 'js/plupload/Moxie.swf',
        dragdrop: true,
        chunk_size: '4mb',
        uptoken_url: $('#uptoken_url').val(),
        bucket_domain: $('#domain').val(),
        auto_start: true,
        init: {
            'FilesAdded': function(up, files) {
                $('table').show();
                $('#success').hide();
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
                $.post('downtoken', {
                    key: info.key,
                    domain: $('#domain').val()
                }).done(function(res) {
                    // console.log(res)
                    $.extend(info, res);
                    progress.setComplete(up, info);
                }).error(function() {
                    console.log('获取下载token失败')
                });
            },
            'Error': function(up, err) {
                $('table').show();
                var progress = new FileProgress(err.file, 'fsUploadProgress');
                progress.setError();
                var error = up.getOption('error')
                progress.setStatus(error);
            }
        }
    });

    Q.bind('FileUploaded', function() {
        console.log('hello man,a file is uploaded');
    });


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



    $('pre code').each(function(i, e) {
        hljs.highlightBlock(e);
    });


    $('body').on('click', 'table button.btn', function() {
        $(this).parents('tr').next().toggle();
    });

});
