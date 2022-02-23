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
    return dukpy.evaljs("JS_INJECT", input=obj)

__main__()

    