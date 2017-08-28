Vue.component('zone-list', {
  props: ['hostMap', 'currentZone', 'switchZone', 'selectedHost'],
  template: '<div class="uphosts-list"><ul><li v-for="item in hostMap" :class="{on: item.zone == currentZone}" @click="switchZone(item.zone)">{{item.zoneZh}}</li></ul><ul><li v-for="item in hostMap" :class="{on: item.zone == currentZone}"><label v-for="uphost in item.uphosts"><input type="radio" v-model="selectedHost.host" :value="uphost"/>{{uphost}}</label></li></ul></div>'
});
Vue.component('upload-performance', {
  props: ['per', 'warning'],
  template: '<div class="up-performance"><div class="per-title">上传耗时：<span class="warning" v-if="warning">您好，请使用谷歌、IE9+等高级浏览器获取更详细的数据！</span></div>' +
    '<table>' +
    '<tr><th>类型</th><th>耗时 / ms</th></tr>' +
    '<tr v-if="per.redirect != undefined"><td>重定向：</td><td>{{per.redirect | tofixed(2)}}</td></tr>' +
    '<tr v-if="per.domainLookup != undefined"><td>DNS 查询：</td><td>{{per.domainLookup | tofixed(2)}}</td></tr>' +
    '<tr v-if="per.connect != undefined"><td>建立连接：</td><td>{{per.connect | tofixed(2)}}</td></tr>' +
    '<tr v-if="per.request != undefined"><td>发送数据：</td><td>{{per.request | tofixed(2)}}</td></tr>' +
    '<tr v-if="per.response != undefined"><td>接收响应：</td><td>{{per.response | tofixed(2)}}</td></tr>' +
    '<tr v-if="per.duration != undefined"><td>总耗时：</td><td>{{per.duration | tofixed(2)}}</td></tr></table>' +
  '</div>'
});
Vue.component('up-headers', {
  props: ['headers'],
  template: '<div class="up-headers"><div class="per-title">响应头：</div><table><tr><th>类型</th><th>值</th></tr><tr v-for="header in headers"><td>{{header.key}}</td><td>{{header.val}}</td></tr></table></div>'
});
Vue.filter('tofixed', function (val, size) {
  return val.toFixed(size);
});

var app = new Vue({
  el: '#app',
  data: {
    currentZone: 'z0',
    selectedHost: {
      host: ''
    },
    currentToken: '',
    loadMessage: '',
    hostMap: [
      {
        zone: 'z0',
        zoneZh: '华东',
        token: 'xozWSPMxkMjIVoHg2JyXq4-7-oJaEADLOKHVR0vU:ImkQNYuzXd7mj_MJ-Ez3f0ojFhs=:eyJzY29wZSI6Impzc2RrOmEuanBnIiwiZGVhZGxpbmUiOjIxMTQzODA4MDAsImZzaXplTWluIjo4MDAwMDAsImZzaXplTGltaXQiOjEwMDAwMDB9',
        uphosts: [
          'http://up.qiniu.com',
          'http://upload.qiniu.com',
          'https://up.qbox.me',
          'https://upload.qbox.me'
        ]
      },
      {
        zone: 'z1',
        zoneZh: '华北',
        token: 'xozWSPMxkMjIVoHg2JyXq4-7-oJaEADLOKHVR0vU:mU26SwShCB0I-B1yCsO9-3bK82g=:eyJzY29wZSI6Impzc2RrLXoxOmEuanBnIiwiZGVhZGxpbmUiOjIxMTQzODA4MDAsImZzaXplTWluIjo4MDAwMDAsImZzaXplTGltaXQiOjEwMDAwMDB9',
        uphosts: [
          'http://up-z1.qiniu.com',
          'http://upload-z1.qiniu.com',
          'https://up-z1.qbox.me',
          'https://upload-z1.qbox.me'
        ]
      },
      {
        zone: 'z2',
        zoneZh: '华南',
        token: 'xozWSPMxkMjIVoHg2JyXq4-7-oJaEADLOKHVR0vU:iEkyIA0yoFKYS-SAihuyR3jPo50=:eyJzY29wZSI6Impzc2RrLXoyOmEuanBnIiwiZGVhZGxpbmUiOjIxMTQzODA4MDAsImZzaXplTWluIjo4MDAwMDAsImZzaXplTGltaXQiOjEwMDAwMDB9',
        uphosts: [
          'http://up-z2.qiniu.com',
          'http://upload-z2.qiniu.com',
          'https://up-z2.qbox.me',
          'https://upload-z2.qbox.me'
        ]
      },
      {
        zone: 'na0',
        zoneZh: '北美',
        token: 'xozWSPMxkMjIVoHg2JyXq4-7-oJaEADLOKHVR0vU:4iTbAdFUN_fV0IQdN5vJReR9fx0=:eyJzY29wZSI6Impzc2RrLW5hMDphLmpwZyIsImRlYWRsaW5lIjoyMTE0MzgwODAwLCJmc2l6ZU1pbiI6ODAwMDAwLCJmc2l6ZUxpbWl0IjoxMDAwMDAwfQ==',
        uphosts: [
          'http://up-na0.qiniu.com',
          'http://upload-na0.qiniu.com',
          'https://up-na0.qbox.me',
          'https://upload-na0.qbox.me'
        ]
      },
    ],
    isPerformanceSupported: true,
    performance: null,
    headers: null,
    timetags: {},
    totalBytes: 0
  },
  methods: {
    renderHtml: function() {},
    post: function(opt) {
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.open('POST', opt.url, true);
      xmlHttp.setRequestHeader('X-Qiniu-Performance', 'true');
      if (opt.headers) {
        for (var k in opt.headers) {
          xmlHttp.setRequestHeader(k, opt.headers[k]);
        }
      }
      xmlHttp.onreadystatechange = function () {
          if (xmlHttp.readyState == 4) {
            if (xmlHttp.status == 200) {
              opt.success && opt.success(xmlHttp);
            } else {
              opt.error && opt.error(xmlHttp.responseText);
            }
            opt.finally && opt.finally(xmlHttp.status, xmlHttp);
          }
      };
      xmlHttp.upload.onprogress = opt.progress;
      this.timetags.beginAjax = + new Date();
      xmlHttp.send(opt.data);
    },
    uploadTest: function() {
      if(!this.selectedHost.host) return;
      this.resetResult();
      var self = this;
      httpPerformance.clear();
      this.post({
        url: this.selectedHost.host,
        data: this.mockDate(),
        progress: function(e) {
          if (e.lengthComputable) {
            var percent = e.loaded/e.total*100;
            self.loadMessage = '模拟数据上传：' + e.loaded + " / " + e.total+" bytes  完成：" + percent.toFixed(2) + "%";
            if (percent === 100) {
              self.timetags.afterUpload = + new Date();
              self.totalBytes = e.total;
            }
          }
        },
        success: function(xhr) {
          self.formateHeader(xhr.getAllResponseHeaders());
        },
        error: function(res) {
          self.loadMessage = '上传失败：' + res;
        },
        finally: function(code, xhr) {
          self.timetags.afterAjax = + new Date();
          self.getPerformance();
          self.formateLog(code, xhr);
        }
      });
    },
    mockDate: function(size) {
      var f = new FormData(document.getElementById("testform"));
      f.append('file', this.dataURLtoBlob(this.randomBase64(size)));
      f.append('token', this.currentToken);
      return f;
    },
    randomBase64: function() {
      var dataurl = 'data:image/jpeg;base64,';
      var len = parseInt(Math.random()*(1330000-1100000+1)+1100000, 10);
      while (dataurl.length < len) {
        dataurl += Math.random > 0.5 ? '/9j/4AAQSkZJRgABAQAASABIAAD/4Q' : '/9j/4AAQSkZJRgABAQAASABIAAD/4W';
      }
      return dataurl;
    },
    dataURLtoBlob: function(dataurl) {
      var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while(n--){
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], {type:mime});
    },
    resetResult: function() {
      for (var i = 0; i < this.hostMap.length; i++) {
        if (this.hostMap[i].zone === this.currentZone) {
          this.currentToken = this.hostMap[i].token;
          break;
        }
      }
      this.performance = null;
      this.headers = null;
      this.timetags = {};
    },
    switchZone: function(zone) {
      this.currentZone = zone;
      this.selectedHost.host = '';
    },
    getPerformance: function() {
      if (this.isPerformanceSupported) {
        var per = httpPerformance.getByName(this.selectedHost.host + '/');
        if(per.length == 2) {
          per[1].redirect = per[0].redirect;
          per[1].domainLookup = per[0].domainLookup;
          per[1].connect = per[0].connect;
        }
        this.performance = per[1] || per[0]; // 跨域有时候会先发送一个 option 请求，并不是真的上传请求。
      } else {
        this.performance = {
          request: this.timetags.afterUpload - this.timetags.beginAjax,
          response: this.timetags.afterAjax - this.timetags.afterUpload,
          duration: this.timetags.afterAjax - this.timetags.beginAjax
        };
      }
    },
    formateHeader: function(headers) {
      var list = [];
      headers.match(/.+/mg).map(function(item) {
        var index = item.indexOf(':');
        var o = {
          key: item.substr(0, index),
          val: item.substr(index + 1)
        };
        list.push(o);
      });
      this.headers = list;
    },
    formateLog: function(code, xhr) {
      // status_code,req_id,host,remote_ip,port,duration,up_time,bytes_sent,up_type
      headers = xhr.getAllResponseHeaders();
      var req_id = headers.match(/X-Reqid:\s*(\w+)/);
      if (req_id && req_id.length === 2) req_id = req_id[1];
      var host = this.selectedHost.host;
      var port = 80;
      if (host) {
        if (host.indexOf('https') > -1) port = 443;
        host = host.split('//')[1];
      }
      remote_ip = headers.match(/X-Forwarded-For:[^,]+,\s*([^,]+)/);
      if (remote_ip && remote_ip.length === 2) remote_ip = remote_ip[1];
      var duration = this.performance.duration.toFixed(2);
      var up_time = this.timetags.beginAjax.toString().slice(0,-3);
      var bytes_sent = this.totalBytes;
      var log = [code, req_id, host, remote_ip, port, duration, up_time, bytes_sent, 'jsperf'];
      this.sendLog(log);
    },
    sendLog: function(log) {
      this.post({
        url: 'https://uplog.qbox.me/log/2',
        data: log.join(','),
        headers: {
          'Authorization': 'UpToken xozWSPMxkMjIVoHg2JyXq4-7-oJaEADLOKHVR0vU:iEkyIA0yoFKYS-SAihuyR3jPo50=:eyJzY29wZSI6Impzc2RrLXoyOmEuanBnIiwiZGVhZGxpbmUiOjIxMTQzODA4MDAsImZzaXplTWluIjo4MDAwMDAsImZzaXplTGltaXQiOjEwMDAwMDB9'
        }
      });
    }
  },
  created: function() {
    this.isPerformanceSupported = !!(window.performance && window.performance.getEntries);
  }
});


