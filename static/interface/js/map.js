function fetchMapDetail(onSuccess) {
    $.ajax({
        url: mapDetailsUrl,
        type: 'GET',
        success: function (data) {
            onSuccess(data);
        },
        error: function (data) {
            showErrorToastAjax(data, 'Failed fetching map detail');
        }
    });
}

function loadBasemapList(url) {
    clearInnerAndShowSpinner('base-map-list');

    $.ajax({
        url: url,
        type: 'GET',
        success: function (data) {
            let baseMapList = $('#base-map-list');
            baseMapList.empty();
            if (data.base_maps.length === 0) {
                baseMapList.append('<li class="list-group-item">No basemaps available</li>');
            } else {
                for (let i = 0; i < data.base_maps.length; i++) {
                    let baseMap = data.base_maps[i];

                    let thumbnail_url = baseMap.url.replace('{s}', 'a').replace('{z}', '12').replace('{x}', '654').replace('{y}', '1584');
                    let col = $(`
                        <a class="col text-black" role="button">
                            <div class="card shadow-sm">
                                <img class="basemap-thumbnail" src="${thumbnail_url}" alt="Base map thumbnail" />
                                <div class="card-body">
                                    <p class="card-text text-wrap" style="display: inline-block">${baseMap.name}</p>
                                </div>
                            </div>
                        </a>
                    `);
                    col.click(function () {
                        loadBasemap(baseMap.url, baseMap.max_zoom, baseMap.attribution);
                        updateBaseMap(baseMap.id);
                    });
                    baseMapList.append(col);
                }
            }
        },
        error: function (data) {
            showErrorToastAjax(data, 'Failed fetching basemap list');
        }
    });
}

function updateCollaboratorList() {
    clearInnerAndShowSpinner('collaborator-list');

    $.ajax({
            url: collaboratorListUrl,
            type: 'GET',
            dataType: 'json',
            success: function (data) {
                let collaboratorList = $('#collaborator-list');
                collaboratorList.empty();
                if (data.collaborators.length === 0) {
                    collaboratorList.append('<span class="text-center m-3">No collaborators</span>');
                } else {
                    for (let i = 0; i < data.collaborators.length; i++) {
                        let collaborator = data.collaborators[i];
                        let collaboratorElement = $('<label class="list-group-item d-flex justify-content-between p-3 align-content-center" ' +
                            `onmouseenter="showDeleteOption('delete-btn-${key.id}')" 
                            onmouseleave="hideDeleteOption('delete-btn-${key.id}')"
                            ></label>`);
                        collaboratorElement.append(`
                            <span class="m-2">
                                ${collaborator.name}
                            </span>`);
                        collaboratorElement.append('<span">' +
                            `
                            <a tabindex="-1" id="delete-btn-${key.id}" class="btn lh-1" style="color: #d73030" 
                            data-bs-toggle="popover" data-bs-trigger="focus" data-bs-content="<button class='btn text-danger' onclick='removeCollaborator(${key.id})'>Confirm?</button>">&cross;</a>
                            ` +
                            '</span>');
                        collaboratorList.append(keyElement);
                    }
                    enableTooltip();
                    enableDismissablePopover(false);
                }
            },
            error: function (data) {
                showErrorToastAjax(data, 'failed loading keys');
            }
        }
    );
}

function addCollaborator(username) {
    showProcessingToast();
    $.ajax({
        url: usernameCheckUrl,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'username': username
        },
        success: function (data) {
            if (data.exists) {
                $('#collaborator-list').append(`
                        <label class="list-group-item d-flex justify-content-between p-3 align-content-center">
                            <span class="m-2">${username}</span>
                            <span class="badge bg-success rounded-pill p-2 m-2">${data.message}</span>
                        </label>`);
            } else {
                showErrorToast("User not found");
            }
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed checking collaborator');
        }
    });
}

function updateBaseMap(id) {
    showProcessingToast();
    $.ajax({
        url: updateMapInfoUrl,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'base_map': id
        },
        success: function (data) {
            showToast('Successfully updated base map');
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed updating basemap');
        }
    });
}

function deleteMap(url) {
    $.ajax({
        url: url,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        success: function (data) {
            window.location.href = '/';
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed deleting map');
        }
    });
}

function exportPois(url, type) {
    showProcessingToast(500);
    let keyword = $('#search-input').val();
    $.ajax({
            url: url,
            type: 'POST',
            headers: {
                'X-CSRFToken': csrftoken
            },
            data: {
                type: type,
                keyword: keyword
            },
            success: function (data) {
                showToast('POIs exported');
                // open a new window with the file url
                window.open(data.url);
            },
            error: function (data) {
                showErrorToastAjax(data, 'failed exporting POIs');
            }
        }
    );
}


function showDeleteOption(deleteContainerId) {
    $("#" + deleteContainerId).fadeIn(100);
}

function hideDeleteOption(deleteContainerId) {
    $("#" + deleteContainerId).fadeOut(100);
}

let page = 0;
let pagination = undefined;


function updateFeatureList() {
    showProcessingToast();
    let keyword = $('#search-input').val();

    $.ajax({
        url: featureListUrlBuilder(-1, -1),
        type: 'GET',
        success: function (data) {
            loadGeoJSON(JSON.parse(data.geom));
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed loading features');
        }
    })
}


// MARK: - Load base map
fetchMapDetail((data) => {
    loadBasemap(data.base_map.url, data.base_map.max_zoom, data.base_map.attribution);
});


// MARK: - Search related

let onDisplayDataList = [];

function searchEntryIdBuilder(id) {
    return "search-entry-" + id;
}

function addSearchResultEntry(id, name, additionalInfo, address, page = 0) {
    let additionalTooltip = "";
    if (additionalInfo) {
        let ratingStr = additionalInfo.rating ? "Rating: " + additionalInfo.rating + " / 5" : "";
        let costStr = additionalInfo.cost ? "Avg Cost: " + additionalInfo.cost : "";
        let additionalSeparator = additionalInfo.rating !== null && additionalInfo.cost !== null ? "<br>" : "";
        additionalTooltip = ratingStr + additionalSeparator + costStr;
    } else {
        additionalTooltip = "No additional info";
    }
    let addressToolTip = "";
    if (address.length > 14) {
        addressToolTip = `data-bs-toggle="tooltip" data-bs-placement="bottom" title="${address}"`;
    }
    document.getElementById("poi-list").innerHTML +=
        `<li id="${searchEntryIdBuilder(id)}" class="poi-entry" onclick="poiSpotlight(${id})" 
        data-bs-toggle="tooltip" data-bs-placement="right" data-bs-html="true" title="" 
                data-bs-original-title="${additionalTooltip}">
            <span class="poi-name text-truncate">${name}</span>
            <br>
            <span class="poi-address text-truncate">${address}</span>
        </li>`;
}

function clearSearchResult() {
    document.getElementById("poi-list").innerHTML = "";
}

function createMarker(poi, isSpotlight = false) {
    return L.marker([poi.latitude, poi.longitude]
        , {
            icon: isSpotlight ? highlightMarkerIcon : normalMarkerIcon,
            zIndexOffset: isSpotlight ? 10 : 0,
            title: poi.name
        }
    ).addTo(map).on('click', function (e) {
        poiSpotlight(poi.id);
    });
}

function updatePageNumbers() {
    let pageInput = $("#pageNumber-input");
    pageInput.val(page);
    pageInput.attr("max", pagination.totalPages);
    pageInput.attr("min", 1);
    $("#pageNumber-total").text(pagination.totalPages);
}

function updatePageEntries(entries) {
    clearSearchResult();

    // Remove existing markers
    onDisplayDataList.forEach(data => {
        data['marker'].remove();
    });

    // Empty cached list
    onDisplayDataList = [];

    if (entries.length === 0) {
        document.getElementById("poi-list").innerHTML = "<div class='text-center text-muted m-3'>No results found</div>";
    } else {
        // Show new entries
        entries.forEach(poi => {
            addSearchResultEntry(poi.id, poi.name, poi.additional_info, poi.address);

            // Populate marker on map
            let marker = createMarker(poi, false);

            // Add to cached list
            onDisplayDataList.push({
                'marker': marker,
                'poi': poi
            });
        });

        enableTooltip();
    }
}

function changePage(target) {
    if (pagination.totalPages === 0 || (target <= pagination.totalPages && target > 0)) {
        page = target;

        clearSearchResult();
        pagination.loadPage(page);
    }
}


// MARK: - POI Spotlight related

let lastSpotlightEntryIndex = undefined;

function poiSpotlight(id) {
    // Iterate over currently on screen POIs and zoom to the one with expected ID
    for (let i = 0; i < onDisplayDataList.length; i++) {
        if (onDisplayDataList[i].poi.id === id) {
            let poi = onDisplayDataList[i].poi;
            let marker = onDisplayDataList[i].marker;

            // Remove normal marker
            marker.remove();
            // Add spotlighted marker
            onDisplayDataList[i].marker = createMarker(poi, true);
            // Zoom to POI
            map.setView(new L.LatLng(poi.latitude, poi.longitude), 16);

            // Remove previous spotlighted marker
            if (lastSpotlightEntryIndex && lastSpotlightEntryIndex !== i) {
                let lastSpotlightEntry = onDisplayDataList[lastSpotlightEntryIndex];
                lastSpotlightEntry.marker.remove();
                lastSpotlightEntry.marker = createMarker(lastSpotlightEntry.poi);

                $('#' + searchEntryIdBuilder(lastSpotlightEntry.poi.id)).removeClass('poi-entry-selected');
            }
            // Highlight selected entry
            $('#' + searchEntryIdBuilder(id)).addClass('poi-entry-selected');

            lastSpotlightEntryIndex = i;
            return;
        }
    }
}

// MARK: - Editor related

let editor = new MapEditor();
editor.setSelectedTool(0);
