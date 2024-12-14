let log = window.MHR.log

/**
 * decodeJWT decodes the JWT without checking the signature.
 * But we will perform some important validations like expiration
 * @param {string}  jwt - The encoded JWT as a string with the three components separated by a dot.
 * @returns {{error: boolean, header: JSONObject, body: JSONObject, signature: string}} 
 */
export function decodeJWT(jwt) {
    // We will decode the JWT without checking the signature
    // But we will perform some important validations like expiration

    // This is the object that will be returned
    let decoded = {
        error: false,
        header: undefined,
        body: undefined,
        signature: undefined
    }

    let components = ""

    // Check that jwt is a string
    if(typeof jwt === "string" || jwt instanceof String){
        // Split the input in three components using the dots "." as separator
        components = jwt.split(".");
    } else {
        decoded.error = "Format error. Encoded credential is not a string"
        log.error(decoded.error)
        return decoded;
    }    

    if (components.length != 3) {
        decoded.error = "Malformed JWT, not enough components: " + components.length
        log.error(decoded.error);
        return decoded;
    }

    // Decode the header and the body into JSON objects
    try {
        decoded.header = JSON.parse(atobUrl(components[0]))
        decoded.body = JSON.parse(atobUrl(components[1]))
        decoded.signature = components[2]
    } catch (error) {
        decoded.error = "Error parsing header or body"
        log.error(decoded.error)
        return decoded;        
    }

    // Perform some consistency checks
    if (!decoded.header) {
        decoded.error = "Field does not exist in JWT (header)"
        log.error(decoded.error)
        return decoded;
    }

    return decoded;

}

function btoaUrl(input) {

    // Encode using the standard Javascript function
    let astr = btoa(input)

    // Replace non-url compatible chars with base64 standard chars
    astr = astr.replace(/\+/g, '-').replace(/\//g, '_');

    return astr;
}

function atobUrl(input) {

    // Replace non-url compatible chars with base64 standard chars
    input = input.replace(/-/g, '+').replace(/_/g, '/');

    // Decode using the standard Javascript function
    let bstr = decodeURIComponent(escape(atob(input)));

    return bstr;
}
