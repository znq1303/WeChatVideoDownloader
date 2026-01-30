import CONFIG from './const';
import mkdirp from 'mkdirp';
import fs from 'fs';
import path from 'path';
import { clipboard, dialog } from 'electron';
import spawn from 'cross-spawn';

export function checkCertInstalled() {
  return fs.existsSync(CONFIG.INSTALL_CERT_FLAG) || 
         (process.platform === 'win32' && fs.existsSync(CONFIG.WIN_CERT_MANUAL_INSTALL_FLAG));
}

export async function checkManualCertInstall() {
  if (process.platform !== 'win32') {
    return false;
  }
  
  const { dialog } = require('electron');
  const result = dialog.showMessageBoxSync({
    type: 'question',
    buttons: ['是，已手动导入', '否，需要程序导入'],
    defaultId: 1,
    title: '证书导入确认',
    message: '您是否已手动导入证书到系统？',
    detail: '如果您已经手动将证书导入到系统受信任的根证书颁发机构，请选择"是"。否则程序将自动导入证书。'
  });
  
  if (result === 0) {
    mkdirp.sync(path.dirname(CONFIG.WIN_CERT_MANUAL_INSTALL_FLAG));
    fs.writeFileSync(CONFIG.WIN_CERT_MANUAL_INSTALL_FLAG, '');
    return true;
  }
  
  return false;
}

export async function installCert(checkInstalled = true) {
  if (checkInstalled && checkCertInstalled()) {
    return;
  }

  mkdirp.sync(path.dirname(CONFIG.INSTALL_CERT_FLAG));

  if (process.platform === 'darwin') {
    return new Promise((resolve, reject) => {
      clipboard.writeText(
        `echo "输入本地登录密码" && sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${CONFIG.CERT_PUBLIC_PATH}" &&  touch ${CONFIG.INSTALL_CERT_FLAG} && echo "安装完成"`,
      );
      dialog.showMessageBoxSync({
        type: 'info',
        message: `命令已复制到剪贴板,粘贴命令到终端并运行以安装并信任证书`,
      });

      reject();
    });
  } else {
    return new Promise((resolve, reject) => {
      const result = spawn.sync(CONFIG.WIN_CERT_INSTALL_HELPER, [
        '-c',
        '-add',
        CONFIG.CERT_PUBLIC_PATH,
        '-s',
        'root',
      ]);

      if (result.stdout.toString().indexOf('Succeeded') > -1) {
        fs.writeFileSync(CONFIG.INSTALL_CERT_FLAG, '');
        resolve();
      } else {
        reject();
      }
    });
  }
}
