  $.ajax({url: "/api/uptoken", success: function(res){
    var token = res.uptoken;
    var domain = res.domain;
    var config = {
      useCdnDomain: true,
      disableStatisticsReport: false,
      retryCount: 6,
      region: qiniu.region.z0
    };
    var putExtra = {
      fname: "",
      params: {},
      mimeType: null
    };
    imageControl(domain);
    uploadWithMultiSDK(token, putExtra, config, domain);
  }})
