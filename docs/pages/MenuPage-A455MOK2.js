// front/src/pages/MenuPage.js
var gotoPage = window.MHR.gotoPage;
var goHome = window.MHR.goHome;
var storage = window.MHR.storage;
window.MHR.register("MenuPage", class extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  enter() {
    let html = this.html;
    var menu = html`
        <ion-list>
            ${window.menuItems.map(
      ({ page, params, text }) => html`
                <ion-item><ion-label onclick=${() => {
        MHR.processPageEntered(MHR.pageNameToClass, page, params);
      }}><span class="text-menu">${text}</span></ion-label></ion-item>
            `
    )}
        </ion-list>
        `;
    this.render(menu, true);
  }
});
