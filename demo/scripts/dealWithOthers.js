function dealWithOthers(token, putExtra, config, domain) {
  controlTabDisplay("others");
  var uploadUrl = Qiniu.getUploadUrl(config);
  var board = {};
  var indexCount = 0;
  var ctx;
  var chunk_size;
  var blockSize;
  var isfirstAddBoard = true;
  var width;
  var speedCalInfo = {
    isResumeUpload: false,
    resumeFilesize: 0,
    startTime: "",
    currentTime: ""
  };
  var uploader = new plupload.Uploader({
    runtimes: "html5,flash,silverlight,html4",
    url: uploadUrl,
    browse_button: "select", // 触发文件选择对话框的按钮，为那个元素id
    flash_swf_url: "./js/Moxie.swf", // swf文件，当需要使用swf方式进行上传时需要配置该参数
    silverlight_xap_url: "./js/Moxie.xap",
    chunk_size: 4 * 1024 * 1024,
    multipart_params: {
      // token从服务端获取，没有token无法上传
      token: token
    },
    init: {
      PostInit: function() {
        console.log("upload init");
      },
      FilesAdded: function(up, files) {
        ctx = "";
        $("#box input").attr("disabled", "disabled");
        $("#box button").css("backgroundColor", "#aaaaaa");
        chunk_size = uploader.getOption("chunk_size");
        var id = files[0].id;
        // 添加上传dom面板
        board[id] = addUploadBoard(files[0], config, files[0].name, "2");
        board[id].start = true;
        // 拿到初始宽度来为后面方便进度计算
        if (isfirstAddBoard) {
          width = getBoardWidth(board[id]);
          isfirstAddBoard = false;
        }
        // 绑定上传按钮开始事件
        $(board[id])
          .find(".control-upload")
          .on("click", function() {
            if (board[id].start) {
              uploader.start();
              board[id].start = false;
              $(this).text("暂停上传");
            } else {
              uploader.stop();
              board[id].start = "reusme";
              $(this).text("继续上传");
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
        alert(err.response);
      }
    }
  });
  uploader.init();

  uploader.bind("BeforeUpload", function(uploader, file) {
    key = file.name;
    putExtra.params["x:name"] = key.split(".")[0];
    var id = file.id;
    chunk_size = uploader.getOption("chunk_size");
    var directUpload = function() {
      var multipart_params_obj = {};
      multipart_params_obj.token = token;
      if (putExtra.params) {
        for (var k in putExtra.params) {
          if (Qiniu.isMagic(k, putExtra.params)) {
            multipart_params_obj[k] = putExtra.params[k].toString();
          }
        }
      }
      multipart_params_obj.key = key;
      uploader.setOption({
        url: uploadUrl,
        multipart: true,
        multipart_params: multipart_params_obj
      });
    };

    var resumeUpload = function() {
      if (!ctx) {
        Qiniu.removeLocalItemInfo(file.name);
      }
      blockSize = chunk_size;
      var localFileInfo = Qiniu.getLocalItemInfo(file.name);
      if (localFileInfo.length) {
        for (var i = 0; i < localFileInfo.length; i++) {
          if (Qiniu.isChunkExpired(localFileInfo[i].time)) {
            Qiniu.removeLocalItemInfo(file.name);
            break;
          }
        }
      }
      initFileInfo(file);

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
        Math.floor(file.percent / 100 * width.totalWidth - 2) + "px"
      );
      // 初始化已上传的chunk进度
      for (var i = 0; i < index; i++) {
        var dom_finished = $(board[id])
          .find(".fragment-group li")
          .eq(index)
          .find("#childBarColor");
        dom_finished.css("width", Math.floor(width.childWidth - 2) + "px");
      }
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
    ctx = ctx ? ctx + "," + res.ctx : res.ctx;
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
    var localFileInfo = Qiniu.getLocalItemInfo(file.name);
    localFileInfo[indexCount] = {
      ctx: res.ctx,
      time: new Date().getTime() / 1000,
      offset: info.offset,
      percent: file.percent
    };
    indexCount++;
    Qiniu.setLocalItemInfo(localFileInfo, file.name);
  });

  // 每个事件监听函数都会传入一些很有用的参数，
  // 我们可以利用这些参数提供的信息来做比如更新UI，提示上传进度等操作
  uploader.bind("UploadProgress", function(uploader, file) {
    var id = file.id;
    //更新进度条进度信息;
    var fileUploaded = file.loaded || 0;
    var dom_total = $(board[id])
      .find("#totalBar")
      .children("#totalBarColor");
    var percent = file.percent + "%";
    dom_total.css(
      "width",
      Math.floor(file.percent / 100 * width.totalWidth - 2) + "px"
    );
    $(board[id])
      .find(".speed")
      .text("进度：" + percent);
    var count = Math.ceil(file.size / uploader.getOption("chunk_size"));
    if (file.size > chunk_size) {
      setChunkProgress(file, board[id], chunk_size, count);
    }
  });

  uploader.bind("FileUploaded", function(uploader, file, info) {
    var id = file.id;
    if (ctx) {
      // 调用sdk的url构建函数
      var requestURI = Qiniu.createMkFileUrl(uploadUrl, file, key, putExtra);
      // 设置上传的header信息
      let xhr = Qiniu.getResumeUploadXHR(requestURI, token, "ctx");
      xhr.send(ctx);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status === 200) {
            uploadFinish(this.responseText, board[id]);
          }
        }
      };
    } else {
      uploadFinish(info.response, board[id]);
    }
  });

  function setChunkProgress(file, board, chunk_size, count) {
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
      Math.floor(leftSize / chunk_size * width.childWidth - 2) + "px"
    );
  }

  function uploadFinish(res, board) {
    $("#box input").removeAttr("disabled", "disabled");
    $("#box button").css("backgroundColor", "#00b7ee");
    var data = JSON.parse(res);
    $(board)
      .find("#totalBar")
      .addClass("hide");
    $(board)
      .find(".control-container")
      .html(
        "<p><strong>Hash：</strong>" +
          data.hash +
          "</p>" +
          "<p><strong>Bucket：</strong>" +
          data.bucket +
          "</p>"
      );
    if (data.key && data.key.match(/\.(jpg|jpeg|png|gif)$/)) {
      imageDeal(board, data.key, domain);
    }
  }
  function initFileInfo(file) {
    var localFileInfo = Qiniu.getLocalItemInfo(file.name);
    var length = localFileInfo.length;
    if (length) {
      file.loaded = localFileInfo[length - 1].offset;
      file.percent = localFileInfo[length - 1].percent;
    } else {
      indexCount = 0;
    }
  }
}
