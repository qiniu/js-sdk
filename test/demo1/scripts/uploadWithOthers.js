function uploadWithOthers(token, putExtra, config, domain) {
  controlTabDisplay("others");
  qiniu.getUploadUrl(config, token).then(function(res){
    var uploadUrl = res
    var board = {};
    var indexCount = 0;
    var resume = false;
    var chunk_size;
    var blockSize;
    var uploader = new plupload.Uploader({
      runtimes: "html5,flash,silverlight,html4",
      url: uploadUrl,
      browse_button: "select", // 触发文件选择对话框的按钮，为那个元素id
      flash_swf_url: "./js/Moxie.swf", // swf文件，当需要使用swf方式进行上传时需要配置该参数
      silverlight_xap_url: "./js/Moxie.xap",
      chunk_size: 4 * 1024 * 1024,
      max_retries: 3,
      multipart_params: {
        // token从服务端获取，没有token无法上传
        token: token
      },
      init: {
        PostInit: function() {
          console.log("upload init");
        },
        FilesAdded: function(up, files) {
          resume = false;
          $("#box input").attr("disabled", "disabled");
          $("#box button").css("backgroundColor", "#aaaaaa");
          chunk_size = uploader.getOption("chunk_size");
          var id = files[0].id;
          // 添加上传dom面板
          board[id] = addUploadBoard(files[0], config, files[0].name, "2");
          board[id].start = true;
          // 绑定上传按钮开始事件
          $(board[id])
            .find(".control-upload")
            .on("click", function() {
              if (board[id].start) {
                uploader.start();
                board[id].start = false;
                $(this).text("取消上传");
              } else {
                uploader.stop();
                board[id].start = true;
                $(this).text("开始上传");
              }
            });
        },
        FileUploaded: function(up, file, info) {
          console.log(info);
        },
        UploadComplete: function(up, files) {
          // Called when all files are either uploaded or failed
          console.log("[完成]");
        },
        Error: function(up, err) {
          console.log(err.response);
        }
      }
    });
    uploader.init();
    uploader.bind('Error',function(){
      console.log(1234)
    })
    uploader.bind("BeforeUpload", function(uploader, file) {
      key = file.name;
      putExtra.params["x:name"] = key.split(".")[0];
      var id = file.id;
      chunk_size = uploader.getOption("chunk_size");
      var directUpload = function() {
        var multipart_params_obj = {};
        multipart_params_obj.token = token;
        // filterParams 返回符合自定义变量格式的数组，每个值为也为一个数组，包含变量名及变量值
        var customVarList = qiniu.filterParams(putExtra.params);
        for (var i = 0; i < customVarList.length; i++) {
          var k = customVarList[i];
          multipart_params_obj[k[0]] = k[1];
        }
        multipart_params_obj.key = key;
        uploader.setOption({
          url: uploadUrl,
          multipart: true,
          multipart_params: multipart_params_obj
        });
      };

      var resumeUpload = function() {
        blockSize = chunk_size;
        initFileInfo(file);
        if(blockSize === 0){
          mkFileRequest(file)
          uploader.stop()
          return
        }
        resume = true;
        var multipart_params_obj = {};
        // 计算已上传的chunk数量
        var index = Math.floor(file.loaded / chunk_size);
        var dom_total = $(board[id])
          .find("#totalBar")
          .children("#totalBarColor");
        if (board[id].start != "reusme") {
          $(board[id])
            .find(".fragment-group")
            .addClass("hide");
        }
        dom_total.css(
          "width",
          file.percent + "%"
        );
        // 初始化已上传的chunk进度
        for (var i = 0; i < index; i++) {
          var dom_finished = $(board[id])
            .find(".fragment-group li")
            .eq(i)
            .find("#childBarColor");
          dom_finished.css("width", "100%");
        }
        var headers = qiniu.getHeadersForChunkUpload(token)
        uploader.setOption({
          url: uploadUrl + "/mkblk/" + blockSize,
          multipart: false,
          required_features: "chunks",
          headers: {
            Authorization: "UpToken " + token
          },
          multipart_params: multipart_params_obj
        });
      };
      // 判断是否采取分片上传
      if (
        (uploader.runtime === "html5" || uploader.runtime === "flash") &&
        chunk_size
      ) {
        if (file.size < chunk_size) {
          directUpload();
        } else {
          resumeUpload();
        }
      } else {
        console.log(
          "directUpload because file.size < chunk_size || is_android_weixin_or_qq()"
        );
        directUpload();
      }
    });

    uploader.bind("ChunkUploaded", function(up, file, info) {
      var res = JSON.parse(info.response);
      var leftSize = info.total - info.offset;
      var chunk_size = uploader.getOption && uploader.getOption("chunk_size");
      if (leftSize < chunk_size) {
        up.setOption({
          url: uploadUrl + "/mkblk/" + leftSize
        });
      }
      up.setOption({
        headers: {
          Authorization: "UpToken " + token
        }
      });
      // 更新本地存储状态
      var localFileInfo = JSON.parse(localStorage.getItem(file.name))|| [];
      localFileInfo[indexCount] = {
        ctx: res.ctx,
        time: new Date().getTime(),
        offset: info.offset,
        percent: file.percent
      };
      indexCount++;
      localStorage.setItem(file.name, JSON.stringify(localFileInfo));
    });

    // 每个事件监听函数都会传入一些很有用的参数，
    // 我们可以利用这些参数提供的信息来做比如更新UI，提示上传进度等操作
    uploader.bind("UploadProgress", function(uploader, file) {
      var id = file.id;
      // 更新进度条进度信息;
      var fileUploaded = file.loaded || 0;
      var dom_total = $(board[id])
        .find("#totalBar")
        .children("#totalBarColor");
      var percent = file.percent + "%";
      dom_total.css(
        "width",
        file.percent + "%"
      );
      $(board[id])
        .find(".speed")
        .text("进度：" + percent);
      var count = Math.ceil(file.size / uploader.getOption("chunk_size"));
      if (file.size > chunk_size) {
        updateChunkProgress(file, board[id], chunk_size, count);
      }
    });

    uploader.bind("FileUploaded", function(uploader, file, info) {
      var id = file.id;
      if (resume) {
        mkFileRequest(file)
      } else {
        uploadFinish(JSON.parse(info.response), file.name,board[id]);
      }
    });

    function updateChunkProgress(file, board, chunk_size, count) {

      var index = Math.ceil(file.loaded / chunk_size);
      var leftSize = file.loaded - chunk_size * (index - 1);
      if (index == count) {
        chunk_size = file.size - chunk_size * (index - 1);
      }

      var dom = $(board)
        .find(".fragment-group li")
        .eq(index - 1)
        .find("#childBarColor");
      dom.css(
        "width",
        leftSize / chunk_size *100 + "%"
      );
    }

    function uploadFinish(res, name, board) {
      localStorage.removeItem(name)
      $("#box input").removeAttr("disabled", "disabled");
      $("#box button").css("backgroundColor", "#00b7ee");
      $(board)
        .find("#totalBar")
        .addClass("hide");
      $(board)
        .find(".control-container")
        .html(
          "<p><strong>Hash：</strong>" +
            res.hash +
            "</p>" +
            "<p><strong>Bucket：</strong>" +
            res.bucket +
            "</p>"
        );
      if (res.key && res.key.match(/\.(jpg|jpeg|png|gif)$/)) {
        imageDeal(board, res.key, domain);
      }
    }

    function initFileInfo(file) {
      var localFileInfo = JSON.parse(localStorage.getItem(file.name))|| [];
      indexCount = 0;
      var length = localFileInfo.length
      if (length) {
        var clearStatus = false
        for (var i = 0; i < localFileInfo.length; i++) {
            indexCount++
          if (isExpired(localFileInfo[i].time)) {
            clearStatus = true
            localStorage.removeItem(file.name);
            break;
          }
        }
        if(clearStatus){
          indexCount = 0;
          return
        }
        file.loaded = localFileInfo[length - 1].offset;
        var leftSize = file.size - file.loaded;
        if(leftSize < chunk_size){
          blockSize = leftSize
        }
        file.percent = localFileInfo[length - 1].percent;
        return
      }else{
        indexCount = 0
      }
    }

    function mkFileRequest(file){
      // 调用sdk的url构建函数
      var requestUrl = qiniu.createMkFileUrl(
        uploadUrl,
        file.size,
        key,
        putExtra
      );
      var ctx = []
      var id = file.id
      var local = JSON.parse(localStorage.getItem(file.name))
      for(var i =0;i<local.length;i++){
        ctx.push(local[i].ctx)
      }
      // 设置上传的header信息
      var headers = qiniu.getHeadersForMkFile(token)
      $.ajax({url: requestUrl, type: "POST",  headers: headers, data: ctx.join(","), success: function(res){
        uploadFinish(res, file.name,board[id]);
      }})
    }

    function isExpired(time){
      let expireAt = time + 3600 * 24* 1000;
      return new Date().getTime() > expireAt;
    }
  });
}
