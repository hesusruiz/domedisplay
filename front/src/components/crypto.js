//********************************
// CRYPTO KEY SUPPORT
//********************************

import { util } from "@cef-ebsi/key-did-resolver";

/**
 * 
 * @returns {Promise<{did: string, privateKey: JsonWebKey}>}
 */
export async function createDidKey() {
    var keyPair = await generateECDSAKeyPair()
    var publicJWK = await exportToJWK(keyPair.publicKey)
    var privateJWK = await exportToJWK(keyPair.privateKey)
    const did = util.createDid(publicJWK)
    return {did: did, privateKey: privateJWK}
}

/**
 * 
 * @returns {Promise<{did: string, privateKey: JsonWebKey, timestamp: number}>}
 */
export async function getOrCreateDidKey() {
    // Create a did:key (ECDSA/P-256) if it was not already created
    var myDid = await window.MHR.storage.didFirst()
    if (!myDid) {
        myDid = await createDidKey()
        await window.MHR.storage.didSave(myDid)
    }
    return myDid
}

// Import support for x509 certificates
import * as x509 from "@peculiar/x509";

/**
 * 
 * @param {string} signingString The string to sign
 * @param {JsonWebKey} keyJWK The private key in JWK format to use for signature
 * @returns {Promise<string>}
 */
export async function signWithJWK(signingString, keyJWK) {
    const privateKey = await importFromJWK(keyJWK)

    if (privateKey.type != "private") {
        throw new Error("Not a private key");
    }

    const hashBuffer = new TextEncoder().encode(signingString)

    let signature = await window.crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: { name: "SHA-256" },
        },
        privateKey,
        hashBuffer
    );

    let astr = btoa(String.fromCharCode(...new Uint8Array(signature)))

    // Remove padding equal characters
    astr = astr.replace(/=+$/, '');

    // Replace non-url compatible chars with base64 standard chars
    astr = astr.replace(/\+/g, '-').replace(/\//g, '_');

    return astr;

}

/**
 * 
 * @param {{typ: string, alg: string, kid: string}} header
 * @param {Object} payload
 * @param {JsonWebKey} keyJWK 
 * @returns {Promise<string>}
 */
export async function signJWT(header, payload, keyJWK) {

    // ASCII(BASE64URL(Header)) || '.' || BASE64URL(Payload))

    const stringifiedHeader = JSON.stringify(header);
    const stringifiedPayload = JSON.stringify(payload);
  
    const headerBase64 = UTF8StringToBase64Url(stringifiedHeader)
    const payloadBase64 = UTF8StringToBase64Url(stringifiedPayload)
    const headerAndPayload = `${headerBase64}.${payloadBase64}`
    
    const signature = await signWithJWK(headerAndPayload, keyJWK)
  
    return `${headerAndPayload}.${signature}`;
  }


/**
 * Create an ECDSA/P-256 CryptoKey
 * @returns {Promise<CryptoKey>}
 */
export async function generateECDSAKeyPair() {

    const extractable = true;
    const algorithm = {
        name: "ECDSA",
        namedCurve: "P-256",
    };
    const keyUsages = ["sign", "verify"];

    // Ask browser to create a key pair with the P256 curve
    let keyPair = await crypto.subtle.generateKey(
        algorithm,
        extractable,
        keyUsages
    );

    return keyPair;
}

/**
 * Convert a key from CryptoKey (native) format to JWK format
 * @param {CryptoKey} key 
 * @returns {Promise<JsonWebKey>}
 */
export async function exportToJWK(key) {
    
    // Export the key to the JWK format (see spec for details)
    let keyJWK = await crypto.subtle.exportKey("jwk", key);
    return keyJWK;
}


/**
 * Import from JWK (JSON Web Key) format
 * @param {JsonWebKey} jwk 
 * @returns {Promise<CryptoKey>}
 */
export async function importFromJWK(jwk) {
    // Create a CryptoKey from JWK format

    // Fix the "use" field for malformed keys from Sweden
    jwk["use"] = "sig";
    const extractable = true;
    const format = "jwk";
    const keyType = jwk["kty"];
    let algorithm;

    if (keyType == "EC") {
        algorithm = {
            name: "ECDSA",
            namedCurve: "P-256",
        };
    } else if (keyType == "RSA") {
        algorithm = {
            name: "RSA-PSS",
            hash: "SHA-256",
        };
    } else {
        throw new Error(`Invalid key type specified: ${jwk["kty"]}`);
    }

    // If "d" is in the JWK, then it is a private key for signing.
    // Otherwise it is a public key for verification
    let keyUsages = jwk["d"] ? ["sign"] : ["verify"];

    let key = await crypto.subtle.importKey(
        format,
        jwk,
        algorithm,
        extractable,
        keyUsages
    );

    return key;
}


export async function sign(key, bytes) {
    if (key.type != "private") {
        throw new Error("Not a private key");
    }

    let signature = await window.crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: { name: "SHA-256" },
        },
        key,
        bytes
    );

    return signature;
}

// Verify a signature, either with EC or RSA key
export async function verify(key, signature, bytes) {

    // Accept only Public Keys
    if (key.type != "public") {
        console.log(key)
        throw new Error("Not a public key");
    }

    let algo = key.algorithm
    console.log("Key algorithm", algo)

    // Set the proper parameters depending on algorithm used when signing
    if (key.algorithm.name === "RSA-PSS") {
        algo = {
            name: "RSA-PSS",
            saltLength: 32,
        }
    } else if (key.algorithm.name === "ECDSA") {
        algo = {       
            name: "ECDSA",
            hash: "SHA-256"         
        }
    } else {
        throw `Invalid signature algorithm: ${key.algorithm.name}`;
    }

    // Verify the signature. Returns undefined if it fails
    let result
    try {
        result = await window.crypto.subtle.verify(
            algo,
            key,
            signature,
            bytes
        );
    } catch (error) {
        throw `Verification of payload failed: ${error}`;
    }

    console.log("Result:", result);
    return result;
}


// Converts a Public key in PEM format into a Subtle Crypto native key
async function importKeyFromPEM(certPem) {
    // Decode the PEM into a x509 certificate
    const cert = new x509.X509Certificate(certPem);

    // Extract the Public Key and try to convert it first to EC and then to RSA
    const pubk = cert.publicKey.rawData
    var publicKey
    try {
        publicKey = await window.crypto.subtle.importKey(
            "spki",
            pubk,
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,
            ["verify"]
        );
        
    } catch (error) {
        try {
            publicKey = await window.crypto.subtle.importKey(
                "spki",
                pubk,
                {
                    name: "RSA-PSS",
                    hash: "SHA-256"
                },
                true,
                ["verify"]
            );
    
        } catch (error) {
            throw "Key is neither RSA not ECDSA key type"
        }
    }
    return publicKey
}


//********************************
// CRYPTO KEY SUPPORT
//********************************

/*
Convert  an ArrayBuffer into a string
from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

/*
Convert a string into an ArrayBuffer
from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
*/
function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// Utility class for managing Crypto Subtle native keys
class DGCKey {
    constructor() { }

    // Import from Subject PKI format
    static async fromSPKI(SPKI) {
        const binaryDerString = window.atob(SPKI);
        // convert from a binary string to an ArrayBuffer
        const binaryDer = str2ab(binaryDerString);

        const extractable = true;
        const format = "spki";

        let algorithm = {
            name: "ECDSA",
            namedCurve: "P-256",
        };

        let key = await crypto.subtle.importKey(
            format,
            binaryDer,
            algorithm,
            extractable,
            ["verify"]
        );

        return key;
    }

    // Import from JWK (JSON Web Key) format
    static async fromJWK(jwk) {
        // Create a CryptoKey from JWK format

        // Fix the "use" field for malformed keys from Sweden
        jwk["use"] = "sig";
        const extractable = true;
        const format = "jwk";
        const keyType = jwk["kty"];
        let algorithm;

        if (keyType == "EC") {
            algorithm = {
                name: "ECDSA",
                namedCurve: "P-256",
            };
        } else if (keyType == "RSA") {
            algorithm = {
                name: "RSA-PSS",
                hash: "SHA-256",
            };
        } else {
            throw new Error(`Invalid key type specified: ${jwk["kty"]}`);
        }

        // If "d" is in the JWK, then it is a private key for signing.
        // Otherwise it is a prublic key for verification
        let keyUsages = jwk["d"] ? ["sign"] : ["verify"];

        let key = await crypto.subtle.importKey(
            format,
            jwk,
            algorithm,
            extractable,
            keyUsages
        );

        return key;
    }

    // Generate an Elliptic Curve key pair
    static async generateECDSAKeyPair() {
        // Create an ECDSA/P-256 CryptoKey

        const extractable = true;
        const algorithm = {
            name: "ECDSA",
            namedCurve: "P-256",
        };
        const keyUsages = ["sign", "verify"];

        // Ask browser to create a key pair with the P256 curve
        let keyPair = await crypto.subtle.generateKey(
            algorithm,
            extractable,
            keyUsages
        );

        return keyPair;
    }

    // Generate a symmetric encryption key
    static async generateEncryptionKey() {
        // Generate a symmetric key for encrypting credentials when in transit
        // The credentials (and other material) will be encrypted when sent to the
        // Secure Messaging Server

        // Ask browser to create a symmetric key
        let key = await crypto.subtle.generateKey(
            {
                name: "AES-GCM",
                length: 256,
            },
            true,
            ["encrypt", "decrypt"]
        );

        return key;
    }

    static async exportToJWK(key) {
        // Convert a key from CryptoKey (native) format to JWK format

        // Export the key to the JWK format (see spec for details)
        let keyJWK = await crypto.subtle.exportKey("jwk", key);
        return keyJWK;
    }

    static async exportToPEM(key) {
        // Convert a key from CryptoKey (native) format to PEM format

        let keyJWK = await crypto.subtle.exportKey("spki", key);
        return keyJWK;
    }

    static async importFromPEMRaw(keyPEMString) {
        // base64 decode the string to get the binary data
        const binaryDerString = window.atob(keyPEMString);
        console.log(binaryDerString);
        // convert from a binary string to an ArrayBuffer
        const binaryDer = str2ab(binaryDerString);
        console.log(binaryDer);

        // Import a public key
        let key = await crypto.subtle.importKey(
            "spki",
            binaryDer,
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            true,
            ["verify"]
        );

        return key;
    }

    static async sign(key, bytes) {
        if (key.type != "private") {
            throw new Error("Not a private key");
        }

        let signature = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" },
            },
            key,
            bytes
        );

        return signature;
    }

    // Verify a signature, either with EC or RSA key
    static async verify(key, signature, bytes) {

        // Accept only Public Keys
        if (key.type != "public") {
            console.log(key)
            throw new Error("Not a public key");
        }

        let algo = key.algorithm
        console.log("Key algorithm", algo)

        // Set the proper parameters depending on algorithm used when signing
        if (key.algorithm.name === "RSA-PSS") {
            algo = {
                name: "RSA-PSS",
                saltLength: 32,
            }
        } else if (key.algorithm.name === "ECDSA") {
            algo = {       
                name: "ECDSA",
                hash: "SHA-256"         
            }
        } else {
            throw `Invalid signature algorithm: ${key.algorithm.name}`;
        }

        // Verify the signature. Returns undefined if it fails
        let result
        try {
            result = await window.crypto.subtle.verify(
                algo,
                key,
                signature,
                bytes
            );
        } catch (error) {
            throw `Verification of payload failed: ${error}`;
        }

        console.log("Result:", result);
        return result;
    }

    // Encrypt a byte array message with a symmetric key
    static async encryptMessage(key, bytes) {
        if (key.type != "secret") {
            throw new Error("Not a symmetric encryption key");
        }

        // Generate the iv
        // The iv must never be reused with a given key.
        let iv = crypto.getRandomValues(new Uint8Array(12));

        // Perform the actual encryption
        let ciphertext = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            bytes
        );

        // Return the resulting ArrayBuffer, together with the iv
        return { iv: iv, ciphertext: ciphertext };
    }

    static async decryptMessage(key, iv, ciphertext) {
        if (key.type != "secret") {
            throw new Error("Not a symmetric encryption key");
        }

        // Perform the decryption of the received ArrayBuffer
        let decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            ciphertext
        );

        // Return the byte array
        return decrypted;
    }
}


//********************************
// AUXILIARY FUNCTIONS
//********************************


function uint(bytes) {
    // Convert a byte array of 2 or 4 bytes to an unsigned integer
    // The byte array is in network byte order

    // Get the first byte
    var value = bytes[0];

    // If there are more bytes, iterate the byte array
    var i = bytes.length;
    for (let j = 1; j < i; j = j + 1) {
        value = value * 256;
        value = value + bytes[j];
    }

    return value;
}

// The character codes for the ranges
var aCode = "a".charCodeAt(0);
var fCode = "f".charCodeAt(0);
var ACode = "A".charCodeAt(0);
var FCode = "F".charCodeAt(0);
var zeroCode = "0".charCodeAt(0);
var nineCode = "9".charCodeAt(0);

function charValue(char) {
    // Given a character, return the hex value
    // "0" -> 0
    // "a" or "A" -> 10
    // "f" or "F" -> 15
    var c = char.charCodeAt(0);

    if (c >= aCode && c <= fCode) {
        return c - aCode + 10;
    }

    if (c >= ACode && c <= FCode) {
        return c - ACode + 10;
    }

    if (c >= zeroCode && c <= nineCode) {
        return c - zeroCode;
    }
}

function hexStr2bytes(hexString) {
    // Converts a string of hex values to a byte array (Uint8Array)
    // The input string should have 2 hex characters for each byte (even size)
    // The string should not start by 0X or any other prefix
    // Example: 'd28449a2012704'

    // Check if there is an even number of characters
    if (hexString.length % 2 > 0) {
        console.log("ERROR: Hex String length incorrect");
        return undefined;
    }

    // Create a byte array with one byte for each two input characters
    var array = new Uint8Array(hexString.length / 2);

    // Iterate for each pair of input characters
    for (let i = 0; i < hexString.length; i = i + 2) {
        // get the integer value for each of the two characters
        var code1 = charValue(hexString[i]);
        var code2 = charValue(hexString[i + 1]);

        // code1 is the most significant byte, code2 the least

        // Set the array entry. Index is i/2
        array[i / 2] = code1 * 16 + code2;
    }

    return array;
}

const lutArray = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
];

function bytes2hexStr(bytes) {
    // Convert a byte array to a hex string
    // Each byte is converted into two hex chars representing the byte

    // Initialize the hex string
    var hexStr = "";

    // Iterate the input byte array
    for (let i = 0; i < bytes.length; i = i + 1) {
        // Get the value of the 4 most significant bits
        nibHigh = bytes[i] >>> 4;
        // Get the value of the 4 least significant bits
        nibLow = bytes[i] & 0x0f;

        // Concatenate the two chars to the whole hex string
        hexStr = hexStr + lutArray[nibHigh] + lutArray[nibLow];
    }

    return hexStr;
}



// ****************************************************************

function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, (m) => m.codePointAt(0));
}

function bytesToBase64(bytes) {
    const binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte),
    ).join("");
    return btoa(binString);
}

/**
 * 
 * @param {string} string Text in UTF8 to encode in Base64Url
 * @returns {string}
 */
function UTF8StringToBase64Url(string) {
    var encoded = bytesToBase64(new TextEncoder().encode(string))
    encoded = encoded.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    return encoded
}

/**
 * 
 * @param {string} b64urlString Text in Base64Url format to decode to string
 * @returns {string}
 */
function Base64UrlToUTF8String(b64urlString) {
    b64urlString = b64urlString.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
    var decoded = new TextDecoder().decode(base64ToBytes(b64urlString))
    return decoded
}

