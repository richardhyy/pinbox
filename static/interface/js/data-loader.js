// MARK: - Basic map
let baseMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

let map = L.map("map", {
    center: [0, 0],
    zoom: 2,
    layers: [
        baseMapLayer
    ],
    zoomControl: false,
});

L.control.zoom({
    position: 'topright'
}).addTo(map);

provAndcitylayers = new L.FeatureGroup();
map.addLayer(provAndcitylayers);

let popup = L.popup();

function loadBasemap(url, maxZoom, attribution) {
    baseMapLayer.remove();
    baseMapLayer = L.tileLayer(url, {
        maxZoom: maxZoom,
        attribution: attribution
    });
    map.addLayer(baseMapLayer);
}