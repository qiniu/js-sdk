// 实现form直传无刷新并解决跨域问题
function uploadWithForm(token, putExtra, config) {
  controlTabDisplay("form");
  // 获得上传地址
  qiniu.getUploadUrl(config, token).then(function(res){
    var uploadUrl = res;
    document.getElementsByName("token")[0].value = token;
    document.getElementsByName("url")[0].value = uploadUrl;
    // 当选择文件后执行的操作
    $("#select3").unbind("change").bind("change",function(){
      var iframe = createIframe();
      disableButtonOfSelect();
      var key = this.files[0].name;
      // 添加上传dom面板
      var board = addUploadBoard(this.files[0], config, key, "3");
      window.showRes = function(res){
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
      }
      $(board)
        .find("#totalBar")
        .addClass("hide");
      $(board)
        .find(".control-upload")
        .on("click", function() {
          enableButtonOfSelect();
          // 把action地址指向我们的 node sdk 后端服务,通过后端来实现跨域访问
          $("#uploadForm").attr("target", iframe.name);
          $("#uploadForm")
            .attr("action", "/api/transfer")
            .submit();
          $(this).text("上传中...");
          $(this).attr("disabled", "disabled");
          $(this).css("backgroundColor", "#aaaaaa");
        });
    })
  });
}

function createIframe() {
  var iframe = document.createElement("iframe");
  iframe.name = "iframe" + Math.random();
  $("#directForm").append(iframe);
  iframe.style.display = "none";
  return iframe;
}

function enableButtonOfSelect() {
  $("#select3").removeAttr("disabled", "disabled");
  $("#directForm")
    .find("button")
    .css("backgroundColor", "#00b7ee");
}

function disableButtonOfSelect() {
  $("#select3").attr("disabled", "disabled");
  $("#directForm")
    .find("button")
    .css("backgroundColor", "#aaaaaa");
}

