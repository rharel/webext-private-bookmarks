export default {
    sourceDir: "./build/",
    artifactsDir: "./distribution/",
    build: {
        overwriteDest: true,
    },
    run: {
        startUrl: ["about:debugging#/runtime/this-firefox"],
    },
};
