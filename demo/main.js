(function() {
  var ajax = getToken();
  $("#box").addClass("hide");
  ajax.onreadystatechange = function() {
    if (ajax.readyState === 4 && ajax.status === 200) {
      var token = JSON.parse(ajax.responseText).uptoken;
      var domain = JSON.parse(ajax.responseText).domain;
      console.log(domain);
      var config = new qiniu.Config();
      var putExtra = new qiniu.PutExtra();
      putExtra.crc32 = true;
      config.zone = qiniu.Zones.Zone_z2;
      config.useHttpsDomain = false;
      config.useCdnDomain = true;
      config.putThreshhold = 4 * 1024 * 1024; //启用分片上传阈值
      $(".nav-box")
        .find("a")
        .each(function(index) {
          $(this).on("click", function(e) {
            switch (e.target.name) {
              case "h5":
                dealWithSDK(token, putExtra, config, domain);
                break;
              case "expand":
                dealWithOthers(token, putExtra, config, domain);
                break;
              case "directForm":
                dealWithForm(token, putExtra, config);
                break;
              default:
                "";
            }
          });
        });
      dealWithSDK(token, putExtra, config, domain);
    }
  };
})();

function getToken() {
  if (window.XMLHttpRequest) {
    xmlhttp = new XMLHttpRequest();
  } else {
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  var token;
  xmlhttp.open("GET", "/api/uptoken");
  xmlhttp.send();
  return xmlhttp;
}
function createAjax() {
  var xmlhttp = {};
  if (window.XMLHttpRequest) {
    xmlhttp = new XMLHttpRequest();
  } else {
    xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
  }
  return xmlhttp;
}
