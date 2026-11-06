import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.whenReady().then(() => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: 90,
    height: 90,
    x: width - 120,
    y: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
  });

  win.loadURL(`data:text/html;charset=utf-8,
    <html>
      <body style="margin:0;padding:0;overflow:hidden;background:transparent;display:flex;align-items:center;justify-content:center;height:100vh;-webkit-app-region:drag;">
        <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 10px 25px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-family:sans-serif;font-weight:bold;font-size:14px;border:2px solid white;cursor:grab;">
          CHAT
        </div>
      </body>
    </html>
  `);

  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'floating');
  win.show();
});
