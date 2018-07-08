const resolve = require('path').resolve;

let adapterObject = {
  module: 'parse-server-mailgun',
  options: {
    // The address that your emails come from
    fromAddress: 'WebAgro <infowebagro@gmail.com>',
    // Your domain from mailgun.com
    domain: 'chatbotcanada.com',
    // Your API key from mailgun.com
    apiKey: 'key-406af55a4fb54fece0f8f6db1bfe3fea',
    // The template section
    templates: {
      inviteNewUser: {
        fromAddress: `Web Agro System <noreplywebagro@gmail.com>`,
        subject: 'Convite de acesso ao web agro',
        pathPlainText: resolve(__dirname, './templates/invite-new-user.txt'),
        pathHtml: resolve(__dirname, './templates/invite-new-user.html'),
      },
      passwordReset: {
        fromAddress: `Web Agro System <noreplywebagro@gmail.com>`,
        subject: 'Resetar a senha de acesso ao web agro',
        pathPlainText: resolve(__dirname, './templates/passord-reset.txt'),
        pathHtml: resolve(__dirname, './templates/password-reset.html'),
      }
    }
  }
}

exports.adapterObject = adapterObject;