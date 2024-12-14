let gotoPage = window.MHR.gotoPage
let goHome = window.MHR.goHome
let storage = window.MHR.storage

window.MHR.register("MenuPage", class extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    enter() {
        let html = this.html

        var menu = html`
        <ion-list>
            ${window.
            // @ts-ignore
            menuItems.map(
                ({page, params, text}) => html`
                <ion-item><ion-label onclick=${()=>{MHR.processPageEntered(MHR.pageNameToClass, page, params)}}><span class="text-menu">${text}</span></ion-label></ion-item>
            `)}
        </ion-list>
        `;
        
        this.render(menu, true)
    }
})
