Qiniu.prototype.watermark = function(first_argument) {
    // body...
};


Qiniu.prototype.imageView = function(op) {
    var url = op.url || '',
        mode = op.mode || '',
        w = op.width || '',
        h = op.height || '',
        q = op.quality || '',
        format = op.format || '';
    if (!mode || !url) {
        return false;
    }
    if (!w && !h) {
        return false;
    }

    var imageUrl = '';
    imageUrl += url + '?imageView2/' + mode;
    imageUrl += w ? '/w/' + w : '';
    imageUrl += h ? '/h/' + h : '';
    imageUrl += q ? '/q/' + q : '';
    imageUrl += format ? '/format/' + format : '';

    return imageUrl;
};


Qiniu.prototype.imagemogr = function(op) {

    // mageMogr2/auto-orient
    //           /thumbnail/<imageSizeGeometry>
    //           /strip
    //           /gravity/<gravityType>
    //           /crop/<imageSizeAndOffsetGeometry>
    //           /quality/<imageQuality>
    //           /rotate/<rotateDegree>
    //           /format/<destinationImageFormat>

    var url = op.url || '',
        auto_orient = op['auto-orient'] || '',
        thumbnail = op.thumbnail || '',
        strip = op.strip || '',
        gravity = op.gravity || '',
        crop = op.crop || '',
        quality = op.quality || '',
        rotate = op.rotate || '',
        format = op.format || '';
    if (!mode || !url) {
        return false;
    }
    if (!w && !h) {
        return false;
    }

    var imageUrl = '';
    imageUrl += url + '?imageMogr2/' + auto_orient;
    imageUrl += thumbnail ? '/thumbnail/' + thumbnail : '';
    imageUrl += strip ? '/strip/' + strip : '';
    imageUrl += crop ? '/crop/' : '';
    imageUrl += quality ? '/quality/' + quality : '';
    imageUrl += rotate ? '/rotate/' + rotate : '';
    imageUrl += format ? '/format/' + format : '';


    return imageUrl;
};
