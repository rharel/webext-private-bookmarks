module.exports = {
    sourceDir: "./build/",
    artifactsDir: "./distribution/",
    build: {
        overwriteDest: true,
    },
    run: {
        startUrl: ["about:addons", "about:debugging"],
    },
};
