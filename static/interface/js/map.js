let editable = false;

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
                            `onmouseenter="showDeleteOption('collaborator-delete-btn-${collaborator.id}')" 
                            onmouseleave="hideDeleteOption('collaborator-delete-btn-${collaborator.id}')"
                            ></label>`);
                        collaboratorElement.append(`
                            <span class="m-2">
                                ${collaborator.username}
                            </span>`);
                        collaboratorElement.append('<span">' +
                            `
                            <a tabindex="-1" id="collaborator-delete-btn-${collaborator.id}" class="btn lh-1" style="color: #d73030" 
                            data-bs-toggle="popover" data-bs-trigger="focus" data-bs-content="<button class='btn text-danger' onclick='removeCollaborator(${collaborator.id})'>Confirm?</button>">&cross;</a>
                            ` +
                            '</span>');
                        collaboratorList.append(collaboratorElement);
                        hideDeleteOption('collaborator-delete-btn-' + collaborator.id);
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
        url: addCollaboratorUrl,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'username': username
        },
        success: function (data) {
            updateCollaboratorList();
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed checking collaborator');
        }
    });
}

function removeCollaborator(id) {
    showProcessingToast();
    $.ajax({
        url: removeCollaboratorUrl,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'id': id
        },
        success: function (data) {
            if (data.status) {
                $('#collaborator-list').empty();
                updateCollaboratorList();
            } else {
                showErrorToast("Failed removing collaborator");
            }
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed removing collaborator');
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

function setMapPublic(isPublic) {
    showProcessingToast();
    $.ajax({
        url: updateMapInfoUrl,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'public': isPublic
        },
        success: function (data) {
            showToast('Successfully updated map public status');
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed updating map public status');
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

let page = 1;
let pagination = new Pagination([],
    6,
    updatePageEntries,
    updatePageNumbers,
    () => clearInnerAndShowSpinner('poi-list', false));

function updateFeatureList() {
    let keyword = $('#search-input').val();

    let url = keyword === '' ? featureListUrlBuilder(-1, -1) : filteredFeatureListUrlBuilder(keyword, -1, -1);

    $.ajax({
        url: url,
        type: 'GET',
        success: function (data) {
            loadGeoJSON(JSON.parse(data.geom));

            // Add features to ToC
            let entries = [];
            for (let i = 0; i < userFeatureLayer.getLayers().length; i++) {
                let feature = userFeatureLayer.getLayers()[i].feature;
                let name = feature.properties.name;
                let description = feature.properties.description;
                let id = feature.properties.pk;
                let type = feature.geometry.type;
                let creator = feature.properties.creator;
                let created_at = feature.properties.created_at;

                let featureEntry = {
                    name: name,
                    description: description,
                    id: id,
                    type: type,
                    creator: creator,
                    created_at: created_at
                };

                entries.push(featureEntry);
            }

            // Sort features by creation time, the create_at property is a standard ISO 8601 date string
            entries.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });

            let _tempPagination = new Pagination(entries,
                pagination.limit,
                () => {},
                () => {},
                () => {});
            let newPageEntries = _tempPagination._getPageEntries(page);
            let currentPageEntries = pagination._getPageEntries(page);

            // Compare the new page entries with the current page entries
            // If they are the same, do nothing
            if (newPageEntries.length !== currentPageEntries.length) {
                pagination.setData(entries);
            } else {
                for (let i = 0; i < newPageEntries.length; i++) {
                    if (newPageEntries[i].id !== currentPageEntries[i].id) {
                        pagination.setData(entries);
                        break;
                    }
                }
            }
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed loading features');
        }
    })
}


// MARK: - Load base map
fetchMapDetail((data) => {
    loadBasemap(data.base_map.url, data.base_map.max_zoom, data.base_map.attribution);

    if (data.owner === viewerUsername || data.collaborators.includes(viewerUsername)) {
        $('.non-editing-area').hide();
        editable = true;
    } else {
        $('.editing-area').hide();
    }

    if (data.owner === viewerUsername) {
        $('#public-map-switch').prop('checked', data.public);
    }
});


// MARK: - Search related

let onDisplayDataList = [];

function searchEntryIdBuilder(id) {
    return "search-entry-" + id;
}

function addSearchResultEntry(feature) {
    let infoUpdateFunctionName = feature.type === 'Point' ? 'updatePoint' : 'updatePolyline';
    let featureListItem = `
        <li id="${searchEntryIdBuilder(feature.id)}" class="poi-entry">
            <div class="row align-items-center" onmouseenter="showDeleteOption('feature-delete-btn-${feature.id}')" 
                                                onmouseleave="hideDeleteOption('feature-delete-btn-${feature.id}')">
                <div class="feature-icon col-1 me-2" onclick="poiSpotlight(${feature.id}, '${feature.type}')">
                ` +
                (feature.type === "Point" ? `<img class="poi-icon" src="${markerBtnIcon}" alt="point feature">` :
                    feature.type === "LineString" ? `<img class="poi-icon" src="${lineBtnIcon}" alt="line feature">` :
                        '?')
                + `
                </div>
                <div class="feature-detail col-9">
                    <input id="feature-name-input-${feature.id}" class="form-control form-control-plaintext pb-1" value="${feature.name}" 
                        onkeyup='${infoUpdateFunctionName}("${feature.id}", $(this).val())'
                    />
                    <input id="feature-description-input-${feature.id}" class="form-control form-control-plaintext text-muted pt-0 pb-1" value="${feature.description ? feature.description : ''}"  
                        onkeyup='${infoUpdateFunctionName}("${feature.id}", undefined, $(this).val())' placeholder="No description"
                    />
                </div>` +
        (editable ?
                `<div class="feature-operation col-1">
                    <a tabindex="-1" id="feature-delete-btn-${feature.id}" class="btn lh-1" style="color: #d73030; display: none;" data-bs-toggle="popover"
                    data-bs-trigger="focus" data-bs-content="<button class='btn text-danger' onclick='deleteFeature(${feature.id}, \`${feature.type}\`)'>Confirm?</button>">&cross;</a>
                </div>` : '') +
            `</div>
        </div>
        </li>
    `;

    document.getElementById("poi-list").innerHTML += featureListItem;
}

function clearSearchResult() {
    document.getElementById("poi-list").innerHTML = "";
}


function updatePoint(id, name, description = undefined) {
    showProcessingToast();
    $.ajax({
        url: updatePointUrl + id,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'name': name,
            'description': description
        },
        success: function (data) {
            showToast('Successfully updated point');
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed updating point');
        }
    });
}

function updatePolyline(id, name, description = undefined) {
    showProcessingToast();
    $.ajax({
        url: updateLineUrl + id,
        type: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
        data: {
            'name': name,
            'description': description
        },
        success: function (data) {
            showToast('Successfully updated polyline');
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed updating polyline');
        }
    });
}

function deleteFeature(id, geoemtryType) {
    if (geoemtryType === "Point") {
        deletePoint(id);
    } else if (geoemtryType === "LineString") {
        deletePolyline(id);
    }
}

function deletePoint(id) {
    showProcessingToast();
    $.ajax({
        url: deletePointUrl + id,
        type: 'GET',
        success: function (data) {
            showToast('Marker deleted');
            updateFeatureList();
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed deleting marker');
        }
    });
}

function deletePolyline(id) {
    showProcessingToast();
    $.ajax({
        url: deleteLineUrl + id,
        type: 'GET',
        success: function (data) {
            showToast('Polyline deleted');
            updateFeatureList();
        },
        error: function (data) {
            showErrorToastAjax(data, 'failed deleting polyline');
        }
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
        entries.forEach(feature => addSearchResultEntry(feature));

        enableTooltip();
        enableDismissablePopover(false);
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

let previousSpotlight = {
    page: undefined,
    id: undefined
}

function poiSpotlight(id, geometryType) {
    // Iterate over currently on screen POIs and zoom to the one with expected ID
    for (let i = 0; i < userFeatureLayer.getLayers().length; i++) {
        let feature = userFeatureLayer.getLayers()[i].feature;
        if (feature.properties.pk === id.toString() && feature.geometry.type === geometryType) {
            if (feature.geometry.type === "Point") {
                map.flyTo(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]), 18);
            } else if (feature.geometry.type === "LineString") {
                map.flyToBounds(userFeatureLayer.getLayers()[i].getBounds(), {
                    padding: [50, 50]
                });
            }
            let onPage = pagination.getPageNumberForRecord((record) => {
                return record.id === id && record.type === geometryType;
            });
            changePage(onPage);

            if (previousSpotlight.page === onPage && previousSpotlight.id !== undefined) {
                // Remove previous spotlight
                $('#' + searchEntryIdBuilder(previousSpotlight.id)).removeClass('poi-entry-selected');
            }
            // Highlight selected entry
            $('#' + searchEntryIdBuilder(id)).addClass('poi-entry-selected');

            previousSpotlight.page = onPage;
            previousSpotlight.id = id;

            break;
        }
    }
}

// MARK: - Editor related

let editor = new MapEditor();
editor.setSelectedTool(0);
