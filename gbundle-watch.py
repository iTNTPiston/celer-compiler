import yaml
import dukpy
import sys
import json
import time

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import http.server
import socketserver
class HTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self,path):
        print(path)
        return "/bundle.json"

class Handler(FileSystemEventHandler):
    def __init__(self, inputFile):
        self.inputFile = inputFile
    def on_any_event(self, event):
        print(event)
        if not event.src_path.endswith("bundle.json"):
            print(f"Rebundling... {self.inputFile}")
            rebuild(self.inputFile)

def __main__():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <input> [<port>]")
        sys.exit(1)

    inputFile = sys.argv[1]
    port = 2222

    if len(sys.argv) > 2:
        port = int(sys.argv[2])
    else:
        print(f"Using default port {port}")
    print(f"Bundling... {inputFile}")
    rebuild(inputFile)

    event_handler = Handler(inputFile)
    observer = Observer()
    observer.schedule(event_handler, ".", recursive=True)
    observer.start()
    print("Start watching changes")

    with socketserver.TCPServer(("", port), HTTPRequestHandler) as httpd:
        print("Hosting bundle.json at localhost:" + str(port))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Stopping...")
    
    observer.stop()
    print("Stopped watching for changes")
    observer.join()


def rebuild(inputFile):
    with open(inputFile, "r") as f:
        obj = yaml.load(f, Loader=yaml.FullLoader)

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

    