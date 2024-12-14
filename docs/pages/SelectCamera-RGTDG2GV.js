// front/src/components/camerainfo.js
function getPlatformOS() {
  const userAgent = window.navigator.userAgent;
  let os = null;
  const isIOS = (/iPad|iPhone|iPod/.test(userAgent) || /Mac|Mac OS|MacIntel/gi.test(userAgent) && (navigator.maxTouchPoints > 1 || "ontouchend" in document)) && !window.MSStream;
  if (/Macintosh|Mac|Mac OS|MacIntel|MacPPC|Mac68K/gi.test(userAgent)) {
    os = "Mac OS";
  } else if (isIOS) {
    os = "iOS";
  } else if (/'Win32|Win64|Windows|Windows NT|WinCE/gi.test(userAgent)) {
    os = "Windows";
  } else if (/Android/gi.test(userAgent)) {
    os = "Android";
  } else if (/Linux/gi.test(userAgent)) {
    os = "Linux";
  }
  return os;
}
console.log("running on:", getPlatformOS());
async function getVideoDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return void 0;
  }
  let allDevices = await navigator.mediaDevices.enumerateDevices();
  let videoDevices = allDevices.filter((device) => {
    return device.kind === "videoinput";
  });
  console.log(videoDevices);
  if (videoDevices.length == 0) {
    return void 0;
  }
  let allLabelsEmpty = videoDevices.every((device) => {
    return device.label === "";
  });
  if (!allLabelsEmpty) {
    return videoDevices;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    allDevices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = allDevices.filter((device) => {
      return device.kind === "videoinput";
    });
  } catch {
    console.log("Probably the user did not authorise request");
  } finally {
    if (stream !== void 0) {
      stream.getVideoTracks().forEach((track) => {
        track.stop();
      });
    }
  }
  return videoDevices;
}
async function getPreferredVideoDevice() {
  let undefinedVideoDevice = {
    defaultPreferredCamera: void 0,
    videoDevices: []
  };
  let videoDevices = await getVideoDevices();
  if (!videoDevices) {
    return undefinedVideoDevice;
  }
  let defaultPreferredCamera;
  if ("Android" == getPlatformOS()) {
    defaultPreferredCamera = videoDevices[videoDevices.length - 1];
  }
  return {
    defaultPreferredCamera,
    videoDevices
  };
}

// front/src/pages/SelectCamera.js
var gotoPage = window.MHR.gotoPage;
var goHome = window.MHR.goHome;
var storage = window.MHR.storage;
var log = window.MHR.log;
window.MHR.register("SelectCamera", class extends window.MHR.AbstractPage {
  constructor(id) {
    super(id);
  }
  async enter() {
    let html = this.html;
    try {
      var preferredVideoDevices = await getPreferredVideoDevice();
      if (preferredVideoDevices.videoDevices.length == 0) {
        this.render(html`<p>No camera available</p>`);
        return;
      }
      var videoDevices = preferredVideoDevices.videoDevices;
    } catch (error) {
      this.render(html`<p>No camera available</p>`);
      return;
    }
    let theHtml = html`
        <ion-list class="w3-container">
            <ion-list-header>
            <ion-label>Select a camera</ion-label>
            </ion-list-header>
            ${videoDevices.map(
      (camera) => html`<ion-item button @click=${() => this.setCamera(camera.deviceId)}><ion-label>
                <div class="text-larger">${camera.label}</div></a>
                </ion-label></ion-item>`
    )}
        </ion-list>`;
    this.render(theHtml);
  }
  async setCamera(cameraID) {
    window.selectedCamera = cameraID;
    localStorage.setItem("selectedCamera", cameraID);
    goHome();
  }
});
