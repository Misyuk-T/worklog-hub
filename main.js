const { app, BrowserWindow } = require("electron");
const electron = require("electron");
const path = require("path");

const server = require("./server");

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,
      hardwareAcceleration: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });

  // Load the app through your Express server (e.g., running on http://localhost:8000)
  mainWindow.loadURL("http://localhost:8000");
};

server();

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  app.quit();
});

process.on("SIGTERM", () => {
  app.quit();
});
