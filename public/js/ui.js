function FileProgress(file, targetID) {
    this.fileProgressID = file.id;
    this.file = file;

    this.opacity = 100;
    this.height = 0;
    this.fileProgressWrapper = document.getElementById(this.fileProgressID);
    if (!this.fileProgressWrapper) {
        // <div class="progress">
        //   <div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="20" aria-valuemin="0" aria-valuemax="100" style="width: 20%">
        //     <span class="sr-only">20% Complete</span>
        //   </div>
        // </div>
        this.fileProgressWrapper = document.createElement('tr');
        this.fileProgressWrapper.id = this.fileProgressID;
        this.fileProgressWrapper.className = "progressContainer";

        this.fileProgressElement = document.createElement('td');

        var progressText = document.createElement("td");
        progressText.className = "progressName";
        progressText.appendChild(document.createTextNode(file.name));

        var fileSize = plupload.formatSize(file.size).toUpperCase();
        var progressSize = document.createElement("td");
        progressSize.className = "progressFileSize";
        progressSize.appendChild(document.createTextNode(fileSize));

        var progressBarTd = document.createElement('td');
        var progressBarBox = document.createElement('div');
        progressBarBox.className = "info";
        var progressBarWrapper = document.createElement("div");
        progressBarWrapper.className = "progress";
        var progressBar = document.createElement('div');
        progressBar.className = 'progress-bar progress-bar-info';
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuemax', 100);
        progressBar.setAttribute('aria-valuenow', 0);
        progressBar.setAttribute('aria-valuein', 0);

        progressBar.style.width = "0%";
        var progressBarPercent = document.createElement('span');
        progressBarPercent.className = "sr-only";
        var progressCancel = document.createElement("a");
        progressCancel.className = "progressCancel";
        progressCancel.href = "#";
        progressCancel.style.visibility = "hidden";
        progressCancel.appendChild(document.createTextNode(" "));
        progressBarPercent.appendChild(document.createTextNode(fileSize));
        progressBar.appendChild(progressBarPercent);
        progressBarWrapper.appendChild(progressBar);
        progressBarBox.appendChild(progressBarWrapper);
        progressBarBox.appendChild(progressCancel);
        var progressBarStatus = document.createElement('div');
        progressBarStatus.className = "status text-center";
        progressBarBox.appendChild(progressBarStatus);
        progressBarTd.appendChild(progressBarBox);
        this.fileProgressWrapper.appendChild(progressText);
        // this.fileProgressWrapper.appendChild(progressStatus);
        this.fileProgressWrapper.appendChild(progressSize);
        this.fileProgressWrapper.appendChild(progressBarTd);

        document.getElementById(targetID).appendChild(this.fileProgressWrapper);
    } else {
        this.reset();
    }

    this.height = this.fileProgressWrapper.offsetHeight;
    this.setTimer(null);
}

FileProgress.prototype.setTimer = function(timer) {
    this.fileProgressWrapper.FP_TIMER = timer;
};

FileProgress.prototype.getTimer = function(timer) {
    return this.fileProgressWrapper.FP_TIMER || null;
};

FileProgress.prototype.reset = function() {
    this.fileProgressWrapper.className = "progressContainer";

    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].childNodes[0].innerHTML = "&nbsp;";
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].className = 'progress-bar progress-bar-info';
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].setAttribute('aria-valuenow', 0);
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = '0%';
    this.appear();
};

FileProgress.prototype.setChunkProgess = function(chunk_size) {
    var chunk_amount = Math.ceil(this.file.size / chunk_size);
    if (chunk_amount === 1) {
        return false;
    }
    for (var i = 1; i <= chunk_amount; i++) {
        var progressBar = document.createElement('div');
        progressBar.className = 'progress-bar progress-bar-info text-left';
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-valuemax', 100);
        progressBar.setAttribute('aria-valuenow', 0);
        progressBar.setAttribute('aria-valuein', 0);
        progressBar.setAttribute('id', this.file.id + '_' + i);
        progressBar.innerHTML = "&nbsp;";
        progressBar.style.width = "0%";

        this.fileProgressWrapper.childNodes[2].childNodes[0].appendChild(progressBar);
    }
}

FileProgress.prototype.setProgress = function(percentage, speed, chunk_size) {
    this.fileProgressWrapper.className = "progressContainer green";

    var file = this.file;
    var uploaded = file.loaded;
    var total = file.size;

    var size = plupload.formatSize(uploaded).toUpperCase();
    var speed = plupload.formatSize(speed).toUpperCase();
    var progressbar = this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0];
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[2].innerHTML = "已上传: " + size + " 上传速度： " + speed + "/s";

    progressbar.childNodes[0].innerHTML = "&nbsp;";
    progressbar.className = 'progress-bar progress-bar-info';
    progressbar.setAttribute('aria-valuenow', parseInt(percentage, 10));
    progressbar.style.width = percentage;

    if (chunk_size) {
        var chunk_amount = Math.ceil(file.size / chunk_size);
        if (chunk_amount === 1) {
            return false;
        }
        var current_uploading_chunk = Math.ceil(uploaded / chunk_size);

        var currentProgessBar = document.getElementById(file.id + "_" + current_uploading_chunk);
        var current_chunk_percent;
        if (uploaded % chunk_size) {
            current_chunk_percent = (uploaded % chunk_size) / chunk_size * 100;
        } else {
            current_chunk_percent = 100;
        }

        currentProgessBar.style.width = current_chunk_percent + '%';
        currentProgessBar.setAttribute('aria-valuenow', current_chunk_percent);
        currentProgessBar.innerHTML = "块" + current_uploading_chunk + "上传进度" + current_chunk_percent + '%';
    }

    this.appear();
};

FileProgress.prototype.setComplete = function(info) {
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].setAttribute('aria-valuenow', parseInt(100, 10));
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = "100%";
    this.fileProgressWrapper.childNodes[2].childNodes[0].style.display = 'none';
    // var res = $.parseJSON(info.response);
    var res = info;
    var url = 'http://qiniu-plupload.qiniudn.com/' + encodeURI(res.key);
    var link = 'http://qiniu-plupload.qiniudn.com/' + res.key;
    var str = "<div><strong>Link:</strong><a href=" + url + " target='_blank' > " + link + "</a></div>" +
        "<div><strong>Hash:</strong>" + res.hash + "<div>";

    this.fileProgressWrapper.childNodes[2].innerHTML = str;
};
FileProgress.prototype.setError = function() {
    this.fileProgressWrapper.childNodes[2].className = 'text-warning';
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.display = 'none';
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = "0%";
};

FileProgress.prototype.setCancelled = function(manual) {
    var progressContainer = 'progressContainer';
    if (!manual) {
        progressContainer += ' red';
    }
    this.fileProgressWrapper.className = progressContainer;
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = "0%";
};

FileProgress.prototype.setStatus = function(status, isUploading) {
    if (!isUploading) {
        this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[2].innerHTML = status;
        this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[2].className = 'status text-left';
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

    if (this.fileProgressWrapper.filters) {
        try {
            this.fileProgressWrapper.filters.item("DXImageTransform.Microsoft.Alpha").opacity = 100;
        } catch (e) {
            // If it is not set initially, the browser will throw an error.  This will set it if it is not set yet.
            this.fileProgressWrapper.style.filter = "progid:DXImageTransform.Microsoft.Alpha(opacity=100)";
        }
    } else {
        this.fileProgressWrapper.style.opacity = 1;
    }

    this.fileProgressWrapper.style.height = "";

    this.height = this.fileProgressWrapper.offsetHeight;
    this.opacity = 100;
    this.fileProgressWrapper.style.display = "";

};
