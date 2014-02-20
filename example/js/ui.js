/*global plupload */
/*global isImage */
function FileProgress(file, targetID) {
    this.fileProgressID = file.id;
    this.file = file;

    this.opacity = 100;
    this.height = 0;
    this.fileProgressWrapper = $('#' + this.fileProgressID);
    if (!this.fileProgressWrapper.length) {
        // <div class="progress">
        //   <div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100" style="width: 20%">
        //     <span class="sr-only">20% Complete</span>
        //   </div>
        // </div>

        this.fileProgressWrapper = $('<tr></tr>');
        var Wrappeer = this.fileProgressWrapper;
        Wrappeer.attr('id', this.fileProgressID).addClass('progressContainer');

        var progressText = $("<td/>");
        progressText.addClass('progressName').text(file.name);


        var fileSize = plupload.formatSize(file.size).toUpperCase();
        var progressSize = $("<td/>");
        progressSize.addClass("progressFileSize").text(fileSize);

        var progressBarTd = $("<td/>");
        var progressBarBox = $("<div/>");
        progressBarBox.addClass('info');
        var progressBarWrapper = $("<div/>");
        progressBarWrapper.addClass("progress progress-striped");


        var progressBar = $("<div/>");
        progressBar.addClass("progress-bar progress-bar-info")
            .attr('role', 'progressbar')
            .attr('aria-valuemax', 100)
            .attr('aria-valuenow', 0)
            .attr('aria-valuein', 0)
            .width('0%');

        var progressBarPercent = $('<span class=sr-only />');
        progressBarPercent.text(fileSize);


        var progressCancel = $('<a href=# />');
        progressCancel.hide().addClass('progressCancel').text('');


        progressBar.append(progressBarPercent);
        progressBarWrapper.append(progressBar);
        progressBarBox.append(progressBarWrapper);
        progressBarBox.append(progressCancel);


        var progressBarStatus = $('<div class="status text-center"/>');
        progressBarBox.append(progressBarStatus);
        progressBarTd.append(progressBarBox);


        Wrappeer.append(progressText);
        Wrappeer.append(progressSize);
        Wrappeer.append(progressBarTd);

        $('#' + targetID).append(Wrappeer);
    } else {
        this.reset();
    }

    this.height = this.fileProgressWrapper.offset().top;
    this.setTimer(null);
}

FileProgress.prototype.setTimer = function(timer) {
    this.fileProgressWrapper.FP_TIMER = timer;
};

FileProgress.prototype.getTimer = function(timer) {
    return this.fileProgressWrapper.FP_TIMER || null;
};

FileProgress.prototype.reset = function() {
    this.fileProgressWrapper.attr('class', "progressContainer");
    this.fileProgressWrapper.find('td .progress .progress-bar-info').attr('aria-valuenow', 0).width('0%').find('span').text('');
    this.appear();
};

FileProgress.prototype.setChunkProgess = function(chunk_size) {
    var chunk_amount = Math.ceil(this.file.size / chunk_size);
    if (chunk_amount === 1) {
        return false;
    }

    var viewProgess = $('<button class="btn btn-default">查看分块上传进度</button>');

    var progressBarChunkTr = $('<tr><td colspan=3></td></tr>');
    var progressBarChunk = $('<div/>');
    // progressBarChunk.hide();
    for (var i = 1; i <= chunk_amount; i++) {
        var col = $('<div class="col-md-2"/>');
        var progressBarWrapper = $('<div class="progress progress-striped"></div');

        var progressBar = $("<div/>");
        progressBar.addClass("progress-bar progress-bar-info text-left")
            .attr('role', 'progressbar')
            .attr('aria-valuemax', 100)
            .attr('aria-valuenow', 0)
            .attr('aria-valuein', 0)
            .width('0%')
            .attr('id', this.file.id + '_' + i)
            .text('');

        var progressBarStatus = $('<span/>');
        progressBarStatus.addClass('chunk-status').text();

        progressBarWrapper.append(progressBar);
        progressBarWrapper.append(progressBarStatus);

        col.append(progressBarWrapper);
        progressBarChunk.append(col);
    }
    this.fileProgressWrapper.find('td>div').append(viewProgess);

    progressBarChunkTr.hide().find('td').append(progressBarChunk);

    progressBarChunkTr.insertAfter(this.fileProgressWrapper);
};

FileProgress.prototype.setProgress = function(percentage, speed, chunk_size) {
    this.fileProgressWrapper.attr('class', "progressContainer green");

    var file = this.file;
    var uploaded = file.loaded;

    var size = plupload.formatSize(uploaded).toUpperCase();
    var formatSpeed = plupload.formatSize(speed).toUpperCase();
    var progressbar = this.fileProgressWrapper.find('td .progress').find('.progress-bar-info');
    this.fileProgressWrapper.find('.status').text("已上传: " + size + " 上传速度： " + formatSpeed + "/s");

    progressbar.attr('aria-valuenow', parseInt(percentage, 10)).css('width', percentage);


    if (chunk_size) {
        var chunk_amount = Math.ceil(file.size / chunk_size);
        if (chunk_amount === 1) {
            return false;
        }
        var current_uploading_chunk = Math.ceil(uploaded / chunk_size);

        var currentProgessBar = $('#' + file.id + "_" + current_uploading_chunk);
        var current_chunk_percent;
        if (current_uploading_chunk < chunk_amount) {
            if (uploaded % chunk_size) {
                current_chunk_percent = ((uploaded % chunk_size) / chunk_size * 100).toFixed(2);
            } else {
                current_chunk_percent = 100;
                currentProgessBar.removeClass().addClass('alert-success');
            }
        } else {
            var last_chunk_size = file.size - chunk_size * (chunk_amount - 1);
            var left_file_size = file.size - uploaded;
            if (left_file_size % last_chunk_size) {
                current_chunk_percent = ((uploaded % chunk_size) / last_chunk_size * 100).toFixed(2);
            } else {
                current_chunk_percent = 100;
                currentProgessBar.removeClass().addClass('alert-success');
            }
        }
        currentProgessBar.width(current_chunk_percent + '%');
        currentProgessBar.attr('aria-valuenow', current_chunk_percent);
        var text = "块" + current_uploading_chunk + "上传进度" + current_chunk_percent + '%';
        currentProgessBar.next().html(text);
    }

    this.appear();
};

FileProgress.prototype.setComplete = function(up, info) {
    var td = this.fileProgressWrapper.find('td:eq(2) .progress');
    // td.find('.progress-bar').attr('aria-valuenow', 100).width('100%');

    var res = info;
    var domain = up.getOption('domain');
    var url = domain + encodeURI(res.key);
    var link = domain + res.key;
    var str = "<div><strong>Link:</strong><a href=" + url + " target='_blank' > " + link + "</a></div>" +
        "<div class=hash><strong>Hash:</strong>" + res.hash + "</div>";
    // "<button class='btn btn-default'>查看分块上传进度</button>";

    td.html(str).removeClass().next().next('.status').hide();

    var progressNameTd = this.fileProgressWrapper.find('.progressName');
    var imageView = '?imageView2/1/w/100/h/100';


    var isImg = isImage(url);

    var Wrapper = $('<div class="Wrapper"/>');
    var imgWrapper = $('<div class="imgWrapper col-md-3"/>');
    var showImg = $('<img/>');


    Wrapper.append(imgWrapper);
    progressNameTd.append(Wrapper);

    if (!isImg) {
        showImg.attr('src', 'default.png');
        imgWrapper.append(showImg);
        Wrapper.addClass('default');
    } else {
        var img = new Image();

        $(img).attr('src', url + imageView);


        // Wrapper.append(showImg);
        // imgWrapper.append(showImg);
        showImg.attr('src', 'loading.gif');
        imgWrapper.append(showImg);

        var timeId = setTimeout(function() {

            showImg.attr('src', 'default.png');
            Wrapper.addClass('default');

            $(img).unbind();
        }, 3500);

        $(img).on('load', function() {
            // var Wrapper = $('<div class=Wrapper/>');

            clearTimeout(timeId);
            // var Img = $('<img/>');
            showImg.attr('src', url + imageView);

            // var linkWrapper = $('<div class="linkWrapper">');
            // var imageMogr2Img = $('<a/>');
            // imageMogr2Img.attr('data-href', res.key).text('查看旋转效果');

            // var watermarkImg = $('<a/>');
            // watermarkImg.attr('data-href', res.key).text('查看水印效果');

            // imageMogr2Img.on('click', function() {
            //     $('#myModal').modal();
            //     var modalBody = $('#myModal').find('.modal-body');
            //     var url = Q.imageMogr2({
            //         'auto-orient': true,
            //         'strip': true,
            //         'thumbnail': '1000x1000',
            //         'crop': '!300x400a10a10',
            //         'quality': 40,
            //         'rotate': 20,
            //         'format': 'png'
            //     }, $(this).data('href'));
            //     modalBody.find('img').attr('src', url);
            //     modalBody.find('.modal-body-wrapper').find('a').attr('href', url);
            //     return false;
            // });

            // watermarkImg.on('click', function() {
            //     var modalBody = $('#myModal').find('.modal-body');
            //     var url = Q.watermark({
            //         mode: 1,
            //         image: 'http://www.b1.qiniudn.com/images/logo-2.png',
            //         dissolve: 100,
            //         gravity: 'SouthEast',
            //         dx: 100,
            //         dy: 100
            //     }, $(this).data('href'));
            //     $('#myModal').modal();
            //     modalBody.find('img').attr('src', url);
            //     modalBody.find('.modal-body-wrapper').find('a').attr('href', url);

            //     return false;
            // });

            // linkWrapper.append(imageMogr2Img).append($('<br>')).append(watermarkImg).hide();
            // imgWrapper.append(Img).append(linkWrapper);


            var infoWrapper = $('<div class="infoWrapper col-md-5"></div>');
            var exifLink = $('<a href="" target="_blank">查看exif</a>');
            exifLink.attr('href', url + '?exif');

            var imageInfo = Q.imageInfo(res.key);
            var infoArea = $('<div/>');
            infoArea.html('格式：' + imageInfo.format + '  <br />宽度：' + imageInfo.width + '  <br />高度：' + imageInfo.height);

            console.log(imageInfo);
            infoWrapper.append(exifLink).append(infoArea);

            Wrapper.append(infoWrapper);

            // imgWrapper.on('mouseover', function() {
            //     linkWrapper.show();
            // }).on('mouseout', function() {
            //     linkWrapper.hide();
            // });


        }).on('error', function() {
            showImg.attr('src', 'default.png');
            Wrapper.addClass('default');
            clearTimeout(timeId);
        });
    }
    // var nextTr = this.fileProgressWrapper.next();
    // var isChunk = nextTr.find('td').length === 1;
    // if (isChunk) {
    //     nextTr.hide();
    // }
};
FileProgress.prototype.setError = function() {
    this.fileProgressWrapper.find('td:eq(2)').attr('class', 'text-warning');
    this.fileProgressWrapper.find('td:eq(2) .progress').css('width', 0).hide();
};

FileProgress.prototype.setCancelled = function(manual) {
    var progressContainer = 'progressContainer';
    if (!manual) {
        progressContainer += ' red';
    }
    this.fileProgressWrapper.attr('class', progressContainer);
    this.fileProgressWrapper.find('td .progress .progress-bar-info').css('width', 0);
};

FileProgress.prototype.setStatus = function(status, isUploading) {
    if (!isUploading) {
        this.fileProgressWrapper.find('.status').text(status).attr('class', 'status text-left');
    }
};

// Show/Hide the cancel button
FileProgress.prototype.toggleCancel = function(show, up) {
    // var self = this;
    // if (up) {
    //     self.fileProgressWrapper.childNodes[0].onclick = function() {
    //         //绑定事件 取消当前上传文件
    //         self.setCancelled();
    //         self.setStatus("取消上传");
    //         var status_before = self.file.status;
    //         up.removeFile(self.file);
    //         if (up.state === plupload.STARTED && status_before === plupload.UPLOADING) {
    //             up.stop();
    //             up.start();
    //         }
    //         return true;
    //     };
    // }

};

FileProgress.prototype.appear = function() {
    if (this.getTimer() !== null) {
        clearTimeout(this.getTimer());
        this.setTimer(null);
    }

    if (this.fileProgressWrapper[0].filters) {
        try {
            this.fileProgressWrapper[0].filters.item("DXImageTransform.Microsoft.Alpha").opacity = 100;
        } catch (e) {
            // If it is not set initially, the browser will throw an error.  This will set it if it is not set yet.
            this.fileProgressWrapper.css('filter', "progid:DXImageTransform.Microsoft.Alpha(opacity=100)");
        }
    } else {
        this.fileProgressWrapper.css('opacity', 1);
    }

    this.fileProgressWrapper.css('height', '');

    this.height = this.fileProgressWrapper.offset().top;
    this.opacity = 100;
    this.fileProgressWrapper.show();

};
