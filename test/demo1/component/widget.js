(function(global) {
  function widget() {
    this.widget = {};
  }

  widget.prototype.register = function(name, component) {
    this.widget[name] = component;
  };
  widget.prototype.add = function(name, obj) {
    if (this.widget[name]) {
      this.widget[name].node = obj.node;
      return this.widget[name].init(obj);
    }
    return false;
  };
  global.widget = new widget();
})(window);
