
const UserAgent = require('user-agents');
const cookie = require('cookie');
const HttpsProxyAgent = require('https-proxy-agent');
const cookies = new Map();

let fetch;

import('node-fetch').then(fetchModule => {
    fetch = fetchModule.default;
}).catch(error => {
    console.error('Error importing node-fetch:', error);
});

console.log(cookies)

const fetchCookie = (domain = 'be') => {
    return new Promise((resolve, reject) => {
        try {
            fetch(`https://vinted.${domain}`, {
                headers: {
                    'user-agent': new UserAgent().toString()
                }
            }).then((res) => {
                const sessionCookie = res.headers.get('set-cookie');
                // console.log("[VINTED COOKIE] Session Cookie:", sessionCookie); 

                const cookiesRaw = sessionCookie.split('; '); // Split the cookie string into individual cookie pairs

                // console.log("cookiesRaw", cookiesRaw)

                const vintedFrSessionCookie = cookiesRaw.find(cookie => cookie.includes('_vinted_fr_session'));
                // console.log("vintedFrSessionCookie", vintedFrSessionCookie)

                const sessionRegex = /_vinted_fr_session=([^;,]+)/;
                const match = vintedFrSessionCookie.match(sessionRegex);

                if (match && match[1]) {
                    const c = match[1]
                    cookies.set(domain, c);
                    console.log("[VINTED COOKIE] Cookie set successfully:", c);
                    resolve(c);
                } else {
                    console.log("[VINTED COOKIE] not found")
                }
            }).catch((err) => {
                console.log("[VINTED COOKIE] Error fetching cookie:", err);
                reject(false);
            });
        } catch (error) {
            console.log("[VINTED COOKIE] Catch block error:", error);
            resolve(false);
        }
    });
};


const random = (allproxy) => {
    const
        max = allproxy.length - 1,
        min = 0,
        randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return allproxy[randomNum]
};

const parseVintedURL = (url, disableOrder = false, allowSwap = false, customParams = {}) => {
    try {
        const
            decodedURL = decodeURI(url),
            matchedParams = decodedURL.match(/^https:\/\/www\.vinted\.([a-z]+)/);
        if (!matchedParams) return { validURL: false };
        const
            missingIDsParams = ['catalog', 'status'],
            params = decodedURL.match(/(?:([a-z_]+)(\[\])?=([a-zA-Z 0-9._À-ú+%]*)&?)/g);
        if (typeof matchedParams[Symbol.iterator] !== 'function') return { validURL: false };
        const mappedParams = new Map();
        for (let param of params) {
            let [_, paramName, isArray, paramValue] = param.match(/(?:([a-z_]+)(\[\])?=([a-zA-Z 0-9._À-ú+%]*)&?)/);
            if (paramValue?.includes(' ')) paramValue = paramValue.replace(/ /g, '+');
            if (isArray) {
                if (missingIDsParams.includes(paramName)) paramName = `${paramName}_id`;
                if (mappedParams.has(`${paramName}s`)) mappedParams.set(`${paramName}s`, [...mappedParams.get(`${paramName}s`), paramValue]);
                else mappedParams.set(`${paramName}s`, [paramValue]);
            } else mappedParams.set(paramName, paramValue);
        }
        for (let key of Object.keys(customParams)) { mappedParams.set(key, customParams[key]) };
        const finalParams = [];
        for (let [key, value] of mappedParams.entries()) { finalParams.push(typeof value === 'string' ? `${key}=${value}` : `${key}=${value.join(',')}`) };
        if (!finalParams.includes("order=newest_first")) finalParams.push("order=newest_first");
        return {
            validURL: true,
            domain: matchedParams[1],
            querystring: finalParams.join('&')
        }
    } catch (e) {
        return { validURL: false }
    }
};

exports.parseVintedURL = parseVintedURL;

const vintedSearch = (url, proxy) => {
    return new Promise(async (resolve, reject) => {
        try {
            let userag = new UserAgent().toString();
            if (proxy) userag = new HttpsProxyAgent('http:/' + random(proxy));
            const
                c = cookies.get('be') || await fetchCookie('be'),
                { validURL, domain, querystring } = parseVintedURL(url);
            // console.log(c)
            if (!validURL) return resolve();
            fetch(`https://www.vinted.be/api/v2/catalog/items?${querystring}`, {
                headers: {
                    'user-agent': userag,
                    'cookie': '_vinted_fr_session=' + c,
                    'accept': 'application/json, text/plain, */*'
                }
            }).then(res => {
                res.json().then(data => {
                    resolve(data);
                    // console.log(data);
                }).catch(() => { resolve() });
            }).catch(err => {
                console.log(`[VINTED SEARCH] ${err}`);
                resolve();
            });
        } catch (error) {
            console.log(`[VINTED SEARCH] ${error}`);
            resolve()
        }

    })
};

exports.vintedSearch = vintedSearch