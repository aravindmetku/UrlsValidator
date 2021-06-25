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
            const headResponse = await axios.head(this.url)
            return headResponse.status === 200;
        } catch (e) {
            if (e.isAxiosError && e.response.status === 501) {
                await timeout(10000);
                let getResponse = await axios.get(this.url);
                return getResponse.status === 200;
            }
        }
        return false
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

async function getAllInvalidUrlObjs(flattened) {
    const final = []
    const alreadySeen = new Set()
    for (let i = 0; i < flattened.length; i++) {
        const urlObj = flattened[i]
        if (alreadySeen.has(urlObj.url)) {
            continue
        }
        await timeout(10000)
        console.log('checking: ', urlObj.url)
        const check = await urlObj.check()
        if (!check) {
            final.push(urlObj)
        }
        alreadySeen.add(urlObj.url)
    }
    return final;
}

async function urlChecker(ldifContent) {
    const flattened = ldifContent.content.flatMap(getFlattenedData)
    console.log('Total URLs to check', flattened.length)
    const checkedInvalidUrls = await getAllInvalidUrlObjs(flattened);
    console.log('invalid urls ', checkedInvalidUrls.length)

    try{
        fs.writeFileSync('output.json', JSON.stringify(checkedInvalidUrls));
    } catch (_) {
        console.log("failed to save to file")
    }
    return checkedInvalidUrls
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log(process.argv[2])
const ldifContent = require(process.argv[2])
urlChecker(ldifContent);
