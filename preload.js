// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  window.$ = window.jQuery = require("jQuery");

  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ["chrome", "node", "electron"]) {
    replaceText(`${type}-version`, process.versions[type]);
  }

  $(document).on("click", ".card", function () {
    $(".loading").show();
    ipcRenderer.send("setBackgroud", $(this).attr("filepath"));
  });

  $(document).on("change", ".latest", function (e) {
    $(".loading").show();
    ipcRenderer.send("setLatest", e.currentTarget.checked);
  });

  ipcRenderer.on("setLatest-reply", (event, data) => {
    $(".loading").hide();
  });

  ipcRenderer.on("setBackgroud-reply", (event, data) => {
    $(".loading").hide();
    if (data) {
      alert("Background update Successfully!");
    } else {
      alert("Background update Failed!");
    }
  });

  ipcRenderer.send("getBackgrouds", "get");

  function getResolution(data, resolution = "1920х1080") {
    let reso = data.resolution.filter((path) => path.details == resolution);
    return reso && reso.length > 0 ? reso[0].filepath : data.filepath;
  }

  ipcRenderer.on("getBackgrouds-reply", (event, data) => {
    let cards = Object.values(data);
    let $cards = cards
      .map(
        (wallwaper) => `
            <div class="col-md-3">
              <div class="card mb-4 box-shadow" filepath="${getResolution(
                wallwaper
              )}">
                <img class="card-img-top" data-src="holder.js/100px225?theme=thumb&amp;bg=55595c&amp;fg=eceeef&amp;text=Thumbnail" alt="Thumbnail [100%x225]" style="height: 225px; width: 100%; display: block;" src="${
                  wallwaper.small_img
                }" data-holder-rendered="true">
              </div>
            </div>`
      )
      .join("");

    if (cards.length > 0) {
      ipcRenderer.send("background", getResolution(cards[0]));
    }

    $(".wallwapers").html(`<div class="row mr-2 ml-2">${$cards}</div>`);
  });

  ipcRenderer.on("background-reply", (event, data) => {
    $(".loading").hide();
    $(".latest").attr("checked", data);
    console.log(`Updated: ${data}`);
  });
});
