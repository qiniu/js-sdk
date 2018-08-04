(function() {
  var init = function(obj) {
    var li_children =
      "<div id='childBar' style='width:100%;height:20px;border:1px solid;border-radius:3px'>" +
      "<div id='childBarColor' style='width:0;border:0;background-color:rgba(250,59,127,0.8);height:18px;'>" +
      "</div>" +
      "</div>";
    var li = document.createElement("li");
    $(li).addClass("fragment");
    $(li).html(li_children);
    obj.node.append(li);
  };
  widget.register("li", {
    init: init
  });
})();

(function() {
  var init = function(obj) {
    var data = obj.data;
    var name = data.name;
    var size = data.size;
    var parent =
      "<td>" +
      name +
      "<div class='wraper'><a class='linkWrapper'></a></div>" +
      "</td>" +
      "<td>" +
      size +
      "</td>" +
      "<td><div style='overflow:hidden'><div id='totalBar' style='float:left;width:80%;height:30px;border:1px solid;border-radius:3px'>" +
      "<div id='totalBarColor' style='width:0;border:0;background-color:rgba(232,152,39,0.8);height:28px;'></div>" +
      "<p class='speed'></p>" +
      "</div>" +
      "<div class='control-container'>" +
      '<button class="btn btn-default control-upload">开始上传</button>' +
      "</div></div>" +
      "<div><button class='btn btn-default resume'>查看分块进度</button></div>" +
      "<ul class='fragment-group hide'>" +
      "</ul></td>";
    var tr = document.createElement("tr");
    $(tr).html(parent);
    obj.node.append(tr);
    for (var i = 0; i < data.num; i++) {
      widget.add("li", {
        data: "",
        node: $(tr).find(".fragment-group")
      });
    }
    $(tr)
      .find(".resume")
      .on("click", function() {
        var ulDom = $(tr).find(".fragment-group");
        if (ulDom.hasClass("hide")) {
          ulDom.removeClass("hide");
        } else {
          ulDom.addClass("hide");
        }
      });
    return tr;
  };
  widget.register("tr", {
    init: init
  });
})();
