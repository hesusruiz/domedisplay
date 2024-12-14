import {
  html
} from "../chunks/chunk-CRDZSWPZ.js";

// front/src/pages/SWNotify.js
window.MHR.register("SWNotify", class SWNotify extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  enter(pageData) {
    let msg;
    if (pageData && pageData.isUpdate) {
      msg = T("Application updated");
    } else {
      msg = T("Application available");
    }
    let theHtml = html`
        <div class="w3-container w3-padding-64">
            <div class="w3-card-4 w3-center">
        
                <header class="w3-container w3-center color-primary">
                    <h3>${msg}</h3>
                </header>
        
                <div class="w3-container">
                    <p>${T("There is a new version of the application and it has already been updated.")}</p>
                    <p>${T("Please click Accept to refresh the page.")}</p>
                </div>
                
                <div class="w3-container w3-center">
                    <btn-primary class="w3-margin-bottom" onclick=${() => window.location.reload()}>${T("Accept")}</btn-primary>        
                </div>

            </div>
        </div>
        `;
    this.render(theHtml);
  }
});
