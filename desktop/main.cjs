const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, dialog, shell, ipcMain, session, Menu } = require('electron');
const { createStaticServer, validateWebRoot } = require('./server.cjs');

const SESSION_PARTITION = 'persist:schoolresult';
let mainWindow = null;
let staticServer = null;
let origin = '';
let logPath = '';
let isQuitting = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.setAppUserModelId('qa.schoolresult.desktop');

  function webRoot() {
    return path.join(__dirname, 'web');
  }

  function writeLog(message, error) {
    try {
      if (!logPath) logPath = path.join(app.getPath('userData'), 'startup.log');
      const detail = error ? `\n${error.stack || error.message || String(error)}` : '';
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}${detail}\n`, 'utf8');
    } catch {}
  }

  function showStartupError(title, error) {
    writeLog(title, error);
    const detail = error?.message || String(error || 'خطأ غير معروف');
    dialog.showErrorBox(
      title,
      `${detail}\n\nتم حفظ سجل التشخيص في:\n${logPath || path.join(app.getPath('userData'), 'startup.log')}`
    );
  }

  function isInternalUrl(value) {
    if (!origin) return false;
    try { return new URL(value).origin === origin; } catch { return false; }
  }

  function openTrustedExternal(value) {
    try {
      const url = new URL(value);
      if (!['https:', 'mailto:'].includes(url.protocol)) return false;
      void shell.openExternal(url.toString());
      return true;
    } catch {
      return false;
    }
  }

  async function createWindow() {
    mainWindow = new BrowserWindow({
      title: 'مرصد النتائج المدرسية',
      width: 1480,
      height: 920,
      minWidth: 1080,
      minHeight: 700,
      show: false,
      backgroundColor: '#f4f8fa',
      autoHideMenuBar: true,
      icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        partition: SESSION_PARTITION
      }
    });

    let shown = false;
    const showWindow = () => {
      if (!mainWindow || mainWindow.isDestroyed() || shown) return;
      shown = true;
      mainWindow.show();
      mainWindow.focus();
    };

    mainWindow.once('ready-to-show', showWindow);
    mainWindow.webContents.once('did-finish-load', showWindow);
    const safetyShowTimer = setTimeout(showWindow, 5000);
    mainWindow.on('closed', () => clearTimeout(safetyShowTimer));

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (isInternalUrl(url)) return { action: 'allow' };
      openTrustedExternal(url);
      return { action: 'deny' };
    });

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (!isInternalUrl(url)) {
        event.preventDefault();
        openTrustedExternal(url);
      }
    });

    mainWindow.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      writeLog(`did-fail-load ${code}: ${description} (${url})`);
      showWindow();
      dialog.showErrorBox(
        'تعذر تحميل واجهة مرصد النتائج المدرسية',
        `حدث خطأ أثناء تحميل الواجهة (${code}: ${description}).\nأغلق البرنامج وافتحه مرة أخرى.\n\nسجل التشخيص:\n${logPath}`
      );
    });

    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      writeLog(`render-process-gone: ${JSON.stringify(details)}`);
      if (!isQuitting) dialog.showErrorBox('تعطل واجهة البرنامج', `تعطلت واجهة العرض.\nالسبب: ${details.reason}\n\nسجل التشخيص:\n${logPath}`);
    });

    mainWindow.on('unresponsive', () => writeLog('main window became unresponsive'));

    try {
      await mainWindow.loadURL(`${origin}/index.html`);
      writeLog(`UI loaded from ${origin}`);
    } catch (error) {
      showWindow();
      showStartupError('تعذر فتح واجهة مرصد النتائج المدرسية', error);
    }

    return mainWindow;
  }

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  process.on('uncaughtException', error => {
    writeLog('uncaughtException', error);
    if (app.isReady() && !isQuitting) showStartupError('حدث خطأ غير متوقع في مرصد النتائج المدرسية', error);
  });

  process.on('unhandledRejection', error => {
    writeLog('unhandledRejection', error);
  });

  app.whenReady().then(async () => {
    logPath = path.join(app.getPath('userData'), 'startup.log');
    writeLog(`Starting SchoolResult ${app.getVersion()} on ${process.platform} ${process.arch}`);
    Menu.setApplicationMenu(null);

    const appSession = session.fromPartition(SESSION_PARTITION);
    appSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    appSession.setPermissionCheckHandler(() => false);

    appSession.on('will-download', (event, item) => {
      const result = dialog.showSaveDialogSync(mainWindow, {
        title: 'حفظ الملف',
        defaultPath: item.getFilename()
      });
      if (!result) return event.preventDefault();
      item.setSavePath(result);
    });

    ipcMain.handle('app:get-info', () => ({
      name: app.getName(),
      version: app.getVersion(),
      desktop: true,
      origin,
      startupLog: logPath
    }));

    try {
      validateWebRoot(webRoot());
      // Port 0 asks Windows for a free localhost port, preventing startup failure
      // when the old fixed port is already occupied by another process.
      const local = await createStaticServer(webRoot(), 0);
      staticServer = local.server;
      origin = local.origin;
      writeLog(`Local server listening at ${origin}`);
      await createWindow();
    } catch (error) {
      showStartupError('تعذر تشغيل مرصد النتائج المدرسية', error);
      app.quit();
    }
  }).catch(error => {
    writeLog('app.whenReady failed', error);
    if (app.isReady()) showStartupError('تعذر بدء تشغيل مرصد النتائج المدرسية', error);
    app.quit();
  });

  app.on('before-quit', () => { isQuitting = true; });

  app.on('window-all-closed', () => {
    if (staticServer) staticServer.close();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && staticServer) void createWindow();
  });
}
