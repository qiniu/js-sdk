 /* global URLSafeBase64Encode */
 /* global Qiniu */
 /* global createAjax */

 Qiniu.prototype.getUrl = function(key) {
     if (!key) {
         return false;
     }
     key = encodeURI(key);
     var domain = this.domain;
     if (domain.slice(domain.length - 1) !== '/') {
         domain = domain + '/';
     }
     return domain + key;
 };

 Qiniu.prototype.imageView2 = function(op, key) {
     var mode = op.mode || '',
         w = op.w || '',
         h = op.h || '',
         q = op.quality || '',
         format = op.format || '';
     if (!mode) {
         return false;
     }
     if (!w && !h) {
         return false;
     }

     var imageUrl = 'imageView2/' + mode;
     imageUrl += w ? '/w/' + w : '';
     imageUrl += h ? '/h/' + h : '';
     imageUrl += q ? '/q/' + q : '';
     imageUrl += format ? '/format/' + format : '';
     if (key) {
         imageUrl = this.getUrl(key) + '?' + imageUrl;
     }
     return imageUrl;
 };


 Qiniu.prototype.imageMogr2 = function(op, key) {

     // mageMogr2/auto-orient
     //           /thumbnail/<imageSizeGeometry>
     //           /strip
     //           /gravity/<gravityType>
     //           /crop/<imageSizeAndOffsetGeometry>
     //           /quality/<imageQuality>
     //           /rotate/<rotateDegree>
     //           /format/<destinationImageFormat>

     var auto_orient = op['auto-orient'] || '',
         thumbnail = op.thumbnail || '',
         strip = op.strip || '',
         gravity = op.gravity || '',
         crop = op.crop || '',
         quality = op.quality || '',
         rotate = op.rotate || '',
         format = op.format || '';
     if (!auto_orient) {
         return false;
     }
    // if (crop.indexOf('!') === -1 || (crop.indexOf('a') === -1) && (crop.indexOf('-') === -1)) {
    //     return false;
    // }
     //Todo check option

     var imageUrl = auto_orient ? 'imageMogr2' + '/auto-orient' : '';
     imageUrl += thumbnail ? '/thumbnail/' + thumbnail : '';
     imageUrl += strip ? '/strip' : '';
     imageUrl += gravity ? '/gravity/' + gravity : '';
     imageUrl += quality ? '/quality/' + quality : '';
     imageUrl += crop ? '/crop/' + crop : '';
     imageUrl += rotate ? '/rotate/' + rotate : '';
     imageUrl += format ? '/format/' + format : '';

     if (key) {
         imageUrl = this.getUrl(key) + '?' + imageUrl;
     }
     return imageUrl;
 };

 Qiniu.prototype.watermark = function(op, key) {

     var mode = op.mode;
     if (!mode) {
         return false;
     }

     var imageUrl = 'watermark/' + mode;

     if (mode === 1) {
         var image = op.image || '';
         if (!image) {
             return false;
         }
         imageUrl += image ? '/image/' + URLSafeBase64Encode(image) : '';
     } else if (mode === 2) {
         var text = op.text ? op.text : '',
             font = op.font ? op.font : '',
             fontsize = op.fontsize ? op.fontsize : '',
             fill = op.fill ? op.fill : '';
         if (!text) {
             return false;
         }
         imageUrl += text ? '/text/' + URLSafeBase64Encode(text) : '';
         imageUrl += font ? '/font/' + URLSafeBase64Encode(font) : '';
         imageUrl += fontsize ? '/fontsize/' + fontsize : '';
         imageUrl += fill ? '/fill/' + URLSafeBase64Encode(fill) : '';
     } else {
         // Todo mode3
         return false;
     }

     var dissolve = op.dissolve || '',
         gravity = op.gravity || '',
         dx = op.dx || '',
         dy = op.dy || '';

     imageUrl += dissolve ? '/dissolve/' + dissolve : '';
     imageUrl += gravity ? '/gravity/' + gravity : '';
     imageUrl += dx ? '/dx/' + dx : '';
     imageUrl += dy ? '/dy/' + dy : '';

     if (key) {
         imageUrl = this.getUrl(key) + '?' + imageUrl;
     }
     return imageUrl;

 };

 Qiniu.prototype.imageInfo = function(key) {
     if (!key) {
         return false;
     }
     var url = this.getUrl(key) + '?imageInfo';
     var xhr = createAjax();
     var info;
     xhr.open('GET', url, false);
     xhr.onreadystatechange = function() {
         if (xhr.readyState === 4 && xhr.status === 200) {
             info = $.parseJSON(xhr.responseText);
         }
     };
     xhr.send();
     return info;
 };


 Qiniu.prototype.exif = function(key) {
     if (!key) {
         return false;
     }
     var url = this.getUrl(key) + '?exif';
     var xhr = createAjax();
     var info;
     xhr.open('GET', url, false);
     xhr.onreadystatechange = function() {
         if (xhr.readyState === 4 && xhr.status === 200) {
             info = $.parseJSON(xhr.responseText);
         }
     };
     xhr.send();
     return info;
 };

 Qiniu.prototype.get = function(type, key) {
     if (!key || !type) {
         return false;
     }
     if (type === 'exif') {
         return this.exif(key);
     } else if (type === 'imageInfo') {
         return this.imageInfo(key);
     }
     return false;
 };


 Qiniu.prototype.pipeline = function(arr, key) {

     var isArray = Object.prototype.toString.call(arr) === '[object Array]';
     var option, errOp, imageUrl = '';
     if (isArray) {
         for (var i = 0, len = arr.length; i < len; i++) {
             option = arr[i];
             if (!option.fop) {
                 return false;
             }
             switch (option.fop) {
                 case 'watermark':
                     imageUrl += this.watermark(option) + '|';
                     break;
                 case 'imageView2':
                     imageUrl += this.imageView2(option) + '|';
                     break;
                 case 'imageMogr2':
                     imageUrl += this.imageMogr2(option) + '|';
                     break;
                 default:
                     errOp = true;
                     break;
             }
             if (errOp) {
                 return false;
             }
         }
         if (key) {
             imageUrl = this.getUrl(key) + '?' + imageUrl;
             var length = imageUrl.length;
             if (imageUrl.slice(length - 1) === '|') {
                 imageUrl = imageUrl.slice(0, length - 1);
             }
         }
         return imageUrl;
     }
     return false;
 };
