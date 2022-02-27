// Target compiler version
const TARGET_VERSION = "1.0.0" as const;

// Bundled Route script. This is what the engine side receives
export type RouteScript = {
    compilerVersion: typeof TARGET_VERSION,
    Project: RouteMetadata,
    Route: RouteSection[],
}

// Metadata containing project info
export type RouteMetadata = {
    Name: string,
    Authors: string[],
    Url: string,
    Version: string,
    Description: string,
}

// Unbundled route script is what the bundler receives
// The bundler processes __use__ directives and remove unused modules
const __use__ = "__use__";
type UnbundledRouteScript = Omit<RouteScript, "compilerVersion"> & {
    [key: string]: RouteModule
};


export type RouteSection = RouteModule | SingleProperty<RouteModule>
export type RouteModule = RouteStep | RouteStep[];
export type RouteStep = string | SingleProperty<RouteScriptExtend>;
export type RouteScriptExtend = {
    text?: string,
	icon?: string,
	comment?: string,

    coord?: [number, number],//simple way to specify a movement (becomes to: coord, isWarp: false, isAway: false)
}
//should only have one key
type SingleProperty<T> = {
    [key: string]: T
} 

// Helper functions to encapsulate error handling when parsing route script

export const switchSection = <T>(
    section: RouteSection,
    moduleHandler: (name: string | undefined, m: RouteModule)=>T,
    errorHandler: (error: string)=>T
):T => {
    if(!section){
        return errorHandler("Not a valid section: "+ section);
    }
    if(typeof section === "object" && !Array.isArray(section)){
        const [name, module] = switchSinglePropertyObject<RouteModule|RouteScriptExtend, [string|undefined, RouteModule | undefined]>(section, (name, moduleOrExtend)=>{
            // Need to further determine if module is a module or actually extend..
            if(name.length > 0 && name[0] === "_"){
                // if name starts with underscore, treat it as a step
                return [undefined, section as RouteModule];
            }
            // Otherwise treat as section
            return [name, moduleOrExtend as RouteModule];
        }, (errorString)=>{
            return [errorString, undefined];
        });
        if(!module){
            return errorHandler(name);
        }
        return moduleHandler(name, module as RouteModule);
    }
    //If falls through, must be unnamed section (section is a module)
    return moduleHandler(undefined, section as RouteModule);
}

export const switchModule = <T>(
    module: RouteModule, 
    stringHandler: (m: string)=>T, 
    extendHandler: (preset: string, extend: RouteScriptExtend)=>T,
    arrayHandler: (array: RouteStep[])=>T,
    errorHandler: (error: string)=>T
): T => {
    if (typeof module === "string"){
        return stringHandler(module);
    }
    if(!module){
        return errorHandler("Not a valid step: " + JSON.stringify(module));
    }
    if (Array.isArray(module)){
        return arrayHandler(module);
    }
    return switchSinglePropertyObject<RouteScriptExtend, T>(module, extendHandler, errorHandler);

}

export const switchStep = <T>(
    step: RouteStep,
    stringHandler: (m: string)=>T, 
    extendHandler: (preset: string, extend: RouteScriptExtend)=>T,
    errorHandler: (error: string)=>T
):T => {
    if (typeof step === "string"){
        return stringHandler(step);
    }
    if(!step){
        return errorHandler("Not a valid step: " + JSON.stringify(step));
    }
    if (Array.isArray(step)){
        return errorHandler("Step cannot be an array: " + JSON.stringify(step));
    }
    return switchSinglePropertyObject<RouteScriptExtend, T>(step, extendHandler, errorHandler);
}
 
const switchSinglePropertyObject = <T, R>(
    spo: SingleProperty<T>,
    okHandler: (key: string, value: T)=>R,
    errorHandler: (error: string)=>R
): R => {
    if(!spo || typeof spo !== "object"){
        return errorHandler("Not a valid step: " + JSON.stringify(spo));
    }
    const keys = Object.keys(spo);
    if (keys.length !== 1){
        return errorHandler("A valid step must have exactly 1 key, received: " + JSON.stringify(spo));
    }
    const key = keys[0];
    return okHandler(key, spo[key]);
}

// Debug switch. Only works on bundler side
const ENABLE_DEBUG = false;
let debugInfo: any[] = [];

class RouteScriptBundler {
    bundle(script: UnbundledRouteScript): RouteScript {
        return {
            compilerVersion: TARGET_VERSION,
            Project: this.ensureProject(script),
            Route: this.bundleRoute(script, script.Route)
        }
    }
    private ensureProject(script: UnbundledRouteScript): RouteMetadata {
        const project = {
            Name: "Untitled Project",
            Authors: [],
            Url: "",
            Version: "Unknown",
            Description: "No Description",
        };

        if(script.Project){
            // Spread expression is not parsable in dukpy so here's the workaround
            if(script.Project.Name){
                project.Name = script.Project.Name;
            }
            if(script.Project.Authors){
                project.Authors = script.Project.Authors;
            }
            if(script.Project.Url){
                project.Url = script.Project.Url;
            }
            if(script.Project.Version){
                project.Version = script.Project.Version;
            }
            if(script.Project.Description){
                project.Description = script.Project.Description;
            }
        }
        return project;
    }

    private bundleRoute(script: UnbundledRouteScript, route: RouteSection[]): RouteSection[]{
        // Make sure route is actually an array
        if(!Array.isArray(route)){
            return ["(!=) Bundler Error: Route property must be an array"];
        }
        // First scan dependencies
        const dependency: {[name: string]: string[]} = {};

        route.forEach(section=>{
            switchSection(section,
                (_, module)=>{
                    this.scanDependencyForModule(dependency, "Route", module);
                },()=>{
                    // Do not process dependency if error
                });
        });

        for(const key in script){
            if(key !== "Project" && key !== "Configuration" && key !== "Route"){
                this.scanDependencyForModule(dependency, key, script[key]);
            }
        }
        // DFS to ensure no circular dependencies
        const circularDependency = this.ensureNoCircularDependency(dependency, "Route", ["Route"]);
        if(circularDependency){
            return ["(!=) Bundler Error: Circular dependency is detected, so the route is not processed. Please check all your __use__ directives to make sure there is no circular dependencies. Path hit: "+circularDependency];
        }

        const cache: {[key: string]: RouteModule} = {};
        const bundled = this.bundleSections(script, route, cache);
        //debug trace
        if(ENABLE_DEBUG){
            bundled.push(JSON.stringify(cache));
            bundled.push(JSON.stringify(debugInfo));
        } 
        return bundled;
    }

    private scanDependencyForModule(dependency: {[name: string]: string[]}, name: string, module: RouteModule): void {
        switchModule(module,
            (stringModule)=>{
                this.scanDependencyForStringStep(dependency, name, stringModule);
            },()=>{
                // Ignore preset extend
            },(arrayModule)=>{
                arrayModule.forEach(s=>{
                    switchStep(s, (stringStep)=>{
                        this.scanDependencyForStringStep(dependency, name, stringStep);
                    },()=>{
                        // Ignore preset extend
                    },()=>{
                        // Do not process dependency if error
                    });
                });
            },()=>{
                // Do not process dependency if error
            });
    }

    private scanDependencyForStringStep(dependency: {[name: string]: string[]}, name: string, step: string): void{
        const dep = this.getModuleNameFromStep(step);
        if(dep){
            if(!dependency[name]){
                dependency[name] = [];
            }
            dependency[name].push(dep);
        }
    }

    private ensureNoCircularDependency(dependency: {[name: string]: string[]}, name: string, searchPath: string[]): string | undefined {
        if(!dependency[name]){
            //has no dependency
            return undefined;
        }
        for(let i = 0;i < dependency[name].length; i++){
            const next = dependency[name][i];
            // Make sure next is not already hit
            for(let j = 0; j<searchPath.length;j++){
                if(next === searchPath[j]){
                    return searchPath.join(" -> ")+" -> "+next;
                }
            }
            // put next on stack
            searchPath.push(next);
            const recurResult = this.ensureNoCircularDependency(dependency, next, searchPath);
            if(recurResult){
                return recurResult;
            }
            searchPath.pop();
        }
        return undefined;
    }
    private bundleSections(script: UnbundledRouteScript, sections: RouteSection[], cache: {[key: string]: RouteModule}): RouteSection[] {
        const returnArray: RouteSection[] = [];
        sections.forEach(section=>{
            switchSection(section,
                (name, module)=>{
                    debugInfo.push(module);
                    const bundledModule = this.bundleModule(script, undefined, cache, module);
                    if(name){
                        returnArray.push({[name]: bundledModule});
                    }else{
                        //Flatten the array if it is an array
                        switchModule(bundledModule,
                            (stringModule)=>{
                                returnArray.push(stringModule);
                            },(preset, extend)=>{
                                returnArray.push({[preset]: extend});
                            },(arrayModule)=>{
                                arrayModule.forEach(m=>returnArray.push(m));
                            },(errorString)=>{
                                returnArray.push("(!=) Bundler Error: Error when bundling " + JSON.stringify(module) + ". Caused by: "+errorString);
                        })
                    }
                },(errorString)=>{
                    "(!=) Bundler Error: Error when bundling section " + JSON.stringify(section) + ". Caused by: "+errorString;
                });
        });
        return returnArray;
        
    }

    private bundleModule(script: UnbundledRouteScript, name: string|undefined, cache: {[key: string]: RouteModule}, unbundledModule?: RouteModule):RouteModule {
        if(name && cache[name]){
            //Cache hit, return cached module
            return cache[name];
        }
        // Cache miss, get unbundled from script
        if(name){
            if(script[name] !== undefined){
                unbundledModule = script[name];
            }else{
                unbundledModule = "(!=) Bundler Error: Cannot find module "+name ;
            }
        }else if (!unbundledModule){
            unbundledModule = "(!=) Bundler Error: Illegal Invocation of bundledModule(): Both name and unbundledModule are undefined. This is likely a bug in the bundler.";
        }
        const bundledModule = switchModule(unbundledModule,
            (stringModule)=>{
                if(stringModule.trim().substring(0, 7) === "__use__"){
                    const moduleName = stringModule.substring(7).trim();
                    return this.bundleModule(script, moduleName, cache);
                }else{
                    return stringModule;
                }
            },(preset, extend)=>{
                // No action here
                return {
                    [preset]: extend
                };
            },(arrayModule)=>{
                const returnArray: RouteStep[] = [];
                arrayModule.forEach(s=>{
                    switchStep(s,
                        (stringStep)=>{
                            const moduleName = this.getModuleNameFromStep(stringStep);
                            if(moduleName){
                                const bundledModule = this.bundleModule(script, moduleName, cache);
                                switchModule(bundledModule,
                                    (stringModule)=>{
                                        returnArray.push(stringModule);
                                    },(preset, extend)=>{
                                        returnArray.push({[preset]: extend});
                                    },(arrayModule)=>{
                                        // Flatten the array
                                        arrayModule.forEach(m=>returnArray.push(m));
                                    },(errorString)=>{
                                        returnArray.push("(!=) Bundler Error: Unexpected @279. Please contact developer. Message: "+errorString);
                                    })
                            }else{
                                returnArray.push(stringStep);
                            }
                        },(preset, extend)=>{
                            returnArray.push({[preset]: extend});
                        },(errorString)=>{
                            arrayModule.push("(!=) Bundler Error: Error when bundling " + JSON.stringify(s) + ". Caused by: "+errorString);
                        });
                });
                return returnArray;
            },(errorString)=>{
                return "(!=) Bundler Error: Error when bundling module with name " + name + ". Caused by: "+errorString;
            });
        
        if(name){
            cache[name] = bundledModule;
        }
        return bundledModule;
    }

    private getModuleNameFromStep(step: string): string | undefined {
        if(step.trim().substring(0, 7) === __use__){
            return step.substring(7).trim();
        }
        return undefined;
    }
}

export default new RouteScriptBundler();