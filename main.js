const electron = require("electron");
const url = require("url");
const path = require("path");
const { BrowserWindow, Menu } = require("electron");

const { app } = electron;

try {
    require('electron-reloader')(module)
} catch (_) { }

let mainWindow;

const isMac = process.platform === 'darwin'

const mainMenuTemplate = [
    {
        label: "Window",
        submenu: [
            {
                label: "Dev Tools",
                accelerator: isMac ? "Command+D" : "Ctrl+D",
                click (item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                label: "Close Current"
            }
        ]
    },
    {
        label: "Exit",
        accelerator: isMac == "darwin" ? "Command+Q" : "Ctrl+Q",
        role: "quit"
    }
];

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        height: 750,
        width: 1230,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            worldSafeExecuteJavaScript: true
        }
    });
    mainWindow.loadFile('main.html')

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);

    Menu.setApplicationMenu(mainMenu);
});

