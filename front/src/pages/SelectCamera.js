import { getPreferredVideoDevice } from '../components/camerainfo'

let gotoPage = window.MHR.gotoPage
let goHome = window.MHR.goHome
let storage = window.MHR.storage
let log = window.MHR.log

window.MHR.register("SelectCamera", class extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    async enter() {
        let html = this.html

        try {
            var preferredVideoDevices = await getPreferredVideoDevice()
            if (preferredVideoDevices.videoDevices.length == 0) {
                this.render(html`<p>No camera available</p>`)
                return;
            }

            var videoDevices = preferredVideoDevices.videoDevices

        } catch (error) {
            this.render(html`<p>No camera available</p>`)
            return;
        }

        let theHtml = html`
        <ion-list class="w3-container">
            <ion-list-header>
            <ion-label>Select a camera</ion-label>
            </ion-list-header>
            ${videoDevices.map((camera) =>
                html`<ion-item button @click=${() => this.setCamera(camera.deviceId)}><ion-label>
                <div class="text-larger">${camera.label}</div></a>
                </ion-label></ion-item>`
            )}
        </ion-list>`
        this.render(theHtml)
    }

    async setCamera(cameraID) {
        window.selectedCamera = cameraID
        localStorage.setItem("selectedCamera", cameraID)
        goHome()
    }

})
