import DocsManager from "./DocsManager";

const blacklisted = new Set(["docs", "gh-pages"]);

export default new DocsManager({
    id: "main",
    name: "Main",
    global: "JerichoPlayer",
    repo: "SidisLiveYT/Jericho-Player",
    defaultTag: "main",
    docsBranch: "docs",
    branchFilter: (branch) => !blacklisted.has(branch) && !branch.startsWith("dependabot/"),
    tagFilter: () => false
});
