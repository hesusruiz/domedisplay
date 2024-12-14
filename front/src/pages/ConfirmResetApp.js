let gotoPage = window.MHR.gotoPage
let goHome = window.MHR.goHome

window.MHR.register("ConfirmResetApp", class extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    enter(pageData) {
        let html = this.html

        // We expect pageData to be an object with two fields:
        // - title: the string to be used for the title of the message
        // - msg: the string with the details

        // Provide a default title if the user did not set the title
        let title = T("Confirm Reset")

        // Provide a default message if the user did not specify it
        let msg = "Are you sure you want to RESET the app and delete everything?"

        // Display the title and message, with a button that goes to the home page
        let theHtml = html`

        <ion-card>

        <ion-card-header>
            <ion-card-title>${title}</ion-card-title>
        </ion-card-header>


        <ion-card-content class="ion-padding-bottom">

            <div class="text-larger">${msg}</div>

        </ion-card-content>

        <div class="ion-margin-start ion-margin-bottom">

            <ion-button @click=${()=> history.back()}>
                <ion-icon slot="start" name="chevron-back"></ion-icon>
                ${T("Cancel")}
            </ion-button>

            <ion-button color="danger" @click=${()=> this.resetApplication()}>
                <ion-icon slot="start" name="trash"></ion-icon>
                ${T("Reset application")}
            </ion-button>

        </div>
        </ion-card>
        `
        this.render(theHtml)
    }

    async resetApplication() {
        await window.MHR.storage.resetDatabase()
        // Reload the application
        window.MHR.cleanReload()
        return
    }


})

