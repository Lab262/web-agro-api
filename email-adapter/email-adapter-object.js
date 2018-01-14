const resolve = require('path').resolve;

let adapterObject = {
    module: 'parse-server-mailgun',
    options: {
      // The address that your emails come from
      fromAddress: 'WebAgro <info@webagro.com>',
      // Your domain from mailgun.com
      domain: 'webagro.com',
      // Your API key from mailgun.com
      apiKey: 'key-406af55a4fb54fece0f8f6db1bfe3fea',
      // The template section
      templates: {
        // passwordResetEmail: {
        //   subject: 'Reset your password',
        //   pathPlainText: resolve(__dirname, 'path/to/templates/password_reset_email.txt'),
        //   pathHtml: resolve(__dirname, 'path/to/templates/password_reset_email.html'),
        //   callback: (user) => { return { firstName: user.get('firstName') }}
        //   // Now you can use {{firstName}} in your templates
        // },
        // verificationEmail: {
        //   subject: 'Confirm your account',
        //   pathPlainText: resolve(__dirname, 'path/to/templates/verification_email.txt'),
        //   pathHtml: resolve(__dirname, 'path/to/templates/verification_email.html'),
        //   callback: (user) => { return { firstName: user.get('firstName') }}
        //   // Now you can use {{firstName}} in your templates
        // },
        newLeadMail: {
          subject: 'New lead from web-agro.com',
          pathPlainText: resolve(__dirname, './templates/new-lead.txt'),
          pathHtml: resolve(__dirname, './templates/new-lead.html'),
        }
      }
    }
  }

  exports.adapterObject = adapterObject;