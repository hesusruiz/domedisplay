import { html } from 'uhtml'
import { log } from '../log'

let recentLogs = window.MHR.storage.recentLogs

let version = "1.0.1"

function shortDate(timestamp) {
    let date = new Date(timestamp)
//    return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()+1}`
    return `${date.toISOString()}`
}

window.MHR.register("LogsPage", class extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    async enter() {
        let html = this.html
        var items = await recentLogs()

        let theHtml = html`
        <div class="w3-container">
            <h2>${T("Technical logs")} (${version})</h2>
        </div>

        <ion-list>
            ${items.map(
            ({timestamp, level, desc, item}, i) => {
                if (level == "E") {
                    var theHtml = html`
                    <ion-item><ion-label class="ion-text-wrap"><ion-text color="danger">
                    ${shortDate(timestamp)} ${desc} ${item}
                    </ion-text></ion-label></ion-item>
                    `
                } else {
                    var theHtml = html`
                    <ion-item><ion-label class="ion-text-wrap">
                    ${shortDate(timestamp)} ${desc} ${item}
                    </ion-label></ion-item>
                    `
                }
                return theHtml
            }
            )}
        </ion-list>

        `;

        this.render(theHtml)
    }
})
