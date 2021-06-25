const http = require('http');
const util = require('util');
const axios = require('axios');
const fs = require('fs')

class UrlObj {
    constructor(url, factsheetId, name) {
        this.url = url
        this.factsheetId = factsheetId
        this.name = name
    }

    async check() {
        const dynamicCheckResult = await this.dynamicCheck()
        return this.staticCheck() && dynamicCheckResult
    }

    async dynamicCheck() {
        try {
            const request = await axios.head(this.url)
            return request.status === 200;
        } catch (e) {
            return false
        }
    }

    staticCheck() {
        try {
            var url = new URL(this.url);
        } catch (_) {
            return false;
        }

        // boolean
        return url.protocol === "http:" || url.protocol === "https:";
    }
}

function getFlattenedData(data) {
    // [UrlObj, UrlObj]
    return data.data.documents.map(doc => new UrlObj(doc.url, data.id, doc.name));
}

async function urlChecker(ldifContent) {
    const flattened = ldifContent.content.flatMap(getFlattenedData)
    const final = []
    for (let i = 0; i < flattened.length; i++) {
        const urlObj = flattened[i]
        console.log('checking: ', urlObj.url)
        const check = await urlObj.check()
        if (!check) {
            final.push(urlObj)
        }
    }

    console.log('invalid urls', final.length)
    fs.writeFileSync('output.json', JSON.stringify(final));
    return final
}

console.log(process.argv[2])
const ldifContent = require(process.argv[2])x
urlChecker(ldifContent);
