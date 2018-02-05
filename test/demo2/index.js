import * as qiniu from 'qiniu-js'

$.ajax({url:"/api/uptoken",success: (res)=> initFileInput(res)})

let initFileInput = (res) =>{

  let token = res.uptoken;

  let config = {
    useCdnDomain: true,
    region: qiniu.region.z2
  };
  let putExtra = {
    fname: "",
    params: {},
    mimeType: null
  };
  

  $("#select").change(function(){

    let file = this.files[0];
    let key = file.name;
    // 添加上传dom面板
    let next = (response) =>{
      let total = response.total;
      $(".speed").text("进度：" + total.percent + "% ");
    }
  
  
    let subscription;
    // 调用sdk上传接口获得相应的observable，控制上传和暂停
    let observable = qiniu.upload(file, key, token, putExtra, config);
    observable.subscribe(next)
  })
}