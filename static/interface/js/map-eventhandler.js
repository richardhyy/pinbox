function search(keyword) {
    if (keyword === "") {
        pagination.page_cache = {};
        pagination.urlConstructor = poiListUrlBuilder;
    } else {
        pagination.page_cache = {};
        pagination.urlConstructor = function poiFilteringUrlConstructor(limit, page) {
            return filteredPoiListUrlBuilder(keyword, limit, page);
        };
    }
    changePage(1);
}

function searchCompletion(currentText) {
    
}

registerEnterKeyEvent('#search-input', () => search($('#search-input').val()));

// searchInput.on('input', function () {
//     searchCompletion(searchInput.val());
// });

registerEnterKeyEvent('#pageNumber-input', () => changePage(parseInt($('#pageNumber-input').val())));
