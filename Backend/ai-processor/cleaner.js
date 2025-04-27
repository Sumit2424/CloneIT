const cheerio = require('cheerio')

function cleanHtml(rawHTML){
    const $ = cheerio.load(rawHTML)
    $('script').remove()
    $('style').remove()
    $('<!--').remove()

    
return $.html()
.replace(/\s{2,}/g, ' ') // Remove excessive spaces
.replace(/\n{2,}/g, '\n'); // Reduce line breaks
}

module.exports = cleanHtml;
