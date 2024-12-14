// front/src/pages/ConfirmResetApp.js
var gotoPage = window.MHR.gotoPage;
var goHome = window.MHR.goHome;
window.MHR.register("ConfirmResetApp", class extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  enter(pageData) {
    let html = this.html;
    let title = T("Confirm Reset");
    let msg = "Are you sure you want to RESET the app and delete everything?";
    let theHtml = html`

        <ion-card>

        <ion-card-header>
            <ion-card-title>${title}</ion-card-title>
        </ion-card-header>


        <ion-card-content class="ion-padding-bottom">

            <div class="text-larger">${msg}</div>

        </ion-card-content>

        <div class="ion-margin-start ion-margin-bottom">

            <ion-button @click=${() => history.back()}>
                <ion-icon slot="start" name="chevron-back"></ion-icon>
                ${T("Cancel")}
            </ion-button>

            <ion-button color="danger" @click=${() => this.resetApplication()}>
                <ion-icon slot="start" name="trash"></ion-icon>
                ${T("Reset application")}
            </ion-button>

        </div>
        </ion-card>
        `;
    this.render(theHtml);
  }
  async resetApplication() {
    await window.MHR.storage.resetDatabase();
    window.MHR.cleanReload();
    return;
  }
});
