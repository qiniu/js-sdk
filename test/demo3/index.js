
var lastFile = null;
var sourceImage;
var options = {
  quality: 0.92,
  maxWidth: 1000,
  maxHeight: 618
}
$("#select").change(function(){
  options.outputType = this.files[0].type;
  console.log(options)
  sourceImage = new Image();
  var sourceUrl = URL.createObjectURL(this.files[0]);
  sourceImage.src = sourceUrl;
  sourceImage.onload = () => {
    compress(this.files[0],sourceImage);
  }
})
 
$('input[type="range"]').each(function() {
  var name = $(this).attr("name");
  $(this).val(options[name])
  $(this).next().text(options[name])
  $(this).on("change", function(){
    options = Object.assign(options, {[name]: +$(this).val()});
    $(this).next().text(options[name])
    compress();
  })
})

function compress(file){
  file = file || lastFile;
  lastFile = file;
  console.log("compress")
  console.log(options)
  URL.revokeObjectURL($(".distImage img").attr("src"));
  URL.revokeObjectURL($(".sourceImage img").attr("src"));
  $(".distImage img").attr("src", "");
  $(".sourceImage img").attr("src", "");
  $(".distImage pre").text("");
  $(".sourceImage pre").text("");
  
  qiniu.compressImage(file, options).then(data => {
    $(".distImage img").attr("src", URL.createObjectURL(data.dist))
    $(".sourceImage img").attr("src", URL.createObjectURL(file));    
    $(".distImage pre").text("File size:" + (data.dist.size / 1024).toFixed(2) + "KB" + "\n" + "File type:" + data.dist.type + "\n" + "Dimensions:" + data.width + "*" + data.height + "\n" + "ratio:" + (data.dist.size / file.size).toFixed(2) * 100 + "%")
    $(".sourceImage pre").text("File size:" + (file.size / 1024).toFixed(2) + "KB" + "\n" + "File type:" + file.type + "\n" + "Dimensions:" + sourceImage.width + "*" + sourceImage.height)
  })
}