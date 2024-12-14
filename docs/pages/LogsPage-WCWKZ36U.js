import "../chunks/chunk-BFXLU5VG.js";
import "../chunks/chunk-CRDZSWPZ.js";

// front/src/pages/LogsPage.js
var recentLogs = window.MHR.storage.recentLogs;
var version = "1.0.1";
function shortDate(timestamp) {
  let date = new Date(timestamp);
  return `${date.toISOString()}`;
}
window.MHR.register("LogsPage", class extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter() {
    let html2 = this.html;
    var items = await recentLogs();
    let theHtml = html2`
        <div class="w3-container">
            <h2>${T("Technical logs")} (${version})</h2>
        </div>

        <ion-list>
            ${items.map(
      ({ timestamp, level, desc, item }, i) => {
        if (level == "E") {
          var theHtml2 = html2`
                    <ion-item><ion-label class="ion-text-wrap"><ion-text color="danger">
                    ${shortDate(timestamp)} ${desc} ${item}
                    </ion-text></ion-label></ion-item>
                    `;
        } else {
          var theHtml2 = html2`
                    <ion-item><ion-label class="ion-text-wrap">
                    ${shortDate(timestamp)} ${desc} ${item}
                    </ion-label></ion-item>
                    `;
        }
        return theHtml2;
      }
    )}
        </ion-list>

        `;
    this.render(theHtml);
  }
});
