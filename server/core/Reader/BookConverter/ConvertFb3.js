const fs = require('fs-extra');

const ConvertHtml = require('./ConvertHtml');

class ConvertFb3 extends ConvertHtml {
    async check(data, opts) {
        const {inputFiles} = opts;
        if (this.config.useExternalBookConverter && 
            inputFiles.sourceFileType && inputFiles.sourceFileType.ext == 'zip') {
            //ищем файл '[Content_Types].xml'
            for (const file of inputFiles.files) {
                if (file.path == '[Content_Types].xml') {
                    const contentTypes = await fs.readFile(`${inputFiles.filesDir}/${file.path}`, 'utf8');
                    return contentTypes.indexOf('/fb3/body.xml') >= 0;
                }
            }
        }

        return false;
    }

    getTitle(text) {
        let title = '';
        const m = text.match(/<title>([\s\S]*?)<\/title>/);
        if (m)
            title = m[1];

        return title.trim();
    }

    async run(data, opts) {
        if (!(await this.check(data, opts)))
            return false;

        const {inputFiles} = opts;

        let text = await fs.readFile(`${inputFiles.filesDir}/fb3/body.xml`, 'utf8');

        const title = this.getTitle(text)
            .replace(/<\/?p>/g, '')
        ;
        text = `<fb2-title>${title}</fb2-title>` + text
            .replace(/<title>/g, '<br><b>')
            .replace(/<\/title>/g, '</b><br>')
            .replace(/<subtitle>/g, '<br><br><fb2-subtitle>')
            .replace(/<\/subtitle>/g, '</fb2-subtitle>')
        ;
        return await super.run(Buffer.from(text), {skipHtmlCheck: true});
    }
}

module.exports = ConvertFb3;
