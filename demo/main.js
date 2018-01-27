(function() {
  var ajax = getToken();
  $("#box").addClass("hide");
  ajax.onreadystatechange = function() {
    if (ajax.readyState === 4 && ajax.status === 200) {
      var token = JSON.parse(ajax.responseText).uptoken;
      var domain = JSON.parse(ajax.responseText).domain;
      var config = {
        useHttpsDomain: false,
        useCdnDomain: true,
        zone: Qiniu.zones.z2
      };
      var putExtra = {
        fname: "",
        params: {},
        mimeType: null
      };
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
      imageControl(domain);
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