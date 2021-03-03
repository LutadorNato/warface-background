// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Menu, Tray } = require("electron");
const path = require("path");
const fs = require("fs");
const wallpaper = require("wallpaper");
const axios = require("axios");
const AutoLaunch = require("auto-launch");
const Store = require("electron-store");

const store = new Store();

const DIR_WB = path.join(app.getPath("home"), "WarfaceBackground");

let tray = null;
let mainWindow = null;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, "assets", "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setResizable(false);
  mainWindow.setMenuBarVisibility(false);

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  mainWindow.on("restore", () => {
    mainWindow.setSkipTaskbar(false);
  });

  mainWindow.on("minimize", () => {
    mainWindow.setSkipTaskbar(true);
  });

  if (process.argv.includes("--hidden")) {
    mainWindow.minimize();
  }

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  tray = new Tray(path.join(__dirname, "assets", "logo.png"));
  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        mainWindow.restore();
      },
    },
    {
      label: "Quit",
      role: "quit",
      click: () => {
        mainWindow.quit();
      },
    },
  ]);
  tray.setToolTip("Warface Background");
  tray.setContextMenu(trayMenu);
  tray.on("click", function (e) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  createWindow();

  let autoLaunch = new AutoLaunch({
    name: "Warface Background",
    path: app.getPath("exe"),
    isHidden: true,
  });
  autoLaunch.isEnabled().then((isEnabled) => {
    if (!isEnabled) autoLaunch.enable();
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

/* ============================================================
  Function: Download Image
============================================================ */

const downloadImage = (url, image_path) =>
  axios({
    url,
    responseType: "stream",
  }).then(
    (response) =>
      new Promise((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(image_path))
          .on("finish", () => resolve())
          .on("error", (e) => reject(e));
      })
  );

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on("background", async (event, url) => {
  let latest = store.get("latest");

  if (!fs.existsSync(DIR_WB)) fs.mkdirSync(DIR_WB);

  if (latest) {
    let default_dir = path.join(DIR_WB, "default" + path.extname(url));
    await downloadImage(url, default_dir);
    await wallpaper.set(default_dir);
  }

  event.reply("background-reply", latest);
});

ipcMain.on("getBackgrouds", async (event, arg) => {
  if (arg == "get") {
    axios
      .get("https://ru.warface.com/dynamic/slider/?a=mainjson2")
      .then((response) => {
        if (response.data && response.data.results.wallpapers)
          event.reply("getBackgrouds-reply", response.data.results.wallpapers);
      })
      .catch(function (error) {
        event.reply("getBackgrouds-reply", null);
      });
  }
});

ipcMain.on("setBackgroud", async (event, url) => {
  let default_dir = path.join(DIR_WB, "default" + path.extname(url));
  await downloadImage(url, default_dir);
  await wallpaper.set(default_dir);
  event.reply("setBackgroud-reply", true);
});

ipcMain.on("setLatest", async (event, data) => {
  store.set("latest", data);
  event.reply("setLatest-reply", data);
});
