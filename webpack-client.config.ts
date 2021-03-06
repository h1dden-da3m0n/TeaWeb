import * as path from "path";
import * as config_base from "./webpack.config";

export = () => config_base.config("client").then(config => {
    Object.assign(config.entry, {
        "client-app": "./client/js/index.ts"
    });

    Object.assign(config.resolve.alias, {
        "tc-shared": path.resolve(__dirname, "shared/js"),
        /* backend hasn't declared but its available via "require()" */
        "tc-backend": path.resolve(__dirname, "shared/backend.d"),
    });

    config.externals.push((context, request: string, callback) => {
        if (request.startsWith("tc-backend/"))
            return callback(null, `window["backend-loader"].require("${request}")`);
        callback();
    });

    return Promise.resolve(config);
});