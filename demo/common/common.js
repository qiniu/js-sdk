const BLOCK_SIZE = 4 * 1024 * 1024;
function addUploadBoard(file, config, key, type) {
  var count = Math.ceil(file.size / BLOCK_SIZE);
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

var getRotate = function(url) {
  if (!url) {
    return 0;
  }
  var arr = url.split("/");
  for (var i = 0, len = arr.length; i < len; i++) {
    if (arr[i] === "rotate") {
      return parseInt(arr[i + 1], 10);
    }
  }
  return 0;
};

function imageControl(domain) {
  $(".modal-body")
    .find(".buttonList a")
    .on("click", function() {
      var img = $(".modal-body").find(".display img");
      var key = img.data("key");
      var oldUrl = img.attr("src");
      var originHeight = img.data("h");
      var fopArr = [];
      var rotate = getRotate(oldUrl);
      if (!$(this).hasClass("no-disable-click")) {
        $(this)
          .addClass("disabled")
          .siblings()
          .removeClass("disabled");
        if ($(this).data("imagemogr") !== "no-rotate") {
          fopArr.push({
            fop: "imageMogr2",
            "auto-orient": true,
            strip: true,
            rotate: rotate,
            format: "png"
          });
        }
      } else {
        $(this)
          .siblings()
          .removeClass("disabled");
        var imageMogr = $(this).data("imagemogr");
        if (imageMogr === "left") {
          rotate = rotate - 90 < 0 ? rotate + 270 : rotate - 90;
        } else if (imageMogr === "right") {
          rotate = rotate + 90 > 360 ? rotate - 270 : rotate + 90;
        }
        fopArr.push({
          fop: "imageMogr2",
          "auto-orient": true,
          strip: true,
          rotate: rotate,
          format: "png"
        });
      }
      $(".modal-body")
        .find("a.disabled")
        .each(function() {
          var watermark = $(this).data("watermark");
          var imageView = $(this).data("imageview");
          var imageMogr = $(this).data("imagemogr");

          if (watermark) {
            fopArr.push({
              fop: "watermark",
              mode: 1,
              image: "http://www.b1.qiniudn.com/images/logo-2.png",
              dissolve: 100,
              gravity: watermark,
              dx: 100,
              dy: 100
            });
          }
          if (imageView) {
            var height;
            switch (imageView) {
              case "large":
                height = originHeight;
                break;
              case "middle":
                height = originHeight * 0.5;
                break;
              case "small":
                height = originHeight * 0.1;
                break;
              default:
                height = originHeight;
                break;
            }
            fopArr.push({
              fop: "imageView2",
              mode: 3,
              h: parseInt(height, 10),
              q: 100,
              format: "png"
            });
          }

          if (imageMogr === "no-rotate") {
            fopArr.push({
              fop: "imageMogr2",
              "auto-orient": true,
              strip: true,
              rotate: 0,
              format: "png"
            });
          }
        });
      var newUrl = Qiniu.pipeline(fopArr, key, domain);

      var newImg = new Image();
      img.attr("src", "images/loading.gif");
      newImg.onload = function() {
        img.attr("src", newUrl);
        img.parent("a").attr("href", newUrl);
      };
      newImg.src = newUrl;
      return false;
    });
}

function imageDeal(board, key, domain) {
  var fopArr = [];
  var img = $(".modal-body").find(".display img");
  $(img).data("key", key);
  fopArr.push({
    fop: "watermark",
    mode: 1,
    image: "http://www.b1.qiniudn.com/images/logo-2.png",
    dissolve: 100,
    gravity: "NorthWest",
    ws: 0.8,
    dx: 100,
    dy: 100
  });
  fopArr.push({
    fop: "imageView2",
    mode: 2,
    h: 450,
    q: 100,
    format: "png"
  });
  var newUrl = Qiniu.pipeline(fopArr, key, domain);
  $(board)
    .find(".wraper a")
    .html(
      '<img src="' +
        domain +
        key +
        '"/>' +
        '<a data-toggle="modal" data-target="#myModal">查看处理效果</a>'
    );
  var newImg = new Image();
  img.attr("src", "images/loading.gif");
  newImg.onload = function() {
    img.attr("src", newUrl);
    img.data("h", 450);
    img.parent("a").attr("href", newUrl);
  };
  newImg.src = newUrl;
}
