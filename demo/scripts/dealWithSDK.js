function dealWithSDK(token, putExtra, config, domain) {
  //切换tab后进行一些css操作
  controlTabDisplay("sdk");
  console.log(123);
  console.log(domain);
  var width;
  var isfirstAddBoard = true;
  $("#select2").change(function() {
    var file = this.files[0];
    var observable;
    if (file) {
      var key = file.name;
      //添加上传dom面板
      var board = addUploadBoard(file, config, key, "");
      var dom_total = $(board)
        .find("#totalBar")
        .children("#totalBarColor");
      //设置next,error,complete对应的操作，分别处理相应的进度信息，错误信息，以及完成后的操作
      var error = function(err) {
        console.log(err);
      };

      var complete = function(res) {
        console.log(res.key);
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
      };

      var next = function(progress) {
        for (var key in progress) {
          if (key != "total") {
            $(board)
              .find(".fragment-group li")
              .eq(key)
              .find("#childBarColor")
              .css(
                "width",
                Math.floor(progress[key].percent / 100 * width.childWidth - 2) +
                  "px"
              );
          } else {
            $(board)
              .find(".speed")
              .text("进度：" + progress[key].percent + "% ");
            dom_total.css(
              "width",
              Math.floor(progress[key].percent / 100 * width.totalWidth - 2) +
                "px"
            );
          }
        }
      };

      var subObject = {
        next: next,
        error: error,
        complete: complete
      };
      var subscription;
      //判断是否是第一次增加，这里主要是获得dom上传面板的初始宽度
      if (isfirstAddBoard) {
        width = getBoardWidth(board);
        console.log(width);
        isfirstAddBoard = false;
      }
      putExtra.params["x:name"] = key.split(".")[0];
      board.start = true;
      //调用sdk上传接口获得相应的observable，控制上传和暂停
      observable = qiniu.upload(file, key, token, putExtra, config);
      $(board)
        .find(".control-upload")
        .on("click", function() {
          if (board.start) {
            if (board.start == "resume") {
              subscription = observable.subscribe(subObject);
              $(this).text("暂停上传");
              board.start = false;
            } else {
              board.start = false;
              $(this).text("暂停上传");
              subscription = observable.subscribe(subObject);
            }
          } else {
            board.start = "resume";
            subscription.unsubscribe();
            $(this).text("继续上传");
          }
        });
    }
  });
}
