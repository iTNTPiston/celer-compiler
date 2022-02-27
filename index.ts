// Expose types and functions to engine side
export type {
    RouteScript,
    RouteMetadata,
    RouteSection,
    RouteModule,
    RouteStep,
    RouteScriptExtend,
} from "./src/ts/RouteScript";
export {
    TARGET_VERSION,
    switchSection,
    switchModule,
    switchStep
} from "./src/ts/RouteScript";

