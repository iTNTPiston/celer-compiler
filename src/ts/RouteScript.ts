const VERSION = "0.0.0" as const;

export type RouteScript = {
    compilerVersion: typeof VERSION,
    Project: {
        Name: string,
        Author: string,
        Version: string,
        Description: string,
    },
    Configuration: {
        Formats: {

        },
        Colors: {

        }
    },
    Route: RouteScriptSection[],
}

type UnbundledRouteScript = Omit<RouteScript, "compilerVersion"> & {
    [key: string]: RouteScriptSection | RouteScriptStep
};

//should only have one key
export type RouteScriptSection = RouteScriptStep | {
    [Section: string]: RouteScriptStep[]
}

export type RouteScriptStep = string | RouteScriptStepObject;

//should only have one key
export type RouteScriptStepObject = {
    [StepString: string]: RouteScriptExtend
}

export type RouteScriptExtend = {
    text?: string,
	icon?: string,
	comment?: string,
}

class RouteScriptBundler {
    bundle(script: UnbundledRouteScript): RouteScript {
        return {
            compilerVersion: VERSION,
            Project: script.Project,
            Configuration: {
                Formats: {

                },
                Colors: {

                }
            },
            Route: [
                ...script.Route,
                {
                    "Test Extra Section": ["say what"]
                }
            ]
        }
    }
}

export default new RouteScriptBundler();