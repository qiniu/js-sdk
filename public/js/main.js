var Q = new Qiniu({
    runtimes: 'html5,flash,html4',
    browse_button: 'pickfiles',
    container: 'container',
    drop_element: 'container',
    max_file_size: '100mb',
    flash_swf_url: 'js/plupload/Moxie.swf',
    silverlight_xap_url: 'js/plupload/Moxie.xap',
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
            console.log(info);
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

Q.uploader.bind('UploadComplete', function() {
    // console.log('hello world');
});
