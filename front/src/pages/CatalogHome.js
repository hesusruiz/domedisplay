// @ts-check
import PocketBase from '../components/pocketbase.es.mjs'

const pb = new PocketBase(window.location.origin)

// @ts-ignore
const MHR = window.MHR
// @ts-ignore
const FV = window.FormValidator

// Copy some globals to make code less verbose
let gotoPage = MHR.gotoPage
let goHome = MHR.goHome
let storage = MHR.storage
let myerror = MHR.storage.myerror
let mylog = MHR.storage.mylog
let html = MHR.html
let cleanReload = MHR.cleanReload

const serverPRO = "https://dome-marketplace-prd.org"
const serverDEV = "https://dome-marketplace-dev2.org"

var server = serverPRO

// This is the home page for the Issuer.
// It needs to be served under a reverse proxy that requests TLS client authentication,
// so the browser requests to the user to select one of the certificates installed in
// the user machine.
MHR.register("CatalogHome", class extends MHR.AbstractPage {

    /**
     * @param {string} id
     */
    constructor(id) {
        super(id)
    }

    async enter() {
        var theHtml

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
        `
        this.render(theHtml, false)

        const POUrl = server + "/catalog/productOffering?limit=200&lifecycleStatus=Launched"

        // debugger
        var POList = await myfetch(POUrl)

        // var POList = theList.slice(0,8)
        // var POList = theList


        var completeRows = Math.floor(POList.length / 2)
        var remainingItems = POList.length % 2

        var elArray = []

        for (let row = 0; row < completeRows; row++) {
            let elHtml = html`
            <div class="w3-row-padding">
                ${await summaryPOCard(POList[row * 2 + 0], row, 0)}
                ${await summaryPOCard(POList[row * 2 + 1], row, 1)}
            </div>
            `
            elArray.push(elHtml)
        }

        if (remainingItems > 0) {
            let elHtml = html`
        <div class="w3-row-padding">
            ${await summaryPOCard(POList[completeRows * 2 + 0], 0, completeRows * 2)}
        </div>
        `
            elArray.push(elHtml)
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

        `

        this.render(theHtml, false)

    }

})

async function summaryPOCard(po, row, i) {

    var colorClass = "card w3-card-4 w3-round"
    var companyName = "Unknown"
    const catalogHref = server + "/search/" + po.href

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
    `
    }

    var prices = []
    for (let i = 0; i < po.productOfferingPrice.length; i++) {
        const poPriceRef = server + "/catalog/productOfferingPrice/" + po.productOfferingPrice[i].href
        var pr = await myfetch(poPriceRef)
        if (!pr) {
            colorClass = "card w3-card-4 w3-round w3-red"
            pr = {priceType: "Error", name: "Error retrieving price from server"}
        }
        
        if (!pr.priceType) {
            colorClass = "card w3-card-4 w3-round w3-lime"
            pr.priceType = "!!PRICE TYPE NOT SPECIFIED"
        }
        if (!pr.name) {
            colorClass = "card w3-card-4 w3-round w3-lime"
            pr.name = "NAME NOT SPECIFIED"
        }
        
        if (pr.priceType == "custom") {
            colorClass = "card w3-card-4 w3-round w3-orange"
        }

        prices.push(pr)
    }

    var pricesHtml = html`
    ${prices.map((p) => html`
        <div>
            <p><b>${p.priceType}</b>: ${p.name}</p>
        </div>`
    )}
    `

    var priceStr = JSON.stringify(prices, null, "  ")


    var theHtml = html`
  <div class="w3-col m6">
    <div class=${colorClass}>
      <div class="w3-container">
        <h3>${row * 2 + i + 1}: <a href=${catalogHref} target="_blank">${po.name}</a></h3>

        ${pricesHtml}

      </div>
    </div>
  </div>
  `
    return theHtml

}

/**
 * @param {string} uri
 * @returns {Promise<any>}
 */
async function myfetch(uri) {

    let response = await fetch(uri, {
        method: "GET",
        mode: "cors",
    })

    if (response.status != 200) {
        // There was an error, present it
        myerror("Error sending request (" + response.status + ")")
        return
    }

    const res = await response.json()
    mylog(res)
    return res

}

var theList = [
    {
        "id": "urn:ngsi-ld:product-offering:99447cb9-e12c-4643-bf14-731ffc3f0a53",
        "href": "urn:ngsi-ld:product-offering:99447cb9-e12c-4643-bf14-731ffc3f0a53",
        "description": " **CuttingEdge World: IIoT for the Cutting Industry. Easy. Safe.** \n\nContact: [✉️](mailto:info@inno-focus.com)  [🔗](https://www.cutting-edge.world/)\n\nIncrease productivity and quality and save resources at the same time, that’s the promise of CuttingEdge. Data-based process monitoring of every single manufacturing step in your production enables you to increase your cost efficiency, improve quality and reduce your carbon footprint. \n\n\n **How does it work?** \n\nCuttingEdge World (CEW) is a digital twin platform digitizing your production. With the help of CEW you create digital twins of your machines, tools, processes, and products. Data can be stored on edge or in a cloud-service. CEW provides you with several (AI-)tools for process data visualization and analysis, enabling you to identify weaknesses in your processes, and optimize them. With CuttingEdge World you stay fully in charge of your data. If desired, it is possible to share selected data internally, with external experts or with suppliers and customers, for example in case of complaints or for support. Our distinguished roles and rights concept enables you to share selected data with accounts of your choice safely. \n\n\n **What are the benefits?** \n\nExtend tool Life  \n\nTools and operating resources can be used better and longer. \n\nIncrease Productivity \n\nIncreased throughput and possible shorter delivery times create competitive advantages. \n\nOptimize Quality \n\nQuality variations in raw materials and workpieces are detected. Quality data is automatically collected in the process. \n\nCompensate for Shortage of Skilled Workers \n\nWork steps can be eliminated or become significantly less labor-intensive thanks to inline quality control. \n\nEnhance Sustainability \n\nThanks to increased efficiency in the processes, fewer rejects are produced, resources are used more efficiently, energy and materials are saved. \n\n\n **Who is it for?** \n\nCuttingEdge World and its tools are designed especially for the milling industry.  \n\nComponent Producers \n\nAnalyze, compare, and optimize processes using detailed actual data. Together with your suppliers for systems and cutting tools, you will improve your processes based on data. You benefit from production planning and control, optimize processes, increase efficiency, and reduce maintenance costs. Simplify the management of any supplier and customer complaints. \n\nFor Plant Manufacturers \n\nImprove the service for your systems thanks to a data-based predictive maintenance from your customers’ production. Gain powerful insights on how your customers use your devices and avoid over-engineering. Introduce flexible maintenance intervals for your devices. \n\nAdditive and Operating Equipment Manufacturer \n\nGain access to data of your products used by component producers. Optimize your cutting tools using data from both your manufacturing and the usage by your customer. \n\nRaw Material Producers \n\nComponent producers generate a lot of information when machining your workpiece, e.g., about blowholes, hardness differences, or surface geometry data. Benefit from this information to optimize your production and product quality. Together with the component manufacturer, you also create the basis for a data-based, automated complaint management. \n\nComputer-aided Manufacturing (CAM) Software Provider \n\nContribute to further development of the cutting technology by implementing process monitoring impulses in your software and thus improving it. Together with machine control, for example, an improved control of the CAD data to the cut product is possible.\n\n\n **Further services** \n\nIn addition to the software components described here, we offer you further services to integrate them seamlessly into your existing systems. We will be happy to advise you. \n\n- As-is analysis \n- System design \n- System implementation \n- System integration: This service will usually run on-premises in the cloud. An Azure environment is preferred for this. \n- Individualized evaluations ",
        "isBundle": false,
        "lastUpdate": "2024-07-12T09:47:56.848812970Z",
        "lifecycleStatus": "Launched",
        "name": "CuttingEdge World",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:a80c1b36-c056-404b-af2c-de0a0eb736b9",
                "href": "urn:ngsi-ld:category:a80c1b36-c056-404b-af2c-de0a0eb736b9",
                "name": "Data product distribution and exchange"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "href": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "name": "Other (manufacturing)"
            },
            {
                "id": "urn:ngsi-ld:category:4e416d59-6294-46ec-913b-68d34e7ae6ba",
                "href": "urn:ngsi-ld:category:4e416d59-6294-46ec-913b-68d34e7ae6ba",
                "name": "Automotive"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "href": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "name": "Manufacturing of Metal Products"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:2349311f-b94b-4c44-a522-1fd23a40180b",
                "href": "urn:ngsi-ld:product-offering-price:2349311f-b94b-4c44-a522-1fd23a40180b",
                "name": "Enterprise"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4819b4f6-303f-445c-9962-012e715af00f",
            "href": "urn:ngsi-ld:product-specification:4819b4f6-303f-445c-9962-012e715af00f",
            "name": "CuttingEdge World",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-12T09:47:56.758Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:a352ff80-55aa-4a22-be91-5f5b20f1116c",
        "href": "urn:ngsi-ld:product-offering:a352ff80-55aa-4a22-be91-5f5b20f1116c",
        "description": "[CREODIAS](https://creodias.eu) platform gives you:\n- Immediate access to current & archive Copernicus Earth Observation satellite data starting 2014\n- Cloud services for data processing\n\n[Get in touch with us](https://creodias.eu/contact)\n",
        "isBundle": false,
        "lastUpdate": "2024-07-18T09:44:52.762067334Z",
        "lifecycleStatus": "Launched",
        "name": "CREODIAS – immediate access to Copernicus Earth Observation data",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "href": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "name": "Education"
            },
            {
                "id": "urn:ngsi-ld:category:16184f67-31f4-4684-89c1-950056c81cdf",
                "href": "urn:ngsi-ld:category:16184f67-31f4-4684-89c1-950056c81cdf",
                "name": "Science and Engineering"
            },
            {
                "id": "urn:ngsi-ld:category:3e40a325-3efc-4330-8349-aba963f074c3",
                "href": "urn:ngsi-ld:category:3e40a325-3efc-4330-8349-aba963f074c3",
                "name": "Security"
            },
            {
                "id": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "href": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "name": "Storage"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "href": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "name": "Network"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:2ea1f55b-c232-45d0-b719-7c784989b976",
                "href": "urn:ngsi-ld:product-offering-price:2ea1f55b-c232-45d0-b719-7c784989b976",
                "name": "CREODIAS pricing plans"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "You can find CREODIAS Terms & Conditions [here](https://creodias.eu/knowledgebase/terms-and-conditions-of-service)",
                "name": "CREODIAS  Terms & Conditions"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:733ffb61-97f5-497f-82ed-05ef908b57cd",
            "href": "urn:ngsi-ld:product-specification:733ffb61-97f5-497f-82ed-05ef908b57cd",
            "name": "CREODIAS – immediate access to Copernicus Earth Observation data",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-18T09:44:50.885Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:00eeffa3-4f6a-4d34-b523-6cc3c3fee3e7",
        "href": "urn:ngsi-ld:product-offering:00eeffa3-4f6a-4d34-b523-6cc3c3fee3e7",
        "description": "Some description:\n* Text",
        "isBundle": false,
        "lastUpdate": "2024-06-25T13:09:28.545066399Z",
        "lifecycleStatus": "Retired",
        "name": "FICODES Offer",
        "version": "0.1",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:f1faf200-5c35-4ea9-b334-9e6317ffe84b",
                "href": "urn:ngsi-ld:product-offering-price:f1faf200-5c35-4ea9-b334-9e6317ffe84b",
                "name": "Plan"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:84ce2d44-7cff-4a9c-9c39-b0bbdbbd0aed",
            "href": "urn:ngsi-ld:product-specification:84ce2d44-7cff-4a9c-9c39-b0bbdbbd0aed",
            "name": "FICODES Product",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-06-25T13:09:28.308Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:eedfc2d9-3003-407a-aa1c-358fee128fca",
        "href": "urn:ngsi-ld:product-offering:eedfc2d9-3003-407a-aa1c-358fee128fca",
        "description": " **Process Data Analyzer** \n\nContact: [✉️](mailto:info@inno-focus.com)  [🔗](https://www.inno-focus.com/en/software-and-consulting-for-digitization-collaboration-and-industry-4-0/)\n\nA digital representation of your production processes fosters transparency and serves as a foundational element for various analyses and optimizations. A distinctive feature of the Process Data Analyzer is its ability to meticulously monitor components throughout the entirety of production processes and create digital shadows for each of them. The Process Data Analyzer delineates the manufacturing workflows within a company, elucidating the sequential stages that a component undergoes during its production journey, encompassing individual production steps, quality assurance measures, and logistical operations. \n\n This software visually maps out the processes, encompassing switches, interfaces, and other elements, adhering to the BPMN model. It enables the integration of all pertinent data with the respective production or quality assurance steps, thereby establishing a nexus between real-time production processes and their corresponding digital counterparts. In essence, the Process Data Analyzer constructs a digital shadow of the manufacturing operations. \n\n Moreover, the Process Data Analyzer facilitates a comprehensive analysis of your entire manufacturing chain, identifying specific tasks and pinpointing areas necessitating additional sensors or data sources.  \n\nBy interfacing with other systems such as ERP and planning tools for product design, process simulation, and manufacturing planning, the software aids in optimizing these tools by leveraging manufacturing production data from digital representations, thereby enhancing digital twin models. \n\nIn addition to its utility in the planning phase, the software provides support during both the ramp-up phase and ongoing production. Through preconfigured visualizations, users can monitor the adherence of data pertaining to specific workpieces within defined production, quality, and logistical contexts, ensuring accurate data capture and transmission. \n\nThis tool is accessible as a web-based service with an edge-based database. Additionally, an On-Premise service is available upon request.\n\n\n **How does it work?** \n\nThe software's process modeling adheres to the international standard Business Process Model and Notation (BPMN) as outlined in ISO/IEC 19510 (2013), empowering users to craft processes augmented with systems, machines, sensors, data sources, quality assurance measures, logistics, and IT components. Processes are manually developed, and subsequently, our team of IT specialists implements the requisite data sources, drawing upon a diverse array of existing machine connections. Data can then be accessed, gathered, and further manipulated. \n\n Ideally, the software is utilized in conjunction with the visualization module Machining Analyzer to graphically represent process data in diverse formats. \n\n\n **What are the benefits?** \n\n- Generates digital shadows for every workpiece/component along any production process. \n- IT systems (hardware and software) are completely organized in the Process Data Analyzer. \n- Establishment of a scope of consideration for digitalization, in particular production, that can be expanded at any time to form a holistic view. \n- Facilitates user access to and manipulation of process-generated data. \n- Supplies data for subsequent processing, such as visualization, analysis, or AI methodologies. \n- Generates comprehensive documentation for all digital shadows within production. \n- Enhances transparency regarding production outcomes. \n- Enables users to pinpoint areas requiring additional data sources or sensors for specific process information. \n- Requires no programming proficiency from the user. \n- Provides clarity regarding connections, even in cases of complex interactions between IT and OT (Information Technology and Operational Technology). \n\n **Who is it for?** \n\nThe software is designed for: \n- Organizations utilizing complex data collection and processing systems, primarily leveraging Edge Data, particularly those centered around IoT data. \n- Entities seeking to transition to a comprehensive holistic digitalization system. \n- Companies within the manufacturing industry, encompassing simulation and planning tools as well as logistic systems characterized by numerous diverse connections. \n\n **Further services** \n\nIn addition to the software components described here, we offer you further services to integrate them seamlessly into your existing systems. We will be happy to advise you. \n\n- As-is analysis \n- System design \n- System implementation \n- System integration: This service will usually run on-premises in the cloud. An Azure environment is preferred for this. \n- Individualized evaluations ",
        "isBundle": false,
        "lastUpdate": "2024-07-12T10:00:34.272739876Z",
        "lifecycleStatus": "Launched",
        "name": "Process Data Analyzer",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "href": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "name": "Other (manufacturing)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "href": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "name": "Manufacturing of Metal Products"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:4eb6ec97-2d02-4c21-accd-b3d3f63f1ad5",
                "href": "urn:ngsi-ld:product-offering-price:4eb6ec97-2d02-4c21-accd-b3d3f63f1ad5",
                "name": "Enterprise"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:5a8db3e6-dd17-482d-8618-87214ccb221c",
            "href": "urn:ngsi-ld:product-specification:5a8db3e6-dd17-482d-8618-87214ccb221c",
            "name": "Process Data Analyzer",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-12T10:00:34.122Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:df7d727c-c631-41a4-b35e-a7730eb8cc04",
        "href": "urn:ngsi-ld:product-offering:df7d727c-c631-41a4-b35e-a7730eb8cc04",
        "description": " **Machining Analyzer** \n\nContact: [✉️](mailto:info@inno-focus.com)  [🔗](https://www.inno-focus.com/en/software-and-consulting-for-digitization-collaboration-and-industry-4-0/)\n\nThe Machining Analyser uses interfaces to access data from a digital twin platform  by inno-focus. It makes it possible to select and visualize all available facets of the digital twin. \n\nThe Machining Analyzer facilitates and simplifies in-depth analyses based on software-supported data selection. Additionally, a fully automated analysis up to a forecast (e.g. through AI modeling) can be prepared by a smart selection of data from selected objects. AI modeling can be developed based on software-supported analysis and integrated as additional services, such as anomaly detection in workpiece material, which is due to deviations in previous process steps or wear detection of an object. \n\nTypical objects include: \n- Workpieces/components \n- Production machines/plants \n- Operating equipment (e.g., cutting tools, master molding, and forming tools) \n- Testing machines and devices \n- Logistics systems in production \n\nThe software component enables an application-specific configuration of the visualization according to analysis requirements and the scope of the available data.\n\n\n **How does it work?** \n\nThe Machining Analyzer is primarily configured by the user. The software uses interfaces to access data from a digital twin platform, such as via the Process Data Analyzer. The data is analyzed web-based with access to the data in the cloud provided or as on-premises services in the customer's own cloud or on a customer server. The selection of the cross-process data for analysis is part of the Machining Analyzer. Consequently, a wide variety of correlations are visualized in one or more diagrams. Graphic types, colors, axis scaling, etc., can be adapted. \n\nFurther details can be found in the picture explanation at the end of the text. \n\n\n **What are the benefits?** \n\n- Combines all available data sources of a digital twin or several twins in a time-synchronised manner and thus enables full transparency of the processes on the machine. \n- Information from other systems such as CAx, ERP, QA systems, and from automatic analyses and forecasting services (AI models) is seamlessly integrated into the \"Process Data Analyzer\" and \"Machining Object Analyzer\" software services. \n- The user does not need any IT knowledge to visualize the selected data. \n\n\n **Whom is the solution designed for?** \n\nThis software is particularly suitable for companies with high quality requirements, flexible production (small series, batch size 1) and high demands for documentation and transparency. It is suitable for detailed analyses in the following areas:  \n- Development/Optimization of Objects (R&D): Especially for processes, machines, and operating resources.  \n- Analyzing Product Weaknesses/Complaints (QA): To identify and address quality issues.  \n- Development of Automated Forecasts (AI Models): Based on data analysis. \n- Optimization of Production Processes: Including production planning and logistics with purchasing, to shorten throughput times for individual products and increase production efficiency.  \n\nThese levers, which are essential in series production, are now becoming effective with digitalization, particularly in the production of individual parts, one-offs and small series. \n\n Note: We already offer a specialized solution for the digitalization and analysis of machining with CuttingEdge World (see Service). \n\n **Further services** \n\nIn addition to the software components described here, we offer you further services to integrate them seamlessly into your existing systems. We will be happy to advise you. \n\n- As-is analysis \n- System design \n- System implementation \n- System integration: This service will usually run on-premises in the cloud. An Azure environment is preferred for this. \n- Individualized evaluations ",
        "isBundle": false,
        "lastUpdate": "2024-07-12T09:52:10.269151209Z",
        "lifecycleStatus": "Launched",
        "name": "Machining Analyzer",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "href": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "name": "Other (manufacturing)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "href": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "name": "Manufacturing of Metal Products"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:3d721b31-1005-4ed1-a22f-3dc73616343e",
                "href": "urn:ngsi-ld:product-offering-price:3d721b31-1005-4ed1-a22f-3dc73616343e",
                "name": "Enterprise"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:475e506a-b966-42f1-bac5-0d91caee220e",
            "href": "urn:ngsi-ld:product-specification:475e506a-b966-42f1-bac5-0d91caee220e",
            "name": "Machining Analyzer",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-12T09:52:10.085Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:cca377ba-f9eb-4e27-af17-0566e9e821be",
        "href": "urn:ngsi-ld:product-offering:cca377ba-f9eb-4e27-af17-0566e9e821be",
        "description": "#### Meet **ETABox**, the AI-powered platform revolutionizing predictive analytics in maritime logistics.\nAt the core of ETABox lies the transformative power of artificial intelligence, engineered to deliver unparalleled accuracy in predicting the Estimated Time of Arrival (ETA) and Departure (ETD) of vessels and containers.",
        "isBundle": false,
        "lastUpdate": "2024-07-17T08:35:48.495239451Z",
        "lifecycleStatus": "Launched",
        "name": "ETABox",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "href": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "name": "Business Analytics"
            },
            {
                "id": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "href": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "name": "Transportation and Transportation infrastructure"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:2c63bf32-37b3-4fe7-aaf1-9a18133f5fd0",
                "href": "urn:ngsi-ld:product-offering-price:2c63bf32-37b3-4fe7-aaf1-9a18133f5fd0",
                "name": "Subscription"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:d92b7617-6ab2-45c4-8963-bcb11c8bbd38",
            "href": "urn:ngsi-ld:product-specification:d92b7617-6ab2-45c4-8963-bcb11c8bbd38",
            "name": "ETABox",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-17T08:35:48.420Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4665e00a-8e3d-4d7b-9781-2ff334fbe1d1",
        "href": "urn:ngsi-ld:product-offering:4665e00a-8e3d-4d7b-9781-2ff334fbe1d1",
        "description": "Libelium IoT solutions can help food producers monitor the health, well-being and performance of their livestock, supporting decision-making based on real data and AI forecasts derived from this data. Libelium has a wide range of sensors to provide information on environmental conditions to veterinary teams, such as temperature, humidity, pressure, gas concentration and other parameters. For example, it can be useful to control the presence of harmful gases, suspended dust and bioaerosols.\n\nLibelium offers end-to-end solutions, so we are not only specialists in providing the means to collect data, but also integrated tools to visualize and analyze this data. From which we can develop AI models to send alerts, improve decision-making and ensure timely intervention with effective actions. All of this adapted to the needs of the project.\n",
        "isBundle": false,
        "lastUpdate": "2024-07-05T16:03:10.397833392Z",
        "lifecycleStatus": "Launched",
        "name": "Smart Farming - by Libelium",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "href": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "name": "Business Analytics"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:3409b32e-c332-4bbe-998e-89b330ad8f5f",
                "href": "urn:ngsi-ld:product-offering-price:3409b32e-c332-4bbe-998e-89b330ad8f5f",
                "name": "Project-based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:f5f37487-abed-4f07-8100-6a43a127e80c",
            "href": "urn:ngsi-ld:product-specification:f5f37487-abed-4f07-8100-6a43a127e80c",
            "name": "Smart Farming",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-05T16:03:10.242Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0d0def13-420d-4feb-812d-567a5b7756cf",
        "href": "urn:ngsi-ld:product-offering:0d0def13-420d-4feb-812d-567a5b7756cf",
        "description": "A municipality Digital Twin automatically collecting & transforming big data about urban processes into rich evidence information for citizens, businesses, administrations to let holistic sustainable transparent governance and performance management",
        "isBundle": false,
        "lastUpdate": "2024-06-25T14:53:21.730288206Z",
        "lifecycleStatus": "Obsolete",
        "name": "SmartCityMonitor",
        "version": "1.31",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:7d4df316-58ed-4993-89fb-dbdda2c874a8",
                "href": "urn:ngsi-ld:product-offering-price:7d4df316-58ed-4993-89fb-dbdda2c874a8",
                "name": "Annual subscription"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:197e6754-1a6d-47a5-aef4-0d93c8b72e44",
                "href": "urn:ngsi-ld:product-offering-price:197e6754-1a6d-47a5-aef4-0d93c8b72e44"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:04fd7758-1716-4201-9dc2-268a0b094968",
            "href": "urn:ngsi-ld:product-specification:04fd7758-1716-4201-9dc2-268a0b094968",
            "name": "Smart City Monitor extended",
            "version": "1.31"
        },
        "validFor": {
            "startDateTime": "2024-06-25T14:53:21.540Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:9d0497e5-eab5-47a4-8f96-da0252c74c5a",
        "href": "urn:ngsi-ld:product-offering:9d0497e5-eab5-47a4-8f96-da0252c74c5a",
        "description": "Introducing BEIA's advanced Weather Conditions Monitoring Service, designed to provide precise and real-time environmental data through a network of specialized sensors., like rain gauge, pyranometer. Perfect for meteorologists, researchers, and enthusiasts, our service ensures comprehensive weather insights accessible through a user-friendly website interface - GRAFANA. Enhance your weather forecasting and climate studies with BEIA's state-of-the-art monitoring technology.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T11:03:42.018278880Z",
        "lifecycleStatus": "Launched",
        "name": "Weather Conditions Monitoring IoT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:dbf8b094-3c22-4c04-b9ab-a7f08a0be4f8",
                "href": "urn:ngsi-ld:product-offering-price:dbf8b094-3c22-4c04-b9ab-a7f08a0be4f8",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:77ad1a3d-372e-4162-8e5a-e69c5c1791d1",
            "href": "urn:ngsi-ld:product-specification:77ad1a3d-372e-4162-8e5a-e69c5c1791d1",
            "name": "Weather Conditions Monitoring",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T11:03:41.780Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:25dcd20c-6f7a-4397-bbdf-b600fdeb83e8",
        "href": "urn:ngsi-ld:product-offering:25dcd20c-6f7a-4397-bbdf-b600fdeb83e8",
        "description": "This service provides a **secure** and **compliant** solution for electronically signing **PDF files (PAdES)** using qualified electronic certificates as specified by the **Cloud Signature Consortium** (CSC v2.0.2). Available on our marketplace, this service allows businesses to streamline their document signing processes with legally binding and internationally recognized digital signatures. Leveraging the latest standards in digital certification, it ensures authenticity, integrity, and non-repudiation of signed documents. Ideal for contracts, legal agreements, and other critical documents, our solution integrates seamlessly with existing workflows, offering a user-friendly interface and robust security features.\n\n* Web: https://digitelts.com\n* Email: info@digitelts.com",
        "isBundle": false,
        "lastUpdate": "2024-11-29T11:12:22.185928163Z",
        "lifecycleStatus": "Launched",
        "name": "Electronic Signature (CSC)",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            },
            {
                "id": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "href": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "name": "Legal, Public Order, Security"
            },
            {
                "id": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "href": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "name": "Blockchain (DLT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:cd750330-8249-46d6-ab22-3b1ba37008c2",
                "href": "urn:ngsi-ld:product-offering-price:cd750330-8249-46d6-ab22-3b1ba37008c2",
                "name": "Pricing Information"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This agreement (“License”) is entered into between [Your Company Name] (“Licensor”) and the party acquiring this license (“Licensee”) for the use and distribution of the electronic signature service (“Service”) on the designated marketplace.\n\n* Scope of License: Licensor grants Licensee a non-exclusive, non-transferable, and revocable license to offer the Service in the marketplace solely under Licensor's branding and in compliance with applicable laws.\n* Intellectual Property: All rights, title, and interest in and to the Service, including any associated documentation, trademarks, and intellectual property, remain the exclusive property of Licensor.\n* Limitations: Licensee shall not modify, sublicense, or distribute the Service outside the marketplace without prior written consent from Licensor.\n* Fees and Revenue Sharing: Revenue generated through the marketplace shall be subject to the terms agreed upon by both parties, as detailed in the accompanying revenue-sharing agreement.\n* Liability and Warranties: The Service is provided \"as-is,\" and Licensor disclaims all warranties, whether express or implied, to the maximum extent permitted by law. Licensor's liability is limited to direct damages not exceeding the amount paid under this License.\n* Termination: Licensor may terminate this License with 30 days' written notice or immediately if Licensee breaches the terms.\n\nBy using or distributing the Service in the marketplace, the Licensee agrees to the terms set forth in this License.",
                "name": "Commercial License for Electronic Signature Service"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7cc37dd7-a75d-4736-9fa0-e1612a065aff",
            "href": "urn:ngsi-ld:product-specification:7cc37dd7-a75d-4736-9fa0-e1612a065aff",
            "name": "Electronic Signature (CSC)",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-11-29T11:12:22.115Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8c2179b6-dae9-4495-bce4-91e760ae54f1",
        "href": "urn:ngsi-ld:product-offering:8c2179b6-dae9-4495-bce4-91e760ae54f1",
        "description": "This service offers advanced fraud prevention solutions leveraging the APIs provided by the OpenGateway initiative from CAMARA. Available on our marketplace, this service empowers businesses to detect and prevent fraudulent activities in real-time through a robust API-driven framework. By integrating seamlessly with your existing systems, it enables comprehensive monitoring and analysis of transactions and user behavior, ensuring enhanced security and reducing the risk of fraud. The service uses cutting-edge algorithms and data analytics to identify suspicious patterns, providing actionable insights and automated responses to potential threats. Ideal for financial institutions, e-commerce platforms, and any business seeking to safeguard their operations, our fraud prevention service delivers reliable and efficient protection against evolving cyber threats.\n\n* Web: https://digitelts.com\n* Email: info@digitelts.com",
        "isBundle": false,
        "lastUpdate": "2024-11-29T11:13:24.876383320Z",
        "lifecycleStatus": "Launched",
        "name": "OpenGateway",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:abe7e420-c254-4610-961e-59fb65a62e5a",
                "href": "urn:ngsi-ld:category:abe7e420-c254-4610-961e-59fb65a62e5a",
                "name": "Financial Services and Insurance"
            },
            {
                "id": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "href": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "name": "Legal, Public Order, Security"
            },
            {
                "id": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "href": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "name": "Blockchain (DLT)"
            },
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            },
            {
                "id": "urn:ngsi-ld:category:910fe9c1-400b-4c4b-82ab-67e8b6b33e23",
                "href": "urn:ngsi-ld:category:910fe9c1-400b-4c4b-82ab-67e8b6b33e23",
                "name": "Healthcare"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:50f66432-359a-4ef0-9381-9b362f82beb2",
                "href": "urn:ngsi-ld:product-offering-price:50f66432-359a-4ef0-9381-9b362f82beb2",
                "name": "Pricing Information"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This agreement (“License”) is entered into between [Your Company Name] (“Licensor”) and the party acquiring this license (“Licensee”) for the use and distribution of the electronic signature service (“Service”) on the designated marketplace.\n\n* Scope of License: Licensor grants Licensee a non-exclusive, non-transferable, and revocable license to offer the Service in the marketplace solely under Licensor's branding and in compliance with applicable laws.\n* Intellectual Property: All rights, title, and interest in and to the Service, including any associated documentation, trademarks, and intellectual property, remain the exclusive property of Licensor.\n* Limitations: Licensee shall not modify, sublicense, or distribute the Service outside the marketplace without prior written consent from Licensor.\n* Fees and Revenue Sharing: Revenue generated through the marketplace shall be subject to the terms agreed upon by both parties, as detailed in the accompanying revenue-sharing agreement.\n* Liability and Warranties: The Service is provided \"as-is,\" and Licensor disclaims all warranties, whether express or implied, to the maximum extent permitted by law. Licensor's liability is limited to direct damages not exceeding the amount paid under this License.\n* Termination: Licensor may terminate this License with 30 days' written notice or immediately if Licensee breaches the terms.\n\nBy using or distributing the Service in the marketplace, the Licensee agrees to the terms set forth in this License.",
                "name": "Commercial License for Electronic Signature Service"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4eb37e32-5365-44d6-83bb-2176da52c0c5",
            "href": "urn:ngsi-ld:product-specification:4eb37e32-5365-44d6-83bb-2176da52c0c5",
            "name": "OpenGateway",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-11-29T11:13:24.721Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:bc35a1e6-1bc9-4fd1-ab82-f6329da89210",
        "href": "urn:ngsi-ld:product-offering:bc35a1e6-1bc9-4fd1-ab82-f6329da89210",
        "description": "This service enables businesses to send certified notifications through WhatsApp using the eDelivery platform. Leveraging the widespread use and reliability of WhatsApp, our solution ensures that your notifications are delivered securely and verifiably. eDelivery provides a robust framework for tracking and certifying each message, offering peace of mind that your communications comply with legal and regulatory standards. Ideal for important updates, legal notices, and any communication requiring proof of delivery, this service integrates seamlessly with existing systems to provide a streamlined and efficient notification process.\n\n* Web: https://digitelts.com\n* Email: info@digitelts.com",
        "isBundle": false,
        "lastUpdate": "2024-11-29T11:14:29.516106982Z",
        "lifecycleStatus": "Launched",
        "name": "Certified WhatsApp\t",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "href": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "name": "Legal, Public Order, Security"
            },
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            },
            {
                "id": "urn:ngsi-ld:category:abe7e420-c254-4610-961e-59fb65a62e5a",
                "href": "urn:ngsi-ld:category:abe7e420-c254-4610-961e-59fb65a62e5a",
                "name": "Financial Services and Insurance"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "href": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "name": "Blockchain (DLT)"
            },
            {
                "id": "urn:ngsi-ld:category:b36fa0db-2e11-470d-b073-4514a480fe6b",
                "href": "urn:ngsi-ld:category:b36fa0db-2e11-470d-b073-4514a480fe6b",
                "name": "Leisure and Entertainment"
            },
            {
                "id": "urn:ngsi-ld:category:910fe9c1-400b-4c4b-82ab-67e8b6b33e23",
                "href": "urn:ngsi-ld:category:910fe9c1-400b-4c4b-82ab-67e8b6b33e23",
                "name": "Healthcare"
            },
            {
                "id": "urn:ngsi-ld:category:cfb6079c-833b-47a5-ba27-bef9327e6f99",
                "href": "urn:ngsi-ld:category:cfb6079c-833b-47a5-ba27-bef9327e6f99",
                "name": "Employment, Recruitment, HR"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:bfc5d6cf-43b7-4847-ac12-b5ce1baeff9d",
                "href": "urn:ngsi-ld:product-offering-price:bfc5d6cf-43b7-4847-ac12-b5ce1baeff9d",
                "name": "Pricing Information"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This agreement (“License”) is entered into between [Your Company Name] (“Licensor”) and the party acquiring this license (“Licensee”) for the use and distribution of the electronic signature service (“Service”) on the designated marketplace.\n\n* Scope of License: Licensor grants Licensee a non-exclusive, non-transferable, and revocable license to offer the Service in the marketplace solely under Licensor's branding and in compliance with applicable laws.\n* Intellectual Property: All rights, title, and interest in and to the Service, including any associated documentation, trademarks, and intellectual property, remain the exclusive property of Licensor.\n* Limitations: Licensee shall not modify, sublicense, or distribute the Service outside the marketplace without prior written consent from Licensor.\n* Fees and Revenue Sharing: Revenue generated through the marketplace shall be subject to the terms agreed upon by both parties, as detailed in the accompanying revenue-sharing agreement.\n* Liability and Warranties: The Service is provided \"as-is,\" and Licensor disclaims all warranties, whether express or implied, to the maximum extent permitted by law. Licensor's liability is limited to direct damages not exceeding the amount paid under this License.\n* Termination: Licensor may terminate this License with 30 days' written notice or immediately if Licensee breaches the terms.\n\nBy using or distributing the Service in the marketplace, the Licensee agrees to the terms set forth in this License.",
                "name": "Commercial License for Electronic Signature Service"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:aadc984a-d4fa-4fc6-8c9c-7d2e20af6108",
            "href": "urn:ngsi-ld:product-specification:aadc984a-d4fa-4fc6-8c9c-7d2e20af6108",
            "name": "Certified WhatsApp",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-11-29T11:14:29.374Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:fee0daeb-c68d-4ca3-98b2-df8195a134f7",
        "href": "urn:ngsi-ld:product-offering:fee0daeb-c68d-4ca3-98b2-df8195a134f7",
        "description": "**Zoom-in your awareness**\n\n**Zoom-out your perspective**\n\nContact us: [📲](https://elliotcloud.com/)   /   [📧](mailto:idi@elliotcloud.com)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T12:05:56.421110776Z",
        "lifecycleStatus": "Launched",
        "name": "Elliot GIS",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:0fdda583-93d3-4d47-b7c4-0eee368ef0c4",
                "href": "urn:ngsi-ld:category:0fdda583-93d3-4d47-b7c4-0eee368ef0c4",
                "name": "Water Supply"
            },
            {
                "id": "urn:ngsi-ld:category:447a01cf-7205-4e96-8007-1050a733f685",
                "href": "urn:ngsi-ld:category:447a01cf-7205-4e96-8007-1050a733f685",
                "name": "Tourism and Accommodation"
            },
            {
                "id": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "href": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "name": "Energy and Utility Suppliers"
            },
            {
                "id": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "href": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "name": "Electricity"
            },
            {
                "id": "urn:ngsi-ld:category:29fa838a-3054-4f3c-aa05-49fdec32de0c",
                "href": "urn:ngsi-ld:category:29fa838a-3054-4f3c-aa05-49fdec32de0c",
                "name": "Gas"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:03157ff0-8ba6-42ba-8135-68a225b206fd",
                "href": "urn:ngsi-ld:product-offering-price:03157ff0-8ba6-42ba-8135-68a225b206fd",
                "name": "Project based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:62684c53-e148-41e0-8f61-e46aacaf8be3",
            "href": "urn:ngsi-ld:product-specification:62684c53-e148-41e0-8f61-e46aacaf8be3",
            "name": "Elliot GIS",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T12:05:56.323Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:74b38cbe-ce15-4e57-911b-cad5563b003e",
        "href": "urn:ngsi-ld:product-offering:74b38cbe-ce15-4e57-911b-cad5563b003e",
        "description": "Enterprise private cloud infrastructure\n\n\n[get in touch with us](mailto:info-dhub@eng.it) \n\nCloudENG vCloud VDC allows you to have your own \"Virtual Data Center\" consisting of a boundle of resources (CPU, RAM, Storage, Network) that can be configured and managed autonomously.  \n\n[who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-03T14:56:29.002249019Z",
        "lifecycleStatus": "Launched",
        "name": "Virtual data center VMware",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:f33b39a9-d65b-42d9-922e-a8a3a0dbd7ba",
                "href": "urn:ngsi-ld:product-offering-price:f33b39a9-d65b-42d9-922e-a8a3a0dbd7ba",
                "name": "Pay-per-use"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:be5876df-7308-44d5-980e-e42f7ef0e240",
                "href": "urn:ngsi-ld:product-offering-price:be5876df-7308-44d5-980e-e42f7ef0e240",
                "name": "Flex 48M"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:cbe97d42-164a-4f11-bf45-5487cdb0f75a",
                "href": "urn:ngsi-ld:product-offering-price:cbe97d42-164a-4f11-bf45-5487cdb0f75a",
                "name": "Flex 18M"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:0ac4c367-854c-4d14-a6bb-6a170013c296",
                "href": "urn:ngsi-ld:product-offering-price:0ac4c367-854c-4d14-a6bb-6a170013c296",
                "name": "Flex 12M"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:0f75e437-9833-4dad-a3d1-e5f6d8844164",
                "href": "urn:ngsi-ld:product-offering-price:0f75e437-9833-4dad-a3d1-e5f6d8844164",
                "name": "Flex 36M"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:2a9b518d-d136-44d2-a7b2-c47cf6678d85",
                "href": "urn:ngsi-ld:product-offering-price:2a9b518d-d136-44d2-a7b2-c47cf6678d85",
                "name": "Flex 24M"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:f7f2dc75-60e0-4fda-8928-8f8d03d8261f",
            "href": "urn:ngsi-ld:product-specification:f7f2dc75-60e0-4fda-8928-8f8d03d8261f",
            "name": "Virtual data center VMware",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-03T14:56:28.873Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0862abc7-0570-42fd-a6d4-f61322af6858",
        "href": "urn:ngsi-ld:product-offering:0862abc7-0570-42fd-a6d4-f61322af6858",
        "description": "Cloud service for medium-size urban areas.",
        "isBundle": false,
        "lastUpdate": "2024-11-28T12:55:07.884833625Z",
        "lifecycleStatus": "Launched",
        "name": "Smart City Monitor for a Mid-sized Urban area (MUA)",
        "version": "1.31",
        "category": [
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "href": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "name": "Operations"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "href": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "name": "Governance"
            },
            {
                "id": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "href": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "name": "Maintenance"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:3fc9abfd-0ebf-46d7-a641-c745e8b2eab7",
                "href": "urn:ngsi-ld:product-offering-price:3fc9abfd-0ebf-46d7-a641-c745e8b2eab7",
                "name": "Annual subscription"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This License Agreement (\"Agreement\") Cloud Service is entered into between GOLEM Integrated Microelectronics Solutions GmbH, Vienna, Austria (\"Provider\") and the user (\"User\") of the cloud-based service Smart City Monitor© at the DOME marketplace platform (\"Service\").\n\n1. LICENSE GRANT Provider grants User a non-exclusive, non-transferable license to access and use the Service including any updates, modifications, or enhancements provided by Provider for the duration of the subscription period, subject to the terms of this Agreement.\n2. ACCEPTABLE USE User agrees to use the Service only for lawful purposes and in accordance with this Agreement. User shall not directly or indirectly: a) Attempt to gain unauthorized access to the Service or its related systems or networks b) Use the Service to store or transmit infringing, libelous, or otherwise unlawful or tortious material c) Use the Service to store or transmit material in violation of third-party privacy rights d) Interfere with or disrupt the integrity or performance of the Service, (e) reverse engineer, decompile, disassemble or otherwise attempt to discover the source code, object code or underlying structure, ideas, know-how or algorithms relevant to the Service; (f) modify, translate, or create derivative works based on the Service; (g) use the Service for timesharing or service bureau purposes or otherwise for the benefit of a third party; or (h) remove any proprietary notices or labels.\n3. USER DATA User retains all rights to any data uploaded, stored, or processed through the Service (\"User Data\"). User grants Provider a license to host, copy, transmit, and display User Data as necessary to provide the Service in accordance with this Agreement.\n4. PRIVACY AND SECURITY Provider will maintain appropriate administrative, physical, and technical safeguards to protect the security and integrity of the Service and User Data. Provider's privacy policy governs the collection and use of User Data.\n5. CONFIDENTIALITY: (a) Each Party (the \"Receiving Party\") understands that the other Party (the \"Disclosing Party\") has disclosed or may disclose business, technical or financial information relating to the Disclosing Party's business (hereinafter referred to as \"Proprietary Information\" of the Disclosing Party), (b) The Receiving Party agrees: (i) to take reasonable precautions to protect such Proprietary Information, and (ii) not to use or divulge to any third person any such Proprietary Information.\n6. PROVIDER retains all right, title and interest in and to the Service, including all related Intellectual Property Rights. No rights are granted to User hereunder other than as expressly set forth herein. \"Intellectual Property Rights\" means all patent rights, copyright rights, moral rights, rights of publicity, trademark, trade dress and service mark rights, goodwill, trade secret rights and other intellectual property rights as may now exist or hereafter come into existence, and all applications therefore and registrations, renewals and extensions thereof, under the laws of any state, country, territory or other jurisdiction.\n7. FEES AND PAYMENT User agrees to pay the fees specified for the Service. Fees are non-refundable except as required by law or as explicitly stated in this Agreement. Provider reserves the right to change the Fees or applicable charges and to institute new charges and Fees at the end of the Initial Service Term or then-current renewal term, upon thirty (30) days prior notice to User.\n8. TERM AND TERMINATION This Agreement begins on the date User first accesses the Service and continues until terminated. Either party may terminate this Agreement upon 30 days' written notice. Upon termination, User's access to the Service will cease. Upon any termination, Provider may, but is not obligated to, delete archived User Data. \n9. WARRANTY DISCLAIMER THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED AND FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.\n10. NOTWITHSTANDING ANYTHING TO THE CONTRARY, PROVIDER AND ITS SUPPLIERS SHALL NOT BE RESPONSIBLE OR LIABLE WITH RESPECT TO ANY SUBJECT MATTER OF THIS AGREEMENT OR TERMS AND CONDITIONS RELATED THERETO UNDER ANY CONTRACT, NEGLIGENCE, STRICT LIABILITY OR OTHER THEORY: (A) FOR ERROR OR INTERRUPTION OF USE OR FOR LOSS OR INACCURACY OR CORRUPTION OF DATA OR COST OF PROCUREThis License Agreement (\"Agreement\") Cloud Service is entered into between GOLEM Integrated Microelectronics Solutions GmbH, Vienna, Austria (\"Provider\") and the user (\"User\") of the cloud-based service Smart City Monitor© at the DOME marketplace platform (\"Service\").\n11. LICENSE GRANT Provider grants User a non-exclusive, non-transferable license to access and use the Service including any updates, modifications, or enhancements provided by Provider for the duration of the subscription period, subject to the terms of this Agreement.\n12. ACCEPTABLE USE User agrees to use the Service only for lawful purposes and in accordance with this Agreement. User shall not directly or indirectly: a) Attempt to gain unauthorized access to the Service or its related systems or networks b) Use the Service to store or transmit infringing, libelous, or otherwise unlawful or tortious material c) Use the Service to store or transmit material in violation of third-party privacy rights d) Interfere with or disrupt the integrity or performance of the Service, (e) reverse engineer, decompile, disassemble or otherwise attempt to discover the source code, object code or underlying structure, ideas, know-how or algorithms relevant to the Service; (f) modify, translate, or create derivative works based on the Service; (g) use the Service for timesharing or service bureau purposes or otherwise for the benefit of a third party; or (h) remove any proprietary notices or labels.\n13. USER DATA User retains all rights to any data uploaded, stored, or processed through the Service (\"User Data\"). User grants Provider a license to host, copy, transmit, and display User Data as necessary to provide the Service in accordance with this Agreement.\n14. PRIVACY AND SECURITY Provider will maintain appropriate administrative, physical, and technical safeguards to protect the security and integrity of the Service and User Data. Provider's privacy policy governs the collection and use of User Data.\n15. CONFIDENTIALITY: (a) Each Party (the \"Receiving Party\") understands that the other Party (the \"Disclosing Party\") has disclosed or may disclose business, technical or financial information relating to the Disclosing Party's business (hereinafter referred to as \"Proprietary Information\" of the Disclosing Party), (b) The Receiving Party agrees: (i) to take reasonable precautions to protect such Proprietary Information, and (ii) not to use or divulge to any third person any such Proprietary Information.\n16. PROVIDER retains all right, title and interest in and to the Service, including all related Intellectual Property Rights. No rights are granted to User hereunder other than as expressly set forth herein. \"Intellectual Property Rights\" means all patent rights, copyright rights, moral rights, rights of publicity, trademark, trade dress and service mark rights, goodwill, trade secret rights and other intellectual property rights as may now exist or hereafter come into existence, and all applications therefore and registrations, renewals and extensions thereof, under the laws of any state, country, territory or other jurisdiction.\n17. FEES AND PAYMENT User agrees to pay the fees specified for the Service. Fees are non-refundable except as required by law or as explicitly stated in this Agreement. Provider reserves the right to change the Fees or applicable charges and to institute new charges and Fees at the end of the Initial Service Term or then-current renewal term, upon thirty (30) days prior notice to User.\n18. TERM AND TERMINATION This Agreement begins on the date User first accesses the Service and continues until terminated. Either party may terminate this Agreement upon 30 days' written notice. Upon termination, User's access to the Service will cease. Upon any termination, Provider may, but is not obligated to, delete archived User Data. \n19. WARRANTY DISCLAIMER THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED AND FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.\n20. NOTWITHSTANDING ANYTHING TO THE CONTRARY, PROVIDER AND ITS SUPPLIERS SHALL NOT BE RESPONSIBLE OR LIABLE WITH RESPECT TO ANY SUBJECT MATTER OF THIS AGREEMENT OR TERMS AND CONDITIONS RELATED THERETO UNDMENT OF SUBSTITUTE GOODS, SERVICES OR TECHNOLOGY OR LOSS OF BUSINESS; (B) FOR ANY INDIRECT, EXEMPLARY, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES; (C) FOR ANY MATTER BEYOND PROVIDER'S REASONABLE CONTROL; OR (D) FOR ANY AMOUNTS THAT, TOGETHER WITH AMOUNTS ASSOCIATED WITH ALL OTHER CLAIMS, EXCEED THE FEES PAID BY USER TO PROVIDER FOR THE SERVICE UNDER THIS AGREEMENT IN THE 12 MONTHS PRIOR TO THE ACT THAT GAVE RISE TO THE LIABILITY, IN EACH CASE, WHETHER OR NOT PROVIDER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n21. GOVERNING LAW This Agreement shall be governed by and construed in accordance with the laws of Austria without regard to its conflict of law provisions.\n22. ENTIRE AGREEMENT This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings, whether written or oral. If any provision of this Agreement is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that this Agreement will otherwise remain in full force and effect and enforceable. This Agreement is not assignable, transferable or sublicensable by User except with Provider's prior written consent.\n\nBy accessing or using the Service, User acknowledges that they have read, understood, and agree to be bound by the terms of this Agreement.",
                "name": "CLOUD SERVICE LICENSE AGREEMENT"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:04fd7758-1716-4201-9dc2-268a0b094968",
            "href": "urn:ngsi-ld:product-specification:04fd7758-1716-4201-9dc2-268a0b094968",
            "name": "Smart City Monitor extended",
            "version": "1.31"
        },
        "validFor": {
            "startDateTime": "2024-11-28T12:55:07.662Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:a4b5a344-a551-4dc9-a83f-fa89b92bda41",
        "href": "urn:ngsi-ld:product-offering:a4b5a344-a551-4dc9-a83f-fa89b92bda41",
        "description": "Agricolus APIs Forecast allow an immediate integration with the development of forecast models for phenology, irrigation, fertilization, harmful insects, and plant diseases, available for 130 crops\n\n- [get in touch with us](mailto:marketing@teamdev.it)\n- [who we are](https://teamdevecosystem.it/en/)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T06:31:23.740971098Z",
        "lifecycleStatus": "Launched",
        "name": "Agricolus APIs Forecast",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:f2fb8fa0-737b-4170-bae6-10141b00bd52",
                "href": "urn:ngsi-ld:product-offering-price:f2fb8fa0-737b-4170-bae6-10141b00bd52",
                "name": "Agricolus APIs Forecast yearly subscription"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This End-User Licence Agreement (“EULA”) is a legal agreement between the User (either an individual or a single entity) and Teamdev for the use of Agricolus APIs Forecast. This EULA governs the use of the Product provided by Teamdev.  \n\n**1. Definitions**\n\nWhen used in this Licence Agreement, the following capitalized terms shall have the meaning set forth below.  \n\n - **Licence** means the terms and conditions described below  \n- **Product or Products** means the Agricolus APIs Forecast made available by DOME to the User and any data and content accessed through the Product.  \n- Agricolus APIs Forecast are API that allow an immediate integration with the development of forecast models for phenology, irrigation, fertilization, harmful insects, and plant diseases, available for 130 crops. \n- **End-User/User/Customer** the subject authorized to use the Product as provided by the present Terms and Conditions \n- **Source Code** means the Software text written in its programming language; \n- **Platform** refers to the infrastructure which stores and disseminates Products and/or derivative works to Users, which is named DOME \n- **Party** means the User, or Teamdev, or together the **Parties**.  \n- **Personal Data** any information that are related to the User and allowing its identification as natural person. It includes information such as name, mailing address, email address, phone number \n\n**2. Licence**\n\nThe End-User is hereby granted by Teamdev a revocable, limited, non-exclusive, non-trasfereable licence a) to access and use against payment the Product, strictly in accordance with this Agreement; b) distribute or allow access to the Product integration or to derivative work from the Product.  \nAll rights in the Product not expressly granted in this Agreement are retained by Teamdev.  \nThe Product is made available for access within the specific portal that will be indicated to the Customer, accessible by the latter through their credentials.  \n\nThe User shall not:  \n - share, resell, assign, timeshare, distribute or tranfer the Product, unless it is a processing or derivative work from the Product ;  \n- use and/or disseminate unauthorized or falsified Licence codes; \n- remove any proprietary notices, labels, or marks from the Product;  \n- transfer or sublicence the Product to any other party; \n- circumvent technical limitations and technological measures in the Product; \n- markets, in any capacity, the Product. \n\nIn the event of a breach, the Licence will be terminated immediately and Teamdev will be compensated for any further damage caused. \n\n**3. Attribution**\n\nThe End-User must include an attribution to Agricolus S.r.l. in any derivative work made based on the Product. The attribution must include, at minimum, the main licensor name: Agricolus S.r.l. and VAT number: 06716550485 \n\n**4. Intellectual Property Protection**\n\nThe Product is licenced by Teamdev by specific agreement with the main licensor, and is protected by Italian, European and International copyright and other intellectual property laws. This User Licence therefore does not grant User any IP rights to such content. The User is aware of this circumstance and declares to accept it without reservation, together with the fact that the Licence will only allow the access and use the Product. \nThis Licence and User right to use the Product terminate automatically if the latter violates any part of this Agreement.  \n\n**5. Price and payment plan**\n\nAll sales of Product to User/Customer shall be at the price detailed indicated below:  \n- The cost to access the Product is € 10.000,00  \n- The payment must be done through Dome Portal according to the payment methods and rules provided by Dome Terms and Conditions.  \n\n**6. Duration and termination**\n\nThe End-user right to access and use the Product ends upon the expiration of DOME subscription credentials.  \nTeamdev may terminate this EULA at any time if the User fails to comply with any term(s) of this Agreement.  \n\n**7. Limited warranty**\n\nTeamdev warrants that the Product is provided “as is” and with all faults.  \nExcept for this express limited warranty, Teamdev makes no warranties, whether express, implied, statutory or in any communication with the User, and Teamdev specifically disclaims any other warranty including the implied warranty of merchantability or fitness for a  particular purpose. Teamdev does not warrant that the operation of the Product will be uninterrupted or error free.  \n\n**8. Limitation of liability**\n\nIn no event shall Teamdev be liable for any damages, whether arising for tort or contract, including loss of data, lost profits, or other special, incidental, consequential, or indirect damages arising out of the use or inability to use the Product. \nTeamdev’s total liability for any damages shall not exceed the amount actually paid by the End-User for the Product. \n\n**9. General**\n\nThis agreement constitutes the entire agreement between the User and Teamdev and supersedes any prior agreement concerning the Product. This Agreement is governed by the Italian laws, without regard to its conflict of law rules.  \nAny legal actions or proceeding relating to or arising from this Licence Agreement shall be settled by the Court of Perugia, Italy. \n\n**10. Privacy**\n\nIn performing the services covered by the Agreement, Teamdev undertakes to process the personal data provided by the User in compliance with the provisions of EU Regulation 2016/679 of the European Parliament and of the Council of 27 April 2016 (the \"GDPR\") as well as D.Lgs. 196/2003 and s.m.i. (the \"Privacy Code\"). \n\n _version of  20 June 2024_ ",
                "name": "End-User Licence Agreement"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:451e1040-2b33-47c5-91ce-becb97fbd165",
            "href": "urn:ngsi-ld:product-specification:451e1040-2b33-47c5-91ce-becb97fbd165",
            "name": "Agricolus APIs Forecast",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-04T06:31:23.594Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:299edde7-2539-4b4c-8fbd-52b8124ef7d2",
        "href": "urn:ngsi-ld:product-offering:299edde7-2539-4b4c-8fbd-52b8124ef7d2",
        "description": " **AI-supported detection of component anomalies** \n\nContact: [✉️](mailto:info@inno-focus.com)  [🔗](https://www.inno-focus.com/en/software-and-consulting-for-digitization-collaboration-and-industry-4-0/)\n\nOur AI-supported inline quality control system offers an innovative solution for the automatic detection of component anomalies, such as blowholes or hardness differences in the material, during the milling process. By utilizing advanced AI algorithms, these defects can be identified during machining, simplifying initial quality control and ensuring comprehensive control without additional effort. \n\nWith our solution, component manufacturers can enhance the efficiency of their manufacturing processes and reduce quality costs by minimizing inspection efforts and detecting defective parts at an early stage. The increase in overall efficiency can be achieved by sending a data-based error message to material production. For this purpose, we recommend a connection to our overall CuttingEdge World system. \n\n\n **How does it work?** \n\nMachine-integrated signals, such as the power consumption of the spindle at a low sampling rate of a few Hertz, were sufficient for the images shown here. To detect even small cavities, a higher-frequency and sensitive sensor system is required. \n\nVarious external sensors can be used for this purpose, which, in combination with the machine data, allow sufficiently accurate detection of the conspicuous area and provide the data basis for a targeted evaluation. Users receive the results in the form of product-related 2D and 3D graphics that show them the critical or faulty areas. \n\nThe unique selling point is the connection of the recorded signals (2D representation) with the real component geometry (3D representation). This connection enables the clear detection and localization of defects. \n\n\n **What are the benefits?** \n\n- Complete inline quality control based on process data during processing \n- Early detection of defects in the component \n- Early decision regarding rework or scrapping possible \n- Reduction in testing effort from targeted testing of critical parts to complete elimination \n- Cost reduction as rework is reduced or further processing of scrap parts is avoided \n- Fact-based optimization of upstream processes instead of costly claims for recourse against suppliers \n- Medium-term increase in production efficiency, including in the form of shorter throughput times \n- Improvement in sustainability possible \n\n\n **Whom is the solution designed for?** \n\nThis software is suitable for all companies that machine materials with undesirable material inhomogeneities. Typical applications are: \n- Metallic cast materials with cavities \n- All metals that must not have any inhomogeneities due to welding \n- Wood with knotholes or knots \n- Sintered materials and ceramic materials with pores and/or material inhomogeneities \n\nIdeally, this service is used as an additional component in our overall CuttingEdge World system (see Service) for the digitization and analysis of machining. \n\n **Further services** \n\nIn addition to the software components described here, we offer you further services to integrate them seamlessly into your existing systems. We will be happy to advise you. \n\n- As-is analysis \n- System design \n- System implementation \n- System integration: This service will usually run on-premises in the cloud. An Azure environment is preferred for this. \n- Individualized evaluations ",
        "isBundle": false,
        "lastUpdate": "2024-07-12T09:54:04.113236737Z",
        "lifecycleStatus": "Launched",
        "name": "AI-supported detection of component anomalies",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "href": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "name": "Other (manufacturing)"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "href": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "name": "Manufacturing of Metal Products"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:33fed356-1c94-44d4-aad5-e2a0d6210f7f",
                "href": "urn:ngsi-ld:product-offering-price:33fed356-1c94-44d4-aad5-e2a0d6210f7f",
                "name": "Enterprise"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:0c6dee49-6f48-429a-a667-3e6148e348b1",
            "href": "urn:ngsi-ld:product-specification:0c6dee49-6f48-429a-a667-3e6148e348b1",
            "name": "AI-supported detection of component anomalies",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-12T09:54:03.963Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:b64c4722-52d1-44fb-94e5-4f549464fd02",
        "href": "urn:ngsi-ld:product-offering:b64c4722-52d1-44fb-94e5-4f549464fd02",
        "description": "Agricolus’s APIs Imagery allows you to easily integrate your offer with vegetation indices elaboration, prescription maps creation, and the identification of management zones obtained from satellite images.\n\n- [get in touch with us](mailto:marketing@teamdev.it)\n- [who we are](https://teamdevecosystem.it/en/)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T06:31:47.486180774Z",
        "lifecycleStatus": "Launched",
        "name": "Agricolus APIs Imagery",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:293c00c5-3dfe-4115-ba3a-87f3d15e2102",
                "href": "urn:ngsi-ld:product-offering-price:293c00c5-3dfe-4115-ba3a-87f3d15e2102",
                "name": "Agricolus APIs Imagery yearly subscription"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This End-User License Agreement (“EULA”) is a legal agreement between the User (either an individual or a single entity) and Teamdev for the use of Agricolus Imagery API. This EULA governs the use of the Product provided by Teamdev.  \n\n**1. Definitions**\n\nWhen used in this Licence Agreement, the following capitalized terms shall have the meaning set forth below.  \n\n- **Licence** means the terms and conditions described below  \n- **Product or Products** means the Agricolus Imagery API made available by DOME to the User and any data and content accessed through the Product.  \n- Agricolus’s APIs Imagery are libraries which allows an immediate integration with vegetation indices elaboration capabilities, prescription maps creation, and the identification of management zones obtained from satellite images. The vegetation indices comprehends vigour, chlorophyl and water stress indices and make it possible to assess the health and development status of the crop, with precise and constant remote monitoring. ​ \n- **End-User/User/Customer** the subject authorized to use the Product as provided by the present Terms and Conditions \n- **Source Code** means the Software text written in its programming language; \n- **Platform** refers to the infrastructure which stores and disseminates Products and/or derivative works to Users, which is named DOME \n- **Party** means the User, or Teamdev, or together the **Parties**.  \n- **Personal Data** any information that are related to the User and allowing its identification as natural person. It includes information such as name, mailing address, email address, phone number \n\n**2. Licence**\n\nThe End-User is hereby granted by Teamdev a revocable, limited, non-exclusive, non-trasfereable licence a) to access and use against payment the Product, strictly in accordance with this Agreement; b) distribute or allow access to the Product integration or to derivative work from the Product.  \nAll rights in the Product not expressly granted in this Agreement are retained by Teamdev.  \nThe Product is made available for access within the specific portal that will be indicated to the Customer, accessible by the latter through their credentials.  \n\nThe User shall not:  \n- share, resell, assign, timeshare, distribute or tranfer the Product, unless it is a processing or derivative work from the Product ;  \n- use and/or disseminate unauthorized or falsified Licence codes; \n- remove any proprietary notices, labels, or marks from the Product;  \n- transfer or sublicence the Product to any other party; \n- circumvent technical limitations and technological measures in the Product; \n- markets, in any capacity, the Product. \n\nIn the event of a breach, the Licence will be terminated immediately and Teamdev will be compensated for any further damage caused. \n\n**3. Attribution**\n\nThe End-User must include an attribution to Agricolus S.r.l. in any derivative work made based on the Product. The attribution must include, at minimum, the main licensor name: Agricolus S.r.l. and VAT number: 06716550485 \n\n**4. Intellectual Property Protection**\n\nThe Product is licenced by Teamdev by specific agreement with the main licensor, and is protected by Italian, European and International copyright and other intellectual property laws. This User Licence therefore does not grant User any IP rights to such content. The User is aware of this circumstance and declares to accept it without reservation, together with the fact that the Licence will only allow the access and use the Product. \nThis Licence and User right to use the Product terminate automatically if the latter violates any part of this Agreement \n\n**5. Price and payment plan**\n\nAll sales of Product to User/Customer shall be at the price detailed indicated below:  \n- The cost to download the Product is € 10.000,00  \n- The payment must be done through Dome Portal according to the payment methods provided by Dome Terms and Conditions \n\n**6. Duration and termination**\n\nThe End-user right to access and use the Product ends upon the expiration of DOME subscription credentials.  \nTeamdev may terminate this EULA at any time if the User fails to comply with any term(s) of this Agreement.  \n\n**7. Limited warranty**\n\nTeamdev warrants that the Product is provided “as is” and with all faults.  \nExcept for this express limited warranty, Teamdev makes no warranties, whether express, implied, statutory or in any communication with the User, and Teamdev specifically disclaims any other warranty including the implied warranty of merchantability or fitness for a  particular purpose. Teamdev does not warrant that the operation of the Product will be uninterrupted or error free.  \n\n**8. Limitation of liability**\n\nIn no event shall Teamdev be liable for any damages, whether arising for tort or contract, including loss of data, lost profits, or other special, incidental, consequential, or indirect damages arising out of the use or inability to use the Product. \nTeamdev’s total liability for any damages shall not exceed the amount actually paid by the End-User for the Product. \n\n**9. General**\n\nThis agreement constitutes the entire agreement between the User and Teamdev and supersedes any prior agreement concerning the Product. This Agreement is governed by the Italian laws, without regard to its conflict of law rules.  \nAny legal actions or proceeding relating to or arising from this Licence Agreement shall be settled by the Court of Perugia, Italy. \n\n**10. Privacy**\n\nIn performing the services covered by the Agreement, Teamdev undertakes to process the personal data provided by the User in compliance with the provisions of EU Regulation 2016/679 of the European Parliament and of the Council of 27 April 2016 (the \"GDPR\") as well as D.Lgs. 196/2003 and s.m.i. (the \"Privacy Code\"). \n\n _version of 14 June 2024_ ",
                "name": "End-User Licence Agreement"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7e482ae3-e405-4dca-892b-9d0944934908",
            "href": "urn:ngsi-ld:product-specification:7e482ae3-e405-4dca-892b-9d0944934908",
            "name": "Agricolus APIs Imagery",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-04T06:31:47.351Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:a9d61837-2fc7-4a2e-ac5d-c241180fa49b",
        "href": "urn:ngsi-ld:product-offering:a9d61837-2fc7-4a2e-ac5d-c241180fa49b",
        "description": "This service allows manufacturing SMEs to execute and monitor processes that have been designed in BPMN (Business Process Model and Notation). It can orchestrate tasks, automated decision-making, assignment of tasks to automated agents (software and hardware) and Web Interface for interactin with Humans (tasklist, input, task confirmation, etc.).\n\n[Learn more about RAMP.eu, the Robotics and Automation Marketplace](https://ramp.eu) \\\n[Get in touch with us](mailto:noreply@ramp.eu)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T07:33:42.995759196Z",
        "lifecycleStatus": "Launched",
        "name": "Process Orchestrator",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:d5a7650c-ddce-46a6-8eba-c85b1c03cec7",
                "href": "urn:ngsi-ld:category:d5a7650c-ddce-46a6-8eba-c85b1c03cec7",
                "name": "Process management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:31622c92-f85e-4d62-925f-3c1fe44630fa",
                "href": "urn:ngsi-ld:product-offering-price:31622c92-f85e-4d62-925f-3c1fe44630fa",
                "name": "Design and implementation of process"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:5107a9f5-4fe8-47cb-a60b-1f4cd0c0a999",
                "href": "urn:ngsi-ld:product-offering-price:5107a9f5-4fe8-47cb-a60b-1f4cd0c0a999",
                "name": "Execution of 5 processes, with a maximum of 30 concurrent instances"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:8ba80db7-56de-44f1-bace-8842f4ea5ca9",
                "href": "urn:ngsi-ld:product-offering-price:8ba80db7-56de-44f1-bace-8842f4ea5ca9",
                "name": "Execution of 1 process, with maximum of 5 concurrent instances"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "The EUPL is a European Free/Open Source Software (F/OSS) licence created on the initiative of the European Commission. More information here: https://commission.europa.eu/content/european-union-public-licence_en",
                "name": "European Union Public Licence"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4f0b4dd8-af08-441f-a2da-14c5f0cee142",
            "href": "urn:ngsi-ld:product-specification:4f0b4dd8-af08-441f-a2da-14c5f0cee142",
            "name": "Process Orchestrator",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T07:33:43.424Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:3ccb7d87-3d52-4e16-bed7-f072224c5497",
        "href": "urn:ngsi-ld:product-offering:3ccb7d87-3d52-4e16-bed7-f072224c5497",
        "description": "The IONOS Managed NextCloud Solution is a robust cloud platform designed to facilitate seamless collaboration and secure data management for businesses. This comprehensive solution offers a fully managed infrastructure, ensuring reliable performance and scalability.\n\nFor more details about the product: https://www.ionos.co.uk/office-solutions/managed-nextcloud-hosting",
        "isBundle": false,
        "lastUpdate": "2024-09-04T14:56:34.373820703Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Managed NextCloud Solution",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:85abf08a-aea7-4c18-9151-5f4d39d44240",
                "href": "urn:ngsi-ld:product-offering-price:85abf08a-aea7-4c18-9151-5f4d39d44240",
                "name": "By Subscription"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:b4095dee-bbcf-4914-ae43-4c5702c235e2",
            "href": "urn:ngsi-ld:product-specification:b4095dee-bbcf-4914-ae43-4c5702c235e2",
            "name": "IONOS Managed NextCloud Solution",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-09-04T14:56:34.093Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:f4b1fd69-eb0e-41b2-a20a-d1047ba14ddb",
        "href": "urn:ngsi-ld:product-offering:f4b1fd69-eb0e-41b2-a20a-d1047ba14ddb",
        "description": "Voting enables shareholders to participate in key company decisions from anywhere in the world, using any device. Whether it's electing board members, approving mergers, or making pivotal strategic decisions, our platform ensures that every voice is heard loud and clear. With features like anonymous voting, real-time results, and encrypted security, Voting is not just a tool; it's a movement towards a more inclusive and democratic corporate environment.\n\nContact us at sales@beia.ro",
        "isBundle": false,
        "lastUpdate": "2024-12-04T12:40:34.555646204Z",
        "lifecycleStatus": "Launched",
        "name": "Voting Platform",
        "version": "5.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "href": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "name": "Governance"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:e9d9cf6f-b9f7-4254-a0a2-2ac696fd5f1c",
                "href": "urn:ngsi-ld:product-offering-price:e9d9cf6f-b9f7-4254-a0a2-2ac696fd5f1c",
                "name": "Fee per voting session"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "Sessions",
                "name": "Sessions"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a941a1cb-0c23-4527-a008-3ec6e2701073",
            "href": "urn:ngsi-ld:product-specification:a941a1cb-0c23-4527-a008-3ec6e2701073",
            "name": "Voting",
            "version": "5.0"
        },
        "validFor": {
            "startDateTime": "2024-12-04T12:40:34.084Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:027f8308-a300-450d-83b2-14394ef02a6e",
        "href": "urn:ngsi-ld:product-offering:027f8308-a300-450d-83b2-14394ef02a6e",
        "description": "Privacy-Preserving Machine Learning and Analytics\n\nThe Federated Al Learning Platform (FedX) utilizes a technique which trains machine learning algorithms across multiple decentralized servers without sharing their data. By using the FedX, you get a secure and fast access to the data, while preserving privacy and gaining useful insights.\nFor more details see product [website](https://www.egroup.hu/software-products/smart-data/federated-ai-learning-platform/) .\n\nIterested?  [Contact us](https://www.egroup.hu/company/contact-us/).\n",
        "isBundle": false,
        "lastUpdate": "2024-07-04T13:03:53.533340812Z",
        "lifecycleStatus": "Launched",
        "name": "FedX - Federated AI Learning Platform",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5db75606-3863-4bfc-8cc9-5fef43883e4d",
                "href": "urn:ngsi-ld:category:5db75606-3863-4bfc-8cc9-5fef43883e4d",
                "name": "Knowledge management"
            },
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            },
            {
                "id": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "href": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "name": "Business Analytics"
            },
            {
                "id": "urn:ngsi-ld:category:a80c1b36-c056-404b-af2c-de0a0eb736b9",
                "href": "urn:ngsi-ld:category:a80c1b36-c056-404b-af2c-de0a0eb736b9",
                "name": "Data product distribution and exchange"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "href": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "name": "Development and Testing"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:ec4bcaf9-4cbc-4ddb-bf05-ed7990216039",
                "href": "urn:ngsi-ld:product-offering-price:ec4bcaf9-4cbc-4ddb-bf05-ed7990216039",
                "name": "Contact us"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7a980eb9-b967-4ad0-b163-56a85ea0eb72",
            "href": "urn:ngsi-ld:product-specification:7a980eb9-b967-4ad0-b163-56a85ea0eb72",
            "name": "FedX - Federated AI Learning Platform",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T13:03:53.379Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4f439569-c6cf-4aba-a2e8-17c2ff349cf4",
        "href": "urn:ngsi-ld:product-offering:4f439569-c6cf-4aba-a2e8-17c2ff349cf4",
        "description": "The Stackable Data Platform is a universal Big Data distribution system, which serves as the base technology to orchestrate, deploy, scale, and manage Big Data within your IONOS Cloud infrastructure.\n\nFor more details about the product: https://cloud.ionos.com/solutions/managed-stackable",
        "isBundle": false,
        "lastUpdate": "2024-09-04T14:56:20.019983128Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Managed Stackable Data Platform",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:8b28f41b-5684-4f55-9860-899f907eb30a",
                "href": "urn:ngsi-ld:product-offering-price:8b28f41b-5684-4f55-9860-899f907eb30a",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7d049c1c-d18e-402a-a0b5-a0ff0cf820d2",
            "href": "urn:ngsi-ld:product-specification:7d049c1c-d18e-402a-a0b5-a0ff0cf820d2",
            "name": "IONOS Managed Stackable Data Platform",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-09-04T14:56:19.716Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:f8e224b0-445d-4dcd-900d-a9de29830867",
        "href": "urn:ngsi-ld:product-offering:f8e224b0-445d-4dcd-900d-a9de29830867",
        "description": "**Don't miss a drop from your water network**\n\n**Elliot**>>**Data**>>**Analysis**>>**Performance**\n\nContact us: [📲](https://elliotcloud.com/)   /   [📧](mailto:idi@elliotcloud.com)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T12:11:28.632296922Z",
        "lifecycleStatus": "Launched",
        "name": "Elliot Water",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:0fdda583-93d3-4d47-b7c4-0eee368ef0c4",
                "href": "urn:ngsi-ld:category:0fdda583-93d3-4d47-b7c4-0eee368ef0c4",
                "name": "Water Supply"
            },
            {
                "id": "urn:ngsi-ld:category:03636940-23b7-42a4-aea3-baacabdf5164",
                "href": "urn:ngsi-ld:category:03636940-23b7-42a4-aea3-baacabdf5164",
                "name": "Waste Collection, Treatment and Disposal Activities"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:ad4ee382-e278-4ff3-9022-6baf65c8b946",
                "href": "urn:ngsi-ld:product-offering-price:ad4ee382-e278-4ff3-9022-6baf65c8b946",
                "name": "Project based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:86e7c196-71a2-4ac4-a3b9-d7b591515f82",
            "href": "urn:ngsi-ld:product-specification:86e7c196-71a2-4ac4-a3b9-d7b591515f82",
            "name": "Elliot Water",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T12:11:28.540Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:321dc5f8-666d-426e-a82b-1169ad436fd7",
        "href": "urn:ngsi-ld:product-offering:321dc5f8-666d-426e-a82b-1169ad436fd7",
        "description": "Private docker registry with unlimitted number of users and repositories, shareable on request. Includes automated vulnerability scanner with recommendations to enhance your application's security and Helm charts features.\n\n[Learn more about RAMP.eu, the Robotics and Automation Marketplace](https://ramp.eu) \\\n[Get in touch with us](mailto:noreply@ramp.eu)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T07:35:02.207172331Z",
        "lifecycleStatus": "Launched",
        "name": "Private docker registry",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "href": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "name": "Development and Testing"
            },
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:64eb5d47-f8e4-478b-9a4d-07836e109828",
                "href": "urn:ngsi-ld:product-offering-price:64eb5d47-f8e4-478b-9a4d-07836e109828",
                "name": "Private Repositories with unlimited users"
            }
        ],
        "productOfferingTerm": [
            {
                "name": "European Union Public License"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:bfa2a05f-3eab-4380-a1da-109010aed762",
            "href": "urn:ngsi-ld:product-specification:bfa2a05f-3eab-4380-a1da-109010aed762",
            "name": "Private docker registry",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T07:35:02.654Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:36f39d2c-93cb-437d-8bda-9400b26a45da",
        "href": "urn:ngsi-ld:product-offering:36f39d2c-93cb-437d-8bda-9400b26a45da",
        "description": "Grid360 is Libelium's proposal for Efficiency in Energy Transportation. Grid360 emerges as a cutting-edge solution, enhancing energy transportation efficiency by up to 30% through IoT technology. ",
        "isBundle": false,
        "lastUpdate": "2024-07-05T16:02:03.700647323Z",
        "lifecycleStatus": "Launched",
        "name": "Smart Energy Transportation - by Libelium",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "href": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "name": "Energy and Utility Suppliers"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "href": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "name": "Electricity"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:077ffa23-64f2-4a7a-9d33-dffd362126e0",
                "href": "urn:ngsi-ld:product-offering-price:077ffa23-64f2-4a7a-9d33-dffd362126e0",
                "name": "Project-based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:b6e96f18-e674-4b14-a466-e15540fcfe02",
            "href": "urn:ngsi-ld:product-specification:b6e96f18-e674-4b14-a466-e15540fcfe02",
            "name": "Smart Energy Transportation",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-05T16:02:03.566Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:73a949ac-a492-4de4-a106-35de37261cd2",
        "href": "urn:ngsi-ld:product-offering:73a949ac-a492-4de4-a106-35de37261cd2",
        "description": "Nivola PaaS (Platform as a Service) provides computing DB PostgreSQL resources (vCPU, vRAM, HDD) and network with pay-per-use payment and network addressing plan. The backup is included with standard retention of 7 or 14 days It is mandatory to choose 1 maintenance plan from those available: Developer (low priority), Standard (business office time), Premium (H24)\n\n \n [Nivola Web](https://www.nivolapiemonte.it/en/homepage-english/) \n\n <a href=\"mailto:info@nivolapiemonte.it\">Get in touch with us</a>",
        "isBundle": false,
        "lastUpdate": "2024-12-11T12:32:39.069110609Z",
        "lifecycleStatus": "Launched",
        "name": "Nivola PaaS (DBaaS PostgreSQL)",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ca1a7bea-8435-402d-b182-242915217266",
                "href": "urn:ngsi-ld:category:ca1a7bea-8435-402d-b182-242915217266",
                "name": "Database"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "href": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "name": "Governmental Administration and Regulation"
            },
            {
                "id": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "href": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "name": "Community Groups, Social, Political and Religious"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:4fce06b2-bb57-4761-ba87-c2ade5616eba",
                "href": "urn:ngsi-ld:product-offering-price:4fce06b2-bb57-4761-ba87-c2ade5616eba",
                "name": "1 instance maintenance plan Standard"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:c29dcb24-5b19-478d-bd8a-1b7cd18e6319",
                "href": "urn:ngsi-ld:product-offering-price:c29dcb24-5b19-478d-bd8a-1b7cd18e6319",
                "name": "1 GB Ram PostgreSql "
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:b66bca52-bd5c-4835-b8a3-480873fe8aeb",
                "href": "urn:ngsi-ld:product-offering-price:b66bca52-bd5c-4835-b8a3-480873fe8aeb",
                "name": "1 instance maintenance plan Developer"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:120c771b-7a45-438a-ba68-4f2a5ad07269",
                "href": "urn:ngsi-ld:product-offering-price:120c771b-7a45-438a-ba68-4f2a5ad07269",
                "name": "1 CPU PostgreSql "
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:42065f59-c08a-4523-b848-85f778079f3e",
                "href": "urn:ngsi-ld:product-offering-price:42065f59-c08a-4523-b848-85f778079f3e",
                "name": "1 instance maintenance plan Premium"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:c361450e-adbc-463e-a770-8e098e0cd60a",
                "href": "urn:ngsi-ld:product-offering-price:c361450e-adbc-463e-a770-8e098e0cd60a",
                "name": "1 GB Storage PostgreSql"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4b3ade6b-61a7-427a-9a35-aa5c29102519",
            "href": "urn:ngsi-ld:product-specification:4b3ade6b-61a7-427a-9a35-aa5c29102519",
            "name": "PaaS (DBaaS)",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-11T12:32:39.262Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:53721bda-431a-4566-995b-0b33ea020ddc",
        "href": "urn:ngsi-ld:product-offering:53721bda-431a-4566-995b-0b33ea020ddc",
        "description": "The Libelium IoT solution for Smart Parking is based on sensors that detect the availability of indoor and outdoor parking with the combination of 2 detection systems: **Radar** and **Magnetic**, which provides higher accuracy and better performance and stability. Other features are:\n\n- Robust waterproof IP68 and IK10 enclosure. The device is protected inside a small and extremely tough enclosure. It is IP68 rated, which means it remains waterproof even submerged in water. Resistant to tampering and vandalism. It is certified for IK10, the maximum rating for external mechanical impacts. Wide range of temperature: -20ºC to 65ºC.\n- Battery life. A low-consumption electronic design and a high-capacity battery (10,400 mAh) allow more than 10 years of uninterrupted operation (it depends on parameters such as the distance to the Base Station or the number of packets sent per day).\n- Almost zero maintenance is needed. Devices are not affected by dirt, dust, rain or oil spills.\n- Two ways of installation: on surface and semi-buried.\n- LoRaWAN communication protocol.\n\nThe Smart Parking solution reduces stress for visitors when searching for available spaces. It also enables cities to monitor and manage parking spaces, improve traffic flow and increase city revenue. This information is a very helpful tool for enforcement officers. They are able to go directly to the occupied places to verify that they have paid for the parking and make sure that the places for the disabled are occupied by vehicles authorized to do so.",
        "isBundle": false,
        "lastUpdate": "2024-07-05T16:02:19.878311431Z",
        "lifecycleStatus": "Launched",
        "name": "Smart Parking - by Libelium",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:4e416d59-6294-46ec-913b-68d34e7ae6ba",
                "href": "urn:ngsi-ld:category:4e416d59-6294-46ec-913b-68d34e7ae6ba",
                "name": "Automotive"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "href": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "name": "Transportation and Transportation infrastructure"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:b8211c86-16f2-4cd5-9b36-c3013e79f6b7",
                "href": "urn:ngsi-ld:product-offering-price:b8211c86-16f2-4cd5-9b36-c3013e79f6b7",
                "name": "Project-based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:8c75df7c-e71e-405d-bf67-37dbab592d61",
            "href": "urn:ngsi-ld:product-specification:8c75df7c-e71e-405d-bf67-37dbab592d61",
            "name": "Smart Parking",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-05T16:02:19.717Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:13a0a99b-c75b-4502-8352-804ba7f95475",
        "href": "urn:ngsi-ld:product-offering:13a0a99b-c75b-4502-8352-804ba7f95475",
        "description": "Nivola is the cloud of CSI.\nNivola PaaS (Platform as a Service) provides computing DB resources (vCPU, vRAM, HDD) and network with pay-per-use payment and network addressing plan .\nThe backup is included with standard retention of  7 or 14 days\nIt is necessary to choose a maintenance plan from those available: Developer, Standard (business office time), Premium (H24)\n\n\n [Nivola Web](https://www.nivolapiemonte.it/en/homepage-english/) \n\n <a href=\"mailto:info@nivolapiemonte.it\">Get in touch with us</a>",
        "isBundle": false,
        "lastUpdate": "2024-12-11T12:32:06.213494434Z",
        "lifecycleStatus": "Launched",
        "name": "Nivola PaaS (DBaaS Oracle)",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ca1a7bea-8435-402d-b182-242915217266",
                "href": "urn:ngsi-ld:category:ca1a7bea-8435-402d-b182-242915217266",
                "name": "Database"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "href": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "name": "Governmental Administration and Regulation"
            },
            {
                "id": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "href": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "name": "Community Groups, Social, Political and Religious"
            },
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:0512f197-9e3b-4fb0-9526-af003f23185f",
                "href": "urn:ngsi-ld:product-offering-price:0512f197-9e3b-4fb0-9526-af003f23185f",
                "name": "1 CPU Oracle  Enterprise"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:fd3f39a8-88f2-47af-9ab7-aac45d659dd9",
                "href": "urn:ngsi-ld:product-offering-price:fd3f39a8-88f2-47af-9ab7-aac45d659dd9",
                "name": "1 GB Ram Oracle Enterprise"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:825ae2b8-83da-4bb6-8996-1b9ed373104a",
                "href": "urn:ngsi-ld:product-offering-price:825ae2b8-83da-4bb6-8996-1b9ed373104a",
                "name": "1 instance maintenance plan Standard"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:fe5c5f72-2635-49fe-a131-d5132f79ad46",
                "href": "urn:ngsi-ld:product-offering-price:fe5c5f72-2635-49fe-a131-d5132f79ad46",
                "name": "1 instance maintenance plan Developer"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:6f29c58d-29e1-4cc7-af45-d90bf933333e",
                "href": "urn:ngsi-ld:product-offering-price:6f29c58d-29e1-4cc7-af45-d90bf933333e",
                "name": "1 instance maintenance plan Premium"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:53a639cb-6c4e-4d65-a76d-555004617665",
                "href": "urn:ngsi-ld:product-offering-price:53a639cb-6c4e-4d65-a76d-555004617665",
                "name": "1 GB Storage Dbms Oracle Enterprise"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4b3ade6b-61a7-427a-9a35-aa5c29102519",
            "href": "urn:ngsi-ld:product-specification:4b3ade6b-61a7-427a-9a35-aa5c29102519",
            "name": "PaaS (DBaaS)",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-11T12:32:06.485Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:25eb1773-62c4-4e65-9d4e-4d593f00a749",
        "href": "urn:ngsi-ld:product-offering:25eb1773-62c4-4e65-9d4e-4d593f00a749",
        "description": "Libelium offers complete IoT solutions for precision agriculture, including a wide range of sensors for a variety of applications. For example, sensors to guarantee accurate irrigation, optimal nutrition of the crops and constant predictive advice based on real data, in order to increase yield and reduce costs.\n\nMain features:\n\n- Real time information for daily monitoring even in isolated locations.\n- High quality sensors.\n- Accurate weather stations.\n- Light and radiation sensors: ultraviolet radiation, photosynthetic active radiation (PAR), shortwave radiation.\n- Soil morphology and fertilizer presence by measuring: electrical conductivity, volumetric water content, soil water potentials, oxygen levels.\n- Daily monitoring of plants/fruits growth by measuring the trunk, stem and/or fruit diameter with the dendrometers.\n- Predictive models powered by Artificial Intelligence, to guide managers and optimize aspects, such as water or agrochemicals, thanks to real-time data monitoring and analysis.\n",
        "isBundle": false,
        "lastUpdate": "2024-07-05T16:02:38.256125912Z",
        "lifecycleStatus": "Launched",
        "name": "Precision Agriculture - by Libelium",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "href": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "name": "Business Analytics"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:7f3cd4ac-dd0c-4ec5-92ba-438a77a9873a",
                "href": "urn:ngsi-ld:product-offering-price:7f3cd4ac-dd0c-4ec5-92ba-438a77a9873a",
                "name": "Project-based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:f96257c7-db86-4308-be93-b1274129e627",
            "href": "urn:ngsi-ld:product-specification:f96257c7-db86-4308-be93-b1274129e627",
            "name": "Precision Agriculture",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-05T16:02:38.104Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:55d15309-872c-4b98-85d4-c02f7d7f2ab1",
        "href": "urn:ngsi-ld:product-offering:55d15309-872c-4b98-85d4-c02f7d7f2ab1",
        "description": "test",
        "isBundle": false,
        "lastUpdate": "2024-07-02T13:22:36.192184858Z",
        "lifecycleStatus": "Obsolete",
        "name": "Test product",
        "version": "0.1",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:5c0b9c7e-82f6-4c04-b602-20f30a9ab684",
                "href": "urn:ngsi-ld:product-offering-price:5c0b9c7e-82f6-4c04-b602-20f30a9ab684",
                "name": "100 usd"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "approved",
                "name": "treaty"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7582d360-ae10-4012-9291-046393149652",
            "href": "urn:ngsi-ld:product-specification:7582d360-ae10-4012-9291-046393149652",
            "name": "test",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-02T13:22:35.991Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e09ac4ab-5eac-497e-80f1-bdf4b1e8e499",
        "href": "urn:ngsi-ld:product-offering:e09ac4ab-5eac-497e-80f1-bdf4b1e8e499",
        "description": "Zoom-in your **awareness**. Zoom-out your **perspective**.",
        "isBundle": false,
        "lastUpdate": "2024-07-02T14:48:50.623991619Z",
        "lifecycleStatus": "Obsolete",
        "name": "Elliot GIS",
        "version": "0.1",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:11a4af1b-04f2-4095-9875-a56dc1c05763",
                "href": "urn:ngsi-ld:product-offering-price:11a4af1b-04f2-4095-9875-a56dc1c05763"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:62684c53-e148-41e0-8f61-e46aacaf8be3",
            "href": "urn:ngsi-ld:product-specification:62684c53-e148-41e0-8f61-e46aacaf8be3",
            "name": "Elliot GIS",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-02T14:48:51.022Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:bbc01e1c-c22d-4981-aab8-da0bdd80218e",
        "href": "urn:ngsi-ld:product-offering:bbc01e1c-c22d-4981-aab8-da0bdd80218e",
        "description": "",
        "isBundle": false,
        "lastUpdate": "2024-07-02T15:46:30.860697081Z",
        "lifecycleStatus": "Retired",
        "name": "customs",
        "version": "0.1",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:d5b25628-0609-403f-ad71-a87b69051b34",
                "href": "urn:ngsi-ld:product-offering-price:d5b25628-0609-403f-ad71-a87b69051b34",
                "name": "another custom"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:05822eee-3c3e-4bd1-8f59-2505d73eff03",
                "href": "urn:ngsi-ld:product-offering-price:05822eee-3c3e-4bd1-8f59-2505d73eff03",
                "name": "custom plan"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:84ce2d44-7cff-4a9c-9c39-b0bbdbbd0aed",
            "href": "urn:ngsi-ld:product-specification:84ce2d44-7cff-4a9c-9c39-b0bbdbbd0aed",
            "name": "FICODES Product",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-02T15:46:30.729Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:81346322-4e4e-4aed-ac06-b831077ad48f",
        "href": "urn:ngsi-ld:product-offering:81346322-4e4e-4aed-ac06-b831077ad48f",
        "description": "**Fly your city assets on autopilot**\n\n**Elliot**>>**Data**>>**Planning**>>**Efficiency**\n\nContact us: [📲](https://elliotcloud.com/)   /   [📧](mailto:idi@elliotcloud.com)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T12:05:45.476755909Z",
        "lifecycleStatus": "Launched",
        "name": "Elliot Smart City",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:0fdda583-93d3-4d47-b7c4-0eee368ef0c4",
                "href": "urn:ngsi-ld:category:0fdda583-93d3-4d47-b7c4-0eee368ef0c4",
                "name": "Water Supply"
            },
            {
                "id": "urn:ngsi-ld:category:03636940-23b7-42a4-aea3-baacabdf5164",
                "href": "urn:ngsi-ld:category:03636940-23b7-42a4-aea3-baacabdf5164",
                "name": "Waste Collection, Treatment and Disposal Activities"
            },
            {
                "id": "urn:ngsi-ld:category:2c54b902-3354-4529-9b6d-e9bb449f2397",
                "href": "urn:ngsi-ld:category:2c54b902-3354-4529-9b6d-e9bb449f2397",
                "name": "Transport of Persons"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "href": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "name": "Energy and Utility Suppliers"
            },
            {
                "id": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "href": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "name": "Transportation and Transportation infrastructure"
            },
            {
                "id": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "href": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "name": "Operations"
            },
            {
                "id": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "href": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "name": "Governance"
            },
            {
                "id": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "href": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "name": "Electricity"
            },
            {
                "id": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "href": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "name": "Maintenance"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:f5ed5e00-d1c3-4f99-b3bd-8628ba87d1c0",
                "href": "urn:ngsi-ld:product-offering-price:f5ed5e00-d1c3-4f99-b3bd-8628ba87d1c0",
                "name": "Project based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:2ac3e133-61df-437e-a073-9f43c338087f",
            "href": "urn:ngsi-ld:product-specification:2ac3e133-61df-437e-a073-9f43c338087f",
            "name": "Elliot Smart City",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T12:05:45.298Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4665c311-3bb2-4bb1-a3d8-a47ad80ae4c9",
        "href": "urn:ngsi-ld:product-offering:4665c311-3bb2-4bb1-a3d8-a47ad80ae4c9",
        "description": "**Zoom-in your awareness**\n\n**Zoom-out your perspective**",
        "isBundle": false,
        "lastUpdate": "2024-07-02T16:35:48.600336292Z",
        "lifecycleStatus": "Obsolete",
        "name": "zz_wrong_Elliot GIS",
        "version": "0.1",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:c9a16f0c-47a5-46a5-a892-d1368cb04ea6",
                "href": "urn:ngsi-ld:product-offering-price:c9a16f0c-47a5-46a5-a892-d1368cb04ea6",
                "name": "Project based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:2ac3e133-61df-437e-a073-9f43c338087f",
            "href": "urn:ngsi-ld:product-specification:2ac3e133-61df-437e-a073-9f43c338087f",
            "name": "Elliot Smart City",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-02T16:35:48.858Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:fb0c7482-941a-4cfe-80e3-888462573e82",
        "href": "urn:ngsi-ld:product-offering:fb0c7482-941a-4cfe-80e3-888462573e82",
        "description": "Cloud service for small-size urban areas.",
        "isBundle": false,
        "lastUpdate": "2024-11-28T12:55:23.006856637Z",
        "lifecycleStatus": "Launched",
        "name": "Smart City Monitor for a Small-sized Urban area (SUA)",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "href": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "name": "Operations"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "href": "urn:ngsi-ld:category:7e54033a-88f7-45a6-9f94-89db71133889",
                "name": "Governance"
            },
            {
                "id": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "href": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "name": "Maintenance"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:695516f1-4fcb-4f4e-b4e4-5b8c06fab0c8",
                "href": "urn:ngsi-ld:product-offering-price:695516f1-4fcb-4f4e-b4e4-5b8c06fab0c8",
                "name": "Annual subscription"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "This License Agreement (\"Agreement\") Cloud Service is entered into between GOLEM Integrated Microelectronics Solutions GmbH, Vienna, Austria (\"Provider\") and the user (\"User\") of the cloud-based service Smart City Monitor© at the DOME marketplace platform (\"Service\").\n\n1. LICENSE GRANT Provider grants User a non-exclusive, non-transferable license to access and use the Service including any updates, modifications, or enhancements provided by Provider for the duration of the subscription period, subject to the terms of this Agreement.\n2. ACCEPTABLE USE User agrees to use the Service only for lawful purposes and in accordance with this Agreement. User shall not directly or indirectly: a) Attempt to gain unauthorized access to the Service or its related systems or networks b) Use the Service to store or transmit infringing, libelous, or otherwise unlawful or tortious material c) Use the Service to store or transmit material in violation of third-party privacy rights d) Interfere with or disrupt the integrity or performance of the Service, (e) reverse engineer, decompile, disassemble or otherwise attempt to discover the source code, object code or underlying structure, ideas, know-how or algorithms relevant to the Service; (f) modify, translate, or create derivative works based on the Service; (g) use the Service for timesharing or service bureau purposes or otherwise for the benefit of a third party; or (h) remove any proprietary notices or labels.\n3. USER DATA User retains all rights to any data uploaded, stored, or processed through the Service (\"User Data\"). User grants Provider a license to host, copy, transmit, and display User Data as necessary to provide the Service in accordance with this Agreement.\n4. PRIVACY AND SECURITY Provider will maintain appropriate administrative, physical, and technical safeguards to protect the security and integrity of the Service and User Data. Provider's privacy policy governs the collection and use of User Data.\n5. CONFIDENTIALITY: (a) Each Party (the \"Receiving Party\") understands that the other Party (the \"Disclosing Party\") has disclosed or may disclose business, technical or financial information relating to the Disclosing Party's business (hereinafter referred to as \"Proprietary Information\" of the Disclosing Party), (b) The Receiving Party agrees: (i) to take reasonable precautions to protect such Proprietary Information, and (ii) not to use or divulge to any third person any such Proprietary Information.\n6. PROVIDER retains all right, title and interest in and to the Service, including all related Intellectual Property Rights. No rights are granted to User hereunder other than as expressly set forth herein. \"Intellectual Property Rights\" means all patent rights, copyright rights, moral rights, rights of publicity, trademark, trade dress and service mark rights, goodwill, trade secret rights and other intellectual property rights as may now exist or hereafter come into existence, and all applications therefore and registrations, renewals and extensions thereof, under the laws of any state, country, territory or other jurisdiction.\n7. FEES AND PAYMENT User agrees to pay the fees specified for the Service. Fees are non-refundable except as required by law or as explicitly stated in this Agreement. Provider reserves the right to change the Fees or applicable charges and to institute new charges and Fees at the end of the Initial Service Term or then-current renewal term, upon thirty (30) days prior notice to User.\n8. TERM AND TERMINATION This Agreement begins on the date User first accesses the Service and continues until terminated. Either party may terminate this Agreement upon 30 days' written notice. Upon termination, User's access to the Service will cease. Upon any termination, Provider may, but is not obligated to, delete archived User Data. \n9. WARRANTY DISCLAIMER THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED AND FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.\n10. NOTWITHSTANDING ANYTHING TO THE CONTRARY, PROVIDER AND ITS SUPPLIERS SHALL NOT BE RESPONSIBLE OR LIABLE WITH RESPECT TO ANY SUBJECT MATTER OF THIS AGREEMENT OR TERMS AND CONDITIONS RELATED THERETO UNDER ANY CONTRACT, NEGLIGENCE, STRICT LIABILITY OR OTHER THEORY: (A) FOR ERROR OR INTERRUPTION OF USE OR FOR LOSS OR INACCURACY OR CORRUPTION OF DATA OR COST OF PROCUREThis License Agreement (\"Agreement\") Cloud Service is entered into between GOLEM Integrated Microelectronics Solutions GmbH, Vienna, Austria (\"Provider\") and the user (\"User\") of the cloud-based service Smart City Monitor© at the DOME marketplace platform (\"Service\").\n11. LICENSE GRANT Provider grants User a non-exclusive, non-transferable license to access and use the Service including any updates, modifications, or enhancements provided by Provider for the duration of the subscription period, subject to the terms of this Agreement.\n12. ACCEPTABLE USE User agrees to use the Service only for lawful purposes and in accordance with this Agreement. User shall not directly or indirectly: a) Attempt to gain unauthorized access to the Service or its related systems or networks b) Use the Service to store or transmit infringing, libelous, or otherwise unlawful or tortious material c) Use the Service to store or transmit material in violation of third-party privacy rights d) Interfere with or disrupt the integrity or performance of the Service, (e) reverse engineer, decompile, disassemble or otherwise attempt to discover the source code, object code or underlying structure, ideas, know-how or algorithms relevant to the Service; (f) modify, translate, or create derivative works based on the Service; (g) use the Service for timesharing or service bureau purposes or otherwise for the benefit of a third party; or (h) remove any proprietary notices or labels.\n13. USER DATA User retains all rights to any data uploaded, stored, or processed through the Service (\"User Data\"). User grants Provider a license to host, copy, transmit, and display User Data as necessary to provide the Service in accordance with this Agreement.\n14. PRIVACY AND SECURITY Provider will maintain appropriate administrative, physical, and technical safeguards to protect the security and integrity of the Service and User Data. Provider's privacy policy governs the collection and use of User Data.\n15. CONFIDENTIALITY: (a) Each Party (the \"Receiving Party\") understands that the other Party (the \"Disclosing Party\") has disclosed or may disclose business, technical or financial information relating to the Disclosing Party's business (hereinafter referred to as \"Proprietary Information\" of the Disclosing Party), (b) The Receiving Party agrees: (i) to take reasonable precautions to protect such Proprietary Information, and (ii) not to use or divulge to any third person any such Proprietary Information.\n16. PROVIDER retains all right, title and interest in and to the Service, including all related Intellectual Property Rights. No rights are granted to User hereunder other than as expressly set forth herein. \"Intellectual Property Rights\" means all patent rights, copyright rights, moral rights, rights of publicity, trademark, trade dress and service mark rights, goodwill, trade secret rights and other intellectual property rights as may now exist or hereafter come into existence, and all applications therefore and registrations, renewals and extensions thereof, under the laws of any state, country, territory or other jurisdiction.\n17. FEES AND PAYMENT User agrees to pay the fees specified for the Service. Fees are non-refundable except as required by law or as explicitly stated in this Agreement. Provider reserves the right to change the Fees or applicable charges and to institute new charges and Fees at the end of the Initial Service Term or then-current renewal term, upon thirty (30) days prior notice to User.\n18. TERM AND TERMINATION This Agreement begins on the date User first accesses the Service and continues until terminated. Either party may terminate this Agreement upon 30 days' written notice. Upon termination, User's access to the Service will cease. Upon any termination, Provider may, but is not obligated to, delete archived User Data. \n19. WARRANTY DISCLAIMER THE SERVICE IS PROVIDED \"AS IS\" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED AND FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.\n20. NOTWITHSTANDING ANYTHING TO THE CONTRARY, PROVIDER AND ITS SUPPLIERS SHALL NOT BE RESPONSIBLE OR LIABLE WITH RESPECT TO ANY SUBJECT MATTER OF THIS AGREEMENT OR TERMS AND CONDITIONS RELATED THERETO UNDMENT OF SUBSTITUTE GOODS, SERVICES OR TECHNOLOGY OR LOSS OF BUSINESS; (B) FOR ANY INDIRECT, EXEMPLARY, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES; (C) FOR ANY MATTER BEYOND PROVIDER'S REASONABLE CONTROL; OR (D) FOR ANY AMOUNTS THAT, TOGETHER WITH AMOUNTS ASSOCIATED WITH ALL OTHER CLAIMS, EXCEED THE FEES PAID BY USER TO PROVIDER FOR THE SERVICE UNDER THIS AGREEMENT IN THE 12 MONTHS PRIOR TO THE ACT THAT GAVE RISE TO THE LIABILITY, IN EACH CASE, WHETHER OR NOT PROVIDER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.\n21. GOVERNING LAW This Agreement shall be governed by and construed in accordance with the laws of Austria without regard to its conflict of law provisions.\n22. ENTIRE AGREEMENT This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings, whether written or oral. If any provision of this Agreement is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that this Agreement will otherwise remain in full force and effect and enforceable. This Agreement is not assignable, transferable or sublicensable by User except with Provider's prior written consent.\n\nBy accessing or using the Service, User acknowledges that they have read, understood, and agree to be bound by the terms of this Agreement.",
                "name": "CLOUD SERVICE LICENSE AGREEMENT"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:e88d2768-4ab7-4bb2-b510-095e136904cb",
            "href": "urn:ngsi-ld:product-specification:e88d2768-4ab7-4bb2-b510-095e136904cb",
            "name": "Smart City Monitor minimum",
            "version": "1.31"
        },
        "validFor": {
            "startDateTime": "2024-11-28T12:55:22.856Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:3ca7aff0-6a45-42e5-a3c7-15fb18afd54d",
        "href": "urn:ngsi-ld:product-offering:3ca7aff0-6a45-42e5-a3c7-15fb18afd54d",
        "description": "Introducing BEIA's comprehensive Air Quality Monitoring Service, featuring advanced sensors for real-time environmental assessment. Our system targets many categories, like conductivity and salinity, suspended solids; turbidity, sludge film etc. Ideal for urban planners, environmental agencies, and health organizations, our service delivers accurate air quality insights through an intuitive web interface - GRAFANA, where you can see your data in real-time. Ensure a healthier environment with BEIA's cutting-edge monitoring technology!",
        "isBundle": false,
        "lastUpdate": "2024-07-26T11:33:03.069036660Z",
        "lifecycleStatus": "Launched",
        "name": "Water Quality Monitoring IoT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:3ecbc88e-4dec-42a0-bc4a-d22f1e07010d",
                "href": "urn:ngsi-ld:product-offering-price:3ecbc88e-4dec-42a0-bc4a-d22f1e07010d",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:58bba98e-c3be-46d5-bd6c-84e8ba8b2faa",
            "href": "urn:ngsi-ld:product-specification:58bba98e-c3be-46d5-bd6c-84e8ba8b2faa",
            "name": "Water Quality Monitoring",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T11:33:02.723Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8566959d-f64d-48c8-ba4f-ce7eb65209f0",
        "href": "urn:ngsi-ld:product-offering:8566959d-f64d-48c8-ba4f-ce7eb65209f0",
        "description": "Allows the integration of web UIs of applications that are located in different servers in a common graphical, desktop-like environment.\n\n[Learn more about RAMP.eu, the Robotics and Automation Marketplace](https://ramp.eu) \\\n[Get in touch with us](mailto:noreply@ramp.eu)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T07:35:11.931891596Z",
        "lifecycleStatus": "Launched",
        "name": "AppHub",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:627d0bad-2b63-4e67-bf0b-751a52f7356c",
                "href": "urn:ngsi-ld:product-offering-price:627d0bad-2b63-4e67-bf0b-751a52f7356c",
                "name": "Private AppHub"
            }
        ],
        "productOfferingTerm": [
            {
                "name": "European Union Public License"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:140c2f8c-f779-4a10-bb2c-c6d15e36e99c",
            "href": "urn:ngsi-ld:product-specification:140c2f8c-f779-4a10-bb2c-c6d15e36e99c",
            "name": "AppHub",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T07:35:12.379Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:b74b0c52-8dff-4745-ae87-0089cd95b670",
        "href": "urn:ngsi-ld:product-offering:b74b0c52-8dff-4745-ae87-0089cd95b670",
        "description": "Nivola is the cloud of CSI.\nNivola IaaS (Infrastructure as a Service) provides computing resources (vCPU, vRAM, HDD) and network with pay-per-use payment\n\n [Nivola Web](https://www.nivolapiemonte.it/en/homepage-english/) \n\n <a href=\"mailto:info@nivolapiemonte.it\">Get in touch with us</a>\n\n",
        "isBundle": false,
        "lastUpdate": "2024-12-11T12:31:52.367245366Z",
        "lifecycleStatus": "Launched",
        "name": "Nivola IaaS",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "href": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "name": "Governmental Administration and Regulation"
            },
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "href": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "name": "Community Groups, Social, Political and Religious"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:92058aa6-3983-4172-9339-726100b09d92",
                "href": "urn:ngsi-ld:product-offering-price:92058aa6-3983-4172-9339-726100b09d92",
                "name": "1 vCPU"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:bd1e9a94-fa66-4e60-9937-61cfef8ce26b",
                "href": "urn:ngsi-ld:product-offering-price:bd1e9a94-fa66-4e60-9937-61cfef8ce26b",
                "name": "1 GB Backup as a Service for Open Source VM "
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:193b19c2-6c46-4e6f-8322-d14ea177039c",
                "href": "urn:ngsi-ld:product-offering-price:193b19c2-6c46-4e6f-8322-d14ea177039c",
                "name": "1 GB vDisk Low"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:3b854df1-b2f3-405a-a7b9-9f079360667d",
                "href": "urn:ngsi-ld:product-offering-price:3b854df1-b2f3-405a-a7b9-9f079360667d",
                "name": "1 License Windows O.S. for WM"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:b2d60190-6dd0-4f15-ab66-b793ae3aa647",
                "href": "urn:ngsi-ld:product-offering-price:b2d60190-6dd0-4f15-ab66-b793ae3aa647",
                "name": "1 GB RAM"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:206bd964-3543-4731-a5f6-57f251aedb14",
                "href": "urn:ngsi-ld:product-offering-price:206bd964-3543-4731-a5f6-57f251aedb14",
                "name": "1 License OSS Enterprise O.S. for VM "
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:0f4c66af-dd34-4b65-a354-aacbded5c863",
                "href": "urn:ngsi-ld:product-offering-price:0f4c66af-dd34-4b65-a354-aacbded5c863",
                "name": "1 GB Backup as a Service for Commercial VM"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:9a6fd57f-d615-4751-9733-843c40b54be7",
                "href": "urn:ngsi-ld:product-offering-price:9a6fd57f-d615-4751-9733-843c40b54be7",
                "name": "1 GB vDisk Performance"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:ebb9274a-5259-4d59-a5ce-e922a1f6eda9",
            "href": "urn:ngsi-ld:product-specification:ebb9274a-5259-4d59-a5ce-e922a1f6eda9",
            "name": "IaaS",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-11T12:31:52.610Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:5eed1a47-45a5-4a5f-b270-6cd0a41c4bad",
        "href": "urn:ngsi-ld:product-offering:5eed1a47-45a5-4a5f-b270-6cd0a41c4bad",
        "description": "Nivola is the cloud of CSI.\nNivola StaaS (Storage as a Service) provides storage and network with pay-per-use payment\n\n\n [Nivola Web](https://www.nivolapiemonte.it/en/homepage-english/) \n\n <a href=\"mailto:info@nivolapiemonte.it\">Get in touch with us</a>",
        "isBundle": false,
        "lastUpdate": "2024-12-11T12:32:27.922908040Z",
        "lifecycleStatus": "Launched",
        "name": "Nivola STaaS",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "href": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "name": "Storage"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "href": "urn:ngsi-ld:category:a08118b1-b146-448e-acab-e4cd700af349",
                "name": "Governmental Administration and Regulation"
            },
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "href": "urn:ngsi-ld:category:18c29b15-9ee2-4860-a9fe-cd16f7d7110c",
                "name": "Community Groups, Social, Political and Religious"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:4a51bc46-10b2-422d-84fc-230e51fa4cad",
                "href": "urn:ngsi-ld:product-offering-price:4a51bc46-10b2-422d-84fc-230e51fa4cad",
                "name": "1 GB Replica Premium Storage on Alternative Site"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:75d7ba26-df00-4da0-badd-712d6a15ae13",
                "href": "urn:ngsi-ld:product-offering-price:75d7ba26-df00-4da0-badd-712d6a15ae13",
                "name": "1 GB Replica Lowrange Storage on Alternative Site"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:6ed8a183-eb5b-4973-b2c8-4804e1a16267",
                "href": "urn:ngsi-ld:product-offering-price:6ed8a183-eb5b-4973-b2c8-4804e1a16267",
                "name": "1 GB Disk Space Storage Premium"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:69595328-2436-48da-a26a-5def4847a497",
                "href": "urn:ngsi-ld:product-offering-price:69595328-2436-48da-a26a-5def4847a497",
                "name": "1 GB Disk Space Storage Lorrange"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:1efe2dfa-a691-4d73-8251-349638d850aa",
            "href": "urn:ngsi-ld:product-specification:1efe2dfa-a691-4d73-8251-349638d850aa",
            "name": "STaaS",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-11T12:32:28.193Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0f190729-9743-499a-a631-1a2475de9953",
        "href": "urn:ngsi-ld:product-offering:0f190729-9743-499a-a631-1a2475de9953",
        "description": "The IONOS AI Model Hub is a comprehensive platform that empowers developers to easily implement advanced AI functionalities. You can enhance your applications' capabilities by leveraging managed foundation models, vector databases, and advanced retrieval augmented generation techniques while ensuring security and compliance. Explore the potential of IONOS AI Model Hub Service to transform your AI projects today.\n\nFor more details about the product: https://cloud.ionos.de/managed/ai-model-hub",
        "isBundle": false,
        "lastUpdate": "2024-08-26T17:36:23.362879470Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS AI Model Hub",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:6b09b754-74a4-44d0-aab2-692c9f8ce398",
                "href": "urn:ngsi-ld:product-offering-price:6b09b754-74a4-44d0-aab2-692c9f8ce398",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:585dfa2b-2aaf-4b69-91a6-d4b7c1bcb74e",
            "href": "urn:ngsi-ld:product-specification:585dfa2b-2aaf-4b69-91a6-d4b7c1bcb74e",
            "name": "IONOS AI Model Hub",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-08-26T17:36:23.151Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:56e25495-1b64-4103-883a-c7f1643fbaa3",
        "href": "urn:ngsi-ld:product-offering:56e25495-1b64-4103-883a-c7f1643fbaa3",
        "description": "#### Welcome to PaaSPort 4.0, the next-gen digital platform engineered to redefine the synergy between port operations and innovation ecosystems. \nAt the heart of our mission is the transformation of ports into dynamic Port Innovation Hubs, accelerating the digital transition of maritime logistics through cutting-edge Data as a Service (DaaS) and Technology as a Service (TaaS) offerings. ",
        "isBundle": false,
        "lastUpdate": "2024-07-17T08:35:16.386016835Z",
        "lifecycleStatus": "Launched",
        "name": "PaaSPort 4.0",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "href": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "name": "Business Analytics"
            },
            {
                "id": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "href": "urn:ngsi-ld:category:37cc8b7f-8875-41e1-94e7-7fbb5117553d",
                "name": "Transportation and Transportation infrastructure"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:19c958a9-c2c6-4be7-a027-dfed14ef74f3",
                "href": "urn:ngsi-ld:product-offering-price:19c958a9-c2c6-4be7-a027-dfed14ef74f3",
                "name": "Subscription"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:0b3ef025-9ddb-4a8b-b6a9-77eb2da3097c",
            "href": "urn:ngsi-ld:product-specification:0b3ef025-9ddb-4a8b-b6a9-77eb2da3097c",
            "name": "PaaSPort 4.0",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-17T08:35:16.255Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:1ce3a119-fbfd-4885-954d-b0b326bd39b9",
        "href": "urn:ngsi-ld:product-offering:1ce3a119-fbfd-4885-954d-b0b326bd39b9",
        "description": "Block Storage is a type of IT architecture in which data is stored as a file system. It provides endless possibilities for storing large amounts of information. It guarantees the safety of resource planning systems and provides instant access to the required amount of data without delay.\n\nFor more details about the product: https://cloud.ionos.com/storage/block-storage",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:23:14.946843892Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Block Storage (HDD/SSD)",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "href": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "name": "Storage"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:6bde93f2-f882-4813-8ba0-674f08aa381a",
                "href": "urn:ngsi-ld:product-offering-price:6bde93f2-f882-4813-8ba0-674f08aa381a",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:2a32ab98-4104-49bf-97b7-d0d0e1477b45",
            "href": "urn:ngsi-ld:product-specification:2a32ab98-4104-49bf-97b7-d0d0e1477b45",
            "name": "IONOS Block Storage (HDD/SSD)",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:23:14.440Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:62205e8a-7950-4c3f-9760-25c82982fdee",
        "href": "urn:ngsi-ld:product-offering:62205e8a-7950-4c3f-9760-25c82982fdee",
        "description": "A web service offering data from IoT devices installed on cows, including geolocation, activity, and surface temperature, for specific users with demonstrative or research purposes.\n\n[get in touch with us](mailto:info@digitanimal.com)\n\n[who we are](https://digitanimal.com/?lang=en)",
        "isBundle": false,
        "lastUpdate": "2024-07-15T15:05:05.815437110Z",
        "lifecycleStatus": "Launched",
        "name": "IoT Monitor",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:9ed99841-6967-45f1-9b39-6105e57a5dbe",
            "href": "urn:ngsi-ld:product-specification:9ed99841-6967-45f1-9b39-6105e57a5dbe",
            "name": "IoT Monitor",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-15T15:05:11.130Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:ccace8d0-c8f1-413d-b069-8f56b438a005",
        "href": "urn:ngsi-ld:product-offering:ccace8d0-c8f1-413d-b069-8f56b438a005",
        "description": "Your private RAMP cloud to store production data.\n\n[Learn more about RAMP.eu, the Robotics and Automation Marketplace](https://ramp.eu) \\\n[Get in touch with us](mailto:noreply@ramp.eu)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T07:34:51.126138046Z",
        "lifecycleStatus": "Launched",
        "name": "Cloud Data Store for production data",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ca1a7bea-8435-402d-b182-242915217266",
                "href": "urn:ngsi-ld:category:ca1a7bea-8435-402d-b182-242915217266",
                "name": "Database"
            },
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:16816e4a-aefc-4a7a-855b-ac48b817a2b6",
                "href": "urn:ngsi-ld:product-offering-price:16816e4a-aefc-4a7a-855b-ac48b817a2b6",
                "name": "Cloud Data Store of 100 GB"
            }
        ],
        "productOfferingTerm": [
            {
                "name": "European Union Public License"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a13f84af-3d4a-4cdf-8a44-a55d2f05a47a",
            "href": "urn:ngsi-ld:product-specification:a13f84af-3d4a-4cdf-8a44-a55d2f05a47a",
            "name": "Cloud Data Store",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T07:34:51.559Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e76c795b-63e2-4e2f-8e08-2c2001c34875",
        "href": "urn:ngsi-ld:product-offering:e76c795b-63e2-4e2f-8e08-2c2001c34875",
        "description": "Online dashboard to visualise and process production data.\n\n[Learn more about RAMP.eu, the Robotics and Automation Marketplace](https://ramp.eu) \\\n[Get in touch with us](mailto:noreply@ramp.eu)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T07:35:20.788213043Z",
        "lifecycleStatus": "Launched",
        "name": "Data Visualisation Dashboard",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:8944ad7f-35e6-407b-920f-e04689c03f1d",
                "href": "urn:ngsi-ld:product-offering-price:8944ad7f-35e6-407b-920f-e04689c03f1d",
                "name": "Base plan"
            }
        ],
        "productOfferingTerm": [
            {
                "name": "European Union Public License"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:000465da-6a28-48e6-ad9c-59c97a4607d1",
            "href": "urn:ngsi-ld:product-specification:000465da-6a28-48e6-ad9c-59c97a4607d1",
            "name": "Data Visualisation Dashboard",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T07:35:21.250Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:550ad446-79ec-4ae1-b316-838113662878",
        "href": "urn:ngsi-ld:product-offering:550ad446-79ec-4ae1-b316-838113662878",
        "description": "Innovate with a full set of RAMP tools to bring your production to the Industrial Internet of Things (IoT) era. The RAMP IIoT platform allows manufacturers to connect their shopfloor sensors and devices with the RAMP cloud.\n\n[Learn more about RAMP.eu, the Robotics and Automation Marketplace](https://ramp.eu) \\\n[Get in touch with us](mailto:noreply@ramp.eu)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T07:34:39.266163589Z",
        "lifecycleStatus": "Launched",
        "name": "RAMP IIoT platform",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:09a3e9db-dd2d-4b0f-a16d-4ce1ab3d52be",
                "href": "urn:ngsi-ld:product-offering-price:09a3e9db-dd2d-4b0f-a16d-4ce1ab3d52be",
                "name": "1 instance of RAMP IoT platform with 5 connected agents."
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:cd62a76c-1be8-4724-b0e3-8bf316276094",
                "href": "urn:ngsi-ld:product-offering-price:cd62a76c-1be8-4724-b0e3-8bf316276094",
                "name": "Integration of non FIWARE-compatible agent"
            }
        ],
        "productOfferingTerm": [
            {
                "name": "European Union Public License"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:073e780e-185e-45e7-b4ad-18038b67aa5b",
            "href": "urn:ngsi-ld:product-specification:073e780e-185e-45e7-b4ad-18038b67aa5b",
            "name": "RAMP IIoT platform",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T07:34:39.703Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:836e5e6e-0a55-4e58-8c9d-2dcf469b7098",
        "href": "urn:ngsi-ld:product-offering:836e5e6e-0a55-4e58-8c9d-2dcf469b7098",
        "description": "Out of the box kubernetes\n\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\nA Kubernetes cluster ready to be instantiated in your dedicated, multi-cloud environment.\n\n[Who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-15T11:21:25.267285460Z",
        "lifecycleStatus": "Active",
        "name": "Private K8s Cluster",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "href": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "name": "Container as a Service (CaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:9a6e92df-7e50-46e4-aaba-7ea0243c6fda",
                "href": "urn:ngsi-ld:product-offering-price:9a6e92df-7e50-46e4-aaba-7ea0243c6fda",
                "name": "EKS"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:a02d4825-9b46-4076-a842-92d1f6229f3d",
                "href": "urn:ngsi-ld:product-offering-price:a02d4825-9b46-4076-a842-92d1f6229f3d",
                "name": "AKS"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:22a069d2-3629-49b9-9e75-1a5e7d1e5185",
                "href": "urn:ngsi-ld:product-offering-price:22a069d2-3629-49b9-9e75-1a5e7d1e5185",
                "name": "GKE"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:fd4c2457-648a-47e5-b7ef-124adea802b5",
            "href": "urn:ngsi-ld:product-specification:fd4c2457-648a-47e5-b7ef-124adea802b5",
            "name": "Private K8s Cluster",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-15T11:21:25.100Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:b3742875-c7b1-49fe-a0ed-fea24c50c00a",
        "href": "urn:ngsi-ld:product-offering:b3742875-c7b1-49fe-a0ed-fea24c50c00a",
        "description": "Introducing BEIA's Advanced Air Quality Monitoring Service – a comprehensive solution designed to provide real-time insights into the air you breathe. Our state-of-the-art monitoring system incorporates high-precision sensors to measure key environmental parameters, like temperature, air humidity, atmospheric pressure. Our service offers user-friendly data visualization  on GRAFANA and analytics tools, enabling you to easily monitor air quality trends, identify pollution sources, and make informed decisions to ensure a healthier environment",
        "isBundle": false,
        "lastUpdate": "2024-07-26T10:35:39.756035990Z",
        "lifecycleStatus": "Launched",
        "name": "Air Quality Monitoring IoT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:d309395f-cf75-411c-bce6-b4d4ccd0bdb8",
                "href": "urn:ngsi-ld:product-offering-price:d309395f-cf75-411c-bce6-b4d4ccd0bdb8",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:32ead20e-1782-4670-a820-79c2ae6194a3",
            "href": "urn:ngsi-ld:product-specification:32ead20e-1782-4670-a820-79c2ae6194a3",
            "name": "Air Quality Monitoring ",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T10:35:39.479Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:17e4bfb5-8c36-4cc3-bcb1-b4b02c33359d",
        "href": "urn:ngsi-ld:product-offering:17e4bfb5-8c36-4cc3-bcb1-b4b02c33359d",
        "description": "[CloudFerro Cloud](https://cloudferro.com/#cloud) provides innovative cloud services for specialized markets such as the European space sector, climate research and science.\n\n[Get in touch with us](https://cloudferro.com/contact)\n",
        "isBundle": false,
        "lastUpdate": "2024-07-18T09:52:20.172520934Z",
        "lifecycleStatus": "Launched",
        "name": "CloudFerro Cloud",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "href": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "name": "Education"
            },
            {
                "id": "urn:ngsi-ld:category:16184f67-31f4-4684-89c1-950056c81cdf",
                "href": "urn:ngsi-ld:category:16184f67-31f4-4684-89c1-950056c81cdf",
                "name": "Science and Engineering"
            },
            {
                "id": "urn:ngsi-ld:category:3e40a325-3efc-4330-8349-aba963f074c3",
                "href": "urn:ngsi-ld:category:3e40a325-3efc-4330-8349-aba963f074c3",
                "name": "Security"
            },
            {
                "id": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "href": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "name": "Storage"
            },
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "href": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "name": "Network"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:c31e9584-24df-4768-86ba-3ea10145f7ff",
                "href": "urn:ngsi-ld:product-offering-price:c31e9584-24df-4768-86ba-3ea10145f7ff",
                "name": "CloudFerro pricing plans"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "You can find CloudFerro Terms & Conditions [here](https://cloudferro.com/terms-and-conditions)",
                "name": "CloudFerro Terms & Conditions"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:0c26e753-cd7e-4374-a227-916c44d048ca",
            "href": "urn:ngsi-ld:product-specification:0c26e753-cd7e-4374-a227-916c44d048ca",
            "name": "CloudFerro Cloud",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-18T09:52:18.317Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:96bb3ff4-4d2e-478f-bb4a-5c16c3397fb9",
        "href": "urn:ngsi-ld:product-offering:96bb3ff4-4d2e-478f-bb4a-5c16c3397fb9",
        "description": "Description: A municipality Digital Twin automatically collecting & transforming big data about urban processes into rich evidence information for citizens, businesses, administrations to let holistic sustainable transparent governance and performance management",
        "isBundle": false,
        "lastUpdate": "2024-07-03T12:04:39.631577123Z",
        "lifecycleStatus": "Retired",
        "name": "SmartCityMonitor Retired",
        "version": "1.31",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:bb95122e-d65e-4639-9b0c-5a0c236fd71c",
                "href": "urn:ngsi-ld:product-offering-price:bb95122e-d65e-4639-9b0c-5a0c236fd71c"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:04fd7758-1716-4201-9dc2-268a0b094968",
            "href": "urn:ngsi-ld:product-specification:04fd7758-1716-4201-9dc2-268a0b094968",
            "name": "Smart City Monitor extended",
            "version": "1.31"
        },
        "validFor": {
            "startDateTime": "2024-07-03T12:04:39.529Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:ef1767e3-a4a3-455c-8578-088fdb65d92c",
        "href": "urn:ngsi-ld:product-offering:ef1767e3-a4a3-455c-8578-088fdb65d92c",
        "description": "Here at BEIA, our advanced Water Level Monitoring Service utilizes state-of-the-art sensors to provide real-time data on water levels. Equipped with radar technology, our sensors ensure accurate and reliable measurements, helping you manage water resources efficiently. It is ideal for environmental monitoring, flood prevention, and water management systems. The data is visualized in a easy-to-use web interface - GRAFANA. Monitor and manage water resources effectively with BEIA's state-of-the-art technology.\n",
        "isBundle": false,
        "lastUpdate": "2024-07-26T12:14:55.249956471Z",
        "lifecycleStatus": "Launched",
        "name": "Water Level Monitoring IoT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:29fcb808-8d1c-4c36-82d5-ebdc7be7bf84",
                "href": "urn:ngsi-ld:product-offering-price:29fcb808-8d1c-4c36-82d5-ebdc7be7bf84",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:52f7f65d-4881-4045-8b30-69caefd686f1",
            "href": "urn:ngsi-ld:product-specification:52f7f65d-4881-4045-8b30-69caefd686f1",
            "name": "Water Level Monitoring",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T12:14:54.956Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0f7164c5-2bb7-49cb-99b4-f557582fa3ed",
        "href": "urn:ngsi-ld:product-offering:0f7164c5-2bb7-49cb-99b4-f557582fa3ed",
        "description": "Smart disaster recovery solution\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\nAWS Sustained Tenant is your AWS cloud account for the activation of all cloud services available on the catalog, along with an AWS expert to consult at your disposal.\n\n[Who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-10T07:59:30.373229252Z",
        "lifecycleStatus": "Active",
        "name": "AWS Sustained Tenant",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:44ff4d51-59c5-416d-94c6-9687eae26d39",
                "href": "urn:ngsi-ld:product-offering-price:44ff4d51-59c5-416d-94c6-9687eae26d39",
                "name": "Internal Tenant"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:724ffa4f-aecb-4def-9c49-849cb6c16d4e",
                "href": "urn:ngsi-ld:product-offering-price:724ffa4f-aecb-4def-9c49-849cb6c16d4e",
                "name": "Customer Tenant"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:d1df7b14-0222-42a1-b91f-fcd960ed9496",
                "href": "urn:ngsi-ld:product-offering-price:d1df7b14-0222-42a1-b91f-fcd960ed9496",
                "name": "Public Sector Tenant"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4a57b95b-1a43-48e4-8736-77693f274a59",
            "href": "urn:ngsi-ld:product-specification:4a57b95b-1a43-48e4-8736-77693f274a59",
            "name": "AWS Sustained Tenant",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-10T07:59:30.205Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:148e3079-d717-4031-835f-45577225efca",
        "href": "urn:ngsi-ld:product-offering:148e3079-d717-4031-835f-45577225efca",
        "description": "Protect your data as a service\n\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\n\nGCP Sustained Tenant is your Google Cloud cloud account for the activation of all cloud services available on the catalog, along with an Google Cloud expert to consult at your disposal.\n\n\n[who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-15T11:28:56.912687510Z",
        "lifecycleStatus": "Active",
        "name": "GCP Sustained Tenant",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:004854bf-9f1f-4424-ae02-04331206ec43",
                "href": "urn:ngsi-ld:product-offering-price:004854bf-9f1f-4424-ae02-04331206ec43",
                "name": "RECOMMENDED"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:e5f2a2af-52dc-4f62-9df0-7d6d242ce070",
            "href": "urn:ngsi-ld:product-specification:e5f2a2af-52dc-4f62-9df0-7d6d242ce070",
            "name": "GCP Sustained Tenant",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-15T11:28:56.655Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:36432efe-67d4-4a31-b72f-7f4bff9cf471",
        "href": "urn:ngsi-ld:product-offering:36432efe-67d4-4a31-b72f-7f4bff9cf471",
        "description": "<h2 style='margin-top:9.75pt;margin-right:0cm;margin-bottom:9.75pt;margin-left:0cm;font-size:21px;font-family:\"Aptos Display\",sans-serif;color:#0F4761;font-weight:normal;line-height:18.0pt;background:white;'><strong><span style=\"font-size: 18px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\">Optimize remote assistance with Click Virtual Office for efficient management of queries</span></strong></h2>\n<p style='margin-right:0cm;margin-left:0cm;font-size:15px;font-family:\"Aptos\",sans-serif;margin:0cm;margin-top:9.75pt;margin-bottom:9.75pt;line-height:15.0pt;background:white;'><span style=\"font-size: 14px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\">Click Virtual Office is a remote assistance solution for internal and/or external users to resolve queries and carry out procedures with the support of a video conferencing tool.</span></p>\n<p style='margin-right:0cm;margin-left:0cm;font-size:15px;font-family:\"Aptos\",sans-serif;margin:0cm;margin-top:9.75pt;margin-bottom:9.75pt;line-height:15.0pt;background:white;'><span style=\"font-size: 14px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\">With this solution, developed by&nbsp;</span><span style=\"font-size: 14px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\"><a href=\"https://in2.es/\" target=\"_blank\" rel=\"noopener noreferrer\">IN2</a></span><span style=\"font-size: 14px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\">, you can streamline assistance when it comes to handling procedures, inquiries, or providing guidance by reducing the need for in-person assistance in service offices.</span></p>\n<p style='margin-right:0cm;margin-left:0cm;font-size:15px;font-family:\"Aptos\",sans-serif;margin:0cm;margin-top:9.75pt;margin-bottom:9.75pt;line-height:15.0pt;background:white;'><span style=\"font-size: 14px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\">Click Virtual Office will enhance your relationship with users through the following features:</span></p>\n<ul type=\"disc\" style=\"margin-bottom:0cm;\">\n    <ul type=\"circle\" style=\"margin-bottom:0cm;\">\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Appointment scheduling, management, and integrated calendar</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Video conferencing with recording capability</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Screen sharing and document exchange</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Multi-conferencing</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Service or topic management</span></li>\n    </ul>\n</ul>\n<p style='margin-right:0cm;margin-left:0cm;font-size:15px;font-family:\"Aptos\",sans-serif;margin:0cm;margin-top:9.75pt;margin-bottom:9.75pt;line-height:15.0pt;background:white;'><span style=\"font-size: 14px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48);\">Furthermore, the solution adapts to your business needs, respecting its interoperability, avoiding rigid architectures, and offering a wide variety of integrations and extensions:</span></p>\n<ul type=\"disc\" style=\"margin-bottom:0cm;\">\n    <ul type=\"circle\" style=\"margin-bottom:0cm;\">\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Digital signature</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Live transcription</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Voice call</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Resource planning</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Certified recording</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Integration with Microsoft365</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Chatbot</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Integration with external calendars</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Citizen identification</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">Certificates</span></li>\n        <li style=\"margin: 0cm; font-size: 15px; font-family: Arial, Helvetica, sans-serif; color: rgb(50, 49, 48); line-height: 15pt; background: white;\"><span style=\"font-size: 14px;\">CO2 savings calculator</span></li>\n    </ul>\n</ul>\n<p><span style=\"font-size: 14px;\"><a href=\"https://www.youtube.com/watch?v=31d7GlQIQzU&ab_channel=IN2InnovatingTogether\" target=\"_blank\" rel=\"noopener noreferrer\">&iexcl;Watch the Click Virtual Office video!</a></span></p>",
        "isBundle": false,
        "lastUpdate": "2024-07-10T06:23:00.445475174Z",
        "lifecycleStatus": "Launched",
        "name": "Click Virtual Office",
        "version": "1.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:728d27c8-fb70-45f4-9cb3-289d254abcd0",
                "href": "urn:ngsi-ld:product-offering-price:728d27c8-fb70-45f4-9cb3-289d254abcd0",
                "name": "Contact us to find out your pricing plan"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:01922885-0240-471c-aaa1-4abe9a805f38",
            "href": "urn:ngsi-ld:product-specification:01922885-0240-471c-aaa1-4abe9a805f38",
            "name": "Click Virtual Office",
            "version": "1.1"
        },
        "validFor": {
            "startDateTime": "2024-07-10T06:23:00.273Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:a5714ece-45dd-42c4-8d07-696dac6bcfba",
        "href": "urn:ngsi-ld:product-offering:a5714ece-45dd-42c4-8d07-696dac6bcfba",
        "description": "BEIA is excited to offer a diverse range of training programs tailored to meet the needs of non-IT professionals, entrepreneurs, and innovators. Our courses are designed to provide practical knowledge and skills in Cybersecurity, Market Fit and Growth Hacking, Website Development, and Blockchain. Each training session is crafted to ensure participants gain actionable insights and hands-on experience.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T11:48:09.031725222Z",
        "lifecycleStatus": "Launched",
        "name": "Training sessions on high performance digital solutions",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            },
            {
                "id": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "href": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "name": "Education"
            },
            {
                "id": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "href": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "name": "Blockchain (DLT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:df5c72c7-2647-4ddb-8a2c-d237f4436a03",
                "href": "urn:ngsi-ld:product-offering-price:df5c72c7-2647-4ddb-8a2c-d237f4436a03",
                "name": "Training sessions on high performance digital solutions"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:e622f344-978d-44fa-8064-3f530a9340ba",
            "href": "urn:ngsi-ld:product-specification:e622f344-978d-44fa-8064-3f530a9340ba",
            "name": "Training sessions on high performance digital solutions",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T11:48:05.985Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:62dcbe67-b5cb-437e-a370-6eb6306f9390",
        "href": "urn:ngsi-ld:product-offering:62dcbe67-b5cb-437e-a370-6eb6306f9390",
        "description": " [Buy now!](https://theplatforms.odoo.com/en/shop/digital-identity-spid-18#attr=)\n\nWhat is it for?\n\nIn just a few clicks you can access the services offered by INPS, Revenue Agencies, your Municipality and your Region. You can use it to pay taxes and duties, for enrollment in education systems and public competitions and for all government bonuses. Your identity is protected by 3 levels of security and your personal data always remain on the institution's website.. \n\nYou can find here the services accessible with SPID: https://www.spid.gov.it/cos-e-spid/dove-utilizzare-spid\n\nWho is it aimed at?\n\nAll adult citizens and freelancers in possession of the required documents. If you are an Italian citizen residing abroad and you do not have a health card/tax code, you can request it through AIRE or the Consulate, also online at the Revenue Agency website, if you are a foreign citizen residing in Italy, in possession of only a residence permit, you can apply for an Italian identity card and tax code.\n\nHow does it work?\n\nAccess to the services is possible whenever, on a website or app for public administration services and adhering private individuals, there is the \"Enter with SPID\" button. Click and select EtnaID and then enter your Spid credentials (email address and personal password). Access to the services is safe and secure, also thanks to additional security checks, such as for example the sending of a temporary password (called OTP - one time password) during authentication.\n",
        "isBundle": false,
        "lastUpdate": "2024-07-04T13:57:22.885540132Z",
        "lifecycleStatus": "Launched",
        "name": "Italian Digital Identity-EtnaID",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "href": "urn:ngsi-ld:category:1a4c56d6-430a-4975-9344-edfd12d74df9",
                "name": "Legal, Public Order, Security"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:d1248301-6ae5-4e59-8d00-077b0d03c43b",
                "href": "urn:ngsi-ld:product-offering-price:d1248301-6ae5-4e59-8d00-077b0d03c43b",
                "name": "Italian Digital Identity-EtnaID-Price"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:bbd45e12-ad98-4d22-adf5-381d819c057f",
            "href": "urn:ngsi-ld:product-specification:bbd45e12-ad98-4d22-adf5-381d819c057f",
            "name": "Italian Digital Identity-EtnaID",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T13:57:31.724Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:02112c0c-99a0-4cc7-8efc-2347eb42837a",
        "href": "urn:ngsi-ld:product-offering:02112c0c-99a0-4cc7-8efc-2347eb42837a",
        "description": "Atempo secures your Microsoft 365 data to a sovereign cloud protected from foreign interference.",
        "isBundle": false,
        "lastUpdate": "2024-12-09T12:56:51.244111431Z",
        "lifecycleStatus": "Launched",
        "name": "Atempo Tina - Microsoft 365 Backup",
        "version": "4.9",
        "category": [
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:6491178c-a2ad-45c0-91bc-038b14ee9676",
                "href": "urn:ngsi-ld:product-offering-price:6491178c-a2ad-45c0-91bc-038b14ee9676",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:efa06de6-6c58-4bc8-adef-34608c0e89bc",
            "href": "urn:ngsi-ld:product-specification:efa06de6-6c58-4bc8-adef-34608c0e89bc",
            "name": " Atempo Tina - Microsoft 365 Backup",
            "version": "4.9"
        },
        "validFor": {
            "startDateTime": "2024-12-09T12:56:51.141Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:fb3600ac-e698-4b97-b01b-26c1b3dfd18b",
        "href": "urn:ngsi-ld:product-offering:fb3600ac-e698-4b97-b01b-26c1b3dfd18b",
        "description": "Professional services in a box\n\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\nOn-demand specialist support for the execution of technical and system activities during the life cycle of cloud services\n\n[Who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-05T10:05:56.570621159Z",
        "lifecycleStatus": "Active",
        "name": "Fastlane Services",
        "version": "0.1",
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:9bdecdae-92c6-4f54-b0d0-b7e560dabc90",
                "href": "urn:ngsi-ld:product-offering-price:9bdecdae-92c6-4f54-b0d0-b7e560dabc90",
                "name": "Business Plus"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:e3704118-3ca7-4674-bf01-1ac18c8c4530",
                "href": "urn:ngsi-ld:product-offering-price:e3704118-3ca7-4674-bf01-1ac18c8c4530",
                "name": "Business"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:e0d6b7ff-7140-49a7-902a-c6d9c4aad1d0",
                "href": "urn:ngsi-ld:product-offering-price:e0d6b7ff-7140-49a7-902a-c6d9c4aad1d0",
                "name": "Pro"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:4fa96afe-d245-436f-8e7e-93d4f8f2d25c",
                "href": "urn:ngsi-ld:product-offering-price:4fa96afe-d245-436f-8e7e-93d4f8f2d25c",
                "name": "Enterprise"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:1b409c49-322e-46b5-b0ea-8f7c952f36ad",
            "href": "urn:ngsi-ld:product-specification:1b409c49-322e-46b5-b0ea-8f7c952f36ad",
            "name": "Fastlane Services",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-05T10:05:56.351Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:2784b0c5-077b-483a-9791-0cde3100da08",
        "href": "urn:ngsi-ld:product-offering:2784b0c5-077b-483a-9791-0cde3100da08",
        "description": "Our User License for the Voice Package provides a scalable and flexible solution tailored to meet your business's communication needs. By leveraging our cloud-based technology, you gain access to advanced features that improve call handling, ensure effective routing, and maintain high-quality service standards. The inclusion of comprehensive reporting, real-time monitoring, and a mobile application empowers your team to manage communication efficiently and adapt to changing demands.",
        "isBundle": false,
        "lastUpdate": "2024-07-30T09:27:10.480939763Z",
        "lifecycleStatus": "Launched",
        "name": "User license for the Voice package",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "href": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "name": "Operations"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "href": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "name": "Development and Testing"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:f976e8a7-638d-48ae-9f9d-4e588a2b3db4",
                "href": "urn:ngsi-ld:product-offering-price:f976e8a7-638d-48ae-9f9d-4e588a2b3db4",
                "name": "User license for the Voice package"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:83357f1d-8b12-4a82-aff1-ee31b7995027",
            "href": "urn:ngsi-ld:product-specification:83357f1d-8b12-4a82-aff1-ee31b7995027",
            "name": "User license for the Voice package",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-30T09:27:10.420Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:08d68ab1-5e1d-48c5-a99e-ba1cc279de5c",
        "href": "urn:ngsi-ld:product-offering:08d68ab1-5e1d-48c5-a99e-ba1cc279de5c",
        "description": "Transform your city into a sustainability model. Improve air quality and encourage sustainable mobility for a greener future.\n\n[Visit](https://www.libelium.com/) or [contact us](mailto:sales@libelium.com)\n",
        "isBundle": false,
        "lastUpdate": "2024-12-02T16:28:32.202787613Z",
        "lifecycleStatus": "Launched",
        "name": "Low Emissions Zones - by Libelium",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5db75606-3863-4bfc-8cc9-5fef43883e4d",
                "href": "urn:ngsi-ld:category:5db75606-3863-4bfc-8cc9-5fef43883e4d",
                "name": "Knowledge management"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "href": "urn:ngsi-ld:category:01bc2b6f-3f91-42b0-8422-49369d233f1f",
                "name": "Business Analytics"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:97bb6fb8-06f2-4ec1-b675-58a4911e985a",
                "href": "urn:ngsi-ld:product-offering-price:97bb6fb8-06f2-4ec1-b675-58a4911e985a",
                "name": "Project-based"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:e2309a52-5893-47ed-bc73-c90a9f2c84ad",
            "href": "urn:ngsi-ld:product-specification:e2309a52-5893-47ed-bc73-c90a9f2c84ad",
            "name": "Low Emission Zones",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-12-02T16:28:32.117Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:1d434af2-5094-4d8a-ba3f-3359c28e0b06",
        "href": "urn:ngsi-ld:product-offering:1d434af2-5094-4d8a-ba3f-3359c28e0b06",
        "description": "Smart disaster recovery solution\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\n\nAzure Sustained Tenant is your Azure cloud account for the activation of all cloud services available on the catalog, along with an Azure expert to consult at your disposal.\n\n[Who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-10T07:59:03.422848033Z",
        "lifecycleStatus": "Active",
        "name": "Azure Sustained Tenant",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:e654d3d6-b585-430a-b3ad-76d13b66ab94",
                "href": "urn:ngsi-ld:product-offering-price:e654d3d6-b585-430a-b3ad-76d13b66ab94",
                "name": "RECOMMENDED"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:beb5d1ae-874e-4036-93a9-f4fed82aa84a",
            "href": "urn:ngsi-ld:product-specification:beb5d1ae-874e-4036-93a9-f4fed82aa84a",
            "name": "Azure Sustained Tenant",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-10T07:59:03.310Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8eb24164-098d-46e0-9c3b-9fa35fcd8360",
        "href": "urn:ngsi-ld:product-offering:8eb24164-098d-46e0-9c3b-9fa35fcd8360",
        "description": " **Wear Prognosis** \n\nContact: [✉️](mailto:info@inno-focus.com)  [🔗](https://www.inno-focus.com/en/software-and-consulting-for-digitization-collaboration-and-industry-4-0/)\n\nThis AI service is designed for cutting tools in machining operations. However, the solution approach is transferable to other wear components, such as bearings. \n\nCutting tools with a defined cutting edge, such as milling cutters and drills, inevitably experience wear. This wear affects the geometry and surface quality of the component. Excessive wear can lead to defective components, and in some cases, tool breakage, which often results in damage to the component. For safety reasons, tools are typically replaced early and not utilized to their maximum load capacity. However, a controlled extension of tool utilization could result in significant cost savings. \n\nCutting tools in machining operations are extremely diverse in terms of materials and process parameters. To date, service life predictions have primarily been conducted on a trial basis, often relying on empirical experience. \n\nWith the advent of digitalization, it is now possible to capture the real production process in all its complexity. By integrating additional measurements of the wear condition of cutting tools, AI models have been successfully trained and tested over the tool life (time series). \n\nThe objective of further development is to significantly reduce the training times for new cutting tool types or varying materials and process conditions. Training is conducted using historical data in a cloud environment, while the AI model is applied close to the machine, on edge, using an industrial PC. \n\n\n **How does it work?** \n\nThe actual process data that determines wear is recorded using additional sensors and integrated with information from the material, cutting tool, and, if necessary, the machine. To train an AI model, geometric measurements of the wear condition are repeatedly required throughout the use of the cutting tool. The AI model developed here can be easily applied to other instances with similar parameter constellations in line with the objective. However, a revision of the AI model is required for significantly different parameter constellations. \n\nThis module can be connected to a digital twin platform via an interface, for which we recommend our product [„CuttingEdge World\"](https://dome-marketplace-prd.org/search/urn:ngsi-ld:product-offering:99447cb9-e12c-4643-bf14-731ffc3f0a53). \n\nIt can be customized for other applications upon request. \n\n\n **What are the benefits?** \n\n- Optimal Utilization of Cutting Tools \n- Utilizing cutting tools up to the limit of their service life optimizes operating resource costs. \n- Avoidance of reject parts due to geometric deviations or unacceptably high surface roughness. \n- Extension of automatic inline quality monitoring to the cutting tools. \n- Data-driven further development of cutting tools is possible through cooperation between the cutting tool manufacturer and its customers. \n\n\n **Whom is the solution designed for?** \n\nThis software is suitable for: \n- Companies in the Machining Industry: \n> - Companies that have implemented or are beginning to implement the digitalization of milling or drilling processes in terms of process data acquisition. \n> - Companies with high demands on the surface quality of their components. \n> - Companies with high expenditure on cutting tools. \n- Companies with Special Challenges in Terms of Wear: \n> - Systems where visual inspection is not possible, but where minimal noise development detectable by sensors indicates critical wear. \n> - Usage based on reference values as part of predictive maintenance. \n> - Continuous recording and evaluation by a permanently installed service for very critical system components. \n\n **Further services** \n\nIn addition to the software components described here, we offer you further services to integrate them seamlessly into your existing systems. We will be happy to advise you. \n\n- As-is analysis \n- System design \n- System implementation \n- System integration: This service will usually run on-premises in the cloud. An Azure environment is preferred for this. \n- Individualized evaluations ",
        "isBundle": false,
        "lastUpdate": "2024-07-12T10:05:02.911828305Z",
        "lifecycleStatus": "Launched",
        "name": "Wear Prognosis",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "href": "urn:ngsi-ld:category:297b773e-9690-4807-915b-cec06c130811",
                "name": "Manufacturing"
            },
            {
                "id": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "href": "urn:ngsi-ld:category:015221e2-7de5-4939-a6ab-5b66e4782808",
                "name": "Other (manufacturing)"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "href": "urn:ngsi-ld:category:3da777ed-e7dd-41c8-aefa-9287af34d62b",
                "name": "Manufacturing of Metal Products"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:dffdd33a-3e4e-4749-acfb-fdd4c5f5ba5d",
                "href": "urn:ngsi-ld:product-offering-price:dffdd33a-3e4e-4749-acfb-fdd4c5f5ba5d",
                "name": "Enterprise"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:4fd5f2ca-5d0d-4f5d-aeb5-5afb9bb2a2b3",
            "href": "urn:ngsi-ld:product-specification:4fd5f2ca-5d0d-4f5d-aeb5-5afb9bb2a2b3",
            "name": "Wear Prognosis",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-12T10:05:02.697Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:7d7120b3-4769-466d-8a12-56f52744a363",
        "href": "urn:ngsi-ld:product-offering:7d7120b3-4769-466d-8a12-56f52744a363",
        "description": "Protect your data as a service\n\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\nBackupProtect is an enterprise data protection solution with high levels of security and quality to meet the most stringent requirements for corporate data protection.\n\n[Who we are](https://www.eng.it/find-us/offices-contacts)\n",
        "isBundle": false,
        "lastUpdate": "2024-07-03T15:01:09.089584652Z",
        "lifecycleStatus": "Launched",
        "name": "BackupProtect",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:a9d6b163-7499-4619-8866-86f5f62c084b",
                "href": "urn:ngsi-ld:product-offering-price:a9d6b163-7499-4619-8866-86f5f62c084b",
                "name": "DATA MANAGEMENT"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:28a572f9-560b-4603-9978-6c72f36dc306",
            "href": "urn:ngsi-ld:product-specification:28a572f9-560b-4603-9978-6c72f36dc306",
            "name": "BackupProtect",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-03T15:01:08.981Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:192af67a-d9b3-415a-98f3-d516af9d6763",
        "href": "urn:ngsi-ld:product-offering:192af67a-d9b3-415a-98f3-d516af9d6763",
        "description": "Smart disaster recovery solution\n\n[get in touch with us](mailto:info-dhub@eng.it)\n\nAvailability Protect is an enterprise solution designed to enable the migration of your workloads or to protect them through an effective and efficient Disaster Recovery.\n\n[Who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-03T15:02:32.674040040Z",
        "lifecycleStatus": "Launched",
        "name": "Availability Protect",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:e014852c-602f-4891-a3f1-f786a4fae7f8",
                "href": "urn:ngsi-ld:product-offering-price:e014852c-602f-4891-a3f1-f786a4fae7f8",
                "name": "DATA PROTECTION E MIGRATION"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:59f5e14d-a3ce-4faa-9cfb-d3a03e1b212f",
            "href": "urn:ngsi-ld:product-specification:59f5e14d-a3ce-4faa-9cfb-d3a03e1b212f",
            "name": "Availability Protect",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-03T15:02:32.585Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:1a525e55-8d0c-4cc8-8a27-dc174af5593c",
        "href": "urn:ngsi-ld:product-offering:1a525e55-8d0c-4cc8-8a27-dc174af5593c",
        "description": "**Drain the Big Data into your results**\n\n**Elliot**>>**Data**>>**Knowledge**>>**Best decisions** \n\n\nContact us: [📲](https://elliotcloud.com/)   /   [📧](mailto:idi@elliotcloud.com)",
        "isBundle": false,
        "lastUpdate": "2024-07-04T12:05:01.114992139Z",
        "lifecycleStatus": "Launched",
        "name": "Elliot Energy",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "href": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "name": "Energy and Utility Suppliers"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:3820bd08-32c7-4fe6-8fdf-f0b880304f13",
                "href": "urn:ngsi-ld:product-offering-price:3820bd08-32c7-4fe6-8fdf-f0b880304f13",
                "name": "Project based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7e7b7dea-b79c-49d4-9b3f-0f5126460534",
            "href": "urn:ngsi-ld:product-specification:7e7b7dea-b79c-49d4-9b3f-0f5126460534",
            "name": "Elliot Energy",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-04T12:05:00.946Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8f9181a8-2cd3-4ba2-9252-f1104e75c2e4",
        "href": "urn:ngsi-ld:product-offering:8f9181a8-2cd3-4ba2-9252-f1104e75c2e4",
        "description": "Smart Water is an IoT solution designed to detect the most relevant water quality parameters such as dissolved oxygen, oxidation-reduction potential, pH, conductivity and temperature. We can monitor drinking water, detect and control real-time leakages in rivers and seas, track pressure variations along pipes and check water quality in fish farms, swimming pools or aquariums.",
        "isBundle": false,
        "lastUpdate": "2024-07-05T16:02:54.515083140Z",
        "lifecycleStatus": "Launched",
        "name": "Smart Water - by Libelium",
        "version": "1.0",
        "category": [
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:97235ff3-090e-41f7-a2ec-50552ca95b94",
                "href": "urn:ngsi-ld:product-offering-price:97235ff3-090e-41f7-a2ec-50552ca95b94",
                "name": "Project-based"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:cd3cc962-78e1-4d3b-8ea6-848f520277f0",
            "href": "urn:ngsi-ld:product-specification:cd3cc962-78e1-4d3b-8ea6-848f520277f0",
            "name": "Smart Water",
            "version": "1.0"
        },
        "validFor": {
            "startDateTime": "2024-07-05T16:02:54.316Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4de370e0-fba8-4d49-95eb-013ebc5eb7b5",
        "href": "urn:ngsi-ld:product-offering:4de370e0-fba8-4d49-95eb-013ebc5eb7b5",
        "description": "Our User License for the Voice + Email Package provides a sophisticated and integrated solution for managing your business's voice and email communications. By combining advanced voice features with powerful email tools, this cloud-based package ensures that your team can efficiently handle all communication channels from a single platform. The inclusion of customizable email templates, unlimited email addresses, and automated email allocation enhances productivity and ensures that customer interactions are handled with precision.",
        "isBundle": false,
        "lastUpdate": "2024-07-30T09:35:11.487058680Z",
        "lifecycleStatus": "Launched",
        "name": "User license for the Voice + Email package",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "href": "urn:ngsi-ld:category:75e05680-748c-4779-a049-d7fd14addb71",
                "name": "Operations"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:ab6bc29e-eb76-4d85-9b68-cf4d5d2c3f06",
                "href": "urn:ngsi-ld:product-offering-price:ab6bc29e-eb76-4d85-9b68-cf4d5d2c3f06",
                "name": "User license for the Voice + Email package"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:1b2e3ac1-43e2-44f1-8b6d-de77f4dc37a1",
            "href": "urn:ngsi-ld:product-specification:1b2e3ac1-43e2-44f1-8b6d-de77f4dc37a1",
            "name": "User license for the Voice + Email package",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-30T09:35:11.429Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:ac9a4d65-d73f-4245-a8ba-e5ac83e4c7ce",
        "href": "urn:ngsi-ld:product-offering:ac9a4d65-d73f-4245-a8ba-e5ac83e4c7ce",
        "description": "BEIA is excited to offer specialized consulting services for integrating advanced digital solutions into your organization. Our expertise in Open Blockchain Infrastructure and Decision Support Systems with Digital Twins will help you stay at the forefront of technological innovation and achieve your strategic objectives.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T12:22:49.803267381Z",
        "lifecycleStatus": "Launched",
        "name": "Consulting for integrating advanced digital solutions",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:0798cd09-3e9a-4d87-9eb1-13db19e373ee",
                "href": "urn:ngsi-ld:category:0798cd09-3e9a-4d87-9eb1-13db19e373ee",
                "name": "Consulting"
            },
            {
                "id": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "href": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "name": "Blockchain (DLT)"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:1af6e324-b359-430e-a9ac-056fb94b70ba",
                "href": "urn:ngsi-ld:product-offering-price:1af6e324-b359-430e-a9ac-056fb94b70ba",
                "name": "Consulting for integrating advanced digital solutions"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7477013d-1985-4dca-a8e2-e9427080a323",
            "href": "urn:ngsi-ld:product-specification:7477013d-1985-4dca-a8e2-e9427080a323",
            "name": "Consulting for integrating advanced digital solutions",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T12:22:46.726Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8b1fde6e-5acf-44c3-b429-4d25ffc4af67",
        "href": "urn:ngsi-ld:product-offering:8b1fde6e-5acf-44c3-b429-4d25ffc4af67",
        "description": "BEIA is delighted to offer a specialized consulting service focused on monitoring energy supply networks through photovoltaic (PV) panels. Our comprehensive solution includes advanced sensors for environmental monitoring, user-friendly data management, and long-term data storage, ensuring you have the necessary tools to optimize your solar energy systems and enhance efficiency.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T13:21:52.177048699Z",
        "lifecycleStatus": "Launched",
        "name": "Energy Supply Network Monitoring_Photovoltaic Panels",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "href": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "name": "Energy and Utility Suppliers"
            },
            {
                "id": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "href": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "name": "Electricity"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:38c41763-f04e-4e29-845a-77cdc95b7e99",
                "href": "urn:ngsi-ld:product-offering-price:38c41763-f04e-4e29-845a-77cdc95b7e99",
                "name": "Energy Supply Network Monitoring_Photovoltaic Panels"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:432373ce-53d4-4540-bb8f-2fd970a11dca",
            "href": "urn:ngsi-ld:product-specification:432373ce-53d4-4540-bb8f-2fd970a11dca",
            "name": "Energy Supply Network Monitoring_Photovoltaic Panels",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T13:21:48.967Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:1f835fe9-2527-4579-9609-24858cdb4b8e",
        "href": "urn:ngsi-ld:product-offering:1f835fe9-2527-4579-9609-24858cdb4b8e",
        "description": "Enterprise private cloud infrastructure\n\n\n[get in touch with us](mailto:info-dhub@eng.it) \n\nYour suite of secure intelligent Google applications for cloud-native and multi-devices for productivity and collaboration.\n\n\n[who we are](https://www.eng.it/find-us/offices-contacts)",
        "isBundle": false,
        "lastUpdate": "2024-07-15T11:26:55.650873680Z",
        "lifecycleStatus": "Active",
        "name": "Google Workspace",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:b0c68ad7-f128-49b1-be5e-ea429fe9a0e7",
                "href": "urn:ngsi-ld:product-offering-price:b0c68ad7-f128-49b1-be5e-ea429fe9a0e7",
                "name": "Enterprise"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:fa1f3ed3-4e1c-4e9a-9af1-c3d5776409d6",
                "href": "urn:ngsi-ld:product-offering-price:fa1f3ed3-4e1c-4e9a-9af1-c3d5776409d6",
                "name": "Business Plus"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:2f0c90d7-0ada-4b73-9fec-2e852da4ac25",
                "href": "urn:ngsi-ld:product-offering-price:2f0c90d7-0ada-4b73-9fec-2e852da4ac25",
                "name": "Business Starter"
            },
            {
                "id": "urn:ngsi-ld:product-offering-price:dd305ac7-53b4-4a55-ae25-94329ab58667",
                "href": "urn:ngsi-ld:product-offering-price:dd305ac7-53b4-4a55-ae25-94329ab58667",
                "name": "Business Standard"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:51c70fb6-514e-48d3-bd70-84f0ab379358",
            "href": "urn:ngsi-ld:product-specification:51c70fb6-514e-48d3-bd70-84f0ab379358",
            "name": "Google Workspace",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-15T11:26:55.428Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:cd390626-e57e-41e7-b575-7c6d9f71a2ef",
        "href": "urn:ngsi-ld:product-offering:cd390626-e57e-41e7-b575-7c6d9f71a2ef",
        "description": "Introducing our advanced Gas Emission Monitoring Service at BEIA, featuring cutting-edge sensors like PM1, PM2.5, and PM10. Our service provides real-time monitoring and precise measurement of particulate matter, ensuring accurate data on air quality, which you can see on GRAFANA. Designed for both industrial and environmental applications, our system helps you maintain regulatory compliance and promotes a healthier, safer environment. Trust BEIA for reliable and efficient air quality monitoring solutions.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T10:34:48.468345015Z",
        "lifecycleStatus": "Launched",
        "name": "Gas Emission Monitoring IoT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:a5d7ca53-5c40-41a8-872d-adc9eddb5c4e",
                "href": "urn:ngsi-ld:product-offering-price:a5d7ca53-5c40-41a8-872d-adc9eddb5c4e",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:0728b203-21e7-417f-b04f-50c48159e42c",
            "href": "urn:ngsi-ld:product-specification:0728b203-21e7-417f-b04f-50c48159e42c",
            "name": "Gas Emission Monitoring ",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T10:34:48.171Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:2825967d-0565-442e-a5d9-df9d3df2f5df",
        "href": "urn:ngsi-ld:product-offering:2825967d-0565-442e-a5d9-df9d3df2f5df",
        "description": "Our BEIA state-of-the-art Radon Radiation Measuring System is designed to monitor and measure radon gas levels and display the energy spectrum from the source. This system provides accurate, real-time data on radon concentrations displayed in a user-friendly interface - GRAFANA.  We aim to ensure safety and compliance with health standards. \nIdeal for homes, offices, and industrial settings, it helps in the early detection of radon, reducing the risk of long-term exposure and promoting a healthier living and working environment.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T13:23:48.346253218Z",
        "lifecycleStatus": "Launched",
        "name": "Radon Radiation Measuring IoT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:be970ce1-fe49-43c8-8dd4-2c71be764c97",
                "href": "urn:ngsi-ld:product-offering-price:be970ce1-fe49-43c8-8dd4-2c71be764c97",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:02c32129-23d0-466d-831b-2bebbf7134e3",
            "href": "urn:ngsi-ld:product-specification:02c32129-23d0-466d-831b-2bebbf7134e3",
            "name": "Radon Radiation Monitoring",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T13:23:48.037Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:827de0ae-1f42-45b5-bdde-ba7f48991bd0",
        "href": "urn:ngsi-ld:product-offering:827de0ae-1f42-45b5-bdde-ba7f48991bd0",
        "description": "A web service providing up-to-date prices of meat products from Spanish markets over the past year.\n\n[get in touch with us](mailto:info@digitanimal.com)\n\n[who we are](https://digitanimal.com/?lang=en)",
        "isBundle": false,
        "lastUpdate": "2024-07-15T15:04:43.026623864Z",
        "lifecycleStatus": "Launched",
        "name": "Meat Price Tracker",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:221f6434-ec82-4c62-9825-af0fd7da7613",
            "href": "urn:ngsi-ld:product-specification:221f6434-ec82-4c62-9825-af0fd7da7613",
            "name": "Meat Price Tracker",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-15T15:04:48.305Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:48c7f488-6aa2-4c8c-a2f9-5b8aba8fb616",
        "href": "urn:ngsi-ld:product-offering:48c7f488-6aa2-4c8c-a2f9-5b8aba8fb616",
        "description": "A web service that provides IoT coverage data in a locality based on the historical positions of IoT devices.\n\n[get in touch with us](mailto:info@digitanimal.com)\n\n[who we are](https://digitanimal.com/?lang=en)",
        "isBundle": false,
        "lastUpdate": "2024-07-15T15:05:25.956963333Z",
        "lifecycleStatus": "Launched",
        "name": "IoT Coverage",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7406563a-76f9-4c07-a99c-bd52babc34da",
            "href": "urn:ngsi-ld:product-specification:7406563a-76f9-4c07-a99c-bd52babc34da",
            "name": "IoT Coverage",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-15T15:05:31.235Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:51c82063-5de6-4be7-9743-3a36a7c40225",
        "href": "urn:ngsi-ld:product-offering:51c82063-5de6-4be7-9743-3a36a7c40225",
        "description": "Layer 2 Network Transport Service between two TOP-IX  PoP.\n<br/><br/>\n\nTOP-IX consortiun can also offer other network services. \nFor more information, please visit our website https://www.top-ix.org/en/internet-exchange/service-fees-2/\nor contact  the TOP-IX team at networking@top-ix.org",
        "isBundle": false,
        "lastUpdate": "2024-07-17T08:40:23.761969986Z",
        "lifecycleStatus": "Launched",
        "name": "Layer 2 Network Transport Service",
        "version": "0.2",
        "category": [
            {
                "id": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "href": "urn:ngsi-ld:category:86836789-af84-4ca0-98f6-ee923f22d98d",
                "name": "IT"
            },
            {
                "id": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "href": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "name": "Network"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:d575624f-0d61-456a-a378-f509c17e876d",
                "href": "urn:ngsi-ld:product-offering-price:d575624f-0d61-456a-a378-f509c17e876d",
                "name": "Contact us"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:b650a910-bc97-40af-b8be-26359e2b8d64",
            "href": "urn:ngsi-ld:product-specification:b650a910-bc97-40af-b8be-26359e2b8d64",
            "name": "Layer 2 Transport Service",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-17T08:40:23.332Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:f2683b11-f630-4ed9-b64f-35e462f73daa",
        "href": "urn:ngsi-ld:product-offering:f2683b11-f630-4ed9-b64f-35e462f73daa",
        "description": "BEIA is pleased to offer a specialized consulting service designed for monitoring energy consumption using smart outlets. Our comprehensive solution provides real-time visualization of electrical consumption, user-friendly data management, and long-term data storage, ensuring you have the tools necessary to optimize energy use and enhance operational efficiency.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T13:05:58.894445089Z",
        "lifecycleStatus": "Launched",
        "name": "Energy Supply Network Monitoring_Smart Outlets",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "href": "urn:ngsi-ld:category:a0f758e5-fcdb-4f3d-ade9-2272dc600fbb",
                "name": "Energy and Utility Suppliers"
            },
            {
                "id": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "href": "urn:ngsi-ld:category:a7435c54-a49d-452f-9c62-bab6d693ebb7",
                "name": "Electricity"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:ee35f897-6a7b-456a-b552-98705e9c6bad",
                "href": "urn:ngsi-ld:product-offering-price:ee35f897-6a7b-456a-b552-98705e9c6bad",
                "name": "Energy Supply Network Monitoring_Smart Outlets"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:cbca20c8-a59d-4b3b-9f39-c4fe7b12a35e",
            "href": "urn:ngsi-ld:product-specification:cbca20c8-a59d-4b3b-9f39-c4fe7b12a35e",
            "name": "Energy Supply Network Monitoring_Smart Outlets",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T13:05:55.837Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8cc7b3d2-c3ce-4d5a-b506-7a41444a62e5",
        "href": "urn:ngsi-ld:product-offering:8cc7b3d2-c3ce-4d5a-b506-7a41444a62e5",
        "description": "test DescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescription",
        "isBundle": false,
        "lastUpdate": "2024-07-23T12:54:27.724943257Z",
        "lifecycleStatus": "Retired",
        "name": "Test General",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:71e9dac3-e5fe-4c50-9c13-633fab86e08c",
                "href": "urn:ngsi-ld:product-offering-price:71e9dac3-e5fe-4c50-9c13-633fab86e08c",
                "name": "Zhivkooooo12222222222222artartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartartart"
            }
        ],
        "productOfferingTerm": [
            {
                "description": "test DescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescriptionDescription",
                "name": "test TreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatmentTreatment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:cdc9107b-5a42-42a5-8fb3-8483f507f40c",
            "href": "urn:ngsi-ld:product-specification:cdc9107b-5a42-42a5-8fb3-8483f507f40c",
            "name": "Test ofeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-23T12:54:27.594Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:c9129205-dd89-458f-a5ed-12fa55048581",
        "href": "urn:ngsi-ld:product-offering:c9129205-dd89-458f-a5ed-12fa55048581",
        "description": "BEIA is excited to offer a detailed training program focused on the analysis of IoT and unified communications strategy. Our training is designed to equip participants with the knowledge and skills needed to effectively analyze and implement IoT and unified communications solutions within their organizations.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T12:04:17.100306425Z",
        "lifecycleStatus": "Launched",
        "name": "Digital transformation analysis and strategy",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:0a03a551-0ff2-42ed-9350-42054d38bffc",
                "href": "urn:ngsi-ld:product-offering-price:0a03a551-0ff2-42ed-9350-42054d38bffc",
                "name": "Digital transformation analysis and strategy"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:626479d6-b4bf-4eae-a42d-cdba1a596afc",
            "href": "urn:ngsi-ld:product-specification:626479d6-b4bf-4eae-a42d-cdba1a596afc",
            "name": "Digital transformation analysis and strategy",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T12:04:14.139Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e2c9a597-9cc1-4748-a8e6-518ad5ae9b2a",
        "href": "urn:ngsi-ld:product-offering:e2c9a597-9cc1-4748-a8e6-518ad5ae9b2a",
        "description": "Interstis is a web-based plateforme, a french suite of collaborative tools. Thanks to a secure, sovereign and eco-friendly plateforme, you will be able to manage your project efficiently.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-10T09:43:10.384955571Z",
        "lifecycleStatus": "Launched",
        "name": "Collaborative Suite Interstis",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:2e11c30f-dc79-4f45-b752-95c6fcf04040",
                "href": "urn:ngsi-ld:product-offering-price:2e11c30f-dc79-4f45-b752-95c6fcf04040",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:6bbfd17b-6c91-4432-abe4-adbfedf95eeb",
            "href": "urn:ngsi-ld:product-specification:6bbfd17b-6c91-4432-abe4-adbfedf95eeb",
            "name": "Suite Collaborative Interstis",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-10T09:43:10.239Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:56d0dd5b-92e1-4969-b59f-4ff8814cb8c9",
        "href": "urn:ngsi-ld:product-offering:56d0dd5b-92e1-4969-b59f-4ff8814cb8c9",
        "description": "The Managed Network Load Balancer (NLB) is a pre-configured VDC element that provides connection-based layer 4 load balancing features and functionality. It is fully managed by IONOS, deeply integrated into our Software-Defined Networking (SDN) stack, deployed in a highly available setup, and offers robust security features required for fault-tolerant applications.\n\nFor more details about the product: https://cloud.ionos.com/network/network-loadbalancer",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:20:52.975873576Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Network Load Balancer",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "href": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "name": "Network"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:fc3cf89b-2e83-42d4-9759-e29b6bdaa419",
                "href": "urn:ngsi-ld:product-offering-price:fc3cf89b-2e83-42d4-9759-e29b6bdaa419",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:48ce6f35-e213-43cf-86cc-b02c6b61a001",
            "href": "urn:ngsi-ld:product-specification:48ce6f35-e213-43cf-86cc-b02c6b61a001",
            "name": "IONOS Network Load Balancer",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:20:52.667Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:ee7b08aa-9ce6-46ae-a077-1d107bab2121",
        "href": "urn:ngsi-ld:product-offering:ee7b08aa-9ce6-46ae-a077-1d107bab2121",
        "description": "IONOS Simple Storage Service (S3) Object Storage is a secure, scalable storage solution that offers high data availability and performance. The product adheres to the S3 API standards, enabling the storage of vast amounts of unstructured data and seamless integration into S3-compatible applications and infrastructures.\n\nFor more details about the product: https://cloud.ionos.com/storage/object-storage",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:22:16.505304523Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Object Storage S3",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "href": "urn:ngsi-ld:category:f519d857-b681-4e89-b009-c7dfa178ebfc",
                "name": "Storage"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:98f3e8b1-244e-486f-991d-18097d69d78b",
                "href": "urn:ngsi-ld:product-offering-price:98f3e8b1-244e-486f-991d-18097d69d78b",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:1d77ad2f-9654-4336-905c-0ae4749c9c02",
            "href": "urn:ngsi-ld:product-specification:1d77ad2f-9654-4336-905c-0ae4749c9c02",
            "name": "IONOS Object Storage S3",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:22:16.270Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:175e4d46-a80d-4acc-b06e-b4e0e8b2bbe6",
        "href": "urn:ngsi-ld:product-offering:175e4d46-a80d-4acc-b06e-b4e0e8b2bbe6",
        "description": "A vCPU Server that you create is a new Virtual Machine (VM) provisioned and hosted in one of IONOS' physical data centers. A vCPU Server behaves exactly like physical servers and you can use them either standalone or in combination with other IONOS Cloud products.\n\nFor more details about the product: https://cloud.ionos.com/compute",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:23:55.432082843Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Compute Engine vCPU",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:50277625-6200-4ce2-9b31-f1835bafc5b2",
                "href": "urn:ngsi-ld:product-offering-price:50277625-6200-4ce2-9b31-f1835bafc5b2",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:408732fe-c0ae-4c0b-b317-5ad2665db514",
            "href": "urn:ngsi-ld:product-specification:408732fe-c0ae-4c0b-b317-5ad2665db514",
            "name": "IONOS Compute Engine vCPU",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:23:54.899Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:730c82cc-f4bc-4aad-9461-336d0e879b82",
        "href": "urn:ngsi-ld:product-offering:730c82cc-f4bc-4aad-9461-336d0e879b82",
        "description": "Here at BEIA, our Water Quality Monitoring System features a cutting-edge multiparameter probe designed to provide comprehensive real-time data on various water quality parameters. This system measures dissolved oxygen, pH, conductivity, turbidity, temperature, and more, ensuring accurate and reliable monitoring using ADCON's addVANTAGE Pro 6.x INTERFACE for data visualization.\n\n Ideal for environmental assessments, industrial applications, and water treatment facilities, our system helps maintain optimal water quality standards.\n",
        "isBundle": false,
        "lastUpdate": "2024-07-26T12:56:40.545138872Z",
        "lifecycleStatus": "Launched",
        "name": "Water Quality Monitoring w/ Multiparameter Probe",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:6ecee2e6-6570-4abf-ad1a-e1eb627529d8",
                "href": "urn:ngsi-ld:product-offering-price:6ecee2e6-6570-4abf-ad1a-e1eb627529d8",
                "name": "Recurring Payment"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:dc9cc176-c4b9-43fa-936a-c9e63b760f26",
            "href": "urn:ngsi-ld:product-specification:dc9cc176-c4b9-43fa-936a-c9e63b760f26",
            "name": "Water Quality Monitoring w/ Multiparameter Probe",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T12:56:40.232Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:73eee2d0-06f7-495a-8c77-2d6ee9d32b84",
        "href": "urn:ngsi-ld:product-offering:73eee2d0-06f7-495a-8c77-2d6ee9d32b84",
        "description": "The Managed Application Load Balancer (ALB) distributes incoming application layer traffic to targets based on user-defined policies. Each load balancer is defined by a Listener, which processes forwarding rules and routes traffic to targets. Targets are selected via the round-robin method.\n\nFor more details about the product: https://cloud.ionos.com/network/application-load-balancer",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:20:13.584013283Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Application Load Balancer",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "href": "urn:ngsi-ld:category:f67baeef-6ee8-449a-81d6-0692009f859f",
                "name": "Network"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:ccc7b22e-0054-4c73-87f2-3f711c725361",
                "href": "urn:ngsi-ld:product-offering-price:ccc7b22e-0054-4c73-87f2-3f711c725361",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a4e57bb6-d364-404c-8165-1ebf36d06402",
            "href": "urn:ngsi-ld:product-specification:a4e57bb6-d364-404c-8165-1ebf36d06402",
            "name": "IONOS Application Load Balancer",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:20:13.279Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e971de28-2f9e-4897-88b7-3950385fc3d0",
        "href": "urn:ngsi-ld:product-offering:e971de28-2f9e-4897-88b7-3950385fc3d0",
        "description": "Dedicated Core Servers that you create in the DCD are provisioned and hosted in one of IONOS' physical data centers. Dedicated Core Servers behave exactly like physical servers. They can be configured and managed with your choice of the operating system. \n\nFor more details about the product: https://cloud.ionos.com/compute",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:24:11.151116105Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Compute Engine Dedicated Core",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:6642bb80-d90a-4768-9173-c351320bef7d",
                "href": "urn:ngsi-ld:product-offering-price:6642bb80-d90a-4768-9173-c351320bef7d",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:5c14b653-cd91-4ebd-8e41-d0c8b4e348dc",
            "href": "urn:ngsi-ld:product-specification:5c14b653-cd91-4ebd-8e41-d0c8b4e348dc",
            "name": "IONOS Compute Engine Dedicated Core",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:24:10.929Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:8281fc9a-1111-4187-867e-5a1faffe0b8e",
        "href": "urn:ngsi-ld:product-offering:8281fc9a-1111-4187-867e-5a1faffe0b8e",
        "description": "A Cube is a virtual machine with an attached NVMe Volume. Each Cube you create is a new virtual machine you can use, either standalone or in combination with other IONOS Cloud products. For more information, see [Cubes](https://docs.ionos.com/cloud/compute-services/cubes/cubes-faq)\n\nFor more details about the product: https://cloud.ionos.com/compute/cloud-cubes",
        "isBundle": false,
        "lastUpdate": "2024-07-22T19:24:40.844080561Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Compute Engine Cube",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "href": "urn:ngsi-ld:category:de02a9c4-0524-4037-bed8-3d143301a674",
                "name": "Compute"
            },
            {
                "id": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "href": "urn:ngsi-ld:category:9af8cc92-2d3d-4a60-8f30-6252c0fc7f7e",
                "name": "Infrastructure as a Service (IaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:bf27633e-1644-46d0-8cf2-ad02aa14eb73",
                "href": "urn:ngsi-ld:product-offering-price:bf27633e-1644-46d0-8cf2-ad02aa14eb73",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:136471ab-76ed-495f-928b-0c8f63b282c5",
            "href": "urn:ngsi-ld:product-specification:136471ab-76ed-495f-928b-0c8f63b282c5",
            "name": "IONOS Compute Engine Cube",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-22T19:24:40.560Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:693a6bdb-32c5-4122-855c-95c02ff4e22d",
        "href": "urn:ngsi-ld:product-offering:693a6bdb-32c5-4122-855c-95c02ff4e22d",
        "description": "BEIA is pleased to present a comprehensive training program designed to enhance your technical skills in three critical areas: IoT Technology Development, Cloud Computing, and Data Visualization. Our training sessions are crafted to provide hands-on experience and deep insights, ensuring participants gain practical knowledge and expertise.",
        "isBundle": false,
        "lastUpdate": "2024-07-26T10:57:22.899145847Z",
        "lifecycleStatus": "Launched",
        "name": "Training sessions on digital solutions",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "href": "urn:ngsi-ld:category:8db4c0ac-a7f5-4801-95a7-974d5685260e",
                "name": "Education"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:3ebce3ac-7429-4017-9ab2-96b3e0720c6c",
                "href": "urn:ngsi-ld:product-offering-price:3ebce3ac-7429-4017-9ab2-96b3e0720c6c",
                "name": "Training sessions on digital solutions"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:c9785459-4fed-4443-8458-0e0b4bed3664",
            "href": "urn:ngsi-ld:product-specification:c9785459-4fed-4443-8458-0e0b4bed3664",
            "name": "Training sessions on digital solutions",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-26T10:57:19.989Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e8b14c09-182d-43fb-9cf7-369b1e8d564f",
        "href": "urn:ngsi-ld:product-offering:e8b14c09-182d-43fb-9cf7-369b1e8d564f",
        "description": "\nThe Plant Protection System is an advanced agricultural monitoring solution featuring a datalogger with GSM/GPRS transmission, a solar panel, and sensors for temperature, relative humidity, rain gauge, and leaf wetness. It includes one account on the addVANTAGE PRO 6.x software with access to up to 3 crops and 20 software extensions, data storage for one year, and a 12-month hardware warranty.",
        "isBundle": false,
        "lastUpdate": "2024-07-29T12:20:01.738421858Z",
        "lifecycleStatus": "Launched",
        "name": "Plant Protection",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:d5a7650c-ddce-46a6-8eba-c85b1c03cec7",
                "href": "urn:ngsi-ld:category:d5a7650c-ddce-46a6-8eba-c85b1c03cec7",
                "name": "Process management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:06655e3a-94a1-49bd-84b8-4ba1eaf0901e",
                "href": "urn:ngsi-ld:product-offering-price:06655e3a-94a1-49bd-84b8-4ba1eaf0901e",
                "name": "Plant Protection"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:377e9b75-bcf0-4ab8-9cbb-f816d750984a",
            "href": "urn:ngsi-ld:product-specification:377e9b75-bcf0-4ab8-9cbb-f816d750984a",
            "name": "Plant Protection",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-29T12:20:01.567Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:86b48b7d-fe0a-46a3-a8b9-108ed6ebf5a4",
        "href": "urn:ngsi-ld:product-offering:86b48b7d-fe0a-46a3-a8b9-108ed6ebf5a4",
        "description": "BEIA offers The Evapotranspiration (ETo) and Plant Protection system , that includes a datalogger with GSM/GPRS, solar panel, and sensors for temperature, humidity, rain, pyranometer, and wind. It offers one addVANTAGE PRO 6.x account with access to 3 crops and 20 software extensions, data storage for 1 year, and a 12-month hardware warranty. Installation services are provided by BEIA Consult International and are not included.",
        "isBundle": false,
        "lastUpdate": "2024-07-29T12:57:50.908103515Z",
        "lifecycleStatus": "Launched",
        "name": "Evapotranspiration (Eto) and Plant Protection",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "href": "urn:ngsi-ld:category:509e95fb-f1b5-4da0-91bf-68854a1eec60",
                "name": "Agriculture, Forestry, Fishing"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            },
            {
                "id": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "href": "urn:ngsi-ld:category:44ca04f9-a289-4089-862c-219d9726fae0",
                "name": "Internet of Things (IoT)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:047972f1-ab94-426e-9bb4-57455a97a699",
                "href": "urn:ngsi-ld:product-offering-price:047972f1-ab94-426e-9bb4-57455a97a699",
                "name": "Evapotranspiration (Eto) and Plant Protection"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:f54b4fb7-3456-4d15-abe1-b7fcada1c969",
            "href": "urn:ngsi-ld:product-specification:f54b4fb7-3456-4d15-abe1-b7fcada1c969",
            "name": "Evapotranspiration (Eto) and Plant Protection",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-29T12:57:50.757Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e1ae746f-9b29-45e2-b291-a6bf48b539ee",
        "href": "urn:ngsi-ld:product-offering:e1ae746f-9b29-45e2-b291-a6bf48b539ee",
        "description": "Managed Kubernetes provides a platform to automate the deployment, scaling, and management of containerized applications. With IONOS Cloud Managed Kubernetes, you can quickly set up Kubernetes clusters and manage Node Pools.\n\nFor more details about the product: https://cloud.ionos.com/managed/kubernetes",
        "isBundle": false,
        "lastUpdate": "2024-09-04T14:55:32.182315130Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Managed Kubernetes",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "href": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "name": "Container as a Service (CaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:5632ab36-2b62-4dd0-abd1-5570a98263c6",
                "href": "urn:ngsi-ld:product-offering-price:5632ab36-2b62-4dd0-abd1-5570a98263c6",
                "name": "By Resources"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:5fc83ddf-1ce3-4937-80db-6d585f05bb3f",
            "href": "urn:ngsi-ld:product-specification:5fc83ddf-1ce3-4937-80db-6d585f05bb3f",
            "name": "IONOS Managed Kubernetes",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-09-04T14:55:31.622Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:c0fbad2e-5c35-4620-ad1e-ac9b50a7c385",
        "href": "urn:ngsi-ld:product-offering:c0fbad2e-5c35-4620-ad1e-ac9b50a7c385",
        "description": "BEIA offers The Soil Moisture Monitoring, Plant Protection, and Evapotranspiration system includes a datalogger with GSM/GPRS, solar panel, and sensors for temperature, humidity, rain, leaf wetness, pyranometer, wind, soil moisture, and soil temperature. It provides one addVANTAGE PRO 6.x account with access to 3 crops and 20 software extensions, data storage for 1 year, and a 12-month hardware warranty. ",
        "isBundle": false,
        "lastUpdate": "2024-07-29T13:11:17.402800900Z",
        "lifecycleStatus": "Launched",
        "name": "Soil moisture monitoring, Plant Protection and Evapotranspiration",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5db75606-3863-4bfc-8cc9-5fef43883e4d",
                "href": "urn:ngsi-ld:category:5db75606-3863-4bfc-8cc9-5fef43883e4d",
                "name": "Knowledge management"
            },
            {
                "id": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "href": "urn:ngsi-ld:category:229f0088-ebd4-4264-befb-7bb207e40f9a",
                "name": "Blockchain (DLT)"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:5c42c127-676f-488e-8318-c2a2cbf76e1a",
                "href": "urn:ngsi-ld:product-offering-price:5c42c127-676f-488e-8318-c2a2cbf76e1a",
                "name": "Soil moisture monitoring, Plant Protection and Evapotranspiration"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7b4b5599-a461-4220-bafb-288c305e875d",
            "href": "urn:ngsi-ld:product-specification:7b4b5599-a461-4220-bafb-288c305e875d",
            "name": "Soil moisture monitoring, Plant Protection and Evapotranspiration",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-29T13:11:17.271Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:738a40ff-3fda-4c87-8f4a-30cfdf574e88",
        "href": "urn:ngsi-ld:product-offering:738a40ff-3fda-4c87-8f4a-30cfdf574e88",
        "description": "IONOS's Database as a Service (DBaaS) consists of fully managed databases, with high availability, performance, and reliability hosted in IONOS Cloud and integrated with other IONOS Cloud services.\n\nFor more details about the product: https://cloud.ionos.com/managed/dbaas",
        "isBundle": false,
        "lastUpdate": "2024-09-04T14:55:52.701001172Z",
        "lifecycleStatus": "Launched",
        "name": "IONOS Database as a Service",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:5ad438de-8cd0-4aa1-a3d9-cf532c2f9cd7",
                "href": "urn:ngsi-ld:product-offering-price:5ad438de-8cd0-4aa1-a3d9-cf532c2f9cd7",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7055cf86-4ab4-4307-a7d3-e7df814ccb66",
            "href": "urn:ngsi-ld:product-specification:7055cf86-4ab4-4307-a7d3-e7df814ccb66",
            "name": "IONOS Database as a Service",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-09-04T14:55:52.373Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:de188ed9-ebee-4547-9ee8-fa0c2c298da6",
        "href": "urn:ngsi-ld:product-offering:de188ed9-ebee-4547-9ee8-fa0c2c298da6",
        "description": "Get started with the User License for the Voice + Email + Webchat Package today and revolutionize your customer service with our all-in-one cloud solution. Enjoy a seamless communication experience with advanced features and tools designed to enhance efficiency and satisfaction. Contact us now for more details and to request a personalized demonstration.",
        "isBundle": false,
        "lastUpdate": "2024-07-30T09:47:56.791001231Z",
        "lifecycleStatus": "Launched",
        "name": " User license for the Voice + Email + Webchat package",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "href": "urn:ngsi-ld:category:ce577bea-a882-4505-9c45-6abb9f6e5d63",
                "name": "Maintenance"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:70dedd27-aa71-45f5-aee4-c796b6c32113",
                "href": "urn:ngsi-ld:product-offering-price:70dedd27-aa71-45f5-aee4-c796b6c32113",
                "name": " User license for the Voice + Email + Webchat package"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:764639a4-0d3e-49ee-9461-9927167cc01e",
            "href": "urn:ngsi-ld:product-specification:764639a4-0d3e-49ee-9461-9927167cc01e",
            "name": " User license for the Voice + Email + Webchat package",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-07-30T09:47:56.730Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:b83c7902-93ce-483a-9989-f4eaf87404e3",
        "href": "urn:ngsi-ld:product-offering:b83c7902-93ce-483a-9989-f4eaf87404e3",
        "description": "",
        "isBundle": false,
        "lastUpdate": "2024-09-04T14:49:27.898045978Z",
        "lifecycleStatus": "Retired",
        "name": "IONOS Managed Stackable Data Platform",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "href": "urn:ngsi-ld:category:34daa315-f0f0-46f2-89e0-f9257dfeb6bc",
                "name": "Data management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:0f890343-131c-4d68-8897-0c16bba74bc7",
                "href": "urn:ngsi-ld:product-offering-price:0f890343-131c-4d68-8897-0c16bba74bc7",
                "name": "By Usage"
            }
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7d049c1c-d18e-402a-a0b5-a0ff0cf820d2",
            "href": "urn:ngsi-ld:product-specification:7d049c1c-d18e-402a-a0b5-a0ff0cf820d2",
            "name": "IONOS Managed Stackable Data Platform",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-09-04T14:49:27.609Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0a0cf6bd-a96a-4e27-91b2-a2d52b1b41a1",
        "href": "urn:ngsi-ld:product-offering:0a0cf6bd-a96a-4e27-91b2-a2d52b1b41a1",
        "description": "Process Experience is a low-code solution that connects people, data and technology across the enterprise and beyond.  Design secure end-to-end processes and benefit from a platform designed to adapt to the unique pace of your day-to-day business.\n\nContact us:  [🔗](https://en.outscale.com/business-process/) ",
        "isBundle": false,
        "lastUpdate": "2024-12-09T10:53:30.994125291Z",
        "lifecycleStatus": "Launched",
        "name": "Business Process",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:16184f67-31f4-4684-89c1-950056c81cdf",
                "href": "urn:ngsi-ld:category:16184f67-31f4-4684-89c1-950056c81cdf",
                "name": "Science and Engineering"
            },
            {
                "id": "urn:ngsi-ld:category:0798cd09-3e9a-4d87-9eb1-13db19e373ee",
                "href": "urn:ngsi-ld:category:0798cd09-3e9a-4d87-9eb1-13db19e373ee",
                "name": "Consulting"
            },
            {
                "id": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "href": "urn:ngsi-ld:category:4bd5037e-8ce7-4205-80a8-5e66bcd1b42f",
                "name": "Service Management"
            },
            {
                "id": "urn:ngsi-ld:category:87e6ce6e-a8f1-4df8-bddb-60e6e18718c1",
                "href": "urn:ngsi-ld:category:87e6ce6e-a8f1-4df8-bddb-60e6e18718c1",
                "name": "Project Management, Marketing and Admin"
            },
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:70bbe8c0-bda7-4b97-ab2c-ead61a3e074a",
                "href": "urn:ngsi-ld:product-offering-price:70bbe8c0-bda7-4b97-ab2c-ead61a3e074a",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a78a21bc-12b0-4115-88b3-0642049a6cb1",
            "href": "urn:ngsi-ld:product-specification:a78a21bc-12b0-4115-88b3-0642049a6cb1",
            "name": "Business Process",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T10:53:30.937Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:01405c82-906e-4c7d-9078-b5e8c35c1b71",
        "href": "urn:ngsi-ld:product-offering:01405c82-906e-4c7d-9078-b5e8c35c1b71",
        "description": "ProActive Workflows & Scheduling is an IT process automation platform for workload automation, batch processing, job scheduling and real-time events management.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-09T11:07:04.504078753Z",
        "lifecycleStatus": "Launched",
        "name": "ProActive Workflows and Scheduling",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "href": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "name": "Container as a Service (CaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:c574f3e4-e246-4b48-9727-6b7fa333fbcd",
                "href": "urn:ngsi-ld:product-offering-price:c574f3e4-e246-4b48-9727-6b7fa333fbcd",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:3f7125cb-b110-45dd-95d4-03c8a3e4f21b",
            "href": "urn:ngsi-ld:product-specification:3f7125cb-b110-45dd-95d4-03c8a3e4f21b",
            "name": "ProActive Workflows and Scheduling",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T11:07:04.426Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:ff0c2aa0-e67a-4857-a69f-06f05bcd831e",
        "href": "urn:ngsi-ld:product-offering:ff0c2aa0-e67a-4857-a69f-06f05bcd831e",
        "description": "New GenAI Offer : 100% European and operational generative AI !\n",
        "isBundle": false,
        "lastUpdate": "2024-12-09T11:35:49.208406462Z",
        "lifecycleStatus": "Launched",
        "name": "GenAI",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:498dfbe5-8ab6-4d07-9e8d-8dda14906e6a",
                "href": "urn:ngsi-ld:product-offering-price:498dfbe5-8ab6-4d07-9e8d-8dda14906e6a",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:34639868-1d29-4c71-b868-d8e5c2cacaff",
            "href": "urn:ngsi-ld:product-specification:34639868-1d29-4c71-b868-d8e5c2cacaff",
            "name": "GenAI",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T11:35:49.112Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e4aa35a1-3061-47d3-915d-1d9bd337fb05",
        "href": "urn:ngsi-ld:product-offering:e4aa35a1-3061-47d3-915d-1d9bd337fb05",
        "description": "ProActive Workflows & Scheduling is a cross-platform workflow scheduler and resource manager allowing to run workflow tasks in multiple languages and environments. ProActive Resource Manager handles on-premise and cloud computing resources in an elastic, on-demand and distributed way.\n\nProActive Workflows & Scheduling automates task execution and orchestrates applications across your enterprise. With the Workfow Studio, Scheduler, Resource Manager and Automation Dashboard portals, you can easily design your automation, monitor workflow execution and access job results.\n\nContact us:  [🔗](https://marketplace.outscale.com/partner/org-qh9w0ias/product/pro-slycktyx) ",
        "isBundle": false,
        "lastUpdate": "2024-12-09T10:59:36.681921426Z",
        "lifecycleStatus": "Obsolete",
        "name": "ProActive Workflows and Scheduling",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "href": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "name": "Development and Testing"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a78a21bc-12b0-4115-88b3-0642049a6cb1",
            "href": "urn:ngsi-ld:product-specification:a78a21bc-12b0-4115-88b3-0642049a6cb1",
            "name": "Business Process",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T10:59:36.627Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4a156089-1f17-4e51-b6b3-69520113e145",
        "href": "urn:ngsi-ld:product-offering:4a156089-1f17-4e51-b6b3-69520113e145",
        "description": "Our platform offers 360° functionality : AI + Gen AI\n\n- Add Gen AI to your models\n- Use Gen AI endpoints\n- Deploy Gen AI chat\n\nChatbots are conversational agents that can be used by companies to answer questions from their employees or customers. For employees, the advantage is that they can easily get answers to their questions without having to read all the internal documents. And for customers, to have the answers to their questions in just a few clicks!\n \nAt ALLONIA, we have clients who have implemented automatic document selection. The aim is to find the right document or paragraph from a multitude of texts! This facilitates the work of the teams and saves time for other tasks!\n\nLLMs can be used to generate content. For example: automatically generate summaries from documents selected in advance. The advantage: time saved for employees and, very often, the summary is of a higher quality than human work!\n \nLLMs can also be used to translate texts into other languages. 2 stages are required: pre-processing and translation. Very effective when employees have to translate a lot of internal documents.\n\nContact us  [🔗](https://marketplace.outscale.com/partner/org-0mintuu9/product/pro-hdhpdpcz) ",
        "isBundle": false,
        "lastUpdate": "2024-12-09T10:21:02.169766560Z",
        "lifecycleStatus": "Retired",
        "name": "GenAI",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a78a21bc-12b0-4115-88b3-0642049a6cb1",
            "href": "urn:ngsi-ld:product-specification:a78a21bc-12b0-4115-88b3-0642049a6cb1",
            "name": "Business Process",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T10:21:02.086Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:10507fc1-55cb-4631-8d72-7c17c00f3ad6",
        "href": "urn:ngsi-ld:product-offering:10507fc1-55cb-4631-8d72-7c17c00f3ad6",
        "description": "Automated cyber crisis management exercise software for continuous training of executives, managers and technical teams.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-10T09:32:07.779975413Z",
        "lifecycleStatus": "Launched",
        "name": "CRISIS RESPONSE SIMULATOR",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:5e6d4f3b-1539-4c1a-9cc4-f34cf7ed5835",
                "href": "urn:ngsi-ld:product-offering-price:5e6d4f3b-1539-4c1a-9cc4-f34cf7ed5835",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:6d10bd87-3a97-47c6-8c7c-930026ecd017",
            "href": "urn:ngsi-ld:product-specification:6d10bd87-3a97-47c6-8c7c-930026ecd017",
            "name": "CRISIS RESPONSE SIMULATOR",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-10T09:32:07.663Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:71e5a87d-4ca8-4d28-ae9d-b19c89e54ac4",
        "href": "urn:ngsi-ld:product-offering:71e5a87d-4ca8-4d28-ae9d-b19c89e54ac4",
        "description": "ALLONIA, the SaaS artificial intelligence platform that accelerates and secures AI projects for large companies, SMEs, ETIs and public organisations.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-09T11:09:05.706564761Z",
        "lifecycleStatus": "Launched",
        "name": "ALLONIA AI OPS PLATFORM",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:40eb742a-169c-462e-8ead-86436ef295f4",
                "href": "urn:ngsi-ld:product-offering-price:40eb742a-169c-462e-8ead-86436ef295f4",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:06aacaa6-1067-4981-b073-ea84e30aed64",
            "href": "urn:ngsi-ld:product-specification:06aacaa6-1067-4981-b073-ea84e30aed64",
            "name": "ALLONIA AI OPS PLATFORM",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T11:09:05.621Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:1ef8dec7-d5f2-4310-9d7a-83b6e44a9348",
        "href": "urn:ngsi-ld:product-offering:1ef8dec7-d5f2-4310-9d7a-83b6e44a9348",
        "description": "ALLONIA offers you an all-in-one AI platform (‘classical AI and/or generative AI’) that enables your technical and business teams to collaborate very easily on all your Artificial Intelligence projects.\n\nThe ALLONIA platform has been designed to meet the business needs of companies and public authorities.\n \nThanks to the platform, you can exploit the potential of Artificial Intelligence while maintaining the confidentiality of your sensitive information and ensuring the sovereignty of your data.\n\nContact us  [🔗](https://marketplace.outscale.com/partner/org-0mintuu9/product/pro-8zdvah10) ",
        "isBundle": false,
        "lastUpdate": "2024-12-09T10:16:32.740015652Z",
        "lifecycleStatus": "Active",
        "name": "ALLONIA AI OPS PLATFORM",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:be82913d-14d7-4342-b7e2-d364c56ae54d",
            "href": "urn:ngsi-ld:product-specification:be82913d-14d7-4342-b7e2-d364c56ae54d",
            "name": " GenAI",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T10:16:32.485Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:3a4f98d7-3949-48ab-9844-b3e94c675990",
        "href": "urn:ngsi-ld:product-offering:3a4f98d7-3949-48ab-9844-b3e94c675990",
        "description": "Relocate your cloud files to Outscale Sovereign Cloud with Miria Migration - Additional Data Mover\n",
        "isBundle": false,
        "lastUpdate": "2024-12-09T12:53:33.204076145Z",
        "lifecycleStatus": "Launched",
        "name": "Atempo Miria Data Mover",
        "version": "4.2",
        "category": [
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:468fa7e3-b3e3-4db4-86c7-d48e4438855e",
            "href": "urn:ngsi-ld:product-specification:468fa7e3-b3e3-4db4-86c7-d48e4438855e",
            "name": "Atempo Miria Data Mover (Server Add-on)",
            "version": "4.2"
        },
        "validFor": {
            "startDateTime": "2024-12-09T12:53:33.096Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0564fc58-16f8-4ecb-9191-f2eb3353e4fc",
        "href": "urn:ngsi-ld:product-offering:0564fc58-16f8-4ecb-9191-f2eb3353e4fc",
        "description": "Relocate your Cloud files to OUTSCALE Sovereign Cloud with Miria Migration\n",
        "isBundle": false,
        "lastUpdate": "2024-12-09T12:53:22.046123625Z",
        "lifecycleStatus": "Launched",
        "name": "Atempo Miria Migration",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "href": "urn:ngsi-ld:category:d101960c-a37a-42fa-b78b-828e5fc7b9df",
                "name": "Cybersecurity and Data Privacy"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:ab03987b-62e9-453b-bfa1-9a0cbe5991ba",
                "href": "urn:ngsi-ld:product-offering-price:ab03987b-62e9-453b-bfa1-9a0cbe5991ba",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:3d3d0efb-28a8-450d-9bb3-4457484f39d0",
            "href": "urn:ngsi-ld:product-specification:3d3d0efb-28a8-450d-9bb3-4457484f39d0",
            "name": "Atempo Miria Migration",
            "version": "4.2"
        },
        "validFor": {
            "startDateTime": "2024-12-09T12:53:21.963Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4d98cf52-c555-4d0b-82a9-d6c065a22b12",
        "href": "urn:ngsi-ld:product-offering:4d98cf52-c555-4d0b-82a9-d6c065a22b12",
        "description": "CodéOps is a Cloud Management System interface that enables developers and customers to gain autonomy and responsiveness\n",
        "isBundle": false,
        "lastUpdate": "2024-12-10T09:37:28.851686217Z",
        "lifecycleStatus": "Launched",
        "name": "CodéOps",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "href": "urn:ngsi-ld:category:5071d2dc-27d9-44f0-8874-eb80226039ba",
                "name": "Development and Testing"
            },
            {
                "id": "urn:ngsi-ld:category:d5a7650c-ddce-46a6-8eba-c85b1c03cec7",
                "href": "urn:ngsi-ld:category:d5a7650c-ddce-46a6-8eba-c85b1c03cec7",
                "name": "Process management"
            },
            {
                "id": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "href": "urn:ngsi-ld:category:7757a469-708e-4f8e-838e-b881e410712f",
                "name": "Platform as a Service (PaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:4472e497-1b3e-4e91-b72b-a03df2d11e97",
                "href": "urn:ngsi-ld:product-offering-price:4472e497-1b3e-4e91-b72b-a03df2d11e97",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:00fa4ca1-7a38-40e8-a3bc-80d05bfeee19",
            "href": "urn:ngsi-ld:product-specification:00fa4ca1-7a38-40e8-a3bc-80d05bfeee19",
            "name": "CodéOps",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-10T09:37:28.677Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:4a58fc75-1c94-44a5-9b08-3cbd092802c4",
        "href": "urn:ngsi-ld:product-offering:4a58fc75-1c94-44a5-9b08-3cbd092802c4",
        "description": "Use the integrated models or create multi-models without using the entire platform !\n\n",
        "isBundle": false,
        "lastUpdate": "2024-12-09T11:14:38.086993261Z",
        "lifecycleStatus": "Launched",
        "name": "ALLONIA END POINT",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "href": "urn:ngsi-ld:category:ac997289-76fa-4323-8b62-31202c06ba61",
                "name": "Artificial Intelligence and Machine Learning"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:95cc844e-73cf-429d-bf7c-edc4537f9fd0",
                "href": "urn:ngsi-ld:product-offering-price:95cc844e-73cf-429d-bf7c-edc4537f9fd0",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:71cbc128-cfcc-4ff6-b5df-4bb59389cf67",
            "href": "urn:ngsi-ld:product-specification:71cbc128-cfcc-4ff6-b5df-4bb59389cf67",
            "name": "ALLONIA END POINT",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T11:14:38.008Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:410d17ab-fa92-4a5f-93f6-b077e62a4dc3",
        "href": "urn:ngsi-ld:product-offering:410d17ab-fa92-4a5f-93f6-b077e62a4dc3",
        "description": "ProActive Workflows & Scheduling is an IT process automation platform for workload automation, batch processing, job scheduling and real-time events management.\n\n Contact us [🔗](https://marketplace.outscale.com/partner/org-qh9w0ias/product/pro-slycktyx) ",
        "isBundle": false,
        "lastUpdate": "2024-12-09T10:57:50.077600774Z",
        "lifecycleStatus": "Retired",
        "name": "ProActive Workflows and Scheduling",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "href": "urn:ngsi-ld:category:92b309b4-70c3-4a21-95de-363b0fb8e79a",
                "name": "Container as a Service (CaaS)"
            }
        ],
        "productOfferingPrice": [
            {
                "id": "urn:ngsi-ld:product-offering-price:4e2d563b-4170-4c51-a883-8bda1ac96ddd",
                "href": "urn:ngsi-ld:product-offering-price:4e2d563b-4170-4c51-a883-8bda1ac96ddd",
                "name": "By Usage"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:b7364476-992d-47aa-9978-176dd42565c4",
            "href": "urn:ngsi-ld:product-specification:b7364476-992d-47aa-9978-176dd42565c4",
            "name": "ProActive Workflows and Scheduling",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-09T10:57:49.990Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:fda65d16-3a92-4cf2-bb59-1124f937d518",
        "href": "urn:ngsi-ld:product-offering:fda65d16-3a92-4cf2-bb59-1124f937d518",
        "description": "Strengthen collaboration across your entire organization by structuring information around common business lines, projects and themes.",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:31:44.223683334Z",
        "lifecycleStatus": "Obsolete",
        "name": "OPEN AGORA",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:d5259f89-c717-4782-a6b5-4be106eb06a3",
            "href": "urn:ngsi-ld:product-specification:d5259f89-c717-4782-a6b5-4be106eb06a3",
            "name": "JAMESPOT ",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:31:44.134Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:389531f5-9bdc-4133-bd9d-e96f78205bfe",
        "href": "urn:ngsi-ld:product-offering:389531f5-9bdc-4133-bd9d-e96f78205bfe",
        "description": "Strengthen your internal communication by structuring access to your information system through a modular no-code intranet.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:31:52.533013184Z",
        "lifecycleStatus": "Obsolete",
        "name": "FAST INTRANET",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:e0255502-70be-4d2c-8f88-e9e980490d3e",
            "href": "urn:ngsi-ld:product-specification:e0255502-70be-4d2c-8f88-e9e980490d3e",
            "name": "FAST INTRANET",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:31:52.451Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:dc5e40b6-c052-4b20-8f3a-ead35d237cb9",
        "href": "urn:ngsi-ld:product-offering:dc5e40b6-c052-4b20-8f3a-ead35d237cb9",
        "description": "Strengthen your internal communication by structuring access to your information system through a modular no-code intranet.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:36:18.500298551Z",
        "lifecycleStatus": "Launched",
        "name": " FAST INTRANET",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:a4a1aece-b5a8-4424-bcc9-d80adc056e0e",
            "href": "urn:ngsi-ld:product-specification:a4a1aece-b5a8-4424-bcc9-d80adc056e0e",
            "name": "FAST INTRANET",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:36:18.448Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:b4cc4ec6-f2ca-482d-9b48-d2b54b8348bf",
        "href": "urn:ngsi-ld:product-offering:b4cc4ec6-f2ca-482d-9b48-d2b54b8348bf",
        "description": "Elise, the revolutionary ECM solution, uses AI to automate capture, 360° file management and business process orchestration, improving your productivity.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:45:11.366087072Z",
        "lifecycleStatus": "Active",
        "name": "Elise Cloud",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:784e2936-227f-45a0-b2d1-bd01a486d5a7",
            "href": "urn:ngsi-ld:product-specification:784e2936-227f-45a0-b2d1-bd01a486d5a7",
            "name": "Elise Cloud",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:45:11.220Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:0314d219-406d-495c-b35f-e31d348337f6",
        "href": "urn:ngsi-ld:product-offering:0314d219-406d-495c-b35f-e31d348337f6",
        "description": "Opendatasoft platform allows all teams to quickly create compelling digital experiences with their data and share them across their internal and external ecosystems.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:49:15.877019210Z",
        "lifecycleStatus": "Launched",
        "name": "Opendatasoft Data Portal",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "href": "urn:ngsi-ld:category:73720e4b-7d7a-42db-a65c-1a4113d1a0af",
                "name": "Data as a Service (DaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:ef3f018a-a91b-40fd-bf09-9f635024730c",
            "href": "urn:ngsi-ld:product-specification:ef3f018a-a91b-40fd-bf09-9f635024730c",
            "name": "Opendatasoft Data Portal",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:49:15.787Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:c3e89d30-cfa1-4572-8178-958915b3043a",
        "href": "urn:ngsi-ld:product-offering:c3e89d30-cfa1-4572-8178-958915b3043a",
        "description": "Strengthen collaboration across your entire organization by structuring information around common business lines, projects and themes.",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:34:06.158338063Z",
        "lifecycleStatus": "Launched",
        "name": " OPEN AGORA",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:7ac418c7-6bcc-4638-b5ca-56334b3d7141",
            "href": "urn:ngsi-ld:product-specification:7ac418c7-6bcc-4638-b5ca-56334b3d7141",
            "name": "OPEN AGORA",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:34:06.007Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:7f6b616c-8a0e-4183-b83e-1f8351d87a08",
        "href": "urn:ngsi-ld:product-offering:7f6b616c-8a0e-4183-b83e-1f8351d87a08",
        "description": "Engage your employees in a unique and universal experience of communication and collaboration\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:38:11.889797169Z",
        "lifecycleStatus": "Launched",
        "name": " SMART PLACE",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:422d7328-0148-4785-a577-449513c38b4d",
            "href": "urn:ngsi-ld:product-specification:422d7328-0148-4785-a577-449513c38b4d",
            "name": " SMART PLACE",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:38:11.838Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:890a25fe-cf87-4212-8669-d7bd011521af",
        "href": "urn:ngsi-ld:product-offering:890a25fe-cf87-4212-8669-d7bd011521af",
        "description": "The French metaverse designed for hybrid organizations: Strengthen your internal communications by engaging your hybrid teams in virtual offices dedicated to your organization\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:39:26.032797994Z",
        "lifecycleStatus": "Active",
        "name": " Jamespot.Land",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:fd622c21-ee3f-44f2-85cf-976c47e77713",
            "href": "urn:ngsi-ld:product-specification:fd622c21-ee3f-44f2-85cf-976c47e77713",
            "name": "Jamespot.Land",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:39:25.740Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:b982cbde-7251-4888-9798-373bc5cb00e1",
        "href": "urn:ngsi-ld:product-offering:b982cbde-7251-4888-9798-373bc5cb00e1",
        "description": "Elise, the revolutionary ECM solution, uses AI to automate capture, 360° file management and business process orchestration, improving your productivity.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:45:50.095532402Z",
        "lifecycleStatus": "Launched",
        "name": "Elise Cloud",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:784e2936-227f-45a0-b2d1-bd01a486d5a7",
            "href": "urn:ngsi-ld:product-specification:784e2936-227f-45a0-b2d1-bd01a486d5a7",
            "name": "Elise Cloud",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:45:50.021Z"
        }
    },
    {
        "id": "urn:ngsi-ld:product-offering:e4954b4c-beab-4773-99f6-fee14278e2aa",
        "href": "urn:ngsi-ld:product-offering:e4954b4c-beab-4773-99f6-fee14278e2aa",
        "description": "Trusted collaborative messaging: mail, calendar, cloud, office suite, chat, videoconferencing.\n",
        "isBundle": false,
        "lastUpdate": "2024-12-12T17:41:20.724191321Z",
        "lifecycleStatus": "Launched",
        "name": "Mailo",
        "version": "0.1",
        "category": [
            {
                "id": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "href": "urn:ngsi-ld:category:5cee9b52-3c11-45b4-896b-03f8e988788c",
                "name": "Software as a Service (SaaS)"
            }
        ],
        "productOfferingTerm": [
            {}
        ],
        "productSpecification": {
            "id": "urn:ngsi-ld:product-specification:561fac31-f832-4bc2-9937-058d33348999",
            "href": "urn:ngsi-ld:product-specification:561fac31-f832-4bc2-9937-058d33348999",
            "name": " Mailo",
            "version": "0.1"
        },
        "validFor": {
            "startDateTime": "2024-12-12T17:41:20.643Z"
        }
    }
]