import yaml
import dukpy
import sys
import json

def __main__():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input> ")
        sys.exit(1)

    inputFile = sys.argv[1]
    print(f"Bundling... {inputFile}")
    rebuild(inputFile)

def rebuild(inputFile):
    with open(inputFile, "r") as f:
        obj = yaml.load(f, Loader=yaml.FullLoader)
        print(obj)
    bundled = bundle(obj)
    with open("bundle.json", "w+") as out:
        json.dump(bundled, out)
    print(f"Emitted bundle.json")

def bundle(obj):
# JS_INJECT_NEXT_LINE
    return dukpy.evaljs("""//A dummy impl of SystemJS
 var exports = { };
 var System = {
     register: function(_, callback) {
         var module = callback(function(name, val){ exports[name] = val; });
         module.execute();
     }
 }
 
 
 // Expose bundler
 var bundler = function() { return exports["default"]; };System.register([], function(exports_1) {
    var RouteScriptBundler;
    return {
        setters:[],
        execute: function() {
            RouteScriptBundler = (function () {
                function RouteScriptBundler() {
                }
                RouteScriptBundler.prototype.bundle = function (script) {
                    return {
                        Project: script.Project,
                        Configuration: {
                            Formats: {},
                            Colors: {}
                        },
                        Route: script.Route
                    };
                };
                return RouteScriptBundler;
            })();
            exports_1("default",new RouteScriptBundler());
        }
    }
});
// Input JSON passed from python
 bundler().bundle(dukpy.input);
""", input=obj)

__main__()

    