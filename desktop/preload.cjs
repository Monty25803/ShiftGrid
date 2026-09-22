const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("shiftgridDesktop", {
  isDesktop: true,
  platform: process.platform,
});
