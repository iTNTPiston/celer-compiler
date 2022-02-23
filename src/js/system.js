//A dummy impl of SystemJS
var exports = { };
var System = {
    register: function(_, callback) {
        var module = callback(function(name, val){ exports[name] = val; });
        module.execute();
    }
}


// Expose bundler
var bundler = function() { return exports["default"]; };