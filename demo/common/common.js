function addUploadBoard(file, config, key, type) {
  var count = Math.ceil(file.size / config.BLOCK_SIZE);
  var board = widget.add("tr", {
    data: { num: count, name: key, size: file.size },
    node: $("#fsUploadProgress" + type)
  });
  if (file.size > 100 * 1024 * 1024) {
    $(board).html("本实例最大上传文件100M");
    return;
  }
  count > 1 && type != "3"
    ? ""
    : $(board)
        .find(".resume")
        .addClass("hide");
  return board;
}

function getBoardWidth(board) {
  var total_width = $(board)
    .find("#totalBar")
    .outerWidth();
  $(board)
    .find(".fragment-group")
    .removeClass("hide");
  var child_width = $(board)
    .find(".fragment-group li")
    .children("#childBar")
    .outerWidth();
  $(board)
    .find(".fragment-group")
    .addClass("hide");
  return { totalWidth: total_width, childWidth: child_width };
}

function controlTabDisplay(type) {
  switch (type) {
    case "sdk":
      document.getElementById("box2").className = "";
      document.getElementById("box").className = "hide";
      break;
    case "others":
      document.getElementById("box2").className = "hide";
      document.getElementById("box").className = "";
      break;
    case "form":
      document.getElementById("box").className = "hide";
      document.getElementById("box2").className = "hide";
      break;
  }
}

function imageDeal(board, key, domain) {
  console.log(123);
  var fopArr = [];
  fopArr.push({
    fop: "watermark",
    mode: 1,
    image: "http://www.b1.qiniudn.com/images/logo-2.png",
    dissolve: 100,
    gravity: "NorthWest",
    ws: 0.5,
    dx: 100,
    dy: 100
  });
  fopArr.push({
    fop: "imageView2",
    mode: 3,
    h: 500,
    q: 500,
    format: "png"
  });
  var newUrl = qiniu.pipeline(fopArr, key, domain);
  $(".modal-body").html('<img src="' + newUrl + '"/>');
  $(board)
    .find(".wraper a")
    .html(
      '<img src="' +
        domain +
        key +
        '"/>' +
        '<a data-toggle="modal" data-target="#myModal">查看处理效果</a>'
    );
}
