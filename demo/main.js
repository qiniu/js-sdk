(function() {
  var xhr = createXHR();
  xhr.open("GET", "/api/uptoken");
  xhr.send()
  $("#box").addClass("hide");
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var token = JSON.parse(xhr.responseText).uptoken;
      var domain = JSON.parse(xhr.responseText).domain;
      var config = {
        useHttpsDomain: false,
        useCdnDomain: true,
        zone: qiniu.zones.z2
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
