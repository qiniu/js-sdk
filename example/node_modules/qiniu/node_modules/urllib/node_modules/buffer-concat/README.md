buffer-concat [![Build Status](https://secure.travis-ci.org/fengmk2/buffer-concat.png)](http://travis-ci.org/fengmk2/buffer-concat)
=============

concat patch for Buffer in node &lt; 0.8.

## Install

```bash
$ npm install formstream
```

## Usage

```js
// require before you use Buffer.concat
require('buffer-concat');

var b1 = new Buffer('Hello');
var b2 = new Buffer(' world');
var b3 = Buffer.concat([b1, b2]);
console.log(b3.toString());

// for datas concat
var http = require('http');
var options = {
  host: 'cnodejs.org'
};
http.get(options, function (res) {
  var chunks = [];
  var size = 0;
  res.on('data', function (chunk) {
    size += chunk.length;
    chunks.push(chunk);
  });
  res.on('end', function () {
    var data = Buffer.concat(chunks, size);
    console.log(data.toString());
  });
});
```

## License 

(The MIT License)

Copyright (c) 2012 fengmk2 &lt;fengmk2@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.