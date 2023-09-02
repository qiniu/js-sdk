  $.ajax({url: "/api/uptoken", success: function(res){
    let token = res.uptoken;
    let domain = res.domain;
    let config = {
      checkByServer: true,
      checkByMD5: true,
      forceDirect: false,
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 6,
      region: qiniu.region.z2,
      debugLogLevel: 'INFO'
    };
    let putExtra = {
      customVars: {}
    };
    $(".nav-box")
      .find("a")
      .each(function(index) {
        $(this).on("click", function(e) {
          switch (e.target.name) {
            case "h5":
              uploadWithSDK(token, putExtra, config, domain);
              break;
            case "expand":
              uploadWithOthers(token, putExtra, config, domain);
              break;
            case "directForm":
              uploadWithForm(token, putExtra, config);
              break;
            default:
              "";
          }
        });
      });
    imageControl(domain);
    uploadWithSDK(token, putExtra, config, domain);
  }})
