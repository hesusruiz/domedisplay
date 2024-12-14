// **************************************************
// Local database management
// **************************************************

// Logging level (if false, only log Errors)
const LOG_ALL = true

// Logging support
import { log } from "../log";

// We use a library on top of IndexedDB
// There are two application stores and one logging store:
//    "credentials" for storing the credentials
//    "settings" for miscellaneous things
//    "logs" for persistent logging of important events for diagnostic
import Dexie from "dexie"

export var db = new Dexie('PrivacyWalletNg');
db.version(0.7).stores({
    credentials: 'hash, timestamp, type',
    settings: 'key',
    dids: 'did',
    logs: '++id, timestamp'
});


// The _credential object has the following structure:
//    _credential = {
//        type: the type of credential: "w3cvc", "eHealth", "ukimmigration", etc
//        status: the status in the lifecycle of the credential: offered, tobesigned, signed
//        encoded: the credential encoded in JWT, COSE or any other suitable format
//        decoded: the credential in plain format as a Javascript object
//    }
// If 'replace' is true, the new record replaces an existing one with the same primary key.
// Otherwise, the new record is not saved and an error page displayed
async function credentialsSave(_credential, replace) {

    log.log("CredentialSave", _credential)

    var hashHex
    if (_credential.id) {
        hashHex = _credential.id
    } else {
        // Calculate the hash of the encoded credential to avoid duplicates
        var data = new TextEncoder().encode(_credential.encoded);
        var hash = await crypto.subtle.digest('SHA-256', data)
        var hashArray = Array.from(new Uint8Array(hash));   // convert buffer to byte array
        hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    console.log("hashHex", hashHex)

    // Create the object to store
    var credential_to_store = {
        hash: hashHex,
        timestamp: Date.now(),
        type: _credential.type,
        status: _credential.status,
        encoded: _credential.encoded,
        decoded: _credential.decoded
    }

    if (replace) {
        // Store the object, catching the exception if duplicated, but not displaying any error to the user
        try {
            await db.credentials.put(credential_to_store)
        } catch (error) {
            window.MHR.gotoPage("ErrorPage", {"title": "Error saving credential", "msg": error.message})
            log.error("Error saving credential", error)
            return;
        }
    } else {
        // Store the object, catching the exception if duplicated, but not displayng any error to the user
        try {
            await db.credentials.add(credential_to_store)
        } catch (error) {
            if (error.name == "ConstraintError") {
                window.MHR.gotoPage("ErrorPage", {"title": "Credential already exists", "msg": "Can not save credential: already exists"})
            } else {
                window.MHR.gotoPage("ErrorPage", {"title": "Error saving credential", "msg": error.message})
            }
            log.error("Error saving credential", error)
            return;
        }
    }

    // // Check if the credential is already in the database
    // var oldCred = await credentialsGet(hashHex)
    // if (oldCred != undefined) {
    //     log.error("Credential already exists", oldCred, hashHex)
    //     window.MHR.gotoPage("ErrorPage", {"title": "Credential already exists", "msg": "Can not save credential: already exists"})
    //     // Return an error
    //     return;
    // }


    // Successful save, return the credential stored
    return credential_to_store;

}


// The _credential object has the following structure:
//    _credential = {
//        type: the type of credential: "w3cvc", "eHealth", "ukimmigration", etc
//        status: the status in the lifecycle of the credential: offered, tobesigned, signed
//        encoded: the credential encoded in JWT, COSE or any other suitable format
//        decoded: the credential in plain format as a Javascript object
//    }
async function credentialsDeleteCred(_credential) {


    log.log("credentialsDeleteCred", _credential)

    // Calculate the hash of the encoded credential, which will be the key
    var data = new TextEncoder().encode(_credential.encoded);
    var hash = await crypto.subtle.digest('SHA-256', data)
    var hashArray = Array.from(new Uint8Array(hash));   // convert buffer to byte array
    var hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Delete the credential
    try {
        await db.credentials.delete(hashHex)
    } catch (error) {
        log.error(error);
        window.MHR.gotoPage("ErrorPage", {"title": "Error", "msg": "Error deleting credential"})
    }
}


async function credentialsDelete(key) {
    try {
        await db.credentials.delete(key)
    } catch (error) {
        log.error(error);
        window.MHR.gotoPage("ErrorPage", {"title": "Error", "msg": "Error deleting credential"})
    }
}

async function credentialsDeleteAll() {
    try {
        await db.credentials.clear()
    } catch (error) {
        log.error(error);
        window.MHR.gotoPage("ErrorPage", {"title": "Error", "msg": "Error deleting all credential"})
    }
}

async function credentialsGet(key) {
    try {
        var credential = await db.credentials.get(key)
    } catch (error) {
        log.error(error);
        alert("Error getting credential")
    }

    return credential;

}

// Retrieve all credentials since some period
async function credentialsGetAllRecent(days) {
    if (days == undefined) {
        days = 365
    }
    const dateInThePast = Date.now() - 60 * 60 *  24 * 1000 * days;

    try {
        var credentials = await db.credentials
            .where('timestamp').aboveOrEqual(dateInThePast).toArray();
    } catch (error) {
        log.error(error);
        return
    }

    return credentials;
}

// Get all the keys to iterate all credentials in the store
async function credentialsGetAllKeys() {
    try {
        var keys = await db.credentials.orderBy("timestamp").primaryKeys();
    } catch (error) {
        log.error(error);
        window.MHR.gotoPage("ErrorPage", {"title": "Error", "msg": "Error getting all credentials"})
    }

    return keys;

}


async function recentLogs() {
    var rlogs = await db.logs.reverse().limit(200).toArray()
    return rlogs
}

// Clears the logs table, preserving the other tables
async function clearLogs() {
    await db.logs.clear()
    alert("Logs cleared")
    // Reload application in the same page
    location.reload()
}

// Erases completely the database including credentials.
async function resetDatabase() {
    // Delete database, erasing all tables and their contents
    await db.delete()

    // Reload application in the same page
    location.reload()
}


// *************************************************

// Basic persistent rotating log on top of IndexedDB
const MAX_LOG_ENTRIES = 1000

async function mylog_entry(_level, _desc, _item) {

    // _item should be compatible with Dexie (most objects are)

    // Create the object to store
    var logItem = {
        timestamp: Date.now(),
        level: _level,
        desc: JSON.stringify(_desc),
        item: JSON.stringify(_item)
    }

    // Store the object
    try {
        await db.logs.add(logItem)
    } catch (error) {
        // If error, we can not do anything
        console.error("Error in log add")
    }

    // Check if we should prune old records
    var numEntries = await db.logs.count()
    if (numEntries <= MAX_LOG_ENTRIES) {
        return
    }

    // Perform pruning of the oldest entry
    var oldestEntry = await db.logs.orderBy("id").first()
    try {
        await db.logs.delete(oldestEntry.id)
    } catch (error) {
        console.error("Error in log prune")
    }

}

// async function mylog(_desc) {
//     if (LOG_ALL) {
//         var args = Array.prototype.slice.call(arguments, 1);
//         if (args.length > 0) {
//             console.log(_desc, args)
//             mylog_entry("N", _desc, args)    
//         } else {
//             console.log(_desc)
//             mylog_entry("N", _desc)    
//         }
//     }
// }

async function mylog(_desc, ...additional) {
    console.log(_desc, ...additional)
    if (LOG_ALL) {
        mylog_entry("N", _desc, ...additional)
    }

}

// async function myerror(_desc) {
//     var args = Array.prototype.slice.call(arguments, 1);
//     if (args.length > 0) {
//         console.log(_desc, args)
//         mylog_entry("E", _desc, args)    
//     } else {
//         console.log(_desc)
//         mylog_entry("E", _desc)    
//     }
// }

async function myerror(_desc, ...additional) {
    let msg = _desc
    // Get the stack trace if available
    try {
        let e = new Error(_desc)
        msg = e.stack
    } catch {}
    console.error(msg, ...additional)
    mylog_entry("E", msg, _desc, ...additional)
}


// The following are simple wrappers to insulate from future changes in the db
async function settingsPut(key, value) {
    try {
        await db.settings.put({ key: key, value: value })
    } catch (error) {
        console.error(error);
        alert("Error in put setting")
    }
}

async function settingsGet(key) {
    try {
        var setting = await db.settings.get(key)
    } catch (error) {
        console.error(error);
        alert("Error in get setting")
    }
    if (setting == undefined) {
        return undefined;
    }
    return setting.value;
}

async function settingsDelete(key) {
    try {
        await db.settings.delete(key)
    } catch (error) {
        console.error(error);
        alert("Error deleting setting")
    }
}

async function settingsDeleteAll() {
    try {
        await db.settings.clear()
    } catch (error) {
        console.error(error);
        alert("Error deleting all settings")
    }

}


async function showError(_text) {
    myerror(_text)
    window.MHR.gotoPage("ErrorPage", {"title": "Error", "msg": _text})
    return;
}

// **************************************************
// DID storage, including associated private keys
// **************************************************

/**
 * 
 * @param {{did: string, privateKey: CryptoKey}} _didObject 
 * @returns {Promise<{did: string, privateKey: string, timestamp: number}>}
 */
async function didSave(_didObject) {

    // Check if did already exists
    const oldDID = await db.dids.get(_didObject.did)
    if (oldDID) {
        log.log("DID already existed")
        return oldDID
    }

    // Create the object to store
    var object_to_store = {
        did:        _didObject.did,
        privateKey: _didObject.privateKey,
        timestamp:  Date.now(),
    }

    // Store the object
    await db.dids.add(object_to_store)

    // Successful save, return the credential stored
    return object_to_store;

}

/**
 * 
 * @returns {Promise<{did: string, privateKey: string, timestamp: number}>}
 */
async function didGet(did) {
    const oldDID = await db.dids.get(did)
    return oldDID
}

/**
 * 
 * @returns {Promise<{did: string, privateKey: string, timestamp: number}>}
 */
async function didFirst() {
    const firstDID = await db.dids.toCollection().first()
    return firstDID
}

/**
 * 
 * @param {string} inputString 
 * @returns {string}
 */
async function hash(inputString) {
    var data = new TextEncoder().encode(inputString);
    var hash = await crypto.subtle.digest('SHA-256', data)
    var hashArray = Array.from(new Uint8Array(hash));   // convert buffer to byte array
    var hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex
}

// **************************************************
// End of Local database management
// **************************************************

export {
    mylog, myerror,
    settingsPut, settingsGet, settingsDelete, settingsDeleteAll,
    credentialsSave, credentialsDeleteCred, credentialsDelete, credentialsDeleteAll,
    credentialsGet, credentialsGetAllRecent, credentialsGetAllKeys,
    recentLogs, clearLogs, resetDatabase
};

export var storage = {
    mylog: mylog,
    myerror: myerror,
    settingsPut: settingsPut,
    settingsGet: settingsGet,
    settingsDelete: settingsDelete,
    settingsDeleteAll: settingsDeleteAll,
    credentialsSave: credentialsSave,
    credentialsDeleteCred: credentialsDeleteCred,
    credentialsDelete: credentialsDelete,
    credentialsDeleteAll: credentialsDeleteAll,
    credentialsGet: credentialsGet,
    credentialsGetAllRecent: credentialsGetAllRecent,
    credentialsGetAllKeys: credentialsGetAllKeys,
    didSave: didSave,
    didGet: didGet,
    didFirst: didFirst,
    recentLogs: recentLogs,
    clearLogs: clearLogs,
    resetDatabase: resetDatabase
};
