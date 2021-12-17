function loadEditableMapList(url, map_base_url, targetDivId, noMapMessage = 'No maps found.') {
    clearInnerAndShowSpinner(targetDivId);

    $.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        success: function (data) {
            let mapList = document.getElementById(targetDivId);
            mapList.innerHTML = '';
            if (data.maps.length === 0) {
                mapList.innerHTML = '<span class="text-muted text-center p-5" style="width: 100%">' + noMapMessage + '</span>';
            } else {
                for (let map of data.maps) {
                    let _id = map.id;
                    let _url = map_base_url + _id;
                    let _name = map.name;
                    let _description = map.description;
                    let _lastView = map.last_viewed;
                    let _stars = map.stars;
                    let _collaboratorCount = map.collaborator_count;

                    mapList.innerHTML += `
                    <div class="col">
                        <div class="card shadow-sm">
                            <div class="geo-pattern" id="pattern-${_id}">${_name}</div>
    
                            <div class="card-body">
                                <input id="map-name-input-${_id}" class="form-control form-control-plaintext fs-4 pb-0" 
                                value="${_name}"/>
                                <input id="map-description-input-${_id}" class="form-control form-control-plaintext text-muted mb-1" 
                                value="${_description}"/>
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="btn-group">
                                        <a href="${_url}">
                                            <button type="button" class="btn btn-sm btn-outline-secondary">Open</button>
                                        </a>
                                    </div>
                                    <small class="text-muted" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Last viewed">${_lastView}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    `;
                }

                // Must register event after DOM operations
                for (let map of data.maps) {
                    let _id = map.id;

                    let onEnterPressed = () => updateMapInfo(_id);

                    registerEnterKeyEvent("#map-name-input-" + _id, onEnterPressed);
                    registerEnterKeyEvent("#map-description-input-" + _id, onEnterPressed);
                }

                paintGeoPattern();
                enableTooltip();
            }
        },
        error: function (data) {
            console.log(data);
        }
    });
}

function updateMapInfo(id) {
    let name = $(`#map-name-input-${id}`).val();
    let description = $(`#map-description-input-${id}`).val();

    $.ajax({
        url: mapUpdateUrl + id,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            name: name,
            description: description
        },
        success: function (data) {
            showToast('Updated');
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed updating map information');
        }
    });
}

function createMap(url) {
    let map_name = document.getElementById('input-map-name').value;
    let map_description = document.getElementById('input-map-description').value;

    $.ajax({
        url: url,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            name: map_name,
            description: map_description
        },
        success: function (data) {
            window.location.href = data.url;
        },
        error: function (data) {
            console.log(data);
        }
    });
}