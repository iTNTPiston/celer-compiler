# build.py: A compiler for the compiler
import dukpy

JS_INJECT = "\"JS_INJECT\""
JS_INJECT_NEXT_LINE = "# JS_INJECT_NEXT_LINE"

with open('src/ts/RouteScript.ts', "r") as tsSrc:
    print("Compiling...")
    bundlerJs = dukpy.typescript_compile(" ".join(line for line in tsSrc)  )

with open('src/js/system.js', "r") as systemSrc:
    systemJs = " ".join(line for line in systemSrc)

with open('src/js/invoke.js', "r") as invokeSrc:
    invokeJs = " ".join(line for line in invokeSrc)

jsCode = systemJs + bundlerJs + invokeJs

for pyFile in ["bundle.py", "bundle-watch.py"]:
    with open(f'src/py/{pyFile}', "r") as pySrc:
        pyLines = pySrc.readlines()
        print(f"Injecting... {pyFile}")
        outLines = []
        inject = False
        for l in pyLines:
            if inject:
                l = l.replace(JS_INJECT, f"\"\"\"{jsCode}\"\"\"")
                inject = False
            if l.strip() == JS_INJECT_NEXT_LINE:
                inject = True
            outLines.append(l)
    with open(f"g{pyFile}", "w+") as pyOut:
        print("Emitting...")
        pyOut.writelines(outLines)

