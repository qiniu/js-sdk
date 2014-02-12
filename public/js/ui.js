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
        // this.fileProgressElement = document.createElement("div");
        // this.fileProgressElement.className = "progressContainer";



        var progressText = document.createElement("td");
        progressText.className = "progressName";
        progressText.appendChild(document.createTextNode(file.name));

        var fileSize;
        var _100MB = 100 << 20;
        if (file.size === undefined || file.size > _100MB) {
            fileSize = ">100 MB";
        } else {
            var size = Local.format(file.size, Local.storageHex, Local.storageUnits, 2);
            fileSize = size.base + " " + size.unit;
        }
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
        // var progressUpSize = document.createElement("div");
        // progressUpSize.className = "progressUpSize";
        // progressUpSize.innerHTML = "&nbsp;";

        //this.fileProgressWrapper.appendChild(progressCancel);
        this.fileProgressWrapper.appendChild(progressText);
        // this.fileProgressWrapper.appendChild(progressStatus);
        this.fileProgressWrapper.appendChild(progressSize);
        this.fileProgressWrapper.appendChild(progressBarTd);

        document.getElementById(targetID).appendChild(this.fileProgressWrapper);
    } else {
        //this.fileProgressElement = this.fileProgressWrapper.firstChild;
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

    // this.fileProgressWrapper.childNodes[2]..className = "progressBarInProgress";
    // this.fileProgressWrapper.childNodes[2]..style.width = "0%";

    // this.fileProgressWrapper.childNodes[5].className = "progressUpSize";
    // this.fileProgressWrapper.childNodes[5].innerHTML = "&nbsp;";

    this.appear();
};

FileProgress.prototype.setProgress = function(percentage, speed) {
    this.fileProgressWrapper.className = "progressContainer green";
    // this.fileProgressWrapper.childNodes[3].className = "progressBarInProgress";
    // this.fileProgressWrapper.childNodes[3].style.width = percentage;
    var size = Local.format(this.file.loaded, Local.storageHex, Local.storageUnits, 2);
    speed = Local.format(speed, Local.storageHex, Local.storageUnits, 2);
    // this.fileProgressWrapper.childNodes[2].className = "progressBarStatus";
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[2].innerHTML = "已上传: " + size.base + size.unit + " 上传速度： " + speed.base + speed.unit + "/s";

    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].childNodes[0].childNodes[0].innerHTML = "&nbsp;";
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].childNodes[0].className = 'progress-bar progress-bar-info';
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].setAttribute('aria-valuenow', parseInt(percentage, 10));
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = percentage;

    this.appear();
};

FileProgress.prototype.setComplete = function(info) {
    //console.log(info);
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
    // this.fileProgressWrapper.className = "progressContainer red";
    this.fileProgressWrapper.childNodes[2].className = 'text-warning';
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.display = 'none';
    this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = "0%";
};

FileProgress.prototype.setCancelled = function(manual) {
    // var progressContainer = 'progressContainer';
    // if (!manual) {
    //     progressContainer += ' red';
    // }
    // this.fileProgressWrapper.className = progressContainer;
    // this.fileProgressWrapper.childNodes[2].childNodes[0].childNodes[0].style.width = "0%";
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
