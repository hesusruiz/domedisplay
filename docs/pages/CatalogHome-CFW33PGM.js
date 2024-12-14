import {
  Client
} from "../chunks/chunk-DYS3PAW3.js";

// front/src/pages/CatalogHome.js
var pb = new Client(window.location.origin);
var MHR = window.MHR;
var FV = window.FormValidator;
var gotoPage = MHR.gotoPage;
var goHome = MHR.goHome;
var storage = MHR.storage;
var myerror = MHR.storage.myerror;
var mylog = MHR.storage.mylog;
var html = MHR.html;
var cleanReload = MHR.cleanReload;
var serverPRO = "https://dome-marketplace-prd.org";
var server = serverPRO;
MHR.register("CatalogHome", class extends MHR.AbstractPage {
  /**
   * @param {string} id
   */
  constructor(id) {
    super(id);
  }
  async enter() {
    var theHtml;
    theHtml = html`
        <style>
            .loader {
            border: 16px solid #f3f3f3;
            border-radius: 50%;
            border-top: 16px solid #3498db;
            width: 120px;
            height: 120px;
            -webkit-animation: spin 2s linear infinite; /* Safari */
            animation: spin 2s linear infinite;
            }

            /* Safari */
            @-webkit-keyframes spin {
            0% { -webkit-transform: rotate(0deg); }
            100% { -webkit-transform: rotate(360deg); }
            }

            @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
            }
        </style>
                <!-- Header -->
        <div class="dome-header w3-margin-bottom">
            <div class="dome-content">
            <div class="w3-bar">
                <div class="w3-bar-item padding-right-0">
                <a href="#">
                    <img src="assets/logos/DOME_Icon_White.svg" alt="DOME Icon" style="width:100%;max-height:32px">
                </a>
                </div>
                <div class="w3-bar-item">
                <span class="blinker-semibold w3-xlarge nowrap">DOME MARKETPLACE</span>
                </div>
            </div>
            </div>
        </div>

        <div class="w3-content">
            <div class="loader"></div>
        </div>
        `;
    this.render(theHtml, false);
    const POUrl = server + "/catalog/productOffering?limit=200&lifecycleStatus=Launched";
    var POList = await myfetch(POUrl);
    var completeRows = Math.floor(POList.length / 2);
    var remainingItems = POList.length % 2;
    var elArray = [];
    for (let row = 0; row < completeRows; row++) {
      let elHtml = html`
            <div class="w3-row-padding">
                ${await summaryPOCard(POList[row * 2 + 0], row, 0)}
                ${await summaryPOCard(POList[row * 2 + 1], row, 1)}
            </div>
            `;
      elArray.push(elHtml);
    }
    if (remainingItems > 0) {
      let elHtml = html`
        <div class="w3-row-padding">
            ${await summaryPOCard(POList[completeRows * 2 + 0], 0, completeRows * 2)}
        </div>
        `;
      elArray.push(elHtml);
    }
    var theHtml = html`
        <!-- Header -->
        <div class="dome-header w3-margin-bottom">
            <div class="dome-content">
            <div class="w3-bar">
                <div class="w3-bar-item padding-right-0">
                <a href="#">
                    <img src="assets/logos/DOME_Icon_White.svg" alt="DOME Icon" style="width:100%;max-height:32px">
                </a>
                </div>
                <div class="w3-bar-item">
                <span class="blinker-semibold w3-xlarge nowrap">DOME MARKETPLACE</span>
                </div>
            </div>
            </div>
        </div>

        ${elArray}

        `;
    this.render(theHtml, false);
  }
});
async function summaryPOCard(po, row, i) {
  var colorClass = "card w3-card-4 w3-round";
  var companyName = "Unknown";
  const catalogHref = server + "/search/" + po.href;
  if (!po.productOfferingPrice || po.productOfferingPrice.length == 0) {
    return html`
    <div class="w3-col m6">
        <div class="card w3-card-4 w3-round w3-red">
        <div class="w3-container">
            <h3>${row * 2 + i + 1} <a href=${catalogHref} target="_blank">${po.name}</a></h3>

            <p>Price UNDEFINED</p>

        </div>
        </div>
    </div>
    `;
  }
  var prices = [];
  for (let i2 = 0; i2 < po.productOfferingPrice.length; i2++) {
    const poPriceRef = server + "/catalog/productOfferingPrice/" + po.productOfferingPrice[i2].href;
    var pr = await myfetch(poPriceRef);
    if (!pr) {
      colorClass = "card w3-card-4 w3-round w3-red";
      pr = { priceType: "Error", name: "Error retrieving price from server" };
    }
    if (!pr.priceType) {
      colorClass = "card w3-card-4 w3-round w3-lime";
      pr.priceType = "!!PRICE TYPE NOT SPECIFIED";
    }
    if (!pr.name) {
      colorClass = "card w3-card-4 w3-round w3-lime";
      pr.name = "NAME NOT SPECIFIED";
    }
    if (pr.priceType == "custom") {
      colorClass = "card w3-card-4 w3-round w3-orange";
    }
    prices.push(pr);
  }
  var pricesHtml = html`
    ${prices.map(
    (p) => html`
        <div>
            <p><b>${p.priceType}</b>: ${p.name}</p>
        </div>`
  )}
    `;
  var priceStr = JSON.stringify(prices, null, "  ");
  var theHtml = html`
  <div class="w3-col m6">
    <div class=${colorClass}>
      <div class="w3-container">
        <h3>${row * 2 + i + 1}: <a href=${catalogHref} target="_blank">${po.name}</a></h3>

        ${pricesHtml}

      </div>
    </div>
  </div>
  `;
  return theHtml;
}
async function myfetch(uri) {
  let response = await fetch(uri, {
    method: "GET",
    mode: "cors"
  });
  if (response.status != 200) {
    myerror("Error sending request (" + response.status + ")");
    return;
  }
  const res = await response.json();
  mylog(res);
  return res;
}
