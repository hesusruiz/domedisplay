// The logo in the header
import photo_man from '../img/photo_man.png'
import photo_woman from '../img/photo_woman.png'
import avatar from '../img/logo.png'

// // For rendering the HTML in the pages
// import { html } from 'uhtml';

// Setup some local variables for convenience
let gotoPage = window.MHR.gotoPage
let goHome = window.MHR.goHome
let html = window.MHR.html
let storage = window.MHR.storage
let myerror = window.MHR.storage.myerror
let mylog = window.MHR.storage.mylog


/**
 * renderAnyCredentialCard creates the HTML rendering the credential as a Card.
 * The result can be embedded in other HTML for presenting the credential.
 * @param {JSONObject}  vc - The Verifiable Credential, in JSON format.
 * @param {string}  status - One of 'offered', 'tobesigned' or 'signed'.
 * @returns {Tag<HTMLElement>} - The HTML representing the credential
 */
export function renderAnyCredentialCard(vc, status="signed") {
    var credCard
    const vctypes = vc.type

    if (vctypes.includes("LEARCredentialEmployee")) {
        credCard = renderLEARCredentialCard(vc, status)
    } else if (vctypes.includes("YAMKETServiceCertification")) {
        credCard = renderYAMKETCertificationCard(vc, status)
    } else {
        throw new Error(`credential type unknown: ${vctypes}`)
    }

    return credCard

}


/**
 * renderLEARCredentialCard creates the HTML rendering the credential as a Card.
 * The result can be embedded in other HTML for presenting the credential.
 * @param {JSONObject}  vc - The Verifiable Credential.
 * @param {string}  status - One of 'offered', 'tobesigned' or 'signed'.
 * @returns {Tag<HTMLElement>} - The HTML representing the credential
 */
export function renderLEARCredentialCard(vc, status) {
    console.log("renderLEARCredentialCard with:", status, vc)

    // TODO: perform some verifications to make sure the credential is a LEARCredential
    const vctypes = vc.type
    if (vctypes.indexOf("LEARCredentialEmployee") == -1) {
        throw new Error("renderLEARCredentialCard: credential is not of type LEARCredentialEmployee")
    }

    const vcs = vc.credentialSubject
    const first_name = vcs.mandate.mandatee.first_name
    const last_name = vcs.mandate.mandatee.last_name

    // TODO: Gender will not be in the credential in the future
    var avatar = photo_man
    const gender = vcs.mandate.mandatee.gender
    if (gender && gender.toUpperCase() == "F") {
        avatar = photo_woman
    }

    const powers = vcs.mandate.power

    const learCard = html`
        <ion-card-header>
            <ion-card-title>${first_name} ${last_name}</ion-card-title>
            <ion-card-subtitle>Employee</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content class="ion-padding-bottom">

            <div>
            <ion-list>
            
                <ion-item>
                    <ion-thumbnail slot="start">
                        <img alt="Avatar" src=${avatar} />
                    </ion-thumbnail>
                    ${(status != "signed") ? html`<ion-label color="danger"><b>Status: signature pending</b></ion-label>` : null}
                </ion-item>
            
                ${powers.map(pow => {
                return html`<ion-item><ion-label>${pow.tmf_domain[0]}: ${pow.tmf_function} [${pow.tmf_action}]</ion-label></ion-item>`
                })}
            </ion-list>
            </div>

        </ion-card-content>
        `
    return learCard

}

/**
 * renderYAMKETCertificationCard creates the HTML rendering the credential as a Card.
 * The result can be embedded in other HTML for presenting the credential.
 * @param {JSONObject}  vc - The Verifiable Credential.
 * @param {string}  status - One of 'offered', 'tobesigned' or 'signed'.
 * @returns {Tag<HTMLElement>} - The HTML representing the credential
 */
export function renderYAMKETCertificationCard(vc, status) {
    console.log("renderYAMKETCertificationCard with:", status, vc)

    // TODO: perform some verifications to make sure the credential is a YAMKETServiceCertification

    const serviceName = "TheServiceName"

    const theCard = html`
        <ion-card-header>
            <ion-card-title>${serviceName}</ion-card-title>
            <ion-card-subtitle>Service certification</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content class="ion-padding-bottom">

            <div>
            <ion-list>
            
                <ion-item>
                    <ion-thumbnail slot="start">
                        <img alt="Avatar" src=${avatar} />
                    </ion-thumbnail>
                    ${(status != "signed") ? html`<ion-label color="danger"><b>Status: signature pending</b></ion-label>` : null}
                </ion-item>
            
            </ion-list>
            </div>

        </ion-card-content>
        `
    return theCard
}