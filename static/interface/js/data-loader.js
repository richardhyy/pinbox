const genericFeatureStyle = {
    color: '#7ebbae',
    weight: 3,
    fillColor: '#ffffff',
};

// MARK: - Basic map
let baseMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

let cursorLayer = L.featureGroup();
let editableLayer = L.featureGroup();
let userFeatureLayer = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
            icon: defaultMarkerIcon,
        });
    },
    onEachFeature: function (feature, layer) {

        let nameUpdateFunctionName = feature.geometry.type === 'Point' ? 'updatePoint' : 'updatePolyline';
        let descriptionHtml = feature.properties.description ? '<p class="text-muted">' + feature.properties.description + '</p>' : "";
        layer.bindPopup(`
                    <div class="marker-popup-container">
                        <input id="feature-name-input-${feature.properties.pk}" class="form-control form-control-plaintext" value="${feature.properties.name}" 
                        onkeyup='
                        ${nameUpdateFunctionName}("${feature.properties.pk}", $(this).val());
                        '
                        />
                    </div>
                `).openPopup();
        layer.bindTooltip(feature.properties.name, {
            permanent: true,
            direction: 'bottom',
            offset: [0, 8],
            className: 'feature-label',
        });
        // layer.on('click', function (e) {
        //     this.openPopup();
        // });
        // layer.on('contextmenu', function (e) {
        //     let featureType = feature.geometry.type;
        //     let deleteFunctionName = featureType === "Point" ? "deletePoint" : "deletePolyline";
        //     deletePopup
        //         .setContent(`
        //                     <div class="marker-popup-container">
        //                         <h5>Delete ${feature.properties.name}?</h5>
        //                         <a class="btn btn-outline-secondary" id="delete-feature-${feature.properties.pk}"
        //                                onclick="
        //                                        requireConfirm(
        //                                        'delete-feature-${feature.properties.pk}',
        //                                        () => {
        //                                            ${deleteFunctionName}(${feature.properties.pk});
        //                                            map.closePopup();
        //                                        })"
        //                                data-bs-toggle="tooltip" data-bs-placement="bottom"
        //                                title="Can NOT be undone">
        //                                 Delete</a>
        //                     </div>`)
        //         .setLatLng(e.latlng)
        //         .openOn(map);
        // });


    },
    style: genericFeatureStyle
});

let map = L.map("map", {
    center: [0, 0],
    zoom: 2,
    layers: [
        cursorLayer,
        editableLayer,
        userFeatureLayer,
        baseMapLayer
    ],
    zoomControl: false,
});

L.control.zoom({
    position: 'topright'
}).addTo(map);

provAndcitylayers = new L.FeatureGroup();
map.addLayer(provAndcitylayers);

let deletePopup = L.popup();

function loadBasemap(url, maxZoom, attribution) {
    baseMapLayer.remove();
    baseMapLayer = L.tileLayer(url, {
        maxZoom: maxZoom,
        attribution: attribution
    });
    map.addLayer(baseMapLayer);
}

function loadGeoJSON(geojson, append = false) {
    if (!append) {
        userFeatureLayer.clearLayers();
    }
    userFeatureLayer.addData(geojson);

}


let cursors = {};
let cursorAnimationTimers = {};

function updateCursors(cursorList) {
    for (const [user, cursor] of Object.entries(cursors)) {
        // If the user is not in the cursorList, remove the cursor from screen
        if (!cursorList.includes(user)) {
            cursorLayer.removeLayer(cursor);
            delete cursors[user];
        }
    }

    for (let cursor of cursorList) {
        let user = cursor.user;
        let color = cursor.color;
        let cursorLatLng = L.latLng(cursor.latitude, cursor.longitude);
        setCursor(user, color, cursorLatLng);
    }
}

function setCursor(user, fillColor, latlng) {
    if (cursors[user]) {
        // Update the cursor position with interpolated animation
        let oldLatLng = cursors[user].getLatLng();
        let newLatLng = latlng;

        if (cursorAnimationTimers[user]) {
            clearInterval(cursorAnimationTimers[user]);
        }

        let animationDuration = 500;
        let animationSteps = animationDuration / 10;
        let animationStep = 0;
        let animationInterval = setInterval(function () {
            animationStep++;
            let interpolatedLatLng = L.latLng(
                oldLatLng.lat + (newLatLng.lat - oldLatLng.lat) * animationStep / animationSteps,
                oldLatLng.lng + (newLatLng.lng - oldLatLng.lng) * animationStep / animationSteps
            );
            cursors[user].setLatLng(interpolatedLatLng);
            if (animationStep === animationSteps) {
                clearInterval(animationInterval);
            }
        }, 10);

        cursorAnimationTimers[user] = animationInterval;
    } else {
        let cursorIcon = L.divIcon({
            html: `<div class="user-cursor">
                    <svg class="cursor-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="${fillColor}" d="M13.9096+12.8047C14.1633+13.0502+14.2206+13.3326+14.0815+13.6518C13.9424+13.9792+13.7009+14.1429+13.3572+14.1429L8.66744+14.1429L11.1351+19.9866C11.2169+20.1912+11.2169+20.3918+11.1351+20.5882C11.0532+20.7846+10.9141+20.9278+10.7176+21.0179L8.54461+21.9386C8.34+22.0205+8.13947+22.0205+7.94305+21.9386C7.74664+21.8568+7.60341+21.7176+7.51338+21.5212L5.16849+15.9721L1.33814+19.8024C1.18264+19.9579+0.998478+20.0357+0.785688+20.0357C0.687493+20.0357+0.589273+20.0152+0.491052+19.9743C0.163692+19.8352+0+19.5937+0+19.25L0+0.785714C0+0.441954+0.163692+0.200509+0.491052+0.0613781C0.589246+0.0204576+0.687467+0+0.785688+0C1.00667+0+1.19083+0.0777527+1.33814+0.233258L13.9096+12.8047Z"></path></svg>
                    <div class="user-cursor-name" style="background: ${fillColor}">${user}</div>
                   </div>`,
            iconSize: [22, 22],
            iconAnchor: [0, 0],
            className: "userCursor"
        });

        cursors[user] = L.marker(latlng, {
                icon: cursorIcon,
                zIndexOffset: 2000
            }
        ).addTo(cursorLayer);
    }
}

// Update feature data every 3 seconds
setInterval(function () {
    updateFeatureList();
}, 3000);
