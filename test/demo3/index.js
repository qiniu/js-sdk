
var lastFile = null;
var options = {
  quality: 0.92,
  maxWidth: 1000,
  maxHeight: 618
}
$("#select").change(function(){
  options.outputType = this.files[0].type;
  console.log(options)
  compress(this.files[0]);
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
  var compression = new qiniu.Compress(options);
  URL.revokeObjectURL($(".distImage img").attr("src"));
  URL.revokeObjectURL($(".sourceImage img").attr("src"));
  $(".distImage img").attr("src", "");
  $(".sourceImage img").attr("src", "");
  $(".distImage pre").text("");
  $(".sourceImage pre").text("");
  compression.process(file).then(data => {
    $(".distImage img").attr("src", URL.createObjectURL(data.dist.blob))
    $(".sourceImage img").attr("src", URL.createObjectURL(data.source.blob));
    $(".distImage pre").text("File size:" + (data.dist.blob.size / 1024).toFixed(2) + "KB" + "\n" + "File type:" + data.dist.blob.type + "\n" + "Dimensions:" + data.dist.width + "*" + data.dist.height + "\n" + "ratio:" + (data.dist.blob.size / data.source.blob.size).toFixed(2) * 100 + "%")
    $(".sourceImage pre").text("File size:" + (data.source.blob.size / 1024).toFixed(2) + "KB" + "\n" + "File type:" + data.source.blob.type + "\n" + "Dimensions:" + data.source.width + "*" + data.source.height)
  })
}